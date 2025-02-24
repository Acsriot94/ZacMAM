"use strict";

function S3MultiUpload(file) {
    this.PART_SIZE = 20*1024*1024;
    this.THREAD_COUNT = 0;
    this.THREAD_CONNECTION_MAX = 1;
    this.THREAD_MAX = 3;
    this.PARTS_INITIALIZED = 0;
    this.BLOBS_CACHED = 0;
    this.BLOBS_SENT = 0;
    this.BLOB_CACHE_MAX = 0;
    this.completed = false;
    this.file = file;
    this.fileInfo = {
        name: this.file.name,
        type: this.file.type,
        size: this.file.size,
        lastModifiedDate: this.file.lastModifiedDate
    };
    this.sendBackData = null;
    this.uploadXHR = [];
    this.project = -1;
    this.userID = -1;

    // Progress monitoring
    this.byterate = [];
    this.lastUploadedSize = [];
    this.lastUploadedTime = [];
    this.loaded = [];
    this.total = [];
    this.etags = [];
    this.retries = [];
    this.blobs = [];
    this.workers = [];
    this.uploadDone = 0;
    this.cancelled = false;
    this.part_urls = [];
    this.initialized = false;
    this.finishRetries = 0;
    this.errorCount = 0;

    this.rateCheckTimer = window.setInterval(this.checkUploadRate.bind(this), 5000);
}

S3MultiUpload.prototype.createMultipartUpload = function()
{
    this.initialized = false;
    this.cancelled = false;
    this.reset();

    const self = this;

    $.post('ajax/s3_upload.php', {
        command: 'create',
        fileInfo: self.fileInfo,
        project: self.project,
        userID: self.userID

    }).done(function(data) {
        if (self.cancelled) return;

        if (!data['part_urls'] || !data['part_size'] || !data['part_count'] || !data['uploadId'] || !data['key']) {
            self.onServerError('create', null, "Invalid server response.", null);
        } else {
            self.part_urls = data['part_urls'];
            self.PART_SIZE = parseInt(data['part_size']);
            self.PART_COUNT = parseInt(data['part_count']);

            // Initialize arrays
            for (let i = 0; i < self.PART_COUNT; i++) {
                self.loaded[i] = false;
                self.total[i] = 0;
                self.etags[i] = '';
                self.retries[i] = 0;
                self.blobs[i] = '';
            }

            self.cacheBlobs();

            self.sendBackData = {key: data['key'], uploadId: data['uploadId']};

            self.initialized = true;

            self.onPrepareCompleted();
            self.uploadParts();
        }

    }).fail(function(jqXHR, textStatus, errorThrown) {
        self.onServerError('create', jqXHR, textStatus, errorThrown);
    });
};

/**
 * Call this function to start uploading to server
 */
S3MultiUpload.prototype.start = function()
{
    this.createMultipartUpload();
};

/** private */
S3MultiUpload.prototype.uploadParts = function()
{
    if (this.cancelled) return;

    const loopStart = this.PARTS_INITIALIZED;

    for (let i = loopStart; i < this.PART_COUNT; i++) {
        if (this.THREAD_COUNT >= this.maxThreads()) break;

        this.uploadPart(i);
    }

    this.cacheBlobs();
};

S3MultiUpload.prototype.cacheBlobs = function()
{
    if (this.cancelled) return;
    if (this.BLOB_CACHE_MAX === 0) return;

    this.BLOB_CACHE_MAX = Math.floor((50 * 1024 * 1024) / this.PART_SIZE);

    const loopStart = this.BLOBS_SENT + this.BLOBS_CACHED;
    const loopEnd = loopStart + (this.BLOB_CACHE_MAX - this.BLOBS_CACHED);

    if (loopEnd > this.PART_COUNT) return;

    for (let i = loopStart; i < loopEnd; i++) {
        this.getBlobForPartIndex(i);
    }
};

S3MultiUpload.prototype.uploadPart = function(index)
{
    if (this.cancelled) return;

    this.THREAD_COUNT++;
    this.PARTS_INITIALIZED++;

    this.sendToS3(this.part_urls[index],null,index);
};

S3MultiUpload.prototype.sendToS3 = function(url, blob, index)
{
    if (this.cancelled) return;

    const self = this;

    // Get blob
    const filePart = self.getBlobForPartIndex(index);
    const size = filePart.size;

    if (typeof(Worker) !== "undefined") {
        const uploadWorker = new Worker("js/worker.upload.js?v=" + getJSConnectValue('site.script_version'));
        self.workers.push(uploadWorker);

        uploadWorker.postMessage({url: url, blob: filePart, type: this.fileInfo.type});

        let shouldTerminateWorker = false;
        let shouldAddThreads = true;

        uploadWorker.onmessage = function (event) {
            const data = event.data;

            if (data["success"]) {
                const etag = data["etag"];
                shouldTerminateWorker = true;

                if (etag && etag !== "") {
                    self.etags[index] = etag;
                    self.blobs[index] = '';
                    self.BLOBS_SENT++;
                    self.BLOBS_CACHED--;
                    self.cacheBlobs();
                } else {
                    logError("Error: ETag is empty");
                    shouldAddThreads = false;

                    self.retrySegment(url,blob,index,null);
                }

            } else if (data["progress"]) {
                const loaded = parseInt(data["loaded"]);

                self.total[index] = size;
                self.loaded[index] = loaded;

                if (self.lastUploadedTime[index]) {
                    const time_diff = (new Date().getTime() - self.lastUploadedTime[index]) / 1000;

                    if (time_diff > 0.25) {
                        self.byterate[index] = (self.loaded[index] - self.lastUploadedSize[index]) / time_diff;
                        self.lastUploadedTime[index] = new Date().getTime();
                        self.lastUploadedSize[index] = self.loaded[index];
                    }

                } else {
                    self.byterate[index] = 0;
                    self.lastUploadedTime[index] = new Date().getTime();
                    self.lastUploadedSize[index] = self.loaded[index];
                }

                // Only send update to user once, regardless of how many
                // parallel XHRs we have (unless the first one is over).
//            if (index == 0 || self.total[0] == self.loaded[0])
                self.updateProgress();
            } else {
                shouldTerminateWorker = true;
                shouldAddThreads = false;

                if (data["error"]) logError("Upload error - " + data["error"]);

                self.retrySegment(url,blob,index,null);
            }

            if (shouldTerminateWorker) {
                self.terminateWorker(uploadWorker);

                self.updateProgress();

                if (shouldAddThreads) {
                    self.THREAD_COUNT--;
                    if (self.THREAD_COUNT < self.maxThreads()) self.uploadParts();
                }

                self.uploadXHR[index] = null;
            }
        };

    } else {
        console.log("Error: this browser doesn't support Web Workers");
    }
};

S3MultiUpload.prototype.terminateWorker = function(worker)
{
    worker.terminate();

    if (this.workers.indexOf(worker) > -1) {
        this.workers.splice(this.workers.indexOf(worker),1);
    }
};

S3MultiUpload.prototype.retrySegment = function(url, blob, index, request)
{
    const self = this;
    this.retries[index]++;
    this.errorCount++;

    if (this.THREAD_CONNECTION_MAX > 1) this.THREAD_CONNECTION_MAX--;

    // Wait 30 secs and retry
    if (parseInt(this.retries[index]) < 4) {
        window.setTimeout(function() {
            console.log('Segment ' + index + ' failed. Retrying...');
            self.THREAD_COUNT++;
            self.sendToS3(url,blob,index);
        },30000 + (this.errorCount * 5000));

    } else {
        // Show error
        this.updateProgress();

        let info = {part_size: self.PART_SIZE, max_threads: self.maxThreads()};
        if (typeof request !== "undefined" && request) {
            info["status"] = request.status;
            info["responseHeaders"] = request.getAllResponseHeaders();
        }

        this.onS3UploadError(url, index, info);

        this.THREAD_COUNT--;
//        if (this.THREAD_COUNT < self.THREAD_MAX) self.uploadParts();
    }
};

/**
 * Abort multipart upload
 */
S3MultiUpload.prototype.cancel = function()
{
    this.cancelled = true;

    const self = this;

    for (let i=0; i<this.uploadXHR.length; ++i) {
        if (this.uploadXHR[i]) this.uploadXHR[i].abort();
    }

    for (let i=0; i<this.workers.length; ++i) {
        this.workers[i].postMessage({abort:1});
    }

    this.workers = [];

    $.post('ajax/s3_upload.php', {
        command: 'abort',
        sendBackData: self.sendBackData
    }).done(function(data) {

    });
};


S3MultiUpload.prototype.completeMultipartUpload = function()
{
    const self = this;
    if (this.completed) return;
    if (this.cancelled) return;
    this.completed = true;

    self.sendBackData['etags'] = self.etags.join(',');

    $.post('ajax/s3_upload.php', {
        command: 'complete',
        sendBackData: self.sendBackData,
    }).done(function(data) {
        self.onUploadCompleted(data);
    }).fail(function(jqXHR, textStatus, errorThrown) {
        if (self.finishRetries > 3) {
            self.onServerError('complete', jqXHR, textStatus, errorThrown);
        } else {
            self.finishRetries++;

            window.setTimeout(function() {
                console.log('Finishing multipart failed. Retrying...');
                self.completeMultipartUpload();
            },12000);
        }
    });
};

/**
 * Track progress, propagate event, and check for completion
 */
S3MultiUpload.prototype.updateProgress = function()
{
    if (!this.initialized) return;

    let total = 0;
    let loaded = 0;
    let complete = 1;

    for (let i=0; i<this.total.length; ++i) {
        loaded += +this.loaded[i] || 0;
        total += this.total[i];

        if (this.loaded[i] !== this.total[i]) {
            complete = 0;
        }

        if (this.etags[i].length === 0) complete = 0;
    }

    const byterate = this.currentByteRate();

    total = this.fileInfo.size;
    this.onProgressChanged(loaded, total, byterate);

    if (complete) {
        this.uploadDone++;
        if (this.uploadDone > 0) {
            this.uploadDone = 0;
            this.completeMultipartUpload();
        }
    }
};


S3MultiUpload.prototype.onServerError = function(command, jqXHR, textStatus, errorThrown) {
    console.log("onServerError Command:"+command);

    const data = {'message':'S3 multi-upload error <p>Type: server<br>Command: ' + command + '+<br>xhr: ' + JSON.stringify(jqXHR) + '<br>Status: ' + textStatus + '<br>Error: ' + JSON.stringify(errorThrown)};

    console.log(data);

    const xhttp = new XMLHttpRequest();

    xhttp.open('POST', '../ajax/errorlog', true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send('data=' + encodeURIComponent(JSON.stringify(data)));
};


S3MultiUpload.prototype.onS3UploadError = function(url, index, info) {
    console.log("onS3UploadError ");
    console.log("url: " + url);
    console.log("index: " + index);
    console.log("info: " + info);

    const data = {'message':'S3 multi-upload error <p>Type: s3'};

    console.log(data);

    const xhttp = new XMLHttpRequest();

    xhttp.open('POST', '../ajax/errorlog', true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send('data=' + encodeURIComponent(JSON.stringify(data)));
};


S3MultiUpload.prototype.onProgressChanged = function(uploadedSize, totalSize, bitrate) {};


S3MultiUpload.prototype.onUploadCompleted = function(serverData) {
    console.log('onUploadCompleted');
    console.log(serverData);

    this.reset();
};

S3MultiUpload.prototype.onPrepareCompleted = function() {};

S3MultiUpload.prototype.calculatePartSize = function()
{
    const total_size = this.file.size;
    const part_size = 20*1024*1024; // 20 MB

    const part_count = total_size / part_size;

    if (part_count > 10000) { // 200 GB
        return Math.ceil(total_size / 10000);
    }

    return part_size;
};

S3MultiUpload.prototype.reset = function()
{
    this.sendBackData = null;
    this.uploadXHR = [];
    this.byterate = [];
    this.lastUploadedSize = [];
    this.lastUploadedTime = [];
    this.loaded = [];
    this.total = [];
    this.etags = [];
    this.retries = [];
    this.blobs = [];
    this.workers = [];
};

S3MultiUpload.prototype.getBlobForPartIndex = function(index)
{
    let blob = this.blobs[index];

    if (blob instanceof Blob && blob.size > 0) {
        return blob;
    }

    const start = index*this.PART_SIZE;
    let end = (index+1)*this.PART_SIZE;

    if (end > this.file.size.length) end = this.file.size.length;

    blob = this.file.slice(start, end);

    // Cache result for later
    if (this.BLOB_CACHE_MAX > 0) {
        this.blobs[index] = blob;
        this.BLOBS_CACHED++;
    }

    return blob;
};

S3MultiUpload.prototype.maxThreads = function()
{
    let max_segments = getCookie('upload_max_segments');

    if (max_segments !== null) {
        max_segments = parseInt(max_segments);
        if (max_segments < 1) max_segments = 1;
        if (max_segments > this.THREAD_CONNECTION_MAX) max_segments = this.THREAD_CONNECTION_MAX;

        return max_segments;
    }

    return this.THREAD_CONNECTION_MAX;
};

S3MultiUpload.prototype.checkUploadRate = function()
{
    const byterate = this.currentByteRate();
    
    // Increase threads if rate > 1.5 MB/thread
    if (byterate >= (1.5 * 1024.0 * 1024.0 * parseFloat(this.THREAD_CONNECTION_MAX))) {
        if (this.errorCount === 0 && this.THREAD_CONNECTION_MAX < this.THREAD_MAX) {
            this.THREAD_CONNECTION_MAX++;
            console.log('Increasing concurrent threads to ' + this.THREAD_CONNECTION_MAX);
        }
    } else {
        if (this.THREAD_CONNECTION_MAX > 1) {
            this.THREAD_CONNECTION_MAX--;
            console.log('Decreasing concurrent threads to ' + this.THREAD_CONNECTION_MAX);
        }
    }
};

S3MultiUpload.prototype.currentByteRate = function()
{
    let byterate = 0.0;

    for (let i=0; i<this.total.length; ++i) {
        if (this.lastUploadedTime[i] > new Date().getTime() - 1000) {
            // Only count byterate for active transfers
            byterate += +this.byterate[i] || 0;
        }
    }

    return byterate;
};
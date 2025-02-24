function Upload(file) {
    this.file = file;
    this.title = this.sanitizeTitle(file.name);
    this.size = file.size;
    this.randomFilename = '';
    this.dept = -1;
    this.parent = '/';
    this.type = 0;
    this.progress = 0;
    this.uploadedBytes = 0;
    this.accessKey = '';
    this.encodedPolicy = '';
    this.signature = '';
    this.status = 'Queued';
    this.knob = null;
    this._listeners = {};
    this.xhr = null;
    this.fileID = -1;
    this.error = '';
    this.autoencode = 0;
    this.canRetry = true;
    this.retryCount = 0;
    this.project = -1;
    this.fileRequestID = null;
    this.startDate = null;
    this.finishDate = null;
    this.timeRemaining = '';
    this.timeEstimationTimer = null;
    this.pageObj = null;
    this.thumbURL = null;
    this.formInputs = [];
    this.s3multiupload = null;
    this.lastProgressUpdate = 0;
    this.representedObject = null;
    this.byterate = 0;
    this.prefer_segmented_uploads = true;

    this.lastUploadedTime = 0;
    this.lastUploadedSize = 0;
}


Upload.prototype = {

    constructor: Upload,

    addListener: function(type, listener){
        if (typeof this._listeners[type] === "undefined"){
            this._listeners[type] = [];
        }

        this._listeners[type].push(listener);
    },

    fire: function(event,async){
        if (typeof event === "string"){
            event = { type: event };
        }
        if (!event.target){
            event.target = this;
        }

        if (!event.type) {
            throw new Error("Event object missing 'type' property.");
        }

        if (this._listeners[event.type] instanceof Array){
            var listeners = this._listeners[event.type];
            for (var i=0, len=listeners.length; i < len; i++){
                if (async) {
                    var thisObj = this;
                    var listenerObj = listeners[i];
                    setTimeout(function() { listenerObj.call(thisObj, event); },1);
                } else {
                    listeners[i].call(this, event);
                }
            }
        }
    },

    removeListener: function(type, listener){
        if (this._listeners[type] instanceof Array){
            var listeners = this._listeners[type];
            for (var i=0, len=listeners.length; i < len; i++){
                if (listeners[i] === listener){
                    listeners.splice(i, 1);
                    break;
                }
            }
        }
    }
};

Upload.prototype.cancel = function() {
    this.cancelEstimationTimer();
    if (this.xhr) this.xhr.abort();
    if (this.s3multiupload) this.s3multiupload.cancel();

    this.status = 'Canceled';
    this.fire({type: "status"},true);
    this.fire({type: "abort"},true);
};

Upload.prototype.shouldUseSegments = function() {
    var segmentOptOut = parseInt(getCookie('segmented_uploads_optout'));

    if (segmentOptOut === 1 || !this.prefer_segmented_uploads) {
        console.log('Unable to use segmenting: user opted out');
        return false;
    }

    if (!(window.File && window.FileReader && window.FileList && window.Blob && window.Blob.prototype.slice && window.Worker && !isIE)) {
        console.log('Unable to use segmenting: browser doesn\'t support required features');
        return false;
    }

    if (this.file.size < 25*1024*1024) {
        console.log('File is less than 25 MB - ignoring segmenting...');
        return false;
    }

    return true;
};

Upload.prototype.upload = function()
{
    // Reset upload progress
    this.progress = 0;
    this.uploadedBytes = 0;
    this.lastProgressUpdate = 0;
    this.error = '';

    if (!this.randomFilename || this.randomFilename.length == 0) this.randomFilename = randomFilename(32);

    var filename = this.randomFilename+'-'+this.sanitizeFilename(this.file.name);

    var fileType = this.file.type;
    var fileExt = this.file.name.split('.').pop().toLowerCase();

    if (fileType == 'binary/octet-stream' || fileType == 'application/octet-stream') {
        switch (fileExt) {
            case 'mp4':
                fileType = 'video/mp4';
                break;

            case 'm4v':
                fileType = 'video/mp4';
                break;

            case 'mov':
                fileType = 'video/mp4';
                break;
        }
    }

    // Fake all videos as mp4s for better compatibility with fussy browsers
    if (fileType != 'video/mp4' && fileType.length > 6 && fileType.substr(0,6) == 'video/')
        fileType = 'video/mp4';

    this.mimeType = fileType;

    var upProgress = this.uploadProgress.bind(this);
    var upComplete = this.uploadComplete.bind(this);
    var upError = this.uploadError.bind(this);
    var upAbort = this.uploadAbort.bind(this);
    var upFinish = this.uploadFinish.bind(this);

    if (this.type == 1 || !this.shouldUseSegments()) {
        console.log('Using upload segmenting: no');

        var formData = new FormData();

        if (this.type == 1) {
            formData.append('key',filename);

            formData.action = 'upload';
        } else {

            formData.append('key','uploads/' + this.project + '/' + this.userID + '/' + filename);
            formData.append('acl','private');

            for (var i=0; i<this.formInputs.length; i++) {
                formData.append(this.formInputs[i][0],this.formInputs[i][1]);
            }

            formData.action = 'https://' + this.bucket + '.s3-accelerate.amazonaws.com';
//        formData.action = 'https://kollaborate.s3.amazonaws.com';
        }

        formData.append('Content-Type',fileType);
        formData.append('file',this.file,this.sanitizeFilename(this.file.name));

        formData.enctype = 'multipart/form-data';

        this.xhr = new XMLHttpRequest();

        this.xhr.upload.addEventListener("progress", upProgress, false);
//        this.xhr.upload.addEventListener("load", upComplete, false);
        this.xhr.upload.addEventListener("error", upError, false);
        this.xhr.upload.addEventListener("abort", upAbort, false);
//        this.xhr.addEventListener("load", upFinish, false);

        var self = this;

        this.xhr.onreadystatechange = function(evt) {
            if (self.xhr.readyState === XMLHttpRequest.DONE) {
                if (self.xhr.status >= 200 && self.xhr.status < 300) {
                    self.uploadComplete();
                    self.uploadFinish();
                } else {
                    self.logUploadError(self.xhr.status + ' - ' + self.xhr.responseText, evt);

                    self.error = 'Upload failed';

                    self.status = 'Error';
                    self.fire({type: "status"});
                }
            }
        }

        this.status = 'Uploading';
        this.fire({type: "status"});

        this.startDate = Date.now();
        this.startEstimationTimer();

        this.xhr.open("POST", formData.action, true);
        this.xhr.send(formData);

    } else {
        console.log('Using upload segmenting: yes');

        this.status = 'Preparing';
        this.fire({type: "status"});

        var thisObj = this;

        // Initiate multipart
        this.s3multiupload = new S3MultiUpload(this.file);
        this.s3multiupload.fileInfo.name = filename;
        this.s3multiupload.fileInfo.type = fileType;
        this.s3multiupload.project = this.project;
        this.s3multiupload.userID = this.userID;

        this.s3multiupload.onServerError = function(command, jqXHR, textStatus, errorThrown) {
            console.log(command);
            console.log(jqXHR);
            console.log(textStatus);

            thisObj.logUploadError("Upload failed with server error - command: " + command + ", status: " + textStatus + ", status code: " + jqXHR.status + ", error: " + errorThrown + ", name: " + thisObj.name);

            thisObj.s3multiupload = null;

            // Retry without segmenting
            if (thisObj.size <= (5*1024*1024*1024)) {
                thisObj.prefer_segmented_uploads = false;
                window.setTimeout(function() {
                    thisObj.upload();
                },100);
            } else {
                thisObj.status = 'Error';
                thisObj.fire({type: "status"}, false);
                thisObj.fire({type: "error"}, true);
            }
        };

        this.s3multiupload.onS3UploadError = function(url, index, info) {
            thisObj.logUploadError("Upload failed - " + info.status + ", part " + index + ", part size: " + info.part_size + ", threads: " + info.max_threads + ", total size: " + thisObj.size + ", url: " + url);

            thisObj.s3multiupload = null;

            // Retry without segmenting
            if (thisObj.size <= (5*1024*1024*1024)) {
                thisObj.prefer_segmented_uploads = false;
                window.setTimeout(function() {
                    thisObj.upload();
                },100);
            } else {
                thisObj.status = 'Error';
                thisObj.fire({type: "status"}, false);
                thisObj.fire({type: "error"}, true);
            }
        };

        this.s3multiupload.onProgressChanged = function(uploadedSize, totalSize, speed) {
            thisObj.uploadedBytes = uploadedSize;
            thisObj.byterate = speed;

            var percent = parseInt(uploadedSize / totalSize * 100, 10);
            thisObj.setProgress(percent,false);
        };

        this.s3multiupload.onPrepareCompleted = function() {
            thisObj.startDate = Date.now();
            thisObj.startEstimationTimer();

            thisObj.status = 'Uploading';
            thisObj.fire({type: "status"});
        };

        this.s3multiupload.onUploadCompleted = function() {
            upComplete();
            upFinish();
        };

        this.s3multiupload.start();
    }
};

Upload.prototype.uploadProgress = function(evt) {
    this.uploadedBytes = evt.loaded;

    if (this.lastUploadedTime)
    {
        var time_diff = (new Date().getTime() - this.lastUploadedTime)/1000;

        if (time_diff > 0.005) // 5 miliseconds has passed
        {
            this.byterate = (evt.loaded - this.lastUploadedSize)/time_diff;
            this.lastUploadedTime = new Date().getTime();
            this.lastUploadedSize = evt.loaded;
        }

    } else {
        this.byterate = 0;
        this.lastUploadedTime = new Date().getTime();
        this.lastUploadedSize = evt.loaded;
    }

    var percent = (evt.loaded / evt.total)*100.0;
    this.setProgress(percent,false);
};

Upload.prototype.setProgress = function(percent,force) {
    if (isNaN(percent)) percent = 0;

    // Show greater precision for files > 1 GB
    if (this.size > 1099511627776) {
        this.progress = (Math.round(percent*10)/10).toFixed();
    } else {
        this.progress = Math.round(percent);
    }

    // Only fire progress update once per second
    if (force || this.lastProgressUpdate < (Date.now()/1000) - 1) {
        this.lastProgressUpdate = Date.now()/1000;
        this.fire({type: "progress"});
    }
};

Upload.prototype.uploadComplete = function(evt) {
    console.log('upload complete');

    this.cancelEstimationTimer();

    if (this.status == 'Error') return;

    this.uploadedBytes = this.size;
    this.setProgress(100,true);

    this.status = 'Finishing';
    this.fire({type: "status"});
};

Upload.prototype.uploadFinish = function(evt) {
    console.log('start finishing');

    var upFinish = this.finishFile.bind(this);

    window.setTimeout(upFinish, 1);
};

Upload.prototype.uploadError = function(evt) {
    this.logUploadError(evt.error,evt);
};

Upload.prototype.logUploadError = function(error_string,event) {
    if (error_string) console.log('error:' + error_string);

    this.cancelEstimationTimer();

    // Report error
    var data = {'message':'Upload Error: ' + error_string + '<br>Size: ' + this.size + '<br>Code: ' + (event ? event.target.status:'') + '<br>Status: ' + (event ? event.target.statusText:'')
        + '<br>Response: ' + (event ? event.target.responseText:'') + '<br>Browser: ' + navigator.userAgent + '<br>URL: ' + location.href};
    console.log(data);

    var xhttp = new XMLHttpRequest();

    xhttp.open('POST', 'ajax/errorlog', true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send('upload=' + encodeURIComponent(JSON.stringify(data)));

    this.error = 'Timed out. Please check your network connection.';

    this.status = 'Error';
    this.fire({type: "status"});

    // Retry
    if (this.retryCount < 3 && this.canRetry) {
        this.retryCount++;

        console.log('upload retry');

        var reupload = this.upload.bind(this);

        window.setTimeout(reupload,3000);
    } else {
        this.fire({type: "error"});
    }
};

Upload.prototype.uploadAbort = function(evt) {
    console.log('abort');

    this.cancelEstimationTimer();

    this.fire({type: "abort"});
};

Upload.prototype.finishFile = function() {
    this.cancelEstimationTimer();
    if (this.status == 'Error') return;

    // Prep filename
    var filename = this.sanitizeTitle(this.file.name); // Only remove incompatible chars like \

    var newFilename = this.sanitizeFilename(this.file.name); // Remove special chars
    filename = encodeURIComponent(filename);
    newFilename = encodeURIComponent(newFilename);

    var fileExt = filename.split('.').pop().toLowerCase();

    var mimeType = this.file.type;
    if (mimeType == 'binary/octet-stream' || mimeType == 'application/octet-stream') {
        switch (fileExt) {
            case 'mp4':
                mimeType = 'video/mp4';
                break;

            case 'mov':
                mimeType = 'video/mp4';
                break;
        }
    }

    mimeType = encodeURIComponent(mimeType);

    // Prep params
    var params = { file:this.randomFilename+'-'+newFilename,originalFilename:filename,mime:mimeType,dept:this.dept,parent:this.parent,rev:this.rev,autorev:this.autorev,replace:this.replace,link:this.link,link_parent_type:this.linkparenttype,link_type:this.linktype,project:this.project,fileRequestID:this.fileRequestID,userID:this.userID};

    var thisObj = this;

    // Finish upload on thread to prevent it locking the UI
    if (typeof(Worker) !== "undefined") {
        window.setTimeout(function() { // Delay for 1.5 seconds on cloud

            var finishWorker = new Worker("js/worker.file-finish.js?v=" + getJSConnectValue('site.script_version'));
            finishWorker.postMessage(params);

            finishWorker.onmessage = function (event) {
                var data = event.data.trim();
                finishWorker.terminate();

                if (data.length === 0) {
                    logError('No data returned from upload handler.');

                    if (thisObj.retryCount < 3) {
                        thisObj.retryCount++;

                        console.log('finish retry');

                        /*                        var upFinish = thisObj.finishFile.bind(thisObj);

                                                window.setTimeout(upFinish, 1500);
                                                */

                        var reupload = thisObj.upload.bind(thisObj);

                        window.setTimeout(reupload, 3000);
                        return;
                    }

                } else {
                    var json = safeJSONParse(data.trim());

                    if (json) {
                        if ("undefined" !== typeof json["status"]) {
                            var status = json["status"];
                            if (status === "success" && "undefined" !== typeof json["file_id"]) {
                                thisObj.fileID = parseInt(json["file_id"]);
                                thisObj.status = 'Finished';

                                thisObj.fire({type: "status"}, false);
                                thisObj.fire({type: "complete"}, true);
                                thisObj.finishDate = Date.now();
                                return;

                            } else if (status === "error") {
                                if ("undefined" !== typeof json["description"]) {
                                    thisObj.error = json["description"];
                                }

                                var retryable = true;
                                if ("undefined" !== typeof json["retryable"]) {
                                    retryable = (json["retryable"] === true || json["retryable"] === 1);
                                }

                                if (retryable && thisObj.retryCount < 3) {
                                    thisObj.retryCount++;

                                    console.log('finish retry');

                                    var reupload = thisObj.upload.bind(thisObj);

                                    window.setTimeout(reupload, 3000);
                                    return;
                                }

                                thisObj.status = 'Error';
                                thisObj.fire({type: "status"}, false);
                                thisObj.fire({type: "error"}, true);
                                return;
                            } else {
                                console.log("Unknown status " + status);
                            }
                    } else {
                        console.log("Could not locate status field in JSON object");
                    }
                } else {
                    console.log("Invalid JSON from upload handler");
                }
            }

                // Unknown error
                thisObj.status = 'Error';
                thisObj.fire({type: "status"}, false);
                thisObj.fire({type: "error"}, true);
            };

            finishWorker.onerror = function (err) {
                logError('Error finishing upload - '+err);

                if (thisObj.retryCount < 3) {
                    thisObj.retryCount++;

                    console.log('finish retry');

                    var reupload = thisObj.upload.bind(thisObj);

                    window.setTimeout(reupload, 3000);
                    return;
                }

                thisObj.status = 'Error';
                thisObj.fire({type: "status"}, false);
                thisObj.fire({type: "error"}, true);
            };

        }, (+getJSConnectValue('site.type', 0, false) === 1 ? 500 : 1500));

    } else {
        console.log('Unable to finish upload - this browser does not support Web Workers');
        thisObj.status = 'Error';
        thisObj.fire({type: "status"},false);
        thisObj.fire({type: "error"},true);
    }
};

Upload.prototype.startEstimationTimer = function() {
    this.cancelEstimationTimer();

    var self = this;
    this.timeEstimationTimer = window.setInterval(function() { self.calculateTimeRemaining(); }, 2000);
};

Upload.prototype.cancelEstimationTimer = function() {
    if (this.timeEstimationTimer) window.clearInterval(this.timeEstimationTimer);
    this.timeEstimationTimer = null;
};

Upload.prototype.calculateTimeRemaining = function() {
    if (!this.startDate) {
        this.timeRemaining = '';
        return;
    }

    var timeElapsed = Date.now()-this.startDate;
    if (isNaN(timeElapsed) || timeElapsed < 3000 || this.byterate <= 0) {
        this.timeRemaining = 'Estimating...';
        return;
    }

    var remainingSize = this.size - this.uploadedBytes;
    if (remainingSize <= 0) {
        this.timeRemaining = "00:00:00";
        return;
    }

    var remainingSeconds = remainingSize / this.byterate;

    var seconds = Math.floor(remainingSeconds % 60.0);
    var minutes = Math.floor((remainingSeconds / 60.0) % 60.0);
    var hours = Math.floor(((remainingSeconds / 60.0) / 60.0) % 24.0);

    this.timeRemaining = (hours < 10 ? '0':'') + hours + ':' + (minutes < 10 ? '0':'') + minutes + ':' + (seconds < 10 ? '0':'') + seconds;
};

Upload.prototype.pageObject = function() {
    if (!this.pageObj || !this.pageObj.length) this.pageObj = $('.file-obj[data-upload-index='+this.index+']');
    return this.pageObj;
};

Upload.prototype.sanitizeFilename = function(filename) {
    return filename.replace(/[^\w.]/gi, '_'); // Strip non-words and dots
};

Upload.prototype.sanitizeTitle = function(_title) {
    return _title.replace(/[\\\/]/gi, ''); // Strip slashes
};


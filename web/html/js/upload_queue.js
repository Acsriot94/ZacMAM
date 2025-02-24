var uploads = [];
var upload_count = 0;
var uploadIndex = -1;
var currentUploads = [];

function addFileToQueue(file,subdir,callback)
{
    var upload = uploadObjForFile(file,subdir);

    if (addUploadToQueue(upload,callback)) {
        return upload;
    }

    return null;
}

function addUploadToQueue(upload, callback = null, deferFinishing = false)
{
    if (!upload) return false;

    if (window.jsconnect['link'] && window.jsconnect['link']['id'] && parseInt(window.jsconnect['link']['max_uploads']) > 0) {
        if (upload_count >= parseInt(window.jsconnect['link']['max_uploads'])) {
            alert("This link has exceeded its upload limit.");
            return false;
        }
    }

    // Limit text and image file uploads for trial users
    if (getJSConnectValue('project.is_trial')) {
        const banned_file_types = ['text/plain', 'application/rtf', 'application/msword'];
        const wildcard_file_types = ['/vnd.', 'image/'];
        const banned_file_exts = ['doc', 'docx', 'xls', 'xlsx', 'exe'];

        let banned = false;

        for (const file_type of banned_file_types) {
            if (upload.file.type === file_type) {
                banned = true;
                break;
            }
        }

        if (!banned) {
            for (const wildcard of wildcard_file_types) {
                if (upload.file.type.indexOf(wildcard) > -1) {
                    banned = true;
                    break;
                }
            }
        }

        if (!banned) {
            const file_ext = upload.file.name.split('.').pop().toLowerCase();

            for (const ext of banned_file_exts) {
                if (file_ext === ext) {
                    banned = true;
                    break;
                }
            }
        }

        if (banned) {
            alert("To prevent abuse, this type of file cannot be uploaded in the trial. Please subscribe to upload this file.");
            return false;
        }
    }

    uploads.push(upload);
    upload_count++;

    if (callback) callback(upload);

    if (!deferFinishing) {
        finishAddingToQueue();
    }

    return true;
}

function finishAddingToQueue()
{
    syncUploadCountInPageTitle();

    window.setTimeout(function() {
        if (currentUploads.length < maxConcurrentUploads()) processNextQueueItem();
    }, 10);
}

function uploadObjForFile(file,subdir)
{
    if (!file) return null;

    var upload = new Upload(file);
    upload.randomFilename = randomFilename(32);
    upload.type = getJSConnectValue('site.type');
    upload.project = getJSConnectValue('project.id');
    upload.bucket = getJSConnectValue('upload.bucket');

    upload.userID = (getJSConnectExists('user.id') && !getJSConnectExists('upload.file_request_id') ? getJSConnectValue('user.id', -1):-1);
    upload.userName = getJSConnectValue('user.name', '', false);

    upload.parent = getJSConnectValue('upload.parent', '/');
    if (subdir) upload.parent = upload.parent + (subdir ? (upload.parent === '/' ? '':'/') + subdir:'');

    upload.dept = getJSConnectValue('upload.dept', -1, true);
    upload.rev = getJSConnectValue('upload.rev', -1, false);
    upload.replace = getJSConnectValue('upload.replace', -1, false);
    upload.link = getJSConnectValue('upload.link', -1, false);
    upload.linktype = getJSConnectValue('upload.linktype', -1, false);
    upload.linkparenttype = getJSConnectValue('upload.linkparenttype', -1, false);
    upload.fileRequestID = getJSConnectValue('upload.file_request_id', null, false);

    if (upload.type != 1) {
        upload.formInputs = getJSConnectValue('upload.form_inputs');
    }

    upload.addListener("progress",uploadProgress);
    upload.addListener("status",uploadStatusChanged);
    upload.addListener("complete",uploadFinished);
    upload.addListener("error",uploadError);
    upload.addListener("abort",uploadAbort);

    uploadIndex++;
    upload.index = uploadIndex;

    return upload;
}

function processNextQueueItem()
{
    if (currentUploads.length >= maxConcurrentUploads()) {
        console.log('Concurrent upload queue full - ignoring next queue item');
        return;
    }

    // Rate limit small files
    var finishedUploads = getFinishedUploads();

    if (finishedUploads.length >= 10) {
        var last10Files = finishedUploads.slice(-10);
        var totalDuration = uploadDurationForObjects(last10Files);

        // 10 files should take at least 30 secs to upload - rate limit otherwise
        var threshold = 30000;
        if (totalDuration < threshold) {
            var diff = threshold - totalDuration;

            console.log("Rate limiting for " + (diff / 1000.0) + " secs");

            // Update date of last file so it doesn't rate limit every time
            var lastObj = last10Files[last10Files.length - 1];
            var lastFileName = lastObj.file.name;
            var lastObjIndex = getIndexOfUploadWithFilename(lastFileName);

            if (lastObjIndex > -1) {
                var obj = uploads[lastObjIndex];
                obj.finishDate = Date.now() + diff + 1;
            } else {
                console.log("Failed to locate upload");
            }

            // Process queue again after delay
            window.setTimeout(processNextQueueItem, diff);
            return;
        }
    }

    console.log('Processing next queue item...');

    var newQueue = [];

    // Find next item in queue
    for (var i=0; i<uploads.length; i++) {
        var upload = uploads[i];

        if (upload.status == 'Queued') {
            currentUploads.push(upload);

            try {
                upload.upload();
            }

            catch (e) {
                console.log('Error when calling upload on queue item: ' + e.message);
                upload.status = 'Error';
                upload.fire({type: "status"});
                upload.fire({type: "error"});

                removeCurrentUploadFromQueue(upload);
            }

            syncUploadCountInPageTitle();
            return;

        } else if (upload.status != 'Finished') {
            if (upload.status == 'Error' && !upload.canRetry) continue;
            newQueue.push(upload);
        }
    }

    console.log('Upload queue finished');

    // Remove finished uploads
    uploads = newQueue;

    syncUploadCountInPageTitle();
}

function syncUploadCountInPageTitle()
{
    var newTitle = document.title;
    newTitle = newTitle.replace(/^(\(\d+\)\ )(?=\w)/, '');

    var uploadCount = getQueuedUploadCount();

    if (uploadCount > 0) {
        newTitle = '(' + uploadCount + ') ' + newTitle;
    }

    if (document.title !== newTitle) {
        document.title = newTitle;
    }
}

function removeCurrentUploadFromQueue(upload)
{
    var uploadIndex = currentUploads.indexOf(upload);
    if (uploadIndex >= 0) currentUploads.splice(uploadIndex,1);

    syncUploadCountInPageTitle();
}

function totalSpaceRemaining()
{
    if (window.jsconnect['site']['type'] == 1) {
        return window.jsconnect['site']['max_file_size'];
    } else {
        var remainingSpace = window.jsconnect['site']['free_space'];

        for (var i = 0; i < uploads.length; i++) {
            var upload = uploads[i];
            remainingSpace -= upload.size;
        }

        return remainingSpace;
    }
}

function validateFileSize(file)
{
    if (!window.FileReader) return true;

    return (file.size <= window.jsconnect['site']['max_file_size']);
}

function maxConcurrentUploads()
{
    return (window.jsconnect["site"]["type"] == 1 ? 1:1);
}

function getQueuedUploadCount()
{
    var count = 0;

    for (var i=0; i < uploads.length; i++) {
        var upload = uploads[i];

        if (upload.status !== 'Finished' &&
            upload.status !== 'Error' &&
            upload.status !== 'Canceled') {
            count++;
        }
    }

    return count;
}

function getFinishedUploads()
{
    var output = [];

    // Find next item in queue
    for (var i=0; i<uploads.length; i++) {
        var upload = uploads[i];

        if (upload.status === 'Finished') {
            output.push(upload);
        }
    }

    return output;
}

function getUploadWithFilename(filename)
{
    for (var i=0; i<uploads.length; i++) {
        var upload = uploads[i];

        if (upload.file.name === filename) {
            return upload;
        }
    }

    return null;
}

function getIndexOfUploadWithFilename(filename)
{
    for (var i=0; i<uploads.length; i++) {
        var upload = uploads[i];

        if (upload.file.name === filename) {
            return i;
        }
    }

    return -1;
}

/*
Get the total combined duration taken to upload a group of files
 */
function uploadDurationForObjects(objs)
{
    var startTime = -1;
    var endTime = -1;

    for (const obj of objs) {
        if (obj.startDate !== null && obj.finishDate !== null) {
            if (startTime < 0 || obj.startDate < startTime) {
                startTime = obj.startDate;
            }

            if (endTime < 0 || obj.finishDate > endTime) {
                endTime = obj.finishDate;
            }
        }
    }

    return endTime - startTime;
}
var localThumbQueue = [];
var localThumbQueueRunning = false;

function addUploadToThumbQueue(obj)
{
    if (!obj || typeof obj === 'undefined') return;

    if (isIphone || (navigator.hardwareConcurrency && navigator.hardwareConcurrency === 1)) {
        console.log('Skipping upload icon preview to save system resources');
        return;
    }

    if (getCookie('disable_upload_thumbs')) {
        console.log('Thumbnail generation disabled by user');
        return;
    }

    if (!window.FileReader) {
        console.log('Unable to generate file preview - FileReader not supported by this browser.');
        return;
    }

    if (typeof(Worker) === "undefined") {
        console.log('Unable to generate file preview - Web Workers not supported by this browser.');
        return;
    }

    if (localThumbQueue.indexOf(obj) === -1) {
        localThumbQueue.push(obj);

        if (!localThumbQueueRunning) processNextLocalThumb();
    }
}

function processNextLocalThumb()
{
    localThumbQueueRunning = true;

    var obj = localThumbQueue.pop();

    if (!obj) {
        localThumbQueueRunning = false;
        return;
    }

    if (typeof(Worker) !== "undefined") {
        var thumbWorker = new Worker("js/worker.thumb-generator.js?v=" + getJSConnectValue('site.script_version'));
        thumbWorker.postMessage({index:obj.index, file:obj.file});

        thumbWorker.onmessage = function (event) {
            var data = event.data;

            if (data && data.index && data.thumbURL) {
                var uploadObj = $('.file-obj[data-upload-index=' + data.index + '] .file-thumb.upload');

                if (typeof uploadObj !== 'undefined') {
                    uploadObj.addClass('preview');
                    uploadObj.css('background-image', "url('" + data.thumbURL + "')");
                }
            }

            thumbWorker.terminate();
            thumbWorker = null;

            setTimeout(function() { processNextLocalThumb(); }, 1);
        };
    }
}


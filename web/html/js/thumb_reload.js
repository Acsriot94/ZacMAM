var thumbReloadWorker = null;

function subscribeToThumbUpdates(_file_id)
{
    // Run on thread to prevent it locking the UI
    if (typeof(Worker) !== "undefined") {
        if (!thumbReloadWorker) thumbReloadWorker = new Worker("js/worker.thumb-reload.js?v=" + getJSConnectValue('site.script_version'));

        thumbReloadWorker.postMessage({subscribe:_file_id});

        thumbReloadWorker.onmessage = function (event) {
            var data = event.data;
            if (!data) {
                thumbReloadWorker = null;
                return;
            }

            if (typeof data === 'undefined' || data.length === 0) return;

            var fileIDs = [];
            var destObjs = [];

            for (var i=0; i<data.length; i++) {
                var file_id = parseInt(data[i]);
                if (file_id < 1) continue;

                var destObj = pageObjectForFileID(file_id);

                if (destObj) {
                    fileIDs.push(file_id);
                    destObjs.push(destObj);
                }
            }

            if (fileIDs.length > 0 && destObjs.length === fileIDs.length) {
                reloadFiles(fileIDs, destObjs,filesReloaded);
            }
        };

    } else {
        console.log('Unable to reload thumbnails - this browser does not support Web Workers');
    }
}

function filesReloaded(fileObjs)
{
    if (!fileObjs || typeof fileObjs === 'undefined') return;

    for (var i=0; i<fileObjs.length; i++) {
        var fileObj = fileObjs[i];

        // Only videos and images have to wait for hoverscrub thumbs
        var _file_id = parseInt(fileObj.data('id'));

        if (_file_id > 0) {
            var type = fileObj.data('type');
            if (type !== 'video' && type !== 'image') unsubscribeFromThumbUpdates(_file_id);
        }
    }
}

function unsubscribeFromThumbUpdates(_file_id)
{
    if (!thumbReloadWorker) return;

    thumbReloadWorker.postMessage({unsubscribe:_file_id});
}
let xhrUpload = null;
let progressTimer = null;

onmessage = function (event) {
    var data = event.data;

    if ('url' in data) {
        uploadSegment(data.url, data.blob, data.type);
    } else if ('abort' in data) {
        if (xhrUpload) xhrUpload.abort();
    } else {
        console.log('Unknown command sent to upload worker');
    }
};

function uploadSegment(url, blob, type)
{
    progressTimer = setInterval(timeout, 60000); // Timeout if no progress after 60 secs

    xhrUpload = new XMLHttpRequest();

    xhrUpload.onreadystatechange = function() {

        if (xhrUpload.readyState === 4) { // 4 is DONE
            if (progressTimer) {
                clearInterval(progressTimer);
                progressTimer = null;
            }

            if (xhrUpload.status !== 200) {
                postMessage({error: "Upload returned status " + xhrUpload.status});
            } else {
                const etag = xhrUpload.getResponseHeader('ETag');

                if (etag && etag !== "") {
                    postMessage({success: 1, etag: etag});
                } else {
                    postMessage({error: "No eTag supplied by server"});
                }
            }
        }
    };

    xhrUpload.upload.onprogress = function(e) {
        if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
        }

        if (e.lengthComputable) {
            postMessage({progress: 1, loaded: e.loaded})
        }

        progressTimer = setInterval(timeout, 60000); // Timeout if no progress after 60 secs
    };

    xhrUpload.upload.onerror = function(e) {
        postMessage({error: e.message});
    };

    xhrUpload.open('PUT', url, true);
    xhrUpload.setRequestHeader('Content-Type',type);
    xhrUpload.timeout = 20 * 60 * 1000; // 20 mins
    xhrUpload.send(blob);
}

function timeout()
{
    if (xhrUpload) xhrUpload.abort();
    postMessage({error: "Timeout"});
}
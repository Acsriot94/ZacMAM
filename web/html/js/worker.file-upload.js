var xhrUpload = null;

onmessage = function (event) {
    var data = event.data;

    if ('upload' in data) {
        uploadFile(data['upload']);
    } else if ('abort' in data) {
        if (xhrUpload) xhrUpload.abort();
    } else {
        console.log('Unknown command send to upload worker');
    }
};

function uploadFile(params)
{
    var formData = new FormData();

    if (params.type == 1) {
        formData.append('key',params.randomFilename+'-'+params.file.name.replace(/[^\w.]/gi, '_'));

        formData.action = '../upload';
    } else {
        formData.append('key','uploads/' + params.project_id + '/' + params.userID + '/' + params.randomFilename+'-'+params.file.name.replace(/[^\w.]/gi, '_'));
        formData.append('AWSAccessKeyId',params.accessKey);
        formData.append('acl','private');
        formData.append('policy',params.policy);
        formData.append('signature',params.signature);

        formData.action = 'https://' + params.bucket + '.s3-accelerate.amazonaws.com';
    }

    var fileType = params.file.type;
    var fileExt = params.file.name.split('.').pop().toLowerCase();

    if (fileType == 'binary/octet-stream' || fileType == 'application/octet-stream') {
        switch (fileExt) {
            case 'mp4':
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

    formData.append('Content-Type',fileType);
    formData.append('file',params.file);

    formData.enctype = 'multipart/form-data';

    try {
        xhrUpload = new XMLHttpRequest();

        xhrUpload.upload.addEventListener("progress", uploadProgress, false);
        xhrUpload.upload.addEventListener("load", uploadComplete, false);
        xhrUpload.upload.addEventListener("error", uploadError, false);
        xhrUpload.upload.addEventListener("abort", uploadAbort, false);

        xhrUpload.open("POST", formData.action, true);
        xhrUpload.send(formData);
    }

    catch (e) {
        uploadError(e);
    }

    changeStatus('Uploading');
}

function changeStatus(statusString)
{
    postMessage({'status':statusString});
}

function uploadProgress(evt)
{
    var percent = (evt.loaded / evt.total)*100.0;
    if (isNaN(percent)) percent = 0;

    postMessage({'progress':percent});
}

function uploadComplete(evt)
{
    console.log('upload complete');

    changeStatus('Finishing');

    endWorker();
}

function uploadError(evt)
{
    if (evt.error) console.log('error:' +evt.error);

    // Report error
    var data = {'message':'Upload Error: ' + evt.error + '<br>Code: ' + evt.target.status + '<br>Status: ' + evt.target.statusText
        + '<br>Response: ' + evt.target.responseText + '<br>Browser: ' + navigator.userAgent + '<br>URL: ' + location.href};
    console.log(data);

    var xhttp = new XMLHttpRequest();

    xhttp.open('POST', '../ajax/errorlog', true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send('upload=' + encodeURIComponent(JSON.stringify(data)));

    var errorString = (evt.error ? evt.error:'Timed out. Please check your network connection.');
    postMessage({'error':errorString});

    endWorker();
}

function uploadAbort(evt) {
    console.log('abort');

    postMessage(['abort', upload]);

    endWorker();
}

function endWorker()
{
    xhrUpload = null;

    close();

}

/*    // Send data to server
    var xmlHTTP = new XMLHttpRequest();

    var url = "../ajax/upload_handle.php";
    var params = buildPOSTParams(_params);
    xmlHTTP.open("POST", url, true);

    xmlHTTP.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    xmlHTTP.onreadystatechange = function() {
        if (xmlHTTP.readyState === 4) {
            postMessage(xmlHTTP.responseText);
        }
    };

    xmlHTTP.send(params);
}

function buildPOSTParams(dict)
{
    var params = "";

    for (var key in dict) {
        var val = dict[key];
        if (!val || typeof val === 'undefined') continue;

        if (params.length > 0) params += "&";
        params += key + '=' + encodeURIComponent(val);
    }

    return params;
}*/
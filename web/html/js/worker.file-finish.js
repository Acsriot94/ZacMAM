var waitTimer = null;

onmessage = function (event) {
    finishUpload(event.data);
};

function finishUpload(_params)
{
    // Send data to server
    var xmlHTTP = new XMLHttpRequest();

    var url = "../ajax/upload_handle.php";
    var params = buildPOSTParams(_params);
    xmlHTTP.open("POST", url, true);

    xmlHTTP.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    xmlHTTP.onreadystatechange = function() {
        if (xmlHTTP.readyState == 4) {
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
}
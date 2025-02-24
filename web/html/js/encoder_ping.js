var xmlObjs = {};
var shouldAbort = false;

onmessage = function (event) {
    var type = event.data["type"];

    if (type == "abort") {
        abortEncoders(event.data["encoders"]);

    } else if (type == "ping") {
        pingEncoders(event.data["encoders"]);
    }
};

function abortEncoders(encoders)
{
    shouldAbort = true;

    for (var i=0; i<encoders.length; i++) {
        if (xmlObjs["server_" + encoders[i]]) {
            var xmlhttp = xmlObjs["server_" + encoders[i]];
            xmlhttp.abort();
        }
    }
}

function pingEncoders(encoders)
{
    for (var i=0; i<encoders.length; i++) {
        if (shouldAbort) return;
        pingEncoder(encoders[i]);
    }

    // Check for stalled requests
    setTimeout(function() {
        for (var i=0; i<encoders.length; i++) {
            if (xmlObjs["server_" + encoders[i]]) {
                var xmlhttp = xmlObjs["server_" + encoders[i]];

                if (xmlhttp.readyState < 2) {
                    console.log("Aborting encoder ping because browser stalled for too long");
                    xmlhttp.abort();
                }
            }
        }
    }, 10000);
}

function pingEncoder(id)
{
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function () {
        console.log("readystate: " + xmlhttp.readyState);

        if (shouldAbort) {
            postFailureForEncoder(id);
        } else {
            if (xmlhttp.readyState == 4) {
                if (xmlhttp.status == 200) {
                    postMessage(id + ',' + 'OK');
                    if (xmlObjs["server_" + id]) xmlObjs["server_" + id] = null;
                } else {
                    postFailureForEncoder(id);
                }
            }
        }
    };

    xmlhttp.onprogress = function () {
        if (shouldAbort) postFailureForEncoder(id);
    };

    xmlhttp.onerror = function () {
        console.log("Encoder ping error");
        postFailureForEncoder(id);
    };

    xmlhttp.ontimeout = function () {
        console.log("Encoder ping timed out");
        postFailureForEncoder(id);
    };

    xmlhttp.onabort = function () {
        postFailureForEncoder(id);
    };

    xmlhttp.onloadstart = function () {
        if (shouldAbort) postFailureForEncoder(id);
    };

    xmlhttp.open('GET', '../async/encoder_ping?id=' + id, true);
    xmlhttp.send();

    xmlObjs["server_" + id] = xmlhttp;
}

function postFailureForEncoder(id)
{
    postMessage(id + ',' + 'FAIL');
    if (xmlObjs["server_" + id]) xmlObjs["server_" + id] = null;
}
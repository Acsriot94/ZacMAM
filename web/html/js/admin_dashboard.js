var encoderPing = null;

window.onbeforeunload = function() {
    if (encoderPing) {
        encoderPing.postMessage({type:"abort", encoders:encoder_ids()});
    }
};

window.onunload = function() {
    if (encoderPing) {
        encoderPing.terminate();
        encoderPing = null;
    }
};

function autoPingEncoders()
{
    if (getCookie("adminLastServerPing")) {
        var lastServerPing = parseInt(getCookie("adminLastServerPing"));
        if ((Date.now() / 1000) - lastServerPing < 30) {
            console.log("Skipping auto server ping on page reload because it was done too recently");
            return;
        }
    }

    pingEncoders();
}

function pingEncoders()
{
    writeCookie("adminLastServerPing", Date.now() / 1000, 1);

    console.log("Pinging encoders...");

    var encoders = encoder_ids();

    if (typeof(Worker) !== "undefined") {
        for (var i=0; i < encoders.length; i++) {
            var serverObj = $("#server-" + encoders[i]);
            serverObj.removeClass("online").removeClass("offline").addClass("pending");
        }

        var returnCount = 0;

        if (encoderPing) encoderPing.terminate();

        encoderPing = new Worker("../js/encoder_ping.js");
        encoderPing.postMessage({type:"ping", encoders:encoders});

        encoderPing.onmessage = function (event) {
            returnCount++;

            console.log("encoder ping event received: " + event.data);

            var data = event.data;
            var params = data.split(",");

            if (params.length === 2) {
                var serverObj = $("#server-" + params[0]);
                serverObj.removeClass("online").removeClass("offline");
                if (params[1] === "OK") {
                    serverObj.addClass("online");
                } else {
                    serverObj.addClass("offline");
                }
            }

            if (returnCount >= encoders.length) {
                encoderPing.terminate();
                encoderPing = null;
            }
        };
    } else {
        console.log("Error: Web Workers not supported");
    }
}

function clearMailQueue()
{
    performTask("clearmail",$("#mail_queue_count"));
}

function clearEncodingQueue()
{
    performTask("clearrenders",$("#encoding_queue_count"));
    document.getElementById('unassigned_queue_count').innerText = '0';
}

function clearFailedEncodingJobs()
{
    performTask("clearfailedrenders", $("#encoding_queue_count"));
    document.getElementById('unassigned_queue_count').innerText = '0';
}

function assignUnassignedJobs()
{
    performTask("assignunassignedjobs",$("#unassigned_queue_count"));
}

function clearDeletedFiles()
{
    document.getElementById('deleted_file_count').innerHTML = '<div class="spinner small" style="margin:0"></div>';
    performTask("clearfiles",$("#deleted_file_count"));
}

function clearDeletedProjects()
{
    document.getElementById('deleted_project_count').innerHTML = '<div class="spinner small" style="margin:0"></div>';
    performTask("clearprojects",$("#deleted_project_count"));
}

function performTask(task_name,status_object)
{
    const xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState === 4) {
            const data = xmlhttp.responseText;
            if (data) {
                const obj = safeJSONParse(data);

                if (obj["error"]) {
                    alert("Error: " + obj["error"]);
                } else if (obj["count"]) {
                    status_object.html(obj["count"]);
                } else {
                    status_object.html("0");
                }
            }
        }
    };

    xmlhttp.open("GET", "../async/admin_dash_tasks?" + task_name, true);
    xmlhttp.send();
}


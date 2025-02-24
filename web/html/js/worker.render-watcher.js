var renderWatcherTimer = null;

onmessage = function (event) {
    checkRenderProgress(event.data);
};

function setupTimer(file_id) {
    if (renderWatcherTimer) clearInterval(renderWatcherTimer);
    renderWatcherTimer = setInterval(function () { checkRenderProgress(file_id); }, 5000);
}

function checkRenderProgress(file_id)
{
    setupTimer(file_id);

    var xmlHTTP = new XMLHttpRequest();

    xmlHTTP.onreadystatechange = function() {
        if (xmlHTTP.readyState === 4 && xmlHTTP.status === 200) {
            if (xmlHTTP.responseText.length > 3) {
                postMessage(xmlHTTP.responseText);
            }
        }
    };

    xmlHTTP.open('GET', '../ajax/encode_status?id=' + file_id+'&ts='+(new Date()).getTime(), true);
    xmlHTTP.send();
}
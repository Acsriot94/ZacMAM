
onmessage = function (event) {
    loadFiles(event.data);
};

function loadFiles(params) {
    // Send data to server
    var xmlHTTP = new XMLHttpRequest();

    xmlHTTP.onreadystatechange = function() {
        if (xmlHTTP.readyState === 4) {
            if (xmlHTTP.status === 200) {
                postMessage(xmlHTTP.responseText);
            } else {
                console.log('Error getting file data: ' + xmlHTTP.responseText);
            }
        }
    };

    xmlHTTP.open('GET', "../ajax/files.php?"+params, true);
    xmlHTTP.send();
}

onmessage = function (event) {
    loadTranscript(event.data);
};

function loadTranscript(params) {
    // Send data to server
    var xmlHTTP = new XMLHttpRequest();

    xmlHTTP.onreadystatechange = function() {
        if (xmlHTTP.readyState === 4 && xmlHTTP.status === 200) {
            postMessage(xmlHTTP.responseText);
        }
    };

    xmlHTTP.open('GET', "../ajax/transcript?transcript&"+params, true);
    xmlHTTP.send();
}
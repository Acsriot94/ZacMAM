
onmessage = function (event) {
    loadComments(event.data);
};

function loadComments(params) {
    // Send data to server
    var xmlHTTP = new XMLHttpRequest();

    xmlHTTP.onreadystatechange = function() {
        if (xmlHTTP.readyState === 4 && xmlHTTP.status === 200) {
            postMessage(xmlHTTP.responseText);
        }
    };

    xmlHTTP.open('GET', "../ajax/comments.php?comments&"+params, true);
    xmlHTTP.send();
}
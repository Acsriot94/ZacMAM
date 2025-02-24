var sessionSocket = null;
var fileID = -1;

function sessionConnect(session_id,should_join,join_name) {
    console.log("Connecting to session...");

	window.WebSocket = window.WebSocket || window.MozWebSocket;
		  
	if (!window.WebSocket) {
        console.log("Error: WebSockets not supported.");
		return;
	}

    // Setup socket
    sessionSocket = new WebSocket(socketServerAddress()+'/session/'+session_id);

    console.log('Socket URL: '+socketServerAddress()+'/session/'+session_id);

    sessionSocket.onopen = function () {
      console.log("session socket opened");

        if (should_join)
        joinSession(join_name);

        if (fileID > -1 && window.isSessionOwner)
            sendSessionSocketString('KFILE'+fileID);
    };

    sessionSocket.onclose = function () {
      console.log("session socket closed");
    };

    sessionSocket.onerror = function (evt) {
      console.log("session socket error: "+evt.data);
    };

    sessionSocket.onmessage = function (message) {
        console.log('session data: '+message.data);

        if (message.data == 'KEND') {
            window.location = 'sessions?end';

        } else if (message.data.length > 5 && message.data.substr(0,5) == 'KFILE') {
            var newFileID = message.data.substr(5);
            if (fileID != newFileID) window.location = 'player?id='+newFileID;

        } else if (message.data.length > 5 && message.data.substr(0,5) == 'KJOIN') {
            var username = message.data.substr(5);
            showSuccessAlert(username + ' joined the session','#pagewrapper');
            populateSessionUsers();

        } else if (message.data.length > 6 && message.data.substr(0,6) == 'KLEAVE') {
            var username = message.data.substr(6);
            showSuccessAlert(username + ' left the session','#pagewrapper');
            populateSessionUsers();
        }
    };
}

function sessionDisconnect() {
	if (sessionSocket != null && typeof sessionSocket != 'undefined') sessionSocket.close();
    sessionSocket = null;

    console.log("session socket disconnected");
}

function sendSessionSocketString(val) {
    if (val != null && sessionSocket != null && typeof sessionSocket != 'undefined' && sessionSocket.readyState == 1) {
        sessionSocket.send(val);
    }
}

window.onunload = function() {
    sessionDisconnect();
};

function joinSession(username) {
    sendSessionSocketString('KJOIN'+username);
}

function endSession(url) {
    sendSessionSocketString('KEND');
    window.location = url+'/sessions?end';
}

function leaveSession(username,url) {
    if (username.length > 0) sendSessionSocketString('KLEAVE'+username);
    window.location = url+'/sessions?leave';
}

function changeSessionFileID(file_id) {
    fileID = file_id;
}

$(document).ready(function() {
    populateSessionUsers();
});

function populateSessionUsers() {
    $.post('sessions.php',{sessionusers:1},function(result) {
        $('#session_dropdown').html(result);
    });
}

function sessionDropdownClicked()
{
    showMenuForButton($('#session_dropdown_box'),$('#session_dropdown'));
}

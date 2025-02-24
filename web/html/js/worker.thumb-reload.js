var thumbSubscriptions = [];
var lastThumbCheck = 0;
var thumbReloadTimer = null;

onmessage = function (event) {
    var dict = event.data;
    if (dict['subscribe']) {
        subscribeToThumbUpdates(parseInt(dict['subscribe']));
    } else if (dict['unsubscribe']) {
        unsubscribeFromThumbUpdates(parseInt(dict['unsubscribe']));
    }
};

function subscribeToThumbUpdates(_file_id) {
    if (thumbObjectWithID(_file_id)) return;

    thumbSubscriptions.push({id:_file_id,last_updated:0,time:new Date().getTime()});

    if (!thumbReloadTimer) {
        thumbReloadTimer = setInterval(function () {
            checkForThumbUpdates();
        }, 2500);
    }
}

function unsubscribeFromThumbUpdates(_file_id) {
    for (var i=0;i<thumbSubscriptions.length; i++) {
        if (thumbSubscriptions[i]['id'] == _file_id) {
            thumbSubscriptions.splice(i,1);
            break;
        }
    }

    if (thumbSubscriptions.length === 0) {
        if (thumbReloadTimer) clearInterval(thumbReloadTimer);
        thumbReloadTimer = null;

        // Terminate worker
        postMessage(null);
        close();
    }
}

function checkForThumbUpdates() {
    var previousThumbCheck = lastThumbCheck;
    lastThumbCheck = Math.floor(new Date().getTime() / 1000);

    // Send data to server
    var xmlHTTP = new XMLHttpRequest();

    var url = "../ajax/recent_thumbs.php";
    var params = "since="+previousThumbCheck+"&files="+encodeURIComponent(subscribedThumbIDs().join(','));
    xmlHTTP.open("POST", url, true);

    xmlHTTP.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    xmlHTTP.onreadystatechange = function() {
        if (xmlHTTP.readyState === 4 && xmlHTTP.status === 200) {
            var thumbIDs = [];

            var json = safeJSONParse(xmlHTTP.responseText);

            if (json && json.length > 0) {
                for (var i = 0; i < json.length; i++) {
                    var _file_id = parseInt(json[i]);

                    var thumbObj = thumbObjectWithID(_file_id);

                    if (thumbObj) {
                        thumbObj['last_updated'] = new Date().getTime();
                        thumbIDs.push(_file_id);
                    }
                }

                /*            // Increase interval for hoverscrub
                 if (thumbReloadTimer) clearInterval(thumbReloadTimer);
                 thumbReloadTimer = setInterval(function () {
                 checkForThumbUpdates();
                 }, 10000);*/
            }

            // Update files that were never refreshed
            for (var i=0;i<thumbSubscriptions.length; i++) {
                var thumbObj = thumbSubscriptions[i];

                if (thumbObj['last_updated'] == 0 && thumbObj['time'] < new Date().getTime() - 5000) {
                    thumbObj['last_updated'] = new Date().getTime();
                    thumbIDs.push(thumbObj['id']);
                }
            }

            if (thumbIDs.length > 0) {
                thumbIDs.sort();
                postMessage(thumbIDs);
            }
//            console.log('subscriptions still in queue: '+subscribedThumbIDs().join(','));
        }
    };

    xmlHTTP.send(params);

    // Clear out old subscriptions
    for (var i=thumbSubscriptions.length - 1; i>=0; i--) {
        if (thumbSubscriptions[i]['time'] < new Date().getTime() - 60000) { // 1 min old
            thumbSubscriptions.splice(i, 1);
        }
    }

    if (thumbSubscriptions.length === 0) {
        if (thumbReloadTimer) clearInterval(thumbReloadTimer);
        thumbReloadTimer = null;

        // Terminate worker
        postMessage(null);
        close();
    }
}

function subscribedThumbIDs()
{
    var subscription_ids = [];

    for (var i=0; i < thumbSubscriptions.length; i++) {
        subscription_ids.push(thumbSubscriptions[i]['id']);
    }

    return subscription_ids;
}

function thumbObjectWithID(_file_id)
{
    for (var i=0; i < thumbSubscriptions.length; i++) {
        var thumbObj = thumbSubscriptions[i];
        if (thumbObj['id'] === _file_id) return thumbObj;
    }

    return null;
}

function safeJSONParse(str)
{
    try {
        return JSON.parse(str);
    }

    catch (e) {
        return null;
    }
}
var session_active = true;
var last_session_check = 0;

function checkSession()
{
    // Leave at least 3 mins between session checks
    if (last_session_check > 0 && Date.now() - last_session_check < 180000) {
        return;
    }

    last_session_check = Date.now();

    if (getJSConnectValue("site")) {
        is_session_active(function (active) {
            if (session_active && !active) {
                console.log("session inactive");

                session_active = false;

                // Show message to user
                showSessionTimeoutMessage();
            }

            session_active = active;
        });
    }
}

async function is_session_active(callback)
{
    let siteURL = getJSConnectValue("site.url");
    if (siteURL === null) siteURL = "";

    const response = await fetch(siteURL + "/ajax/sessioncheck.php", {method: "POST", cache: "no-cache"});
    const json = await response.json();

    if (json) {
        console.log(json);
        callback((+json.active === 1));
    } else {
        callback(false);
    }
}

function showSessionTimeoutMessage() {
    $("#session-timeout-alert").remove();
    $("body").prepend("<div id=\"session-timeout-alert\" class=\"error-alert\" style=\"margin-top:0\">Your session timed out due to inactivity. <a href=\"#\" onclick=\"window.location.reload()\"><button style=\"margin-left:10px\">Reload</button></a><div class=\"spacer\"></div></div>");
}

$(document).ready(function () {
    // Don't immediately check the session upon tabbing
    last_session_check = Date.now();

    window.setInterval(function () {
        checkSession();
    }, 10 * 60 * 1000); // 10 mins
});

var currentQuickShareID = null;

function shareFileID(file_id, element)
{
    $('.menu').hide();
    shareItem({file_id: file_id}, element);
}

function shareFolder(dept, path, element)
{
    shareItem({dept: dept, path: path}, element);
}

function shareItem(params, element)
{
    currentQuickShareID = null;

    var shareHTML = '<div id="share-dialog" style="height:calc(100% - 50px)"><center><img src="img/spinner-white.svg"/></center></div>';
    shareHTML += '<div id="share-dialog-buttons" style="margin-top:10px;"></div>';

    // Calculate width
    var width = document.documentElement.clientWidth;
    if (width > 400) width = 400;

    // Subtract padding
    width -= 25 * 2;
    if (width < 200) width = 200;

    showPopupForElement(element,$(shareHTML), width, 370, 'auto');

    params['project_id'] = getCurrentProjectID();

    // Get default settings
    params['require_pass'] = getLocalStorage('share.require_pass', 1);
    params['allow_comments'] = getLocalStorage('share.allow_comments', 1);
    params['view_comments'] = getLocalStorage('share.view_all_comments', 1);
    params['hide_download'] = getLocalStorage('share.hide_download', 0);
    params['force_download'] = getLocalStorage('share.force_download', 0);
    params['access_revisions'] = getLocalStorage('share.access_revisions', 0);
    params['relink_latest_version'] = getLocalStorage('share.relink_latest_version', 0);
    params['view_limit'] = getLocalStorage('share.view_limit', 0);
    params['expiry_days'] = getLocalStorage('share.expiry_days', 0);
    params['show_transcript'] = getLocalStorage('share.show_transcript', 0);

    $.post("ajax/share.php?newlink", params, function(json) {
        if (json['error']) {
            populateShareDialogWithFatalError(json['error']);
        } else {
            populateShareDialogWithSettings(json);
        }
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to share: " + errorString));
    });
}

function populateShareDialogWithSettings(settings)
{
    currentQuickShareID = settings['id'];

    var shareHTML = '<div><h2>Quick Share</h2>';
    shareHTML += '<div class="success-banner"><img src="img/Success.svg" /> New link created</div>';
    shareHTML += '<textarea-copy-button id="quickshare-url" style="width:100%" readonly="readonly" autoselect="autoselect" value="' + settings['url'] + '"></textarea-copy-button>';
    shareHTML += '<p><check-box id="share_require_pass" class="quick-share-option"' + (parseInt(settings['require_pass']) === 1 ? ' checked="checked"':'') + ' text="Require password:"></check-box> <text-input-copy-button class="quick-share-option" id="share_pass" autoselect="autoselect" value="' + settings['password'] + '"></text-input-copy-button>';

    shareHTML += '<p>Descriptive name: <br><input class="quick-share-option" type="text" id="share_name" value="' + settings['name'] + '" placeholder="e.g. John Smith\'s link">';

    shareHTML += '<p>Expires: <select class="quick-share-option" id="share_expiry"> <option value="0">Never';

    var expirations = [1, 3, 7, 14, 21, 30, 60, 90];

    for (var i=0; i < expirations.length; i++) {
        var days = expirations[i];
        shareHTML += '<option value="' + days + '"' + (parseInt(settings['expiry_days']) == days ? ' selected="selected"':'') + '>After ' + days + ' day' + (days !== 1 ? 's':'');
    }

    shareHTML += '</select>';

    shareHTML += addShareCheckbox('share_comments',settings['allow_comments'],'Allow leaving comments');
    shareHTML += addShareCheckbox('share_view_comments',settings['view_comments'],'Allow user to see all comments on the file');
    shareHTML += addShareCheckbox('share_hide_download',settings['hide_download'],'Hide download button');
    shareHTML += addShareCheckbox('share_force_download',settings['force_download'],'Force user to download');
    shareHTML += addShareCheckbox('share_access_revisions',settings['access_revisions'],'Make versions accessible');
    shareHTML += addShareCheckbox('share_version_relink', settings['relink_latest_version'], 'Automatically relink to the latest version of the file');
    shareHTML += addShareCheckbox('share_show_transcript', settings['show_transcript'], 'Show transcript / captions');

    shareHTML += '<p>View limit: <input id="share_view_limit" class="quick-share-option" type="number" min="0" value="' + parseInt(settings['view_limit']) + '" style="width:100px"/> (0 = unlimited)';

    shareHTML += '</div>';

    $('#share-dialog').html(shareHTML);

    // Add buttons
    var shareButtonHTML = '<a href="#" onclick="deleteShareLink(\'' + settings['id'] + '\')"><button>Delete link</button></a> <a href="share_modify?email=' + settings['id'] + '&id=' + settings['file_id'] + '"><button class="actionbtn" style="float:right">Email Link...</button></a>';

    $('#share-dialog-buttons').html(shareButtonHTML);

    validateOptions();

    document.querySelectorAll('.quick-share-option').forEach(obj => {
        obj.addEventListener('change', e => {
            validateOptions();
            saveUpdatedQuickShareSettings(currentQuickShareID);
        });
    });
}

function populateShareDialogWithFatalError(error_string)
{
    var shareHTML = '<div><h2>Quick Share</h2>';
    shareHTML += '<div class="error-alert">' + sanitize_string(error_string) + '</div>';
    $('#share-dialog').html(shareHTML);
    $('#share-dialog-buttons').html('');
}

function addShareCheckbox(element_id, value, text)
{
    return '<p><check-box id="' + element_id + '" class="quick-share-option"' + (parseInt(value) === 1 ? ' checked="checked"':'') + ' text="' + text + '"></check-box>';
}

function saveUpdatedQuickShareSettings(link_id)
{
    if (!link_id) {
        alert('Error: link ID not set.');
        return;
    }

    var params = {
        name: $('#share_name').val(),
        require_pass: (!!document.getElementById('share_require_pass').checked ? 1:0),
        password: $('#share_pass').val(),
        expiry_days: $('#share_expiry').val(),
        allow_comments: (!!document.getElementById('share_comments').checked ? 1:0),
        view_comments: (!!document.getElementById('share_view_comments').checked ? 1:0),
        hide_download: (!!document.getElementById('share_hide_download').checked ? 1:0),
        force_download: (!!document.getElementById('share_force_download').checked ? 1:0),
        access_revisions: (!!document.getElementById('share_access_revisions').checked ? 1:0),
        relink_latest_version: (!!document.getElementById('share_version_relink').checked ? 1:0),
        show_transcript: (!!document.getElementById('share_show_transcript').checked ? 1:0),
        view_limit: parseInt($('#share_view_limit').val()),
        project_id: getCurrentProjectID()
    };

    writeLocalStorage('share.require_pass',params['require_pass']);
    writeLocalStorage('share.allow_comments',params['allow_comments']);
    writeLocalStorage('share.view_all_comments',params['view_comments']);
    writeLocalStorage('share.hide_download',params['hide_download']);
    writeLocalStorage('share.force_download',params['force_download']);
    writeLocalStorage('share.access_revisions',params['access_revisions']);
    writeLocalStorage('share.relink_latest_version',params['relink_latest_version']);
    writeLocalStorage('share.show_transcript',params['show_transcript']);
    writeLocalStorage('share.view_limit',params['view_limit']);
    writeLocalStorage('share.expiry_days',params['expiry_days']);

    $.post("ajax/share.php?edit=" + link_id, params, function(json) {
        if (json['error']) {
            alert(sanitize_string(json['error']));
        }
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to edit link: " + errorString));
    });
}

function deleteShareLink(link_id)
{
    $.post("ajax/share.php?delete=" + link_id, {project_id: getCurrentProjectID()}, function(json) {
        if (json['error']) {
            alert(sanitize_string(json['error']));
        } else {
            currentQuickShareID = null;
            closePopup();
        }

    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to delete link: " + errorString));
    });
}

function validateOptions()
{
    if (!!document.getElementById('share_comments').getAttribute('checked')) {
        document.getElementById('share_view_comments').removeAttribute('disabled');
    } else {
        const viewCommentsCheck = document.getElementById('share_view_comments');
        viewCommentsCheck.setAttribute('disabled', 'disabled');
        viewCommentsCheck.removeAttribute('checked');
    }

    if (!!document.getElementById('share_hide_download').getAttribute('checked')) {
        const forceDownloadCheck = document.getElementById('share_force_download');
        forceDownloadCheck.setAttribute('disabled', 'disabled');
        forceDownloadCheck.removeAttribute('checked');

    } else {
        document.getElementById('share_force_download').removeAttribute('disabled');
    }

    if (!!document.getElementById('share_force_download').getAttribute('checked')) {
        const hideDownloadCheck = document.getElementById('share_hide_download');
        hideDownloadCheck.setAttribute('disabled', 'disabled');
        hideDownloadCheck.removeAttribute('checked');

    } else {
        document.getElementById('share_hide_download').removeAttribute('disabled');
    }

    if (!!document.getElementById('share_access_revisions').getAttribute('checked')) {
        document.getElementById('share_version_relink').removeAttribute('disabled');
    } else {
        const versionRelinkCheck = document.getElementById('share_version_relink');
        versionRelinkCheck.setAttribute('disabled', 'disabled');
        versionRelinkCheck.removeAttribute('checked');
    }
}
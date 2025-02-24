
function showFolderBrowser(selected_dept,selected_path,callback)
{
    showItemBrowser(false,true,true, false, selected_dept,selected_path,-1,null,null,callback);
}

function showFileAndFolderBrowser(selected_dept,selected_path,selected_file_id,callback)
{
    showItemBrowser(true,true,true, true, selected_dept,selected_path,selected_file_id,null,null,callback);
}

function showFileBrowser(selected_file_id,callback)
{
    showItemBrowser(true,false,false, false,-1,'/',selected_file_id,null,null,callback);
}

function showVideoBrowser(selected_file_id,callback)
{
    showItemBrowser(true,false,false, false,-1,'/',selected_file_id,'1',null,callback);
}

function showAudioBrowser(selected_file_id,callback)
{
    showItemBrowser(true,false,false, false,-1,'/',selected_file_id,'2',null,callback);
}

function showImageBrowser(selected_file_id,callback)
{
    showItemBrowser(true,false,false, false,-1,'/',selected_file_id,'3',null,callback);
}

function showFileExtensionBrowser(selected_file_id,extensions,callback)
{
    showItemBrowser(true,false,false, false,-1,'/',selected_file_id,null,extensions,callback);
}

function showItemBrowser(show_files, select_folders, select_depts, select_projects, selected_dept, selected_path, selected_file_id, allowed_types, allowed_extensions, callback)
{
    var currentProjectID = getJSConnectValue('project.id');

    let browser_title = 'File Browser';

    if (!show_files) {
        browser_title = 'Folder Browser';
    } else if (show_files && +allowed_types === 1) {
        browser_title = 'Video Browser';
    } else if (show_files && +allowed_types === 2) {
        browser_title = 'Audio Browser';
    } else if (show_files && +allowed_types === 3) {
        browser_title = 'Image Browser';
    }

    let html = `<dialog-box dialog-title="${browser_title}" show="show" width="500" height="400">
        <div slot="content">
        <file-browser id="file-browser" project-id="${currentProjectID}"`;
    if (select_projects) html += ' show-project-selector="true"';
    if (!show_files) html += ' hide-files="true"';
    if (!select_folders) html += ' can-select-folders="false"';
    if (!select_depts) html += ' can-select-depts="false"';
    if (allowed_types) html += ` file-types="${allowed_types}"`;
    if (allowed_extensions) html += ` file-exts="${allowed_extensions}"`;

    html += `>
        </file-browser>
        </div>`;

    html += `<div slot="buttons">
            <button id="file-browser-cancel">Cancel</button> <button id="file-browser-choose" class="actionbtn">Choose</button>
        </div>
    </dialog-box>`;

    document.body.insertAdjacentHTML('beforeend', html);

    $(document).on('click','#file-browser-cancel',function(e) {
        callback = null;
        document.querySelector('dialog-box').remove();
    });

    $('#file-browser-choose').on('click', function(e) {
        const browser = document.getElementById('file-browser');
        const selectedItem = browser.getSelectedItem();

        // Ignore if user didn't select anything
        if (!selectedItem) {
            callback = null;
            document.querySelector('dialog-box').remove();
            return;
        }

        const itemID = selectedItem.id;
        const itemTitle = selectedItem.title;
        const itemIconURL = selectedItem.thumbnail;
        const folderPath = selectedItem.path;
        const deptID = +selectedItem.department_id;
        const deptName = selectedItem.department_name;
        const projectID = selectedItem.project_id;

        document.querySelector('dialog-box').remove();

        if (callback) callback(itemID, itemTitle, itemIconURL, deptID, folderPath, deptName, projectID);
        callback = null;
    });

    $(document).on('change','#file-browser-project',function(e) {
        var projectID = $('#file-browser-project').val();
        params['project'] = projectID;

        $.get(relative_root + "ajax/file_browser.php",params, function(data) {
            var container = $('.file-browser-container');
            container.html(data);
        });
    });
}

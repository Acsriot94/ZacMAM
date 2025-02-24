var resetOnRender = false;

function setupFiles() {
    loadFiles();
}

function reloadTableColumns()
{
    if (fileView != 0) return;

    // Assumes table is currently empty
    $('#fileTable th').remove();

    var cols = currentFileColumns();

    var html = '<tr>';

    for (var i=0; i<cols.length; i++) {
        var col = cols[i];

        html += '<th class="draggable';
        if (!col.not_resizable) html += ' resizable';
        if (col.no_mobile) html += ' nomobile';

        html += '" data-col="' + col.name + '"';
        if (col.initial_size) html += ' style="width:' + col.initial_size + '"';

        var colTitle = col.title;

        html += '>' + (!col.title_hidden ? colTitle:'');

        if (!col.not_sortable) {
            html += '<span class="sort-icon sort-asc" id="' + col.name + '" style="opacity:0"></span>';
        }

        html += '</th>';
    }

    // Add context menu column
    html += '<th width="30px"></th>';
    html += '</tr>';

    $('#fileTable').html(html);
    setupTableResizing();
    initializeSorting();

    // Make footer the correct size
    $('#fileTable tfoot td').attr('colspan',cols.length+1);
}

function reloadAllFiles()
{
    resetOnRender = true;

    // Store old files temporarily
    var objs = files;

    // Wipe list
    files = [];
    fileStart = 0;

    // Restore uploads from old list
    for (var fileObj in objs) {
        if (typeof Upload !== 'undefined' && fileObj instanceof Upload) {
            files.push(fileObj);
        }
    }

    // Reload files again
    setupFiles();
}

function renderFiles(destObj,sourceArray,relativePath)
{
    purgeFiles();

    if (!destObj) destObj = $('#fileTable');
    if (!destObj.length) destObj = $('#filetablecontainer');
    if (!sourceArray) sourceArray = files;

    for (var fileID in sourceArray) {
        renderFile(sourceArray[fileID],destObj,false,true);
    }

    updateDatesForFiles();
    reloadTooltips();

    var fileTitles = document.querySelectorAll('.file-title');

    for (var title of fileTitles) {
        resizeTextToFit(title);
    }

    setupDraggableRows();
    setupTagEvents();
}

function renderFile(file, destObj, replace_existing, defer_drawing)
{
    if (resetOnRender) {
        $('.file-obj').remove();
        resetOnRender = false;
    }

    if (!destObj || !destObj.length) {
        destObj = (fileView == 0 ? $('#fileTable'):$('#filetablecontainer'));
    } else {
        // Cancel if editing
        if (fileObjectNameIsEditing(destObj)) return;
    }

    var isDept = false;
    var isUpload = (typeof Upload !== 'undefined' && file instanceof Upload);
    var isAlias = false;
    var type = 0;
    var fileTitle = file['title'];
    var itemID = -1;
    var isDeleted = (parseInt(getCookie('file_filter')) === 18);
    let tags = [];

    var fileHTML = '';
    var fileObj = null;

    if (isUpload) {
        file['selected'] = false;
        file['type_name'] = 'Upload';
        file['uploader_id'] = file.userID;
        file['uploader_name'] = file.userName;
        file['uploader_avatar'] = 'avatar?name='+encodeURIComponent(file.userName);

        var icon_path = '';
        var duration_string = '';
        var formatted_file_size = formatFileSize(parseInt(file['size']));
        var typeName = 'upload';
        var fileURL = '#';
        var thumbURL = '';
        var hoverThumb = null;
        var downloadURL = null;

    } else {
        if (!file['selected']) file['selected'] = false;
        if (!file['id'] && file['dept_id']) isDept = true;
        type = parseInt(file['type']);
        if (file['alias_to']) isAlias = true;
        itemID = (isDept ? file['dept_id']:file['id']);

        var icon_path = '';
        var duration_string = (file['duration'] ? file['duration'] : '');
        var formatted_file_size = formatFileSize(parseInt(file['size']));
        var typeName = (isDept ? 'dept' : 'file');
        var thumbURL = (isDept ? 'img/Dept_Folder.svg' : file['icon_path']);
        if (type == 4 && !thumbURL) thumbURL = 'img/Folder.svg';
        var hoverThumb = (file['hover_icon_path'] ? file['hover_icon_path'] : null);
        var downloadURL = null;

        if (isPanel) {
            if (file['download_url']) {
                downloadURL = file['download_url'];
            } else {
                downloadURL = null;
            }
        }

        var fileURL = 'player?id=' + itemID;
        if (file['link_id']) fileURL += '&link=' + file['link_id'];
        if (isPanel && !isDept) fileURL = '#';
        if (!isDept) tags = file.tags ?? [];

        if (typeof URLSearchParams !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('search')) {
                fileURL += '&search=' + encodeURIComponent(urlParams.get('search'));
            }

            if (urlParams.get('searchparams')) {
                fileURL += '&searchparams=' + encodeURIComponent(urlParams.get('searchparams'));
            }
        }

        if (isDept) {
            fileURL = 'files?dept=' + itemID + (projectID ? '&project='+projectID:'');
            if (file['link_id']) fileURL += '&link=' + file['link_id'];

//            fileURL = 'navigateToFolder(' + itemID + ',\'' + escapeSingleQuotes(encodeURIComponent(fileTitle)) + '\',\'/\',false,-1,\'\',false)';
        }

        switch (type) {
            case 1:
                typeName = 'video';
                break;
            case 2:
                typeName = 'audio';
                break;
            case 3:
                typeName = 'image';
                break;
            case 4:
                typeName = 'folder';
                fileURL = 'files?dept=' + file['dept'] + '&folder=' + encodeURIComponent(file['path'] + (file['path'].length > 1 ? '/' : '')) + encodeURIComponent(fileTitle) + (projectID ? '&project='+projectID:'');
                if (file['link_id']) fileURL += '&link=' + file['link_id'];

                var appName = '';
                if (file['app_name']) {
                    appName = file['app_name'];
                } else if (file['app_id'] > -1 && window.jsconnect['folder']['app_name']) {
                    appName = window.jsconnect['folder']['app_name'];
                }

//                fileURL = 'navigateToFolder(' + file['dept'] + ',\'' + (file['dept'] > -1 ? escapeSingleQuotes(file['dept_name']):'') + '\',\'' + escapeSingleQuotes(encodeURIComponent(file['path'] + (file['path'].length > 1 ? '/' : '') + fileTitle)) + '\',false,'+(file['app_id'] ? file['app_id']:-1)+',\''+appName+'\',false)';
                break;
            case 5:
                typeName = 'comment-stream';
                break;
            case 6:
                typeName = 'document';
                break;
            case 7:
                typeName = 'compressed';
                break;

            case -1: // Special
                formatted_file_size = '';

                if (file['app_id']) {
                    thumbURL = 'img/App_Folder.png';
                    fileURL = 'files?app=' + file['app_id'];
                    typeName = 'app';

//                    fileURL = 'navigateToFolder(-1,\'\',\'/\',true,'+file['app_id']+',\''+file['title']+'\',false)';
                }
                break;
        }
    }

    // Set color coding
    var color_classes = ['red','black','orange','green','blue','turquoise','pink','purple'];
    var color_id = parseInt(file['color']);
    var color_class = (color_id > 0 && color_id < 9 ? ' '+color_classes[color_id-1]:'');

    if (fileView == 0) {
        var header = '<tr '+(!isUpload ? (isDept ? 'id="dept'+itemID+'" ' : 'id="file'+itemID+'" '):'')+'class="file-obj'+(isUpload ? ' upload':'')+(file['selected'] ? ' selected':'')+color_class+'" data-type="' + typeName + '" '+(isUpload ? 'data-upload-index="'+file.index+'"':'data-id="' + itemID + '"' + (!isDept && type != 4 ? ' data-primary-id="'+file['primary_id']+'"':''))+'>';

        var data = {};

//        var thumbObj = '<td valign="middle" height="90"><a href="' + (isDept || type == 4 || type == -1 ? '#" onclick="if (confirmNavEvent(this)) ' + fileURL:fileURL) + '" class="file-url"><div id="thumb-' + itemID + '" class="file-thumb'+(type > 0 && type < 4 ? ' '+typeName:'')+'" style="background-image:url(\'' + thumbURL + '\');"> ' + (hoverThumb && !isIOS && !isTouchDevice ? '<img class="preload hoverthumb" src="' + hoverThumb + '"/>' : '') + (type == 1 && file['has_audio'] == 1 ? "<div class=\"has-audio\"></div>" : "") + (duration_string != "" ? '<div class="file-duration">' + duration_string + '</div>' : '') + (hoverThumb && !isIOS && !isTouchDevice ? '<div class="thumb-playhead"></div>' : '') + '</div></div></a>';
        var thumbObj = '<td valign="middle" height="90"><a href="' + fileURL + '" class="file-url"><thumbnail-image id="thumb-' + itemID + '" src="' + thumbURL + '"' + (hoverThumb && !isIOS && !isTouchDevice ? ' hover-src="' + hoverThumb + '"' : '') + (type == 1 ? ' file-type="video"' : '') + (type == 1 && file['has_audio'] ? ' has-audio="true"' : '') + (duration_string !== '' ? ' duration="' + duration_string + '"' : '') + '>' + '</thumbnail-image></div></a>';
        if (isUpload) thumbObj = '<td valign="middle" height="90"><div class="file-thumb video upload"><input type="text" value="0" class="knob" data-index="' + file.index + '" /></div>';

        data['thumb'] = thumbObj;

//        var titleObj = '<td style="position:relative;">' + (file['unviewed'] ? '<span class="file-unviewed" title="Unviewed"></span>' : '') + ' <a href="' + (isDept || type == 4  || type == -1 ? '#" onclick="if (confirmNavEvent(this)) ' + fileURL:fileURL) + '" name="file'+itemID+'" class="file-url"><span class="file-title" title="' + fileTitle + '">' + fileTitle + '</span> ' + (isAlias ? "<img class=\"file-alias\" src=\"img/Alias.svg\" title=\"Alias\">" : "") + (parseInt(file['has_comments']) == 1 ? '<img class="file-comments" src="img/File_Comments.svg" title="File has comments">' : '') + '</a>' + (file['revision_title'] ? '<div class="file-revision-name">' + file['revision_title'] + '</div>' : '');
        var titleObj = '<td style="position:relative;"><div class="file-info-container"><div class="file-title-wrapper"><a href="' + fileURL + '" name="file'+itemID+'" class="file-url">' + (file['unviewed'] ? '<span class="file-unviewed" title="Unviewed"></span>' : '') + '<span class="file-title" title="' + fileTitle + '">' + fileTitle + '</span> ' + (isAlias ? "<div class=\"file-alias\" title=\"Alias\"></div>" : "") + (file['has_comments'] ? '<img class="file-comments" src="img/File_Comments.svg" title="File has comments">' : '') + (file['has_transcript'] ? '<img class="file-transcript" src="img/File_Captions.svg" title="File has transcript">' : '') + (parseInt(file['pinned']) == 1 ? '<div class="file-pin" title="Pinned"></div>' : '') + '</a>' + (file['revision_title'] ? '<div class="file-revision-name">' + file['revision_title'] + '</div>' : '');
        if (isUpload) titleObj += '<div class="upload-status">Queued</div>';

        var revisionObj = (file['revision_count'] > 1 ? '<a href="files?rev=' + file['primary_id'] + '&dept=' + deptID + (projectID ? '&project='+projectID:'') + '"><span id="revShow_' + itemID + '" class="revision-title tooltip" title="' + file['revision_count'] + ' version' + (file['revision_count'] == 1 ? '' : 's') + '">' + file['revision_count'] + ' ></span></a></div>' : '</div>');

        if (!isUpload && !isDept && file['path'] !== undefined && (file['dept'] != window.jsconnect['folder']['dept_id'] || file['path'].toLowerCase() != window.jsconnect['folder']['path'].toLowerCase())) {
            var deptname = '';
            var pathname = '';

            if (file['dept'] == -1) {
                pathname = file['path'].substring(file['path'].lastIndexOf('/') + 1);
                if (pathname.length == 0) pathname = '(root)';

            } else {
                deptname = file['dept_name'];

                pathname = file['path'].substring(file['path'].lastIndexOf('/') + 1);
                if (pathname.length == 0) pathname = '';
            }

            revisionObj += '<div class="file-status">';

            if (typeof deptname !== 'undefined' && deptname.length > 0) {
                revisionObj += '<img class="file-path-icon small" src="img/Dept_Folder.svg" loading="lazy"/> '+deptname;
                if (pathname.length > 0) revisionObj += ' ... ';
            }

            if (pathname.length > 0) revisionObj += '<img class="file-path-icon small" src="img/Folder.svg" loading="lazy"/> '+pathname;

            revisionObj += '</div>';
        } else {
            revisionObj += (file['status_string'] ? '<div class="file-status">' + file['status_string'] + '</div>' : '');
        }

        let tagObj = '';
        if (tags.length > 0) {
            tagObj = `<div class="file-tags tag-view small">`;

            let maxTags = tags.length;
            if (maxTags >= 6) maxTags = 5;

            for (let i = 0; i < maxTags; i++) {
                tagObj += `<a href="${tagURLForValue(tags[i])}">
                            <div class="tag">${tags[i]}</div></a>`;
            }

            if (tags.length >= 6) {
                tagObj += `<div class="tag small tag-more" data-file-id="${itemID}">...</div>`;
            }

            tagObj += `</div>`;
        }

        var controlObj = '<div class="file-controls nomobile" data-type="' + typeName + '" data-id="'+itemID+'">' + (file['can_download'] ? '<a href="#" class="file-download-btn tooltip" title="Download"><div class="fa-icon fa-icon-download-cloud"></div></a>' : '') +
            (file['can_share'] ? '<a href="#" onclick="shareFileID(' + itemID + ',$(this))" title="Share" class="tooltip"><div class="fa-icon fa-icon-link"></div></a>' : '') +
            (!isLink && !isDept && type != 4 && type > -1 ? '<div style="width:26px;height:26px" title="' + (file['is_favorite'] ? 'Unfavorite' : 'Favorite') + '" class="tooltip favoritebtn' + (file['is_favorite'] ? ' favorite' : '') + '"></div>' : '') +
            '</div>';
        if (isUpload) controlObj = '<div class="file-controls"><a href="javascript:cancelUpload('+file.index+')">Cancel</a></div>';
        if (isDeleted) controlObj = '<div class="file-controls"><a href="javascript:restoreItems(['+itemID+'])">Restore</a></div>';

        data['name'] = titleObj + revisionObj + tagObj + controlObj + '</div>';

        data['type'] = '<td align="left" class="nomobile small">' + file['type_name'];
        var workflowObj = '<td align="left" class="nomobile">';

        if (!isUpload && !isDeleted && !isLink && type !== 4 && type > -1 && projectID > -1) { // Not a folder
            var workflowID = parseInt(file['workflow']);

            if (!file['can_edit']) {
                if (workflowID > -1) {
                    for (var j = 0; j < workflows.length; j++) {
                        var workflow = workflows[j];

                        if (workflow['id'] == workflowID) {
                            workflowObj += workflow['name'];
                            break;
                        }
                    }
                }

            } else {
                workflowObj += '<select data-id="' + itemID + '" class="file-workflow noborder">';

                for (var j=0; j<workflows.length; j++) {
                    var workflow = workflows[j];
                    workflowObj += '<option value="' + workflow['id'] + '"' + (workflowID == workflow['id'] ? ' selected="on"' : '') + '>'+workflow['name'];
                }

                workflowObj += '</select>';
            }
        }

        if (window.jsconnect['project']['id'] == -1) workflowObj = '';

        data['workflow'] = workflowObj;

        data['date'] = (isLink ? '<td>' : '<td align="left" class="nomobile small"><span class="file-date"></span>');
        data['uploader'] = (isDept || isLink || !file['uploader_id'] ? '<td>' : '<td align="left" class="nomobile"><a href="profile?view=' + file['uploader_id'] + '"><img class="avatar tooltip" src="' + file['uploader_avatar'] + '" title="' + file['uploader_name'] + '" loading="lazy" /></a>');
        data['size'] = '<td align="left" class="nomobile small">' + formatted_file_size + '';

        var dropdown = '<td><div class="file_dropdown" onclick="showFileDropdown(\''+itemID+'\')" data-id="'+itemID+'"></div>';
        if (isLink || isDept || isUpload || isDeleted || type === -1) dropdown = '<td>';

        data['description'] = '<td class="small">' + (file['description'] ? file['description']:'');
        data['views'] = '<td align="left" class="small"><span class="file-view-count">' + (file['views'] ? file['views']:0) + '</span>';
        data['downloads'] = '<td align="left" class="small"><span class="file-download-count">' + (file['downloads'] ? file['downloads']:0) + '</span>';
        data['comments'] = '<td align="left" class="small">' + (file['comments'] ? file['comments']:0);
        data['duration'] = '<td align="left" class="small">' + (file['duration_timecode'] ? file['duration_timecode'] : '00:00:00:00');
        data['last_comment'] = '<td align="left" class="small">' + (file['last_comment'] > 0 ? moment(new Date(file['last_comment'] * 1000)).fromNow() : '');

        var columns = currentFileColumnTitles();

        fileHTML = header;

        columns.forEach(function(col) {
            if (data[col]) fileHTML += data[col];
        });

        fileHTML += dropdown;

    } else { // Thumb view

        var header = '<div '+(!isUpload ? (isDept ? 'id="dept'+itemID+'" ' : 'id="file'+itemID+'" '):'')+'class="file-obj thumb'+(fileView == 2 ? ' info':'')+(isUpload ? ' upload':'')+(isDept || type == 4 ? ' folder':'')+(file['selected'] ? ' selected':'')+color_class+'" data-type="' + typeName + '" '+(isPanel && downloadURL ? ' data-download-url="'+downloadURL+'" data-download-filename="'+file['download_filename']+'" ':' ')+(isUpload ? 'data-upload-index="'+file.index+'"':'data-id="' + itemID +'"') + (!isDept && type != 4 ? ' data-primary-id="'+file['primary_id']+'"':'') + '>';

//        var thumbObj = (fileURL != '#' ?  '<a href="' + (isDept || type == 4 || type == -1 ? '#" onclick="if (confirmNavEvent(this)) ' + fileURL:fileURL) + '" class="file-url">':'')+'<div id="thumb-' + itemID + '" class="file-thumb'+(type > 0 && type < 4 ? ' '+typeName:'')+'" style="background-image:url(\'' + thumbURL + '\');' + (file['file_type_id'] == 1 ? "background-color:#000;" : "") + '"> ' + (hoverThumb && !isIOS && !isTouchDevice ? '<img class="preload hoverthumb" src="' + hoverThumb + '"/>' : '') + (type == 1 && file['has_audio'] == 1 ? "<div class=\"has-audio\"></div>" : "") + (duration_string != "" ? '<div class="file-duration">' + duration_string + '</div>' : '') + (hoverThumb && !isIOS && !isTouchDevice ? '<div class="thumb-playhead"></div>' : '') + '</div>'+(fileURL != '#' ?  '</a>':'');
        var thumbObj = (fileURL != '#' ?  '<a href="' + fileURL + '" class="file-url">':'')+'<thumbnail-image size="' + (isPanel ? 'small' : 'large') + '" id="thumb-' + itemID + '" src="' + thumbURL + '"' + (hoverThumb && !isIOS && !isTouchDevice ? ' hover-src="' + hoverThumb + '"' : '') + (type == 1 ? ' file-type="video"' : '') + (type == 1 ? ' file-type="video"' : '') + (type == 1 && file['has_audio'] ? ' has-audio="true"' : '') + (duration_string !== '' ? ' duration="' + duration_string + '"' : '') + '>' + '</thumbnail-image>'+(fileURL != '#' ?  '</a>':'');
        if (isUpload) thumbObj = '<div class="file-thumb video upload"><input type="text" value="0" class="knob" data-index="' + file.index + '" /></div>';

//        var titleObj = (file['unviewed'] ? '<span class="file-unviewed" title="Unviewed"></span>' : '') + (fileURL != '#' ?  '<a href="' + (isDept || type == 4 || type == -1 ? '#" onclick="if (confirmNavEvent(this)) ' + fileURL:fileURL) + '" class="file-url">':'')+'<span class="file-title" title="' + fileTitle + '" name="file'+itemID+'">' + fileTitle + '</span> ' + (isAlias ? "<img class=\"file-alias\" src=\"img/Alias.svg\" title=\"Alias\">" : "") + (parseInt(file['has_comments']) == 1 ? '<img class="file-comments" src="img/File_Comments.svg" title="File has comments">' : '') + (fileURL != '#' ?  '</a>':'')+'<div class="file-edit-title"></div>' + (file['revision_title'] ? '<br>' + file['revision_title'] : '');
        var titleObj = '<div class="file-info-container"><div class="file-title-wrapper">' + (fileURL != '#' ?  '<a href="' + fileURL + '" class="file-url">':'<div class="file-url">') + (file['unviewed'] ? '<span class="file-unviewed" title="Unviewed"></span>' : '') + '<span class="file-title" title="' + fileTitle + '" name="file'+itemID+'">' + fileTitle + '</span> ' + (isAlias ? "<div class=\"file-alias\" title=\"Alias\"></div>" : "") + (file['has_comments'] ? '<img class="file-comments" src="img/File_Comments.svg" title="File has comments">' : '')  + (file['has_transcript'] ? '<img class="file-transcript" src="img/File_Captions.svg" title="File has transcript">' : '') + (parseInt(file['pinned']) == 1 ? '<div class="file-pin" title="Pinned"></div>' : '') + (fileURL != '#' ?  '</a>':'</div>')+'<div class="file-edit-title"></div></div>';// + (file['revision_title'] ? '<br>' + file['revision_title'] : '');
        if (isUpload) titleObj += '<div class="upload-status">Queued</div>';

        if (fileView == 2) titleObj = '<div class="info-title">'+titleObj;

        var revisionObj = (file['revision_count'] > 1 ? '<a href="files?rev=' + file['primary_id'] + '&dept=' + deptID  + (projectID ? '&project='+projectID:'') + '"><span id="revShow_' + itemID + '" class="revision-title small tooltip" title="' + file['revision_count'] + ' version' + (file['revision_count'] == 1 ? '' : 's') + '">' + file['revision_count'] + ' ></span></a>' : '');
        revisionObj += '</div>';
        if (!isUpload && !file['revision_version'] && file['status_string']) revisionObj += '<div class="file-status">'+(file['status_string'] ? file['status_string']:'')+'</div>';

        var controlObj = '<div class="file-controls nomobile" data-type="' + typeName + '" data-id="'+itemID+'">' + (isDept ? '&nbsp;':'') + (file['can_download'] ? '<a href="#" class="file-download-btn tooltip" title="Download"><div class="fa-icon fa-icon-download-cloud"></div></a>' : '') +
            (!isLink && !isDept && type != 4 && type > -1 ? '<div style="width:26px;height:26px" title="' + (file['is_favorite'] ? 'Unfavorite' : 'Favorite') + '" class="tooltip favoritebtn' + (file['is_favorite'] ? ' favorite' : '') + '"></div>' : '') +
            (file['can_share'] ? '<a href="#" onclick="shareFileID(' + itemID + ',$(this))" title="Share" class="tooltip"><div class="fa-icon fa-icon-link"></div></a>' : '');

        if (isUpload) controlObj = '<div class="file-controls"><a href="javascript:cancelUpload('+file.index+')">Cancel</a></div>';
        if (isDeleted) controlObj = '<div class="file-controls"><a href="javascript:restoreItems(['+itemID+'])">Restore</a></div>';
        if (isPanel) controlObj = '';

        let tagObj = '';
        if (tags.length > 0) {
            tagObj = `<div class="file-tags tag-view small ` + (!isPanel ?  'centered' : '' ) + `">`;

            let maxTags = tags.length;
            if (maxTags >= 6) maxTags = 5;
            if (isPanel && maxTags > 3) maxTags = 3;

            for (let i = 0; i < maxTags; i++) {
                tagObj += `<a href="${tagURLForValue(tags[i])}">
                            <div class="tag">${tags[i]}</div></a>`;
            }

            if (tags.length > maxTags) {
                tagObj += `<div class="tag small tag-more" data-file-id="${itemID}">...</div>`;
            }

            tagObj += `</div>`;
        }

        if (fileView == 2 && type != 4 && !isDept) {
            var infoControls = '<div class="info-controls"><div class="info-control"><a onclick="panelImportFileID(\''+itemID+'\')" title="'+(isPanel ? 'Import into Project':'Download')+'" class="tooltip"><div class="fa-icon fa-icon-download-cloud"></div></a></div>';
            if (file['has_comments']) infoControls += '<div class="info-control"><a onclick="panelSendMarkers(\''+itemID+'\');" title="Import Markers" class="tooltip"><img width="16" src="img/Import_Marker.svg" loading="lazy"/></div></div>';
            controlObj = infoControls + controlObj;
        }

        var dateObj = '<td align="left" class="nomobile"><span class="file-date"></span>';
        var uploaderObj = (isDept || !file['uploader_id'] ? '<td>' : '<td align="left" class="nomobile"><a href="profile?view=' + file['uploader_id'] + '">' + file['uploader_name'] + '</a>');
        var sizeObj = '<td align="left" class="nomobile">' + formatted_file_size + '';

        var dropdown = '<div class="file_dropdown" onclick="showFileDropdown(\''+itemID+'\')"></div>';

        if (isPanel) {
            dropdown = '';
        }

        if (isLink || isDept || isUpload || isDeleted || (isPanel && type === 4) || type === -1) dropdown = '';

        fileHTML = header + thumbObj + titleObj + revisionObj + tagObj + controlObj + dropdown + (fileView == 2 ? '</div>':'') + '</div></div>';
    }

    fileObj = $(fileHTML);

    if (destObj.hasClass('file-obj')) {
        if (replace_existing) {
            if (destObj.hasClass('selected')) {
                file['selected'] = true;
                fileObj.addClass('selected');
            }

            destObj.replaceWith(fileObj);
        } else {
            fileObj.insertAfter(destObj);
        }

    } else {
        destObj.append(fileObj);
    }

    if (isUpload) {
        fileObj.find('.knob').knob({
            readOnly: true,
            width: (fileView == 0 ? 50:100),
            height: (fileView == 0 ? 50:100),
            'format': function (v) {
                return (v + '%')
            },
            'draw': function () {
                this.i.css('box-shadow', 'none');
                this.c.imageSmoothingEnabled = true;
                this.c.width = this.width * window.devicePixelRatio;
                this.c.height = this.height * window.devicePixelRatio;
                this.i.css({fontHeight:(fileView == 0 ? '10px':'20px'),marginTop:(fileView == 0 ? '14px':'34px')});

                var uploadIndex = this.i.data('index');
                var upload = null;

                for (var i = 0; i < uploads.length; i++) {
                    if (uploads[i].index === uploadIndex) {
                        upload = uploads[i];
                        break;
                    }
                }

                if (upload) upload.knob = this;
            }
        });
    }

    if (!defer_drawing) {
        if (!isUpload) updateDateForFile(file, fileObj);
        reloadTooltipsForFileObject(fileObj);

        var objTitle = fileObj.find('.file-title')[0];
        resizeTextToFit(objTitle);
    }

    setupTagEvents(fileObj);

    return fileObj;
}

function showDropdownForFileID(file_id, xPos, yPos) {
    const obj = generateDropdownForFileID(file_id);

    if (obj !== null) {
        showMenuAtPosition(obj, xPos, yPos);
    }
}

function generateDropdownForFileID(file_id) {
    const file = fileWithID(file_id);
    if (!file) return null;

    const type = +file['type'];
    const isDept = (!file['id'] && file['dept_id']);
    const isUpload = (typeof Upload !== 'undefined' && file instanceof Upload);

    let isAlias = false;
    if (file['alias_to']) isAlias = true;

    const isLink = (typeof window.jsconnect["link"] !== "undefined");

    if (isLink || isDept || isUpload || (isPanel && type === 4) || type === -1) return null;

    let dropdown = '<ul class="file_dropdown_menu menu" data-id="' + file['id'] + '" style="display:none;">';
    dropdown += '<li><a href="#" onclick="openFileInNewTab()">Open in New Tab</a>';

    if (file['revision_count'] > 1 && file['can_edit']) dropdown += '<li><a href="#" onclick="makeIndependent(null,true)">Separate All Versions</a></li>';

    if ((file['app_id'] || type === -1) && type !== 4) {
        dropdown += '<li><a href="#" onclick="editMetadata()">Edit Metadata</a>';
        if (!isAlias) dropdown += '<li><a href="Javascript:showAliasDialog()">Create Alias</a>';

    } else if (type !== 4 && type !== 5 && !isAlias /*&& $can_upload*/) {
        dropdown += '<li><a href="upload?upload&rev=' + file['id'] + '">Upload Version</a><li><a href="upload?upload&replace=' + file['id'] + '">Upload Replacement</a>';
    }

    if (type !== 4 && type > -1) {
        dropdown += '<li><a href="#" onclick="editMetadata()">Edit Metadata</a><li><a href="relationship?id=' + file['id'] + '">Relationship Editor</a>';
        if (!isAlias) dropdown += '<li><a href="Javascript:showAliasDialog()">Create Alias</a>';
    }

    if (file['can_edit']) dropdown += '<li><a href="#">Color</a><ul><li><a href="#" class="dropdown-color" data-color-id="0"><img src="img/Swatch_Blank.png" loading="lazy"/></a><li><a href="#" class="dropdown-color" data-color-id="1"><img src="img/Swatch_Red.png" loading="lazy"/></a><li><a href="#" class="dropdown-color" data-color-id="2"><img src="img/Swatch_Black.png" loading="lazy"/></a><li><a href="#" class="dropdown-color" data-color-id="3"><img src="img/Swatch_Orange.png" loading="lazy"/></a><li><a href="#" class="dropdown-color" data-color-id="4"><img src="img/Swatch_Green.png" loading="lazy"/></a><li><a href="#" class="dropdown-color" data-color-id="5"><img src="img/Swatch_Blue.png" loading="lazy"/></a><li><a href="#" class="dropdown-color" data-color-id="6"><img src="img/Swatch_Turquoise.png" loading="lazy"/></a><li><a href="#" class="dropdown-color" data-color-id="7"><img src="img/Swatch_Pink.png" loading="lazy"/></a><li><a href="#" class="dropdown-color" data-color-id="8"><img src="img/Swatch_Purple.png" loading="lazy"/></a></ul>';
    if (file['can_edit']) dropdown += `<li><a href="#" onclick="showEditFileTagsDialogForSelection('finishEditingTagsForSelection()')">Edit Tags..</a>`;

    if (!isRev) dropdown += '<li><a href="Javascript:togglePin();">' + (+file['pinned'] === 1 ? 'Unpin' : 'Pin') + '</a>';
    if (type !== 4 && type > -1) dropdown += '<li><a href="Javascript:markAsUnviewed(' + (file['unviewed'] ? 0 : 1) + ');">' + (file['unviewed'] ? 'Mark as Viewed' : 'Mark as Unviewed') + '</a>';

    dropdown += '<li><a href="#" onclick="renameFile(' + file['id'] + ')">Rename</a>';
    if (!isRev) dropdown += '<li><a href="Javascript:moveItems();">Move...</a>';

    if (+file['revision_version'] !== 1) {
        dropdown += '<li><a href="Javascript:deleteItems();">Delete...</a>';
        //TODO: Delete Earlier Revisions option
    }

    if (type !== 4) {
        dropdown += '<li><hr/>';
        dropdown += '<li><a href="#">Import</a><ul><li><a href="import?id=' + file_id + '&dest=' + encodeURIComponent(document.location.toString()) + '">Comments...</a><li><a href="import_metadata?id=' + file_id + '&dest=' + encodeURIComponent(document.location.toString()) + '">Metadata...</a><li><a href="import_captions?id=' + file_id + '&dest=' + encodeURIComponent(document.location.toString()) + '">Captions...</a>';
        dropdown += '</ul>';
        dropdown += '<li><a href="#">Export</a><ul><li><a href="#" onclick="showCommentExportDialog()">Comments...</a><li><a href="#" onclick="showCaptionExportDialog()">Captions...</a>';
        dropdown += '</ul>';
    }

    // Remove existing objects
    const objs = document.getElementsByClassName('file_dropdown_menu');

    for (const obj of objs) {
        obj.remove();
    }

    const element = $(dropdown);
    $('body').append(element);

    return element;
}

function purgeFiles()
{
    //TEMP: Disabled for now
    return;
    
    var max_files = 150;

    if (files.length > max_files) {
        // TODO: Account for uploads

        $(".file-obj").slice(0, files.length - max_files).remove();

        files.splice(0, files.length - max_files);

        // Add subset alert
        if (!$('#subset-alert').length) {
            // Strip show parameter from URL
            var newURL = window.location.href.replace(/show=+\d+/g,"");
            if (newURL.length > 1 && (newURL.substr(-1) === "?" || newURL.substr(-1) === "&")) newURL = newURL.substr(0,newURL.length-1);

            $("#filetablecontainer").prepend(
                $("<div class=\"info-alert\" id=\"subset-alert\">You are viewing a subset of the available files in this folder. <a href=\""+newURL+"\">View All</a></div>")
            );
        }
    }
}

function reloadTooltipsForFileObject(fileObj)
{
    if (!isTouchDevice) fileObj.find('.tooltip').tipsy({target: 'hover', gravity: $.fn.tipsy.autoNS});
}

function drawSelectionStatus(_fileID) {
    var file = fileWithID(_fileID);
    var obj = pageObjectForFileID(_fileID);

    drawSelectionStatusForObject(file,obj);
}

function drawSelectionStatusForObject(file,pageObj) {
    if (!file || !pageObj.length) return;

    if (file['selected'] == true) {
        pageObj.addClass('selected');
    } else {
        pageObj.removeClass('selected');
    }
}

function toggleFileSelection(fileID) {
    var file = fileWithID(fileID);
    if (!file) return;

    file['selected'] = !file['selected'];
    drawSelectionStatus(fileID);
    if (!isIOS && !isTouchDevice) setupDraggableRows(selectedFiles(),-1);

    selectionChanged();
}

function fileWithID(_fileID,array)
{
    if (!array) array = files;
    _fileID = parseInt(_fileID)

    for (var fileIndex in array) {
        var file = array[fileIndex];
        if (parseInt(file['id']) === _fileID) return file;
    }

    return null;
}

function indexForFileID(_fileID)
{
    _fileID = +_fileID

    for (var fileIndex in files) {
        var file = files[fileIndex];
        if (+file['id'] === _fileID) return fileIndex;
    }

    return -1;
}

function batchFileSelect(selected)
{
    for (var fileIndex in files) {
        var file = files[fileIndex];
        file['selected'] = selected;
        drawSelectionStatus(file['id']);
    }

    if (!isIOS && !isTouchDevice) setupDraggableRows((selected ? files:[]),-1);

    selectionChanged();

    // Close preview when files are deselected
    if (!selected && $('#file-preview').length) endPreview();
}

function selectedFiles() {
    var outArray = [];

    for (var fileIndex in files) {
        var file = files[fileIndex];
        if (file['selected']) outArray.push(file);
    }

    return outArray;
}

function selectedFileIndexes() {
    var outArray = [];

    for (var fileIndex in files) {
        if (files[fileIndex]['selected']) outArray.push(fileIndex);
    }

    return outArray;
}

function selectedFileIDs() {
    var outArray = [];

    for (var fileIndex in files) {
        var file = files[fileIndex];
        if (file['selected']) outArray.push(+file['id']);
    }

    return outArray;
}

function selectedItemIDsByType(types,exclusions)
{
    if (!types) types = [];
    if (!exclusions) exclusions = [];

    var outArray = [];

    for (var fileIndex in files) {
        var file = files[fileIndex];
        if (file['selected'] && (types.length === 0 || types.indexOf(file['type_name']) > -1) && exclusions.indexOf(file['type_name']) === -1) outArray.push(+file['id']);
    }

    return outArray;
}

function appendFileRangeSelection(currentIndex)
{
    if (currentIndex === undefined) return;

    // Detect if current selection is above selection start
    var selectedIndexes = selectedFileIndexes();

    if (selectedIndexes.length == 0) {
        toggleFileSelection(files[currentIndex]['id']);
    } else if (currentIndex < selectedIndexes[0]) {
        for (var i = currentIndex; i < selectedIndexes[0]; i++) {
            var file = files[i];
            if (typeof file === "undefined" || file === null) continue;
            file['selected'] = true;
            drawSelectionStatus(file['id']);
        }
    } else if (currentIndex > selectedIndexes[selectedIndexes.length - 1]) {
        for (var i = selectedIndexes[selectedIndexes.length - 1]; i <= currentIndex; i++) {
            var file = files[i];
            if (typeof file === "undefined" || file === null) continue;
            file['selected'] = true;
            drawSelectionStatus(file['id']);
        }
    } else if (currentIndex < selectedIndexes[selectedIndexes.length - 1] && currentIndex > selectedIndexes[0]) {
        for (var i = currentIndex + 1; i <= selectedIndexes[selectedIndexes.length - 1]; i++) {
            var file = files[i];
            if (typeof file === "undefined" || file === null) continue;
            file['selected'] = false;
            drawSelectionStatus(file['id']);
        }
    }

    selectionChanged();
}

function appendFileRowSelection(currentIndex)
{
    if (currentIndex === undefined) return;

    // Detect if current selection is above selection start
    var selectedIndexes = selectedFileIndexes();

    // Figure out the column span
    var col_count = Math.floor($('#filetablecontainer').width() / $('.file-obj').width());

    if (selectedIndexes.length === 0) {
        toggleFileSelection(files[currentIndex]['id']);
    } else if (currentIndex < selectedIndexes[0]) {

        var firstObj = pageObjectForFileID(files[selectedIndexes[0]]['id']);
        var startTop = firstObj.position().top;
        var startLeft = firstObj.position().left;
        var startCol = Math.floor(startLeft / firstObj.width());
        var selectedCols = 1;

        for (var i = 1; i < selectedIndexes.length; i++) {
            var newTop = pageObjectForFileID(files[selectedIndexes[i]]['id']).position().top;
            if (newTop == startTop) {
                selectedCols++
            } else {
                break;
            }
        }

        // Now select the upper row
        if (selectedIndexes[0] > col_count) {
            var startIndex = selectedIndexes[0] - col_count;

            for (var i = startIndex; i < selectedCols; i++) {
                var file = files[i];
                file['selected'] = true;
                drawSelectionStatus(file['id']);
            }
        }
    }

    selectionChanged();
}

function pageObjectForFileID(file_id)
{
    var obj = $('#file'+file_id);
    if (!obj.length) obj = $((fileView == 0 ? '#fileTable':'#filetablecontainer')+' .file-obj[data-id='+file_id+']');

    return obj;
}

function pageObjectForElement(obj)
{
    if ($(obj).hasClass('.file-obj')) {
        return $(obj);
    } else {
        return $(obj).closest('.file-obj');
    }
}

function fileIDForElement(obj)
{
    var pageObj= pageObjectForElement(obj);
    if (!pageObj) return -1;

    return parseInt(pageObj.data('id'));
}

function fileObjectForElement(obj)
{
    var _fileID = fileIDForElement(obj);
    return fileWithID(_fileID);
}

function showFileProgress(file_id)
{
    var obj = pageObjectForFileID(file_id);
    obj.find('.file-spinner').remove(); // Remove existing
    obj.find('.file-thumb').prepend($('<div class="file-spinner"></div>'));
}

function hideFileProgress(file_id)
{
    var obj = pageObjectForFileID(file_id);
    obj.find('.file-spinner').remove();
}

function removeRevisionDuplicates(obj)
{
    var file_id = parseInt(obj['id']);
    if (file_id < 1) return;

    var primary_id = parseInt(obj['primary_id']);
    if (primary_id === file_id || primary_id === -1 || file_id === -1) return; // Not a revision stack

    var remove_ids = [];

    // Get files with same primary ID going in reverse
    for (var i=0; i<files.length; i++) {
        var file = files[i];

        if (parseInt(file['primary_id']) === primary_id && parseInt(file['id']) !== file_id) { // It's a duplicate
            remove_ids.push(file['id']);
            break; // Only remove one
        }
    }

    if (remove_ids.length > 0 && files.length > 1) {
        for (var i=0; i<remove_ids.length; i++) {
            removeFileWithID(remove_ids[i]);
        }
    }
}

function removeFileWithID(_file_id)
{
    var file = fileWithID(_file_id);
    if (!file) return;

    unsubscribeFromThumbUpdates(_file_id);

    var index = files.indexOf(file);
    if (index === -1) return;
    files.splice(index,1);

    var pageObj = pageObjectForFileID(_file_id);
    if (pageObj.length) pageObj.remove();
}

function scrollToFileID(_file_id)
{
    var obj = pageObjectForFileID(_file_id);
    if (!obj || typeof obj === 'undefined') return;

    if (isFileObjectOnScreen(obj,0.1)) return; // Don't scroll if unnecessary

    var body = $('html,body');

    var yPos = obj.offset().top - body.offset().top - 50;

    body.animate({
        scrollTop: yPos
    }, 300);
}

function isFileObjectOnScreen(obj,margin_percent)
{
    if (!obj || typeof obj === 'undefined') return false;

    var docTop = $(window).scrollTop();
    docTop += docTop*margin_percent;
    var docBottom = docTop + $(window).height();
    docBottom -= docBottom*margin_percent;

    var elemTop = obj.offset().top;
    var elemBottom = elemTop + obj.height();

    return ((elemBottom <= docBottom) && (elemTop >= docTop));
}

function convertUploadToFile(upload)
{
    if (upload.fileID < 1) return null;

    var type = 0;
    var typeName = 'File';

    var mimeType = upload.file.type;
    var fileExt = upload.file.name.split('.').pop().toLowerCase();

    if ((mimeType.length > 6 && mimeType.substr(0,6) === 'video/') || ['mp4','mov','avi','flv','mxf','m2ts','ts','flv','f4v','mkv','webm'].indexOf(fileExt) > -1) {
        type = 1;
        typeName = 'Video';
    } else if ((mimeType.length > 6 && mimeType.substr(0,6) === 'audio/') || ['wav','aif','aiff','mp3','m4a','wma','flac','opus'].indexOf(fileExt) > -1) {
        type = 2;
        typeName = 'Audio';
    } else if ((mimeType.length > 6 && mimeType.substr(0,6) === 'image/') || ['jpg','jpeg','png','gif','tif','tiff','bmp','dpx'].indexOf(fileExt) > -1) {
        type = 3;
        typeName = 'Image';
    }

    var iconPath = (upload.thumbURL != null ? upload.thumbURL:'img/'+iconForFileType(mimeType, fileExt));

    return {
        id:upload.fileID,
        primary_id:upload.fileID,
        title:upload.title.substring(0, upload.title.lastIndexOf('.')),
        size:upload.size,
        can_download:true,
        can_edit:true,
        can_share:true,
        color:-1,
        date:(Date.now() / 1000),
        has_comments:0,
        icon_path:iconPath,
        selected:false,
        type:type,
        type_name:typeName,
        unviewed:true,
        uploader_id:upload.userID,
        uploader_name:upload.userName,
        uploader_avatar:'avatar?name='+encodeURIComponent(upload.userName),
        workflow:-1
    };
}

function createNewFolderObject(id, title)
{
    // Figure out insert index
    var insertIndex = 0;
    var selectedIndexes = selectedFileIndexes();
    var adjacentFileObject = null;

    if (selectedIndexes.length > 0) {
        insertIndex = selectedIndexes[0];

        if (selectedFileIDs().length > 0) {
            var selectedID = selectedFileIDs()[0];

            adjacentFileObject = pageObjectForFileID(selectedID);
        }
    } else {
        for (var i = 0; i < files.length; i++) {
            if (files[i]["type_name"] == "Department") continue;

            insertIndex = i;
            adjacentFileObject = pageObjectForFileID(files[i]['id']);
            break;
        }
    }

    var newFolder = {id:id,
                     title:title,
                     type:4,
                     type_name:"Folder",
                     unviewed:false,
                     size:0,
                     path:window.jsconnect['folder']['path'],
                     dept:window.jsconnect['folder']['dept_id'],
                     dept_name:window.jsconnect['folder']['dept_name'],
                     date:(Date.now() / 1000)
    };

    files.splice(insertIndex, 0,newFolder);
    renderFile(newFolder,adjacentFileObject);
}

function createNewAliasObject(id, parent_id)
{
    // Figure out insert index
    var insertIndex = -1;
    var firstFileIndex = -1;

    for (var i=0; i<files.length; i++) {
        if (files[i]["type_name"] == "Department") continue;

        if (firstFileIndex === -1) firstFileIndex = i;

        if (parseInt(files[i]["id"]) === parseInt(parent_id)) { // Insert after parent
            insertIndex = i+1;
            break;
        }
    }

    if (insertIndex < 0) insertIndex = firstFileIndex;
    if (insertIndex < 0) insertIndex = 0;

    var parentFile = fileWithID(parent_id);
    var parentObj = pageObjectForFileID(parent_id);

    var newAlias = {id:id,
        title:parentFile["title"]+" Alias",
        alias_to:parent_id,
        type:parseInt(parentFile["type"]),
        type_name:parentFile["type_name"],
        icon_path:parentFile["icon_path"],
        unviewed:true,
        size:0,
        date:(Date.now() / 1000)
    };

    files.splice(insertIndex, 0,newAlias);
    renderFile(newAlias,parentObj);
}

function updateDatesForFiles()
{
    for (var fileIndex in files) {
        // Get existing object
        var file = files[fileIndex];

        if (typeof Upload !== 'undefined' && file instanceof Upload) continue; // Ignore uploads

        updateDateForFile(file);
    }
}

function updateDateForFile(file,fileObj)
{
    if (!fileObj) {
        if (file['id']) {
            fileObj = pageObjectForFileID(file['id']);
        } else if (file['dept_id']) {
            fileObj = $('#dept' + file['dept_id']);
            if (!fileObj.length) fileObj = $((fileView == 0 ? '#fileTable':'#filetablecontainer')+' .file-obj[data-id=' + file['dept_id'] + '][data-type=dept]');
        }
    }

    if (fileObj.length) {
        var dateObj = fileObj[0].querySelector('.file-date');

        if (dateObj) {
            var dateInt = +file['date'];
            var date_string = '';

            if (dateInt > 0) {
                var dateType = (window.localStorage ? +window.localStorage.getItem('file_date_type'):0);

                if (dateType === 1) { // Absolute
                    const m = moment(new Date(dateInt * 1000));
                    m.local();
                    date_string = m.format('YYYY-MM-DD HH:mm:ss');
                } else {
                    date_string = moment(new Date(dateInt * 1000)).fromNow();
                    if (date_string.length > 3 && date_string.substr(0, 3) === 'in ') date_string = 'just now'; // Prevent future dates if clocks mismatch
                }
            }

            dateObj.innerText = date_string;
        }
    }
}

function navigateToFolder(dept,dept_name,path,apps,app_id,app_name,no_history)
{
    if (currentUploads.length > 0) {
        if (confirm('Are you sure you wish to cancel your current upload?')) {
            for (var i=0; i<currentUploads.length; i++) {
                var upload = currentUploads[i];
                upload.cancel();
            }

            uploads = [];
        } else {
            return;
        }
    }

    window.jsconnect['folder']['dept_id'] = decodeURIComponent(dept);
    window.jsconnect['folder']['dept_name'] = decodeURIComponent(dept_name);
    window.jsconnect['folder']['path'] = decodeURIComponent(path);
    window.jsconnect['folder']['apps'] = apps;
    window.jsconnect['folder']['app_id'] = decodeURIComponent(app_id);
    window.jsconnect['folder']['app_name'] = decodeURIComponent(app_name);
    window.jsconnect['folder']['search_params'] = null;

    if (typeof window.jsconnect['upload'] !== 'undefined') {
        window.jsconnect['upload']['dept'] = decodeURIComponent(dept);
        window.jsconnect['upload']['parent'] = decodeURIComponent(path);
    }

    updateFolderTitle();
    updateFolderNavigation();

    // Hide batch actions for apps
    if (apps == true || app_id > -1) {
        $('#file-batch-actions').css('display', 'none');
    } else {
        $('#file-batch-actions').css('display','block');
    }

    $('.file-obj').remove();

    reloadAllFiles();

    // Modify page URL
    if (!no_history && window.history) {
        var search_query = '';

        if (typeof URLSearchParams !== 'undefined') {
            var urlParams = new URLSearchParams(window.location.search);
            search_query = (urlParams.get('search') ? '&search=' + encodeURIComponent(urlParams.get('search')) : '');
        }

        var url = null;

        if (!apps && app_id == -1) {
           url = '';

           if (dept > -1 && !window.jsconnect['link']) {
               url += 'dept='+dept;
           }

            if (path != '/') {
                if (url.length > 0) url += '&';
                url += 'folder='+encodeURIComponent(path);
            }

            if (!window.jsconnect['link']) {
                if (url.length > 0) url += '&';
                url += 'project='+window.jsconnect['project']['id'];
            }

            url = 'files?' + url + search_query;

        } else if (apps && app_id == -1) {
            url = "files?apps" + search_query;
        } else {
            url ="files?app=" + app_id + "&folder=" + encodeURIComponent(path) + search_query;
        }

        if (window.jsconnect['link']) url += '&link='+window.jsconnect['link']['id'];

        window.history.pushState({
            dept: dept,
            dept_name: dept_name,
            path: path,
            apps: apps,
            app_id: app_id,
            app_name: app_name
        }, '', url);

    }
}

function updateFolderTitle()
{
    var headerTitle = null;
    var headerIcon = null;
    var pageTitle = null;

    var dept = window.jsconnect['folder']['dept_id'];
    var path = window.jsconnect['folder']['path'];
    var apps = (window.jsconnect['folder']['apps'] == true);
    var app_id = parseInt(window.jsconnect['folder']['app_id']);

    var folderTitle = path;
    var slashPos = folderTitle.lastIndexOf('/');
    if (slashPos !== false) folderTitle = folderTitle.substr(slashPos+1);

    if (path != '/') {
        headerTitle = folderTitle;
        headerIcon = 'img/Folder.svg';

    } else if (dept > -1) {
        headerTitle = window.jsconnect['folder']['dept_name'];
        headerIcon = 'img/Dept_Folder.svg';

    } else if (dept == -1) {
        headerTitle = window.jsconnect['project']['title'] + ' Files';
        headerIcon = 'img/Header-Files.svg';
        pageTitle = headerTitle + ' - ' + window.jsconnect['site']['title'];
    }

    if (!pageTitle) pageTitle = headerTitle + ' - ' + window.jsconnect['project']['title'] + ' - ' + window.jsconnect['site']['title'];


    if (headerTitle && headerIcon) {
        var titleObj = $('h1 .header-title');
        var imgObj = $('h1 .header-icon');

        titleObj.html(headerTitle);
        imgObj.attr("src",headerIcon);

        window.document.title = pageTitle;
    }

    $('#share-cur-folder').css('display',(path == '/' ? 'none':'inline'));
}

function updateFolderNavigation()
{
    var navbar_html = '';

    var dept = window.jsconnect['folder']['dept_id'];
    var dept_name = (window.jsconnect['folder']['dept_name'] ? window.jsconnect['folder']['dept_name']:'');
    var apps = (window.jsconnect['folder']['apps'] ? true:false);
    var app_name = (window.jsconnect['folder']['app_name'] ? window.jsconnect['folder']['app_name']:'');
    var path = window.jsconnect['folder']['path'];

    if (typeof(window.jsconnect['link']) !== 'undefined') {

        var link_path = window.jsconnect['link']['root_path'];

        if (path.length > link_path.length) {
            var last_dir = link_path.replace(/.*\//, '');

            navbar_html += '<a data-type="folder" href="#" onclick="if (confirmNavEvent(this)) navigateToFolder(' + dept + ',\'\',\'' + escapeSingleQuotes(encodeURIComponent(link_path)) + '\','+apps+',window.jsconnect[\'folder\'][\'app_id\'],\'\',false)"><li><img src="img/Folder.svg" loading="lazy" class="file-path-icon"/>'+(link_path == '/' ? 'Files':last_dir)+'</li></a>';

            var relative_path = path.substr(link_path.length);

            var components = relative_path.split('/');
            var temp_path = link_path;

            for (var i=1; i<components.length; ++i) {
                if (components[i].length == 0) continue;
                temp_path += '/' + stripSlashes(components[i]);

                var temp_folder_id = '-1';
                navbar_html += '<a ' + (i < components.length-1 || window.jsconnect['folder']['rev'] ? ' data-type="folder" data-id="' + temp_folder_id + '"':'') + ' href="#" onclick="if (confirmNavEvent(this)) navigateToFolder(' + dept + ',\'\',\'' + escapeSingleQuotes(encodeURIComponent(temp_path)) + '\','+apps+',window.jsconnect[\'folder\'][\'app_id\'],\'\',false)"><li><img src="img/Folder.svg" class="file-path-icon" loading="lazy"/>' + stripSlashes(components[i]) + '</li></a>';
            }
        }

    } else {
        if (dept > -1 || path != '/' || window.jsconnect['folder']['rev'] || window.jsconnect['folder']['apps'] || window.jsconnect['folder']['app_id'] > -1) {
            navbar_html += '<a href="#" onclick="if (confirmNavEvent(this)) navigateToFolder(-1,\'\',\'/\',false,-1,\'\',false)" class="nav-drop" data-type="folder" data-id="-1"><li><img src="img/Folder.svg" class="file-path-icon" loading="lazy"/>Files</li></a>';
        }

        if (typeof dept_name != 'undefined' && dept_name.length > 0) {
            navbar_html += '<a href="#" onclick="if (confirmNavEvent(this)) navigateToFolder(' + dept + ',\'' + escapeSingleQuotes(encodeURIComponent(dept_name)) + '\',\'/\',false,-1,\'\',false)"><li class="nav-drop" data-type="dept" data-id="' + dept + '"><img src="img/Dept_Folder.svg" class="file-path-icon" loading="lazy"/>' + dept_name + '</li></a>';
        }

        // Loop through the folder path
        if (path != '/') {
            var components = path.split('/');
            var temp_path = '';

            for (var i=1; i<components.length; ++i) {
                temp_path += '/' + stripSlashes(components[i]);
                var temp_folder_id = '-1';
                navbar_html += '<a ' + (i < components.length-1 || window.jsconnect['folder']['rev'] ? ' class="nav-drop" data-type="folder" data-id="' + temp_folder_id + '"':'') + ' href="#" onclick="if (confirmNavEvent(this)) navigateToFolder(' + dept + ',\'' + escapeSingleQuotes(encodeURIComponent(dept_name)) + '\',\'' + escapeSingleQuotes(encodeURIComponent(temp_path)) + '\','+apps+',window.jsconnect[\'folder\'][\'app_id\'],window.jsconnect[\'folder\'][\'app_name\'],false)"><li><img src="img/Folder.svg" class="file-path-icon" loading="lazy"/>' + stripSlashes(components[i]) + '</li></a>';
            }
        }

        if (window.jsconnect['folder']['rev']) {
            //$page->appendPageContent("<a href=\"files?rev=$rev&dept=$dept_id".($project_id ? "&project=$project_id":'').$search_query."\"><li>$rev_title Versions</li></a>");
        }
    }

    $('.file-path-selector').html(navbar_html);
    $('#search-result-alert').remove();
}

function availableFileColumns()
{
    var cols = [
        {
            title: 'Thumbnail',
            name: 'thumb',
            title_hidden: true,
            not_resizable: true,
            initial_size: '120px',
            not_sortable: true
        },
        {
            title: 'Name',
            name: 'name',
            initial_size: '40%'
        },
        {
            title: 'Type',
            name: 'type',
            not_sortable: true,
            no_mobile: true
        },
        {
            title: 'Workflow',
            name: 'workflow',
            initial_size: '110px',
            no_mobile: true,
            no_link: true
        },
        {
            title: 'Date',
            name: 'date',
            no_mobile: true,
            no_link: true
        },
        {
            title: 'Creator',
            name: 'uploader',
            no_mobile: true,
            no_link: true
        },
        {
            title: 'Size',
            name: 'size',
            no_mobile: true
        },
        {
            title:'Views',
            name:'views',
            no_link:true
        },
        {
            title: 'Downloads',
            name: 'downloads',
            no_link: true
        },
        {
            title: 'Comments',
            name: 'comments',
        },
        {
            title: 'Duration',
            name: 'duration',
        },
        {
            title: 'Last Comment',
            name: 'last_comment',
            no_link: true
        },
    ];

    var isLink = (typeof window.jsconnect["link"] !== "undefined");

    if (isLink) {
        var filtered_cols = [];

        for (var i=0; i<cols.length; i++) {
            var obj = cols[i];

            if (!obj.no_link) {
                filtered_cols.push(obj);
            }
        }

        cols = filtered_cols;
    }

    return cols;
}

function currentFileColumnTitles()
{
    var cols = ['thumb','name','type','workflow','date','uploader','size'];

    if (getCookie('fileTable_columns')) {
        cols = getCookie('fileTable_columns').split(',');
    }

    var availableCols = availableFileColumns();
    var allowedCols = [];

    // Check col titles haven't been filtered
    for (var i=0; i<cols.length; i++) {
        var curTitle = cols[i];

        for (var j = 0; j < availableCols.length; j++) {
            var availCol = availableCols[j];

            if (availCol.name == curTitle) {
                allowedCols.push(curTitle);
            }
        }
    }

    return allowedCols;
}

function currentFileColumns()
{
    var availableCols = availableFileColumns();
    var currentColTitles = currentFileColumnTitles();

    var cols = [];

    for (var i=0; i<currentColTitles.length; i++) {
        var curTitle = currentColTitles[i];

        for (var j=0; j<availableCols.length; j++) {
            var availCol = availableCols[j];

            if (availCol.name == curTitle) {
                cols.push(availCol);
                break;
            }
        }
    }

    return cols;
}

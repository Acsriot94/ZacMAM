// TODO: Add drag and drop

function browseForLocalFile()
{
    closeMenu();

    $('#local_file_browser').remove();

    $('body').append($('<input type="file" id="local_file_browser" onchange="handleFiles(this.files)" style="display:none" multiple />'));
    $('#local_file_browser')[0].click();
}

function handleFiles(files)
{
    for (var i=0; i<files.length; i++) {
        addCommentBoxAttachment(-1,0,files[i]['name'],null,files[i]);
    }

    $('#local_file_browser').remove();
}

function uploadProgress(evt)
{
    var upload = evt.target;
    var attachment = upload.representedObject;

    if (!attachment) return;

    var obj = pageObjectForCommentBoxAttachment(attachment);

    if (obj.length) {
        const progressBar = obj.find('.upload-progress');
        if (progressBar.length) {
            progressBar.attr("progress", (upload.uploadedBytes / upload.size)*100)
        }
    }
}

function uploadStatusChanged(evt)
{
    console.log('Status changed');

}

function uploadFinished(evt)
{
    console.log('Upload finished');

    var upload = evt.target;
    var attachment = upload.representedObject;

    attachment['id'] = upload.fileID;
    attachment['file'] = null;

    if (!attachment) return;

    var obj = pageObjectForCommentBoxAttachment(attachment);

    if (obj.length) {
        var canvas = obj.find('canvas');
        if (canvas.length) {
            canvas.css('display','none');
            var icon = obj.find('.icon img');

            if (icon) {
                icon.prop('src','img/Success.svg');
            }
        }
    }

    removeCurrentUploadFromQueue(upload);
    processNextQueueItem();

    if (uploads.length == 0) {
        submitComment();
    }
}

function uploadError(evt)
{
    console.log('Upload finished');

    var upload = evt.target;
    var attachment = upload.representedObject;

    if (!attachment) return;

    var obj = pageObjectForCommentBoxAttachment(attachment);

    if (obj.length) {
        var canvas = obj.find('canvas');
        if (canvas.length) {
            canvas.css('display','none');
            var icon = obj.find('.icon img');

            if (icon) {
                icon.prop('src','img/Error.svg');
            }
        }
    }

    processNextQueueItem();
}

function uploadAbort(evt)
{

}

function cancelUpload(uploadIndex)
{

}

function retryUpload(uploadIndex)
{

}

function iconForFileType(mime_type, file_ext)
{
    if (mime_type == 'application/zip' || file_ext == 'zip'  || file_ext == 'gz') {
        return 'Compressed_Icon.svg';
    } else if (mime_type == 'text/plain') {
        return 'txt_icon.png';
    } else if (mime_type == 'application/pdf') {
        return 'pdf_icon.png';
    } else if (file_ext == 'fcp') {
        return 'fcp_icon.png';
    } else if (file_ext == 'fcpproject') {
        return 'fcpproject_icon.png';
    } else if (file_ext == 'fcpevent') {
        return 'fcpevent_icon.png';
    } else if (file_ext == 'prproj') {
        return 'prproj_icon.png';
    } else if (file_ext == 'aep') {
        return 'aep_icon.png';
    } else if (file_ext == 'psd') {
        return 'psd_icon.png';
    } else if (file_ext == 'ai') {
        return 'ai_icon.png';
    } else if (file_ext == 'rtf') {
        return 'txt_icon.png';
    } else if (file_ext == 'doc') {
        return 'txt_icon.png';
    } else if (file_ext == 'pages') {
        return 'txt_icon.png';
    } else if (file_ext == 'xml') {
        return 'xml_icon.png';
    } else if (file_ext == 'nk') {
        return 'nk_icon.png';
    } else if (mime_type == 'audio/wav' || mime_type == 'audio/x-wav' || mime_type == 'audio/mp3' || mime_type == 'audio/m4a' || file_ext == 'mp3' || file_ext == 'wav' || file_ext == 'm4a') {
        return 'Audio_Icon.svg';
    }

    return 'Unknown_Doc.svg';
}

function randomFilename(length) {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var text = '';
    for(var i = 0; i < length; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return text;
}

function addSubfolderToQueue(entry,parent_path)
{
    try {
        var firstObj = null;
        var directoryReader = entry.createReader();

        directoryReader.readEntries(function (entries) {
            entries.forEach(function (subentry) {
                if (subentry && subentry.isDirectory) {
                    firstObj = addSubfolderToQueue(subentry, parent_path + '/' + subentry.name);
                } else {
                    subentry.file(function (file) {
                        var f = file;

                        // Ignore files starting with a dot
                        if (f.name.length === 0 || f.name.substr(0, 1) === '.') return; // Equivalent to continue in forEach

                        var uploadObj = addFileToQueue(f, parent_path);
                    });
                }
            });
        });

        return firstObj;
    }

    catch(e) {
        return null;
    }
}

function isUploadObjectFolder(obj)
{
    try {
        var entry = null;

        if (obj.getAsEntry) {
            entry = obj.getAsEntry();
        } else if (obj.webkitGetAsEntry) {
            entry = obj.webkitGetAsEntry();
        } else {
            return false;
        }

        return entry.isDirectory;
    }

    catch(e) {
        return false;
    }
}

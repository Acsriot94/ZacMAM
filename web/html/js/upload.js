
function cancel(e) {
    if (e.preventDefault) e.preventDefault(); // required by FF + Safari
    e.dataTransfer.dropEffect = 'copy'; // tells the browser what drop effect is allowed here
    $('.filedropzone').addClass('dragover');
    return false; // required by IE
}

function dragEnd(e) {
    $('.filedropzone').removeClass('dragover');
}

$(document).ready(function() {
    var drop = document.querySelector('.filedropzone');

    // Tells the browser that we can drop on this target
    drop.addEventListener('dragstart', cancel);
    drop.addEventListener('dragover', cancel);
    drop.addEventListener('dragenter', cancel);
    drop.addEventListener('dragleave',dragEnd);
    drop.addEventListener('dragend',dragEnd);

    drop.addEventListener('drop', function (e) {
        if (e.preventDefault) e.preventDefault(); // stops the browser from redirecting

        $('.filedropzone').removeClass('dragover');

        if (e.dataTransfer.items) {
            // Create new row
            for (var i = 0; i < e.dataTransfer.items.length; i++) {
                var f = e.dataTransfer.items[i];

                if (isUploadObjectFolder(f)) {
                    var entry = null;

                    if (f.getAsEntry) {
                        entry = f.getAsEntry();
                    } else if (f.webkitGetAsEntry) {
                        entry = f.webkitGetAsEntry();
                    } else {
                        continue;
                    }

                    addSubfolderToQueue(entry, entry.name);

                } else {
                    f = f.getAsFile();

                    var uploadObj = addFileToQueue(f, null, addNewUpload);
                }
            }

        } else { // Internet Explorer
            var foldersFound = false;

            // Create new row
            for (var i=0; i<e.dataTransfer.files.length; i++) {
                var f = e.dataTransfer.files[i];

                // Ignore folders
                if ((!f.type|| f.type == '') && f.size%4096 == 0) {
                    foldersFound = true;
                    continue;
                }

                var uploadObj = addFileToQueue(f,null, addNewUpload);
            }

            if (foldersFound) alert('Folders cannot be uploaded, only files.');
        }

        return false;
    });
});

function browseFiles()
{
    $('#fileInput')[0].click();
}

function handleFiles(files)
{
    for (var i=0; i<files.length; i++) {
        var uploadObj = addFileToQueue(files[i],null, addNewUpload);
    }

    $('#fileInput').val('');
}

function addNewUpload(upload)
{
    var newRow = $("<tr data-index=\""+upload.index+"\"><td width=80><input type=\"text\" value=\"0\" class=\"knob\" data-index=\""+upload.index+"\"/><td width=75 id=\"fileicon\"><img src=\"img/"+iconForFileType(upload.file.type,"")+"\" style=\"width:80px\"/><td width=\"30%\" id=\"filetitle\">"+upload.title+"<br><small>Queued</small><td width=\"20%\">"+(upload.size/1024/1024).toFixed(2)+" MB<td id=\"buttonarea\"><a href=\"javascript:cancelUpload("+upload.index+")\">Cancel</a>");

    newRow.appendTo("#uploadtable");

    newRow.find(".knob").knob({
        readOnly:true,
        width:60,
        height:60,
        format : function (v) { return (v+"%") },
        draw : function() {
            this.i.css("box-shadow","none");
            this.c.imageSmoothingEnabled = true;

            var uploadIndex = this.i.data("index");
            var upload = null;

            for (var i=0; i<uploads.length; i++) {
                if (uploads[i].index == uploadIndex) {
                    upload = uploads[i];
                    break;
                }
            }

            if (upload) upload.knob = this;
        }
    });

    if (!validateFileSize(upload.file)) {
        upload.status = "Error";
        upload.error = (jsconnect['upload']['max_file_size'] == jsconnect['upload']['free_space'] ? 'You do not have enough free space to upload this file.':'This file exceeds the maximum file size of '.Math.round(jsconnect['upload']['max_file_size']/1024/1024/1024)+' GB');
        upload.canRetry = false;
        upload.fire({type: "error"});
    } else if (totalSpaceRemaining() < 0) {
        upload.status = "Error";
        upload.error = "You don\'t have enough space to upload this file.";
        upload.canRetry = false;
        upload.fire({type: "error"});
    }
}

function uploadProgress(evt)
{
    var upload = evt.target;
    var uploadIndex = upload.index;
    var row = $('tr[data-index='+uploadIndex+']');

    if (row) {
        row.find('.knob').val(upload.progress).trigger('change');
        row.find('#filetitle').html(upload.title+'<br><small>'+upload.status + ' ' + upload.progress + '% - ' + formatFileSize(upload.uploadedBytes) + ' (' + formatBitrate(upload.byterate) + '/s) ' + '<span style="margin-left:10px">'+upload.timeRemaining+'</span>' + '</small>');
    }
}

function uploadStatusChanged(evt)
{
    var upload = evt.target;

    var uploadIndex = upload.index;
    var row = $('tr[data-index='+uploadIndex+']');

    if (upload.status == 'Finishing') {
        upload.knob.i.val("...");
        upload.knob.draw();
        upload.knob.c.imageSmoothingEnabled = true;

        // Remove cancel button
        if (row) {
            row.find('#buttonarea').html('');
        }

        removeCurrentUploadFromQueue(upload);

        // Rate limit lots of files in queue
        const finishedUploadCount = getFinishedUploads().length;

        if (+getJSConnectValue('site.type', 0, false) === 0 &&
            finishedUploadCount > 20 && uploads.length > 25) {
            console.log('Rate limiting due to large queue size');

            let timeout = 1000;

            if (finishedUploadCount > 50 && uploads.length > 15) {
                timeout = 2500;
            }

            window.setTimeout(processNextQueueItem, timeout);
        } else {
            processNextQueueItem();
        }
    }

    if (row) {
        row.find('#filetitle').html(upload.title+'<br><small>'+upload.status+'</small>');
    }
}

function uploadFinished(evt)
{
    var upload = evt.target;

    upload.knob.o.fgColor = '#66CC66';
    upload.knob.fgColor = '#66CC66';
    upload.knob.pColor = '#66CC66';
    upload.knob.o.fgColor = '#66CC66';
    upload.knob.o.bgColor = '#3F414B';
    upload.knob.o.pColor = '#66CC66';

    upload.knob.o.thickness = 1;
    upload.knob.i.show();
    upload.knob.i.val('✔');
    upload.knob.i.css('color','#66CC66');
    upload.knob.draw();
    upload.knob.c.imageSmoothingEnabled = true;

    var uploadIndex = upload.index;
    var row = $('tr[data-index='+uploadIndex+']');

    if (row) {
        row.find('#fileicon').html('<a href="player?id='+upload.fileID+'" target="_blank"><img src="img/'+iconForFileType(upload.file.type,'')+'" style="width:80px" /></a>');

        if (upload.fileRequestID) { // Don't show controls for upload links
            row.find('#buttonarea').html('');
        } else {
            row.find('#filetitle').html('<a href="player?id=' + upload.fileID + '" target="_blank">' + upload.file.name + '</a><br><small><a href="player?id=' + upload.fileID + '" target="_blank">View file</a></small>');
            row.find('#buttonarea').html('<a href="download?id=' + upload.fileID + '" title="Download" class="tooltip" target="_blank"><div class="fa-icon fa-icon-download-cloud"></div></a> <a href="share?create&id=' + upload.fileID + '" title="Share" class="tooltip" target="_blank"><div class="fa-icon fa-icon-link"></div></a> <a href="metadata?edit=' + upload.fileID + '" target="_blank">Edit Metadata</a>');
        }
    }

    $('#info-'+uploadIndex).remove();

    syncUploadCountInPageTitle();

    setTimeout(function() { refreshStorageSpace(); }, 1000);
}

function uploadError(evt)
{
    var upload = evt.target;

    upload.knob.o.fgColor = '#E44646';
    upload.knob.o.thickness = 1;
    upload.knob.i.show();
    upload.knob.i.val('!');
    upload.knob.i.css('color','#E44646');
    upload.knob.draw();
    upload.knob.c.imageSmoothingEnabled = true;

    var uploadIndex = upload.index;
    var row = $('tr[data-index='+uploadIndex+']');

    if (row) {
        if (upload.canRetry) {
            row.find('#buttonarea').html('<a href="javascript:retryUpload('+upload.index+')">Retry</a>');
        } else {
            row.find('#buttonarea').html('');
        }

        if (upload.error) {
            console.log('Upload error: '+upload.error);
            row.find('#filetitle').html(upload.title+'<div class="error-alert">'+upload.error+'</div>');
        }
    }

    removeCurrentUploadFromQueue(upload);

    processNextQueueItem();
}

function uploadAbort(evt)
{
    var upload = evt.target;

    upload.knob.o.fgColor = '#E44646';
    upload.knob.o.thickness = 1;
    upload.knob.i.show();
    upload.knob.val(100);
    upload.knob.i.val('!');
    upload.knob.i.css('color','#E44646');
    upload.knob.draw();
    upload.knob.c.imageSmoothingEnabled = true;

    var uploadIndex = upload.index;
    var row = $('tr[data-index='+uploadIndex+']');

    if (row) {
        row.find('#buttonarea').html('<a href="javascript:retryUpload('+upload.index+')">Retry</a>');
    }

    removeCurrentUploadFromQueue(upload);

    processNextQueueItem();
}

function cancelUpload(uploadIndex)
{
    var upload = null;

    for (var i=0; i<uploads.length; i++) {
        if (uploads[i].index == uploadIndex) {
            upload = uploads[i];
            break;
        }
    }

    if (upload) upload.cancel();
}

function retryUpload(uploadIndex)
{
    var upload = null;

    for (var i=0; i<uploads.length; i++) {
        if (uploads[i].index == uploadIndex) {
            upload = uploads[i];
            break;
        }
    }

    if (upload) {
        upload.status = 'Queued';
        if (upload.knob) {
            upload.knob.fgColor = '#87CEEB';
            upload.knob.pColor = '#87CEEB';
            upload.knob.o.fgColor = '#87CEEB';
//            upload.knob.i.css('color','#87CEEB');
            upload.knob.i.val('0%');
        }

        var row = $('tr[data-index='+uploadIndex+']');

        if (row) {
            row.find('#buttonarea').html('<a href="javascript:cancelUpload('+upload.index+')">Cancel</a>');
            row.find('#filetitle').html(upload.title+'<br><small>'+upload.status+'</small>');
        }

        processNextQueueItem();
    }
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

$(window).bind('beforeunload', function() {
    if (currentUploads.length > 0) return 'Are you sure you wish to cancel your current upload?';
});

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

                        var uploadObj = addFileToQueue(f, parent_path, addNewUpload);
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

function formatBitrate(byte_size)
{
    byte_size *= 8;
    var sizes = ['bits', 'Kbits', 'Mbits', 'Gbits', 'Tbits', 'Pbits', 'Ebits', 'Zbits', 'Ybits'];
    if (byte_size <= 0) return '0 bits';
    var i;
    return ((byte_size/Math.pow(1024, (i = Math.floor(Math.log(byte_size) / Math.log(1024))))).toFixed(2) + ' ' + sizes[i]);
}

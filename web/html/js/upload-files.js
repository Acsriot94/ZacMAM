
function dragOver(e) {
    if (e.preventDefault) e.preventDefault(); // required by FF + Safari
    if (e.stopPropagation) e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy'; // tells the browser what drop effect is allowed here
    $('.filedropzone').addClass('dragover');
    return false; // required by IE
}

function dragEnd(e) {
    $('.filedropzone').removeClass('dragover');
}

$(window).load(function() {
    var drop = document.querySelector('.filedropzone');

    if (drop) {
        // Tells the browser that we can drop on this target
        drop.addEventListener('dragstart', dragOver);
        drop.addEventListener('dragover', dragOver);
        drop.addEventListener('dragenter', dragOver);
//        drop.addEventListener('dragleave', dragEnd);
        drop.addEventListener('dragend', dragEnd);

        drop.addEventListener('drop', function (e) {
            if (e.preventDefault) e.preventDefault(); // stops the browser from redirecting
            if (e.stopPropagation) e.stopPropagation();

            // Remove "drag to upload" area
            if ($(drop).hasClass('filetable-dropzone')) {
                $(drop).removeClass('filetable-dropzone');
                $(drop).html('');
            }

            $('.filedropzone').removeClass('dragover');
            $('.filetable-dropzone').hide();

            var droppedObject = $(e.target).closest('.file-obj:not(.file-obj[data-type=dept])');
            if (!droppedObject.length) droppedObject = null;

            var firstObj = null;
            var uploadObj = null;
            var pageObj = null;

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

                        pageObj = addSubfolderToQueue(entry, entry.name, droppedObject);

                        droppedObject = pageObj;
                        if (firstObj === null) firstObj = pageObj;

                    } else {
                        f = f.getAsFile();
                        uploadObj = uploadObjForFile(f,null);

                        if (addUploadToQueue(uploadObj, null, true)) {
                            pageObj = addNewUpload(uploadObj,droppedObject,(firstObj === null));

                            if (firstObj === null) firstObj = pageObj;
                            droppedObject = pageObj;
                        }

                        if (uploadObj === false) break;
                    }
                }
            } else { // Internet Explorer
                var foldersFound = false;

                // Create new row
                for (var i = 0; i < e.dataTransfer.files.length; i++) {
                    var f = e.dataTransfer.files[i];

                    // Ignore folders
                    if ((!f.type || f.type == '') && f.size % 4096 == 0) {
                        foldersFound = true;
                        continue;
                    }

                    uploadObj = uploadObjForFile(f,null);

                    if (addUploadToQueue(uploadObj, null, true)) {
                        pageObj = addNewUpload(uploadObj,droppedObject,(firstObj === null));

                        if (firstObj === null) firstObj = uploadObj;
                        droppedObject = pageObj;
                    }

                    if (uploadObj === false) break;
                }

                if (foldersFound) alert('Folders cannot be uploaded, only files.');
            }

            finishAddingToQueue();
            return false;
        });
    }
});

function addSubfolderToQueue(entry,parent_path,droppedObject)
{
    var firstObj = null;
    var pageObj = null;
    var uploadObj = null;
    var directoryReader = entry.createReader();

    directoryReader.readEntries(function(entries) {
        entries.forEach(function(subentry) {
            if (subentry.isDirectory) {
                firstObj = addSubfolderToQueue(subentry, parent_path + '/' + subentry.name);

            } else {
                subentry.file(function(file) {
                    var f = file;

                    // Ignore files starting with a dot
                    if (f.name.length === 0 || f.name.substr(0,1) === '.') return; // Equivalent to continue in forEach

                    uploadObj = uploadObjForFile(f,parent_path);

                    if (addUploadToQueue(uploadObj, null, true)) {
                        pageObj = addNewUpload(uploadObj,droppedObject,(firstObj === null));

                        if (firstObj === null) firstObj = uploadObj;
                        droppedObject = pageObj;
                    }
                });
            }
        });
    });

    return droppedObject;
}

function uploadProgress(evt) {
    var upload = evt.target;
    var row = upload.pageObject();

    if (row) {
        row.find('.knob').val(upload.progress).trigger('change');
        row.find('.upload-status').html(upload.status + ' ' + upload.progress + '% - ' + formatFileSize(upload.uploadedBytes) + ' (' + formatBitrate(upload.byterate) + '/s) ' + '<span style="margin-left:10px">'+upload.timeRemaining+'</span>');
    }
}

function uploadStatusChanged(evt) {

    var upload = evt.target;
    var row = upload.pageObject();

    console.log('Upload status: '+upload.status);

    if (upload.status === 'Finishing') {
        upload.knob.i.val("...");
        upload.knob.draw();
        upload.knob.c.imageSmoothingEnabled = true;

        // Remove cancel button
        if (row) {
            row.find('.knob').val(100).trigger('change');
            row.find('.file-controls').html('');
        }
    }

    if (row) {
        row.find('.upload-status').html(upload.status).css('display','block');
        if (upload.status !== 'Error') row.find('.file-error-alert').remove();
    }
}

function uploadFinished(evt) {
    console.log('Upload finished');

    var upload = evt.target;

    upload.knob.o.fgColor = '#66CC66';
    upload.knob.o.thickness = 1;
    upload.knob.i.show();
    upload.knob.i.val('✔');
//    upload.knob.i.css('color','#66CC66');
    upload.knob.o.bgColor = '#66CC66';
    upload.knob.draw();
    upload.knob.c.imageSmoothingEnabled = true;

    var row = upload.pageObject();

    if (row.length) {
        row.attr('data-id',upload.fileID);
        row.attr('id','file'+upload.fileID);

        var file = convertUploadToFile(upload);
        if (file) {
            files.splice(row.index()-1,0,file);
//            files.push(file);
            renderFile(file,row,true);
        } else {
            reloadFile(upload.fileID, row, null);
        }

        subscribeToThumbUpdates(upload.fileID);

        setTimeout(function() { refreshStorageSpace(); }, 1000);
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

function uploadError(evt) {
    var upload = evt.target;

    upload.knob.o.fgColor = '#E44646';
    upload.knob.o.thickness = 1;
    upload.knob.i.show();
    upload.knob.i.val('!');
    upload.knob.i.css('color','#E44646');
    upload.knob.draw();
    upload.knob.c.imageSmoothingEnabled = true;

    var row = upload.pageObject();

    if (row) {
        if (upload.canRetry) {
            row.find('.file-controls').html('<a href="javascript:retryUpload('+upload.index+')">Retry</a>');
        } else {
            row.find('.file-controls').html('');
        }

        if (upload.error) {
            row.find('.file-title').html(upload.title+'<div class="file-error-alert">'+upload.error+'</div>');
            row.find('.upload-status').css('display','none');
        }
    }

    removeCurrentUploadFromQueue(upload);

    // Wait before next file
    window.setTimeout(function() { processNextQueueItem(); }, 750);
}

function uploadAbort(evt) {
    var upload = evt.target;

    upload.knob.o.fgColor = '#E44646';
    upload.knob.o.thickness = 1;
    upload.knob.i.show();
    upload.knob.val(100);
    upload.knob.i.val('!');
    upload.knob.i.css('color','#E44646');
    upload.knob.draw();
    upload.knob.c.imageSmoothingEnabled = true;

    var row = upload.pageObject();

    if (row) {
        row.find('.file-controls').html('<a href="javascript:retryUpload('+upload.index+')">Retry</a>');
    }

    removeCurrentUploadFromQueue(upload);

    processNextQueueItem();
}

function cancelUpload(uploadIndex) {
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
        if (!upload.canRetry) return;

        upload.status = 'Queued';
        if (upload.knob) {
            upload.knob.fgColor = '#87CEEB';
            upload.knob.pColor = '#87CEEB';
            upload.knob.o.fgColor = '#87CEEB';
            upload.knob.i.css('color','#87CEEB');
            upload.knob.i.val('0%');
        }

        var row = upload.pageObject();

        if (row) {
            row.find('.file-controls').html('<a href="javascript:cancelUpload('+upload.index+')">Cancel</a>');
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
    } else if (mime_type == 'audio/wav' || mime_type == 'audio/x-wav' || mime_type == 'audio/mp3' || mime_type == 'audio/m4a' || file_ext == 'mp3' || file_ext == 'wav' || file_ext == 'm4a' || (mime_type.length > 6 && mime_type.substr(0, 6) == 'audio/')) {
        return 'Audio_Icon.svg';
    } else if ((mime_type.length > 6 && mime_type.substr(0, 6) == 'video/') || file_ext == 'mp4' || file_ext == 'm4v' || file_ext == 'mov' || file_ext == 'avi' || file_ext == 'wmv') {
        return 'No_Thumb.jpg';
    }

    return 'Unknown_Doc.svg';
}

$(window).bind('beforeunload', function() {
    if (currentUploads.length > 0) return 'Are you sure you wish to cancel your current upload?';
});

function randomFilename(length)
{
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var text = '';
    for(var i = 0; i < length; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return text;
}

function isUploadObjectFolder(obj)
{
    var entry = null;

    if (obj.getAsEntry) {
        entry = obj.getAsEntry();
    } else if (obj.webkitGetAsEntry) {
        entry = obj.webkitGetAsEntry();
    }

    if (!entry) return false;

    return entry.isDirectory;
}

function addNewUpload(upload,adjacent_obj,shouldScroll)
{
    if (!upload) return;

    var fileObj = renderFile(upload,adjacent_obj,false);

    if (!validateFileSize(upload.file)) {
        upload.status = "Error";
        upload.error = (window.jsconnect['site']['max_file_size'] == window.jsconnect['site']['free_space'] ? "You do not have enough free space to upload this file.":"This file exceeds the maximum file size of "+Math.round(window.jsconnect['site']['max_file_size']/1024/1024/1024)+" GB.");
        upload.canRetry = false;
        upload.fire({type: "error"});
    } else if (totalSpaceRemaining() < 0) {
        upload.status = "Error";
        upload.error = "You don't have enough space to upload this file.";
        upload.canRetry = false;
        upload.fire({type: "error"});
    }

    if (uploads.index < 120) addUploadToThumbQueue(upload);

    // Scroll to new upload
    if (shouldScroll) {
        var uploadObj = $(".file-obj[data-upload-index="+upload.index+"]");

        if (uploadObj.length && typeof uploadObj !== "undefined") {
            var parent = $("html,body");

            scrollParentToObject(uploadObj, parent);
        }
    }

    return fileObj;
}

function formatBitrate(byte_size)
{
    byte_size *= 8;
    var sizes = ['bits', 'Kbits', 'Mbits', 'Gbits', 'Tbits', 'Pbits', 'Ebits', 'Zbits', 'Ybits'];
    if (byte_size <= 0) return '0 bits';
    var i;
    return ((byte_size/Math.pow(1024, (i = Math.floor(Math.log(byte_size) / Math.log(1024))))).toFixed(2) + ' ' + sizes[i]);
}


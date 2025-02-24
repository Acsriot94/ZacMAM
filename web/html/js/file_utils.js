var c = {};
var isLoadingFiles = false;
var moreFilesAvailable = false;
var fileStart = 0;
var shortcutKeyManager = null;
let tagPreviewElement = null;

$(window).load(function() {
    // Context menu
    $(document).on("contextmenu",".file-obj", function(event) {
        event.preventDefault();

        if (!isLink && !isPanel) {
            var _fileID = null;
            var obj = pageObjectForElement(event.target);

            if (obj.length && obj.data('type') !== 'dept') {
                _fileID = obj.data('id');
                var file = fileWithID(_fileID);
                if (!file) {
                    console.log('Unable to locate file with ID ' + _fileID);
                    return;
                }

                // Deselect others if new selection
                if (!file['selected']) {
                    batchFileSelect(false);
                }

                file['selected'] = true;
                drawSelectionStatus(_fileID);
            }

            showContextMenu(_fileID,event.pageY,event.pageX);
        }
    });

    $(document).on("contextmenu","body:not(.file-obj)", function(event) {
        event.preventDefault();

        var tag = event.target.tagName.toLowerCase();
        var target = $(event.target);

        if (!isLink && tag !== 'td' && tag !== 'th' && tag !== 'tr' && tag !== 'a' && !target.hasClass('file-obj') && !target.closest('tr').hasClass('file-obj') && !target.closest('div.file-obj').hasClass('file-obj')) {
            showContextMenu(null,event.pageY,event.pageX); // Show New menu
        }
    });

    $(document).on("click","body", function(event) {
        if (isIOS || isTouchDevice) return;

        var tag = event.target.tagName.toLowerCase();
        var target = $(event.target);

        if (tag !== 'td' && tag !== 'tr' && tag !== 'a' &&
            tag !== 'input' && tag !== 'button' &&
            !target.hasClass('file-obj') &&
            !target.hasClass('file_dropdown') &&
            !target.closest('tr').hasClass('file-obj') &&
            !target.closest('#file-preview').length &&
            !target.closest('dialog-box').length) {

            batchFileSelect(false);
            cancelTextLabelEditing(function(obj) {
                var href = obj.closest(".file-url");

                // Restore href
                if (href.length) {
                    href.prop("href", href.attr("data-href"));
                    href.removeAttr("data-href");
                }
            });
        }

        // Stop rename
        if (tag == 'input') {
            return true;
//            if (target.closest('tr, div').hasClass('file-obj')) event.preventDefault();
        }
    });

    $(document).on("dblclick",".file-obj", function(event) {
        var obj = pageObjectForElement(event.target);

        // Cancel if editing
        if (fileObjectNameIsEditing(obj)) return;

        if (!isPanel || obj.data('type') == 'folder' || obj.data('type') == 'dept') {
            if (!obj.hasClass('upload')) obj.find('.file-title').trigger('click');

        } else if (obj.data('type') == 'video' || obj.data('type') == 'audio') {
            var downloadURL = obj.data('download-url');

            if (!downloadURL) {
                alert('Unable to import file. You do not have permission to download files.');
                return;
            }

            panelImportFile(obj.data('id'),downloadURL,obj.data('download-filename'));
        }
    });

    $(document).on("click",".file-obj", function(event) {
        if (event.which === 3 && event.button === 2) return; // Ignore right-clicks

        var target = $(event.target);
        var tagName = event.target.tagName.toLowerCase();

        if (tagName === "input") return true; // Ignore clicks when renaming

        $('.file-obj').removeClass('focused');

        if (target.hasClass('file-obj') || target.hasClass('file-status') || target.hasClass('file-revision-name') ||
            target.hasClass('tag-view') || target.hasClass('file-title-wrapper') || tagName == 'td' || tagName == 'tr') {
            event.preventDefault();

            processFileClick(event);

            pageObjectForElement(event.target).addClass('focused');
        }
    });

    $(document).on("click","a.file-url", function(event) {
        var target = $(event.target);

        if (fileObjectNameIsEditing(target)) {
//            event.preventDefault();
            return true;
        }
    });

    $(document).on("click",".file-thumb > a, .file-title, .file-title > .text-edit", function(event) {
        var target = $(event.target);
        var tagName = event.target.tagName.toLowerCase();

        if (tagName == 'input') {
//            event.preventDefault();
            return true;
        } else if (target.hasClass('file-thumb') || target.hasClass('file-title')) {

            // Prevent playing video while ctrl/cmd/shift is pressed
            if (event.ctrlKey || event.metaKey || event.shiftKey) {
                processFileClick(event);
                event.preventDefault();
            }
        }
    });

    $(document).on("keydown","body", function(event) {
        const tagName = event.target.tagName.toLowerCase();
        const ignoredTags = ['input', 'textarea', 'token-input', 'text-input-button',
                             'text-input-copy-button', 'textarea-button', 'textarea-copy-button'];

        if (ignoredTags.indexOf(tagName) >= 0) {
            return;
        }

        var indexes = selectedFileIndexes();

        switch (event.keyCode) {
            case 8: case 46: // Delete
                event.preventDefault();
                deleteItems();
                break;

            case 13: // Enter
                if (indexes.length > 0) {
                    event.preventDefault();
                    $('.file-obj[data-id='+files[indexes[0]]['id']+']').find('.file-title').trigger('click'); // Load player
                }
                break;

            case 27: // Esc
                if ($('#file-preview').length) {
                    event.preventDefault();
                    endPreview();
                }
                break;

            case 32: // Space
                event.preventDefault();
                if ($('#file-preview').length) {
                    endPreview();
                } else {
                    if (indexes.length > 0) showPreviewForFile(files[indexes[0]],true);
                }
                break;

            case 37: // Left
                if (fileView == 1 || fileView == 2) { // Only in thumb view
                    event.preventDefault();

                    if (indexes.length == 0) {
                        if (files[0]['dept_id']) break;
                        if (!event.shiftKey) batchFileSelect(false);

                        if (event.shiftKey) {
                            appendFileRangeSelection(files.length - 1);
                        } else {
                            files[files.length - 1]['selected'] = true;
                            drawSelectionStatus(files[files.length - 1]['id']);
                        }

                        ensureElementIsOnScreen(pageObjectForFileID(files[files.length-1]['id']), $('#filetablecontainer'));

                    } else {
                        if (indexes[0] > 0) {
                            var newIndex = parseInt(indexes[0]) - 1;

                            if (files[newIndex]['dept_id']) break;
                            if (!event.shiftKey) batchFileSelect(false);

                            if (event.shiftKey) {
                                appendFileRangeSelection(newIndex);
                            } else {
                                files[newIndex]['selected'] = true;
                                drawSelectionStatus(files[newIndex]['id']);

                                // Update preview
                                if ($('#file-preview').length) showPreviewForFile(files[newIndex], false);
                            }

                            ensureElementIsOnScreen(pageObjectForFileID(files[newIndex]['id']), $('#filetablecontainer'));
                        }
                    }
                }

                selectionChanged();
                break;

            case 38: // Up
                event.preventDefault();

                // Figure out the column span
                var colCount = Math.floor($('#filetablecontainer').width() / $('.file-obj').width());

                if (fileView == 1 || fileView == 2) {
                    if (indexes.length == 0) {
                        if (files[0]['dept_id']) break;
                        if (!event.shiftKey) batchFileSelect(false);

                        if (event.shiftKey) {
                            appendFileRangeSelection(files.length-1);
                        } else {
                            files[files.length - 1]['selected'] = true;
                            drawSelectionStatus(files[files.length - 1]['id']);
                        }

                        ensureElementIsOnScreen(pageObjectForFileID(files[files.length-1]['id']), $('#filetablecontainer'));

                    } else {
                        if (indexes[0] > 0 && indexes[0] > colCount) {
                            var newIndex = parseInt(indexes[0]) - colCount;

                            if (files[newIndex]['dept_id']) break;
                            if (!event.shiftKey) batchFileSelect(false);

                            if (event.shiftKey) {
                                appendFileRangeSelection(newIndex);
                            } else {
                                files[newIndex]['selected'] = true;
                                drawSelectionStatus(files[newIndex]['id']);

                                // Update preview
                                if ($('#file-preview').length) showPreviewForFile(files[newIndex], false);
                            }

                            ensureElementIsOnScreen(pageObjectForFileID(files[newIndex]['id']), $('#filetablecontainer'));
                        }
                    }

                } else {
                    if (indexes.length == 0) {
                        if (files[0]['dept_id']) break;
                        if (!event.shiftKey) batchFileSelect(false);

                        if (event.shiftKey) {
                            appendFileRangeSelection(files.length - 1);
                        } else {
                            files[files.length - 1]['selected'] = true;
                            drawSelectionStatus(files[files.length - 1]['id']);
                        }

                        ensureElementIsOnScreen(pageObjectForFileID(files[files.length-1]['id']), $('#filetablecontainer'));

                    } else {
                        if (indexes[0] > 0) {
                            var newIndex = parseInt(indexes[0]) - 1;

                            if (files[newIndex]['dept_id']) break;
                            if (!event.shiftKey) batchFileSelect(false);

                            if (event.shiftKey) {
                                appendFileRangeSelection(newIndex);
                            } else {
                                files[newIndex]['selected'] = true;
                                drawSelectionStatus(files[newIndex]['id']);

                                // Update preview
                                if ($('#file-preview').length) showPreviewForFile(files[newIndex], false);
                            }

                            ensureElementIsOnScreen(pageObjectForFileID(files[newIndex]['id']), $('#filetablecontainer'));
                        }
                    }
                }

                selectionChanged();
                break;

            case 39: // Right
                if (fileView == 1 || fileView == 2) { // Only in thumb view
                    event.preventDefault();

                    if (indexes.length == 0) {
                        if (files[0]['dept_id']) break;
                        if (!event.shiftKey) batchFileSelect(false);

                        if (event.shiftKey) {
                            appendFileRangeSelection(0);
                        } else {
                            files[0]['selected'] = true;
                            drawSelectionStatus(files[0]['id']);
                        }

                        ensureElementIsOnScreen(pageObjectForFileID(files[0]['id']), $('#filetablecontainer'));

                    } else {
                        if (indexes[indexes.length - 1] < files.length - 1) {
                            var newIndex = parseInt(indexes[indexes.length - 1]) + 1;

                            if (files[newIndex]['dept_id']) break;
                            if (!event.shiftKey) batchFileSelect(false);

                            if (event.shiftKey) {
                                appendFileRangeSelection(newIndex);
                            } else {
                                files[newIndex]['selected'] = true;
                                drawSelectionStatus(files[newIndex]['id']);

                                // Update preview
                                if ($('#file-preview').length) showPreviewForFile(files[newIndex], false);
                            }

                            ensureElementIsOnScreen(pageObjectForFileID(files[newIndex]['id']), $('#filetablecontainer'));
                        }
                    }
                }

                selectionChanged();
                break;

            case 40: // Down
                event.preventDefault();

                // Figure out the column span
                var colCount = Math.floor($('#filetablecontainer').width() / $('.file-obj').width());

                if (fileView == 1 || fileView == 2) {
                    if (indexes.length == 0) {
                        if (files[0]['dept_id']) break;
                        if (!event.shiftKey) batchFileSelect(false);

                        if (event.shiftKey) {
                            appendFileRangeSelection(0);
                        } else {
                            files[0]['selected'] = true;
                            drawSelectionStatus(files[0]['id']);
                        }

                        ensureElementIsOnScreen(pageObjectForFileID(files[0]['id']), $('#filetablecontainer'));

                    } else {
                        if (indexes[indexes.length-1] < files.length-colCount) {
                            var newIndex = parseInt(indexes[indexes.length-1]) + colCount;

                            if (files[newIndex]['dept_id']) break;
                            if (!event.shiftKey) batchFileSelect(false);

                            if (event.shiftKey) {
                                appendFileRangeSelection(newIndex);
                            } else {
                                files[newIndex]['selected'] = true;
                                drawSelectionStatus(files[newIndex]['id']);

                                // Update preview
                                if ($('#file-preview').length) showPreviewForFile(files[newIndex],false);
                            }

                            ensureElementIsOnScreen(pageObjectForFileID(files[newIndex]['id']), $('#filetablecontainer'));
                        }
                    }

                } else {
                    if (indexes.length === 0) {
                        var new_index = 0;

                        if (files[new_index]['dept_id']) {
                            // Get first item that's not a dept
                            for (var j=1; j < files.length; j++) {
                                if (files[j]['dept_id']) continue;

                                new_index = j;
                                break;
                            }

                            if (new_index < 1) break;
                        }

                        if (!event.shiftKey) batchFileSelect(false);

                        if (event.shiftKey) {
                            appendFileRangeSelection(new_index);
                        } else {
                            files[new_index]['selected'] = true;
                            drawSelectionStatus(files[new_index]['id']);
                        }

                        // Get object
                        var newObj = $('.file-obj:eq(' + new_index + ')');

                        if (newObj) {
                            // Focus
                            $('.file-obj').removeClass('focused');
                            newObj.addClass('focused');

                            ensureElementIsOnScreen(newObj, $('#filetablecontainer'));
                        }

                    } else {
                        if (indexes[indexes.length - 1] < files.length - 1) {
                            var newIndex = parseInt(indexes[indexes.length - 1]) + 1;

                            if (files[newIndex]['dept_id']) break;
                            if (!event.shiftKey) batchFileSelect(false);

                            if (event.shiftKey) {
                                appendFileRangeSelection(newIndex);
                            } else {
                                files[newIndex]['selected'] = true;
                                drawSelectionStatus(files[newIndex]['id']);

                                // Update preview
                                if ($('#file-preview').length) showPreviewForFile(files[newIndex], false);
                            }

                            // Get object
                            var newObj = $('.file-obj:eq('+newIndex+')');

                            if (newObj) {
                                // Focus
                                $('.file-obj').removeClass('focused');
                                newObj.addClass('focused');

                                ensureElementIsOnScreen(newObj, $('#filetablecontainer'));
                            }

                            // Load more files if it's the last one
                            if (newIndex === files.length - 1 && $('#more-items').length) {
                                $('#more-items').click();
                            }
                        }
                    }
                }

                selectionChanged();
                break;
        }
    });

    // Favorites
    $(document).on('click','.favoritebtn', function(e) {
        var file_id = $(e.target).closest('.file-controls').data('id');

        if (!file_id) {
            alert('Unable to get file ID.');
            return;
        }

        toggleFavorite(file_id);
    });

    $('#file-filter').on('change',function() {
        const val = $('#file-filter').val();

        writeCookie('file_filter', val, 365);

        if (val === 'manage') {
            showSavedSearchManageDialog();
            return;
        }

        // Set start parameter back to 0
        if (window.location.href.indexOf('start=') > -1) {
            window.location.href = window.location.href.replace(/(start=)[^\&]+/, '$1' + '0');
        } else {
            window.location.reload(false);
        }
    });

    $(document).on('change','.file-workflow',function() {
        var file_id = +$(this).data('id');
        var workflow_id = +$(this).val();

        // Get selected files
        var selection = selectedFileIDs();

        // If this file wasn't previously selected, just select this file alone
        if (selection.indexOf(file_id) < 0) {
            batchFileSelect(false);
            selection = [file_id];
        }

        $.post('ajax/file_ops.php',{workflow:workflow_id, ids:selection.join(',')},function(data) {
            var jsonObj = safeJSONParse(data);

            if (jsonObj.error) {
                $('.error-alert').remove();
                $('<div class="error-alert">Some files could not be modified. Please make sure you have permission to change these files.</div>').prependTo('#page');
            } else {
                for (var i=0; i<selection.length; i++) {
                    var parentObj = $('.file-obj[data-id="' + selection[i] + '"]');
                    reloadFile(selection[i],parentObj,null);
                }
            }
        }).fail(function(jqXHR, textStatus, errorString) {
            alert(sanitize_string("Failed to set workflow: " + errorString));
        });
    });

    if (!isPanel) {
        $('.file-title').click(function (e) {
            var tag = e.target.tagName.toLowerCase();
            if (tag === 'input') return true;

            var href = $(this).closest('a').attr('href');

            // Redirect only after 150 milliseconds
            if (!$(this).data('timer')) {
                $(this).data('timer', setTimeout(function () {
                    window.location = href;
                }, 150));
            }


            return false; // Prevent default action (redirecting)
        });
    }

    $(document).on('click','.panel-import',function(e) {
        console.log('panel import');
        $(e.target).closest('.file-obj').trigger('dblclick');
    });

    $(document).on('click','#more-items',function(e) {
        loadMoreFiles();
    });

    $('.file-title').dblclick(function (e) {
		return; // Disabled
		if (e.target.type == 'input') return;
		clearTimeout($(this).data('timer'));
		$(this).data('timer', null);

		// Show edit block
        var title = $(this).html();
        $(this).html('<input id="filename-edit" type="text" value="'+title+'">');
        $('#filename-edit').focus();

		return false;
	});

	$(document).on("keydown","#filename-edit",function(e) {
        if (e.keyCode == 13 && !e.shiftKey) { // Enter
        	var inputObj = $('#filename-edit');
        	var newFilename = inputObj.val();
        	newFilename.replace('/','-');

        	if (newFilename.length == 0) {
        		alert('Filename cannot be empty');
        		return;
        	}

        	var titleObj = inputObj.closest('.file-title');
        	var row = titleObj.closest('.file-obj');

			if (!row) {
				alert('Cannot get row information');
				return;
			}

			var fileID = row.data('id');

			if (!fileID) {
				alert('Could not get file ID');
				return;
			}

        	titleObj.html(newFilename);

        	// Update folder path
        	if (row.data('type') == 'folder') {
        		var anchor = titleObj.closest('a');
        		var querystring = anchor.attr('href').search;
        		anchor.attr('href','test');
        	}

        	$.post('ajax/file_ops.php',{rename:fileID, title:newFilename}, function(data) {
        		var reply = safeJSONParse(data);

        		if (reply.error) alert(sanitize_string(reply.error));
            }).fail(function(jqXHR, textStatus, errorString) {
                alert(sanitize_string("Failed to rename file: " + errorString));
            });
        }
    });

    // Infinite scrolling
    $(window).scroll(function() {
        var height = $(document).height() - $(window).height();
        var leeway = (height < 4000 ? 0.9:0.95);

        if ($(window).scrollTop() >= height*leeway) {
            loadMoreFiles();
        }
    });

    // Hover scrubbing
    $(document).on('mousemove','.file-thumb', function(e) {
        hoverScrub(e,$(this));
    });

    $(document).on('mouseenter','.file-obj', function(e) {
        preloadHoverscrub(e,$(this));
    });

    // Hover scrubbing
    $(document).on('mouseleave','.file-thumb', function(e) {
        // Hide playhead
        var playhead = $(this).find('.thumb-playhead');
        if (playhead) {
            playhead.css('display','none');
        }
    });

    // File view toggle
    $('#file-view-control').change(function(e) {
        writeCookie('file_view',parseInt($(e.target).val()),365);
        window.location.reload();
    });

    // Color coding
    $(document).on('click','.dropdown-color', function(e) {
        var color_id = $(this).data('color-id');
        if (!color_id || color_id < 0 || color_id > 8) color_id = 0;

        var items = selectedFileIDs();

        var color_classes = ['red','black','orange','green','blue','turquoise','pink','purple'];

        var oldColors = {};

        for (var i=0; i<items.length; i++) {
            var file_id = items[i];
            var file = fileWithID(file_id);
            var file_obj = pageObjectForFileID(file_id);

            oldColors['file_' + file_id] = file.color;
            file.color = color_id;

            for (var j=0; j<color_classes.length; j++) {
                file_obj.removeClass(color_classes[j]);
            }

            if (color_id > 0 && color_id < 9) {
                file_obj.addClass(color_classes[color_id-1]);
            }
        }

        var failed = false;

        $.post('ajax/file_ops.php',{files:items.join(','), color:color_id}, function(data) {
            var reply = safeJSONParse(data);

            if (reply.error) {
                failed = true;
                alert(sanitize_string(reply.error));
            }
        }).fail(function(jqXHR, textStatus, errorString) {
            failed = true;
            alert(sanitize_string("Failed to set file color: " + errorString));
        });

        // Restore old values upon failure
        if (failed) {
            for (let i = 0; i < items.length; i++) {
                const file_id = items[i];
                var file = fileWithID(file_id);
                const file_obj = pageObjectForFileID(file_id);

                const oldColorIndex = oldColors['file_' + file_id];
                file.color = oldColorIndex;

                for (let j = 0; j < color_classes.length; j++) {
                    file_obj.removeClass(color_classes[j]);
                }

                if (oldColorIndex > 0 && oldColorIndex < 9) {
                    file_obj.addClass(color_classes[oldColorIndex - 1]);
                }
            }
        }

        removeMenu();
        batchFileSelect(false);
        return false;
    });

    $(document).on('click','.file-download-btn', function(e) {
        e.preventDefault();

        var fileObj = $(e.target).closest('.file-controls');

        var file_id = fileObj.data('id');
        var obj_type = fileObj.data('type');

        console.log('type: ' + obj_type);

        if (!file_id) {
            alert('Unable to get file ID.');
            return;
        }

        var file = null;
        if (obj_type != 'dept') {
            file = fileWithID(file_id);

            // Get selected files
            var selection = selectedFileIDs();

            // If this file wasn't previously selected, just act on this file alone
            if (selection.indexOf(file_id.toString()) == -1) {
                batchFileSelect(false);
                file['selected'] = true;
                drawSelectionStatus(file_id);
            }
        }

        if (obj_type == 'folder') {
            if (getJSConnectValue('link.id')) {
                window.location.href = 'download_folder?link=' + getJSConnectValue('link.id') + '&path=' + encodePathForURI((file['link_relative_path'] != '/' ? file['link_relative_path'] : '') + '/' + file['title']);
            } else {
                window.location.href = 'download_folder?project=' + getJSConnectValue('project.id') + '&dept=' + getJSConnectValue('upload.dept') + '&path=' + encodePathForURI((file['path'] != '/' ? file['path'] : '') + '/' + file['title']);
            }

        } else if (obj_type == 'dept') {
            window.location.href = 'download_folder?project=' + getJSConnectValue('project.id') + '&dept=' + file_id + '&path=' + encodePathForURI('/');

        } else {
        // Batch download if available
        downloadAll();
    }
    });

    // Modify history to scroll back to this place when playing a file
    $(document).on('click','.file-url',function(e) {
        var _fileID = fileIDForElement(e.target);
        if (!_fileID || _fileID < 1) return;

        if (e.target.nodeName.toLowerCase() == 'input') return;

        addFileIDToHistory(_fileID);
    });

    $(document).on('click','.revision-title',function(e) {
        var _fileID = fileIDForElement(e.target);
        if (!_fileID || _fileID < 1) return;

        addFileIDToHistory(_fileID);
    });

    $(document).on('click','.file-date',function(e) {
        // Toggle between relative and absolute dates
        var dateType = parseInt(window.localStorage.getItem('file_date_type'));
        dateType = (dateType === 1 ? 0:1);
        window.localStorage.setItem('file_date_type',dateType);
        updateDatesForFiles();
    });

    window.setInterval(function() {
        updateDatesForFiles();
    },60000); // Every 60 secs

    window.setInterval(function() {
        refreshUploadAuthorization(getJSConnectValue("project.id"));
    }, 40 * 60 * 1000); // Every 40 mins

    // To make folders refresh when back button pressed
    window.addEventListener("popstate", function(event) {
        var state = event.state;

        if (typeof state !== "undefined" &&
            state &&
            typeof state['dept'] !== "undefined" &&
            typeof state['dept_name'] !== "undefined" &&
            typeof state['path'] !== "undefined" &&
            typeof state['apps'] !== "undefined" &&
            typeof state['app_id'] !== "undefined" &&
            typeof state['app_name'] !== "undefined") {

            navigateToFolder(state['dept'],state['dept_name'],state['path'],state['apps'],state['app_id'],state['app_name'],true);
        } else {
            location.reload();
        }
    });

    $(document).on("contextmenu",".filetable th", function(event) {
        var availableCols = availableFileColumns();
        var selectedCols = currentFileColumnTitles();

        var menu_html = '<ul style="display:none">';

        for (var i=0; i<availableCols.length; i++) {
            var col = availableCols[i];

            menu_html += '<li data-name="' + col.name + '"';
            if (col.name == "name") menu_html += ' disabled="disabled"';
            if (selectedCols.indexOf(col.name) > -1) menu_html += ' class="ui-checked"';
            menu_html += '><a href="#" onclick="toggleColumn(\'' + col.name + '\')">' + col.title + '</a></li>';
        }

        menu_html += '<li>-</li><li><a href="#" onclick="resetFileColumns()">Reset to Defaults</a></li>';
        menu_html += '</ul>';

        var menu = $(menu_html);
        showMenuForEvent(menu,event);
    });

    setupKeyboardShortcuts();
});

function toggleFavorite(file_id)
{
    // Get selected files
    var selection = selectedFileIDs();

    // If this file wasn't previously selected, just act on this file alone
    if (file_id && selection.indexOf(+file_id) < 0) {
        batchFileSelect(false);
        selection = [file_id];
    }

    $.post("ajax/favorites.php",{toggle:selection.join(','),type:0}, function() {
        for (var i=0; i<selection.length; i++) {
            var obj = $('.file-controls[data-id="' + selection[i] + '"] .favoritebtn');

            if (obj.hasClass('favorite')) {
                obj.removeClass('favorite');
                obj.attr('title','Favorite');
            } else {
                obj.addClass('favorite');
                obj.attr('title','Unfavorite');
            }
        }
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to set favorite: " + errorString));
    });
}

function loadMoreFiles()
{
    if (!isLoadingFiles && (files.length === 0 || moreFilesAvailable)) {
        loadFiles();
    }
}

function processFileClick(event)
{
    if (isIOS || isIphone) return;

    var elementObj = pageObjectForElement(event.target);
    if (elementObj === undefined || !elementObj) return;

    if (event.ctrlKey || event.metaKey) { // Ctrl / Cmd
        toggleFileSelection(elementObj.data('id'));
    } else if (event.shiftKey) { // Select range
        var currentIndex = elementObj.index();
        if (fileView == 0) currentIndex--; // Account for header
        appendFileRangeSelection(currentIndex);

    } else {
        var currentIndex = elementObj.index();
        if (fileView == 0) currentIndex--; // Account for header

        var selectedIndexes = selectedFileIndexes();

        if (selectedIndexes.length > 1 ||
            (typeof files !== "undefined" &&
                typeof currentIndex !== "undefined" &&
                selectedIndexes.length > 0 &&
                currentIndex > -1 &&
                typeof files[currentIndex] !== "undefined" &&
                !files[currentIndex]['selected'])) {

            batchFileSelect(false);
        }

        toggleFileSelection(pageObjectForElement(event.target).data('id'));
    }

    setupDraggableRows(selectedFiles(),-1);

    // Change QuickLook preview
    if ($('#file-preview').length) {
        var selection = selectedFiles();

        if (selection.length > 0)showPreviewForFile(selection[0],false);
    }
}

function showFileDropdown(_file_id) {
    var file = fileWithID(_file_id);
    if (file) {
        file['selected'] = true;
        drawSelectionStatus(_file_id);
    }

    const element = generateDropdownForFileID(_file_id);

    if (element) {
        const btnObj = $('.file-obj[data-id="' + _file_id + '"] .file_dropdown');

        showMenuForButton(btnObj, element);
    }
}

function moveItems(items)
{
    if (typeof items === 'undefined' || items.length === 0)
        items = selectedFileIDs(); 	// Get selected items

	if (items.length === 0) {
		alert("You must select one or more items before performing this action.");
		return;
	}

    window.location = "move?move="+encodeURIComponent(items.join(','));

	// New backend
//	showMoveDialogForFileIDs(items);
}

function makeIndependent(items,all)
{
    if (typeof items === 'undefined' || !items || items.length === 0)
        items = selectedFileIDs(); 	// Get selected items

    if (items.length === 0) {
        alert("You must select one or more items before performing this action.");
        return;
    }

    var params = {revsplit:1,items:items.join(',')};
    if (all) params['all'] = 1;

    $.post("ajax/file_ops.php",params, function(data) {
        var json = safeJSONParse(data);

        if (json.error) {
            alert(sanitize_string(json.error));
        } else if (!json["success"]) {
            alert("Unknown error");
        } else {
            window.location.reload();
        }
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to split versions: " + errorString));
    });
}

function combineRevisions()
{
    var items = selectedFileIDs(); 	// Get selected items

    if (items.length < 2) {
        alert("You must select two or more items before performing this action.");
        return;
    }

    // Check for folders
    for (var i in items) {
        var obj = $('.file-obj[data-id='+items[i]+']');

        if (obj.data('type') === 'folder') {
            alert('You cannot combine folders in a revision.');
            return;
        } else if (obj.data('alias') > 0) {
            alert('You cannot combine aliases in a revision.');
            return;
        }
    }

    $.post("ajax/file_ops.php",{revcombine:1, items:items.join(',')}, function(data) {
        var json = safeJSONParse(data);

        if (json.error) {
            alert(sanitize_string(json.error));
        } else if (!json["success"]) {
            alert("Unknown error");
        } else {
            window.location.reload();
        }
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to combine versions: " + errorString));
    });
}

function openFileInNewTab()
{
    var items = selectedFileIDs(); // Get selected items

    if (items.length < 1) {
        alert("You must select one or more items before performing this action.");
        return;
    }

    // Check for folders
    for (var i in items) {
        var obj = $('.file-obj[data-id=' + items[i] + ']');
        var url = obj.find('a.file-url')[0].href;
        var file = fileWithID(items[i], files);

        // Mark as viewed
        if (file.type >= 0 && file.type != 4) {
            file.unviewed = false;
            obj.find('.file-unviewed').hide();

            // Increment view count
            file.views++;
            obj.find('.file-view-count').text(file.views);
        }

        window.open(url, '_blank');
    }
}

function togglePin()
{
    var items = selectedFileIDs(); 	// Get selected items

    if (items.length == 0) {
        alert("You must select an item before performing this action.");
        return;
    }

    $.post("ajax/file_ops.php",{togglepin:1, items:items.join(',')}, function(data) {
            var json = safeJSONParse(data);

            if (json.error) {
                alert(sanitize_string(json.error));
            } else if (!json["success"]) {
                alert("Unknown error");
            } else {
                window.location.reload();
            }
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to pin items: " + errorString));
    });
}

function markAsUnviewed(unviewed)
{
    closeMenu();
    var items = selectedFileIDs(); 	// Get selected items

    if (items.length == 0) {
        alert("You must select an item before performing this action.");
        return;
    }

    var oldStatuses = {};

    // TODO: Support folders
    for (var i=0; i < items.length; i++) {
        var file_id = items[i];
        var file = fileWithID(items[i]);

        if (!file['id'] || parseInt(file['type']) == 4) {
            alert('You cannot mark folders as viewed.');
            return;
        }

        oldStatuses['file_' + file.id] = file.unviewed;

        var obj = pageObjectForFileID(file_id);

        if (file && obj.length) {
            file.unviewed = unviewed;
            renderFile(file, obj, true, false);
        }
    }

    var failed = false;

    $.post("ajax/file_ops.php",{markunviewed: unviewed, items: items.join(','), project: getJSConnectValue('project.id')}, function(data) {
        var json = safeJSONParse(data);

        if (json["error"]) {
            failed = true;
            alert(sanitize_string(json["error"]));
        } else if (!json["success"]) {
            failed = true;
            alert("Unknown error");
        }
    }).fail(function(jqXHR, textStatus, errorString) {
        failed = true;
        alert(sanitize_string("Failed to pin items: " + errorString));
    });

    // Restore old values upon failure
    if (failed) {
        for (let i=0; i < items.length; i++) {
            const file_id = items[i];
            const file = fileWithID(file_id);
            const obj = pageObjectForFileID(file_id);

            if (file && obj.length) {
                file.unviewed = oldStatuses['file_' + file_id];
                renderFile(file, obj, true, false);
            }
        }
    }
}

function editMetadata()
{
	// Get selected items
	var items = selectedFileIDs();

	if (items.length === 0) {
		alert("You must select at least one item before performing this action.");
		return;
	}

    // Check for folders
    if (items.length > 1) {
        for (var i in items) {
            if ($('.file-obj[data-id=' + items[i] + ']').data('type') === 'folder') {
                alert('You cannot batch edit folder metadata.');
                return;
            }
        }
    }

	window.location = "metadata?edit="+items.join(',');
}

function showCaptionExportDialog()
{
    $(".menu").hide();
    $("#subtitle_export_dialog").dialog({title: 'Export Captions', width: 400});
}

function exportCaptions()
{
    const items = selectedFileIDs(); 	// Get selected items

    if (items.length === 0) {
        alert("You must select one or more items before performing this action.");
        return;
    }

    const lang = document.getElementById("subtitle_export_language").value;
    const format = document.getElementById("subtitle_export_format").value;

    const url = "export?subtitles=" + items.join(",") + "&language=" + lang + "&format=" + format;
    window.location.href = url;
}

function showCommentExportDialog()
{
    $(".menu").hide();
    commentExportFormatChanged();
    $("#comment_export_dialog").dialog({title:'Export Comments',width:400});
}

function commentExportFormatChanged()
{
    const selectedVal = $('#comment_export_format').val();

    if (selectedVal == 1) { // Avid
        $("#comment_export_track_row").show();
    } else {
        $("#comment_export_track_row").hide();
    }
}

function exportComments()
{
    const items = selectedFileIDs(); 	// Get selected items

    if (items.length === 0) {
        alert("You must select one or more items before performing this action.");
        return;
    }

    const format = document.getElementById("comment_export_format").value;
    const color = document.getElementById("comment_export_color_filter").value;
    const track = document.getElementById("comment_export_track").value;
    const favorites = document.getElementById("comment_export_favorites").checked ? 'on' : 'off';
    const todo = document.getElementById("comment_export_todo").checked ? 'on' : 'off';
    const replies = document.getElementById("comment_export_replies").checked ? 'on' : 'off';
    const done = document.getElementById("comment_export_done").checked ? 'on' : 'off';
    const combineVersions = document.getElementById("comment_export_combine_versions").checked ? 'on' : 'off';
    const combine = document.getElementById("comment_export_combine").checked ? 'on' : 'off';

    let url = "export?comments=" + items.join(",") + "&format=" + format;
    url += "&export_color_filter=" + color;
    url += "&favorites=" + favorites;
    url += "&todo=" + todo;
    url += "&replies=" + replies;
    url += "&done=" + done;
    url += "&combine_versions=" + combineVersions;
    url += "&combine=" + combine;

    if (+format === 1) { // Avid
        url += "&track=" + track;
    }

    window.location.href = url;
}

function initializeSorting()
{
    var sort_key = 'date';
    var sort_desc = true;

    if (getCookie('file_sort')) {
        sort_key = getCookie('file_sort');
        sort_desc = false;

        if (getCookie('file_sort_desc')) sort_desc = true;
    }

    setupSorting(sort_key,sort_desc);
}

function setupSorting(sortKey,isDesc)
{
    if (!sortKey || sortKey.length === 0) return;

    // Reset everything
    $('.sort-icon').css('opacity','0').removeClass('sort-desc').addClass('sort-asc');

    var sortIcon = $('#'+sortKey+'.sort-icon');
    if (isDesc) {
        sortIcon.removeClass('sort-asc');
        sortIcon.addClass('sort-desc');
    }

    sortIcon.css('display','inline-block');

    $('.sort-icon').parent('th').off('mouseenter.sorting').on('mouseenter.sorting', function() {
            $(this).find('.sort-icon').css('opacity','1.0');
        }).off('mouseleave.sorting').on('mouseleave.sorting', function() {
            var iconObj = $(this).find('.sort-icon');
            if (iconObj.attr('id') != sortKey) {
                iconObj.css('opacity','0');
            }
        });

    $('.sort-asc').parent('th').off('click').on('click', function(e) {
        if ($(e.target).hasClass('resizer')) return;
        var sort_id = $(this).find('.sort-icon').attr('id');

        changeSorting(sort_id,(sort_id == sortKey));
    });

    $('.sort-desc').parent('th').off('click').on('click', function(e) {
        if ($(e.target).hasClass('resizer')) return;
        changeSorting($(this).find('.sort-icon').attr('id'),false);
    });
}

function changeSorting(sort_id,desc)
{
    if (sort_id) {
        writeCookie('file_sort',sort_id,365);

        if (desc) {
            writeCookie('file_sort_desc',desc,365);
        } else {
            writeCookie('file_sort_desc',desc,null);
        }

        reloadAllFiles();
        setupSorting(sort_id,desc);
    }
}

function setupDraggableRows()
{
    if (isLink || isPanel || isIOS || isTouchDevice) return;

    var fileTypes = ['file','video','audio','image','comment-stream','document','compressed'];
    var fileTypeSelector = '.file-obj[data-type=' + fileTypes.join('],.file-obj[data-type=') + ']';

    $(fileTypeSelector + ",.file-obj[data-type=folder]").draggable({
        revert: "invalid",
        helper: "clone",
        start: function(event, ui) {
            c.tr = this;
            c.helper = ui.helper;
            var fileID = c.helper.data('id');

            // Make sure current row is selected
            var file = fileWithID(fileID);
            if (!file) return;
            file['selected'] = true;
            drawSelectionStatus(fileID);

            var selection = selectedFileIndexes();

            c.helper.find('input').remove();
            c.helper.find('.file-controls').remove();
            c.helper.find('td').not(':nth-child(1),:nth-child(2)').remove();
            c.helper.find('td').not(':nth-child(1)').css('width','100%');
            c.helper.css('opacity','0.8');
            if (selection.length > 1) $('<div class="drag-badge">'+selection.length+'</div>').appendTo(c.helper);
        },
        drag: function(event,ui) {
            c.helper.width($('#fileTable').width());
        }
    });

    $(".file-obj[data-type=folder]:not(.selected),.file-obj[data-type=dept],.nav-drop[data-type=folder],.nav-drop[data-type=dept]").droppable({
        accept: fileTypeSelector + ",.file-obj[data-type=folder]",
        hoverClass: "filetablerowdrop",
        refreshPositions: "true",
        tolerance: "pointer",
        drop: function(event, ui) {
            var selection = selectedFiles();
            var droppedID = $(this).data('id').toString();
            var droppedType = $(this).data('type');

            // Don't allow dropping a folder onto itself
            if (droppedType != 'dept') {
                var selectedIDs = selectedFileIDs();
                var folderIndex = selectedIDs.indexOf(droppedID);

                if (folderIndex > -1) {
                    if (selection.length > folderIndex) selection.splice(folderIndex,1);
                }
            }

            var ids = '';
            for (var i=0; i<selection.length; i++) {
                if (ids.length > 0) ids += ',';
                ids += selection[i]['id'];
            }

            if (droppedType == 'dept') {
                $.post( "ajax/file_ops.php",{move: ids, dept: droppedID, folder:-1, project_id: getJSConnectValue('project.id')}, function( data ) {
                    var json = safeJSONParse(data);

                    if (json.error) {
                        alert(sanitize_string(json.error));
                    } else if (!json["success"]) {
                        alert("Unknown error");
                    } else {
                        for (var i=0; i<selection.length; i++) {
                            $('.file-obj[data-id='+selection[i]['id']+']').remove();
                        }

                        if (droppedID > 0) {
                            reloadDepartment(droppedID, $('.file-obj[data-type="dept"][data-id=' + droppedID + ']'))
                        }
                    }

                    batchFileSelect(false);
                }).fail(function(jqXHR, textStatus, errorString) {
                    alert(sanitize_string("Failed to move files: " + errorString));
                });

            } else {
                $.post( "ajax/file_ops.php",{move: ids, dept: (droppedID == -1 ? -1 : getJSConnectValue('folder.dept_id')), folder:droppedID, project_id: getJSConnectValue('project.id')}, function( data ) {
                    var json = safeJSONParse(data);

                    if (json.error) {
                        alert(sanitize_string(json.error));
                    } else if (!json["success"]) {
                        alert("Unknown error");
                    } else {
                        for (var i=0; i<selection.length; i++) {
                            $('.file-obj[data-id='+selection[i]['id']+']').remove();
                        }

                        if (droppedID > 0 && !event.target.classList.contains("nav-drop")) {
                            reloadFile(droppedID, $('.file-obj[data-type="folder"][data-id=' + droppedID + ']'))
                        }
                    }

                    batchFileSelect(false);
                }).fail(function(jqXHR, textStatus, errorString) {
                    alert(sanitize_string("Failed to move files: " + errorString));
                });
            }

            $(c.helper).remove();
        }
    });

    $(fileTypeSelector.replace(/]/g, ']:not(.selected)')).droppable({
        accept: fileTypeSelector,
        hoverClass: "filetablerowdrop",
        drop: function(event, ui) {
            if (isRev) {
                // Reorder versions
                $.post("ajax/file_ops.php", {revreorder:$(this).data('id'), insert_before:ui.draggable.data('id')}, function (data) {
                    var json = safeJSONParse(data);

                    if (json.error) {
                        alert(sanitize_string(json.error));
                    } else if (!json["success"]) {
                        alert("Unknown error");
                    } else {
                        window.location.reload();
                    }
                }).fail(function (jqXHR, textStatus, errorString) {
                    alert(sanitize_string("Failed to reorder versions: " + errorString));
                });

            } else {
                if (ui.draggable.data('alias') > 0 || $(this).data('alias') > 0) {
                    alert('Aliases cannot be combined in versions.');
                    $(c.helper).remove();
                    return;
                }

                if (ui.draggable.data('type') == 'folder' || ui.draggable.data('type') == 'dept' ||
                    $(this).data('type') == 'folder' || $(this).data('type') == 'dept') {
                    alert('Folders cannot be combined in versions.');
                    $(c.helper).remove();
                    return;
                }

                if (confirm('Are you sure you wish to combine these versions?')) {
                    var items = $(this).data('id') + ',' + ui.draggable.data('id');
                    $.post("ajax/file_ops.php", {revcombine: 1, items: items, project: getJSConnectValue('project.id')}, function (data) {
                        var json = safeJSONParse(data);

                        if (json.error) {
                            alert(sanitize_string(json.error));
                        } else if (!json["success"]) {
                            alert("Unknown error");
                        } else {
                            window.location.reload();
                        }
                    }).fail(function (jqXHR, textStatus, errorString) {
                        alert(sanitize_string("Failed to combine versions: " + errorString));
                    });
                }
            }

            $(c.helper).remove();
        }
    });
}

function processFiles(newFiles)
{
    if (files.length === 0 && newFiles.length > 0 && (fileView === 1 || fileView === 2)) {
        $("#filetablecontainer").removeClass("filetable-dropzone").html("");
    }

    // Get selected file ID from URL
    var selectedFileID = 0;
    var match = window.location.href.match(/show=(\d+)/);
    if (match && match.length > 1) selectedFileID = parseInt(match[1]);

    var selectedFileFound = false;
    var newFileCount = 0;

    for (var i=0; i<newFiles.length; i++) {
        var newFile = newFiles[i];

        // Ignore last file
        if (newFileCount <= 20) {
            files.push(newFile);

            if (selectedFileID > 0 && parseInt(newFile['id']) === selectedFileID) {
                selectedFileFound = true;
                newFile['selected'] = true;
            }
        }

        // Ignore departments when getting number of files returned
        if (newFile['id']) newFileCount++;
    }

    if (newFileCount > 20) { // More files available
        $("#more-items").show();
        moreFilesAvailable = true;
    } else {
        $("#more-items").hide();
        moreFilesAvailable = false;
    }

    fileStart += newFileCount;
    renderFiles(null,newFiles);

    if (selectedFileFound) {
        window.setTimeout(function() { scrollToFileID(selectedFileID); }, 10);
    }
}

function reloadFile(fileID,destObj,callback)
{
    reloadFiles([fileID],[destObj],callback);
}

function reloadFiles(fileIDs,destObjs,callback)
{
    // Run on thread to prevent it locking the UI
    if (typeof(Worker) !== "undefined") {
        var fileReloadWorker = new Worker("js/worker.file-load.js?v=" + getJSConnectValue('site.script_version'));

        var isRevision = getJSConnectValue('upload.rev', -1) > -1;
        fileReloadWorker.postMessage("id="+encodeURIComponent(fileIDs.join(',')) + (isRevision ? "&rev=" + getJSConnectValue('upload.rev') : '') + "&project=" + getJSConnectValue('project.id'));

        fileReloadWorker.onmessage = function (event) {
            fileReloadWorker.terminate();

            var newFiles = safeJSONParse(event.data);

            if (!newFiles) {
                alert("Unable to load files");
                return;
            }

            if (newFiles.length > 0) {
                var fileObjs = [];

                for (var i=0; i<newFiles.length; i++) {
                    var newFile = newFiles[i];

                    // Replace existing item if found
                    var existingIndex = indexForFileID(newFile.id);

                    if (existingIndex > -1) {
                        files.splice(existingIndex, 1, newFile);
                    } else {
                        files.push(newFile);
                    }

                    // Note that returned files may be in a different order - preserve original order
                    const idIndex = fileIDs.indexOf(newFile.id);
                    if (idIndex < 0) continue;

                    var fileObj = renderFile(newFile, destObjs[idIndex], true);
                    fileObjs.push(fileObj);

                    if (!isRevision) removeRevisionDuplicates(newFile);
                }

                if (callback) setTimeout(function(){ callback(fileObjs); },1);
            }
        };

    } else {
        console.log("Unable to reload file - this browser does not support Web Workers");
        alert("Unable to reload file - this browser does not support Web Workers");
    }
}

async function reloadDepartment(deptID, destObj, callback)
{
    const obj = await postData("ajax/file_ops", {dept_reload: deptID, project: getJSConnectValue("project.id", -1)});

    if (obj.error) {
        logError("Unable to reload department: " + JSON.stringify(data));
        return;
    }


    for (let i = 0; i < files.length; i++) {
        if (+files[i].dept_id === +obj.dept_id) {

            files.splice(i, 1, obj);

            const fileObj = renderFile(obj, destObj, true);

            if (callback) setTimeout(function () {
                callback([fileObj]);
            }, 1);

            return;
        }
    }

    logError("Unable to reload department: dept " + deptID + " not found");
}

function showNewDropdown()
{
    $('#new_dropdown').show().menu();
}

function showAliasDialog()
{
    removeMenu();

    var allItems = selectedFileIDs();
    var items = selectedItemIDsByType(null,["Folder","Upload"]);

    if (items.length === 0 && allItems.length === 0) {
        alert('You must select one or more files.');
    } else if (items.length === 0 && allItems > 0) {
        alert('Aliases cannot be created for folders.');
    } else {
        $('#alias_file_ids').val(items.join(','));
        $('#alias_dialog').dialog({title: 'Create Alias'});
    }
}

function createAliases()
{
    $('#alias_dialog').dialog('close').hide();

    var aliasIDs = $('#alias_file_ids').val();
    var relinkAlias = $('input[name=relink_alias]:checked').val();

    $.post("ajax/file_ops",{alias:aliasIDs, relink_alias:relinkAlias},function(data) {
        var json = safeJSONParse(data);

        if (json) {
            if (json["error"]) {
                alert(sanitize_string(json["error"]));
            } else if (json["aliases"]) {
                var items = json["aliases"];
                var newIDs = [];
                var destObjs = [];

                for (var i in items) {
                    var item_id = items[i]["id"];
                    createNewAliasObject(item_id, items[i]["alias_to"]);

                    newIDs.push(item_id);

                    var destObj = pageObjectForFileID(item_id);
                    if (destObj.length) destObjs.push(destObj);
                }

                reloadFiles(newIDs,destObjs, function() {
                    if (newIDs.length > 0) {
                        scrollToFileID(newIDs[0]);
                        renameFile(newIDs[0]);
                    }
                });

            } else {
                alert("Unknown error");
            }
        }
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to create alias: " + errorString));
    });
}


function getQueryVar(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
    return null;
}

// Hoverscrubbing

function preloadHoverscrub(e, destObj)
{
    var hoverObj = destObj.find('.preload.hoverthumb');

    if (typeof hoverObj !== "undefined" && hoverObj.length) {
        var hoverURL = hoverObj.data('src');
        hoverObj.removeClass("preload");
        $("body").append($("<link rel=\"preload\" as=\"image\" href=\"" + hoverURL + "\">"));
    }
}

function hoverScrub(e,destObj)
{
    // Detect if hoverscrub is supported
    var hoverImg = destObj.find('.hoverthumb').data('src');

    if (typeof hoverImg !== "undefined" && hoverImg) {
        let pos = e.clientX - destObj.offset().left;

        // Select frame
        let frameWidth = (fileView == 1 ? 240 : 120);
        let frameNumber = Math.ceil((parseFloat(pos) / frameWidth)*100.0)-1;
        if (frameNumber > 99) frameNumber = 99;
        if (frameNumber < 0) frameNumber = 0;

        destObj.css('background','url("'+hoverImg+'")');
        destObj.css('background-size', (frameWidth * 100) + "px");
        destObj.css('background-repeat','no-repeat');
        destObj.css('background-position','-'+(frameNumber*frameWidth)+"px center");
        destObj.css('background-color','#000');

        // Draw playhead
        const playhead = destObj.find('.thumb-playhead');
        if (playhead) {
            playhead.css('display','block');
            playhead.css('left',frameNumber+'%');
        }
    }
}

function ensureElementIsOnScreen(element,container)
{
    if (!element.length) return;

    if (!element.visible()) {
        $('html, body').animate({
            scrollTop: element.offset().top
        }, 200);
    }
}

function showContextMenu(_fileID,top,left)
{
    $('#context-menu').remove();

    let menuElement = null;

    if (_fileID && _fileID > 0) {
        menuElement = generateDropdownForFileID(_fileID);
        menuElement.attr('id', 'context-menu');

        // Context-relevant options
        if (!isPanel) {
            var selectedItems = selectedFiles();
            var folderCount = 0, fileCount = 0, aliasCount = 0;

            for (var i = 0; i < selectedItems.length; i++) {
                var item = selectedItems[i];

                if (parseInt(item['type']) === 4) {
                    folderCount++;
                } else {
                    fileCount++;
                }

                if (item['alias_to'] > 0) aliasCount++;
            }

            // Combine Versions
            if (selectedItems.length > 1 && folderCount === 0 && aliasCount === 0 && !isRev) {
                menuElement.prepend('<li><a href="#" onclick="combineRevisions()">Combine Versions</a></li>');
            }

            if (selectedItems.length == 1 && folderCount == 0 && isRev) {
                menuElement.prepend('<li><a href="#" onclick="renameVersion(\''+_fileID+'\')">Rename Version</a>');
            }
        }
    }

    if ((!menuElement || !menuElement.length) && !isPanel) menuElement = $('<ul id="context-menu" class="menu"></ul>'); // If not file, just show New menu

    if (!isPanel) menuElement.prepend('<li><a href="#">New</a> <ul><li><a href="#" onclick="newFolder()"><img class="icon" src="img/Folder.svg" /> Folder</a></li><li><a href="#" onclick="createCommentStream()"><img class="icon" src="img/Comment_Stream.svg" /> Comment Stream</a></li></ul>');

    if (menuElement.length) {
        menuElement.appendTo('body');
        menuElement.show().menu().css({
            position: "absolute",
            top: top + "px",
            left: left + "px",
            maxWidth: "200px"
        });
    }
}

function renameFile(fileID)
{
    removeMenu();

    var pageObj = pageObjectForFileID(fileID);
    var titleObj = pageObj.find('.file-title');
    var href = pageObj.find(".file-url");
    var textBox = pageObj.find(".text-edit");

    // Check if it's already being edited
    if (textBox.length) {
        textBox.focus();
        return;
    }

    // Remove link href so it doesn't trigger while renaming
    if (href.length) {
        href.attr("data-href", href.prop("href"));
        href.prop("href", "#");
    }

    if (titleObj.length) {
        editTextLabel(titleObj, function (new_name) {
            new_name = sanitizeFileTitle(new_name);

            var href = pageObj.find(".file-url"); // Object may have reloaded so get new href

            // Restore href
            if (href.length) {
                href.prop("href", href.attr("data-href"));
                href.removeAttr("data-href");
            }

            $.post('ajax/file_ops.php',{rename:fileID, title:new_name}, function(data) {
                var reply = safeJSONParse(data);

                if (reply['error']) {
                    alert(sanitize_string(reply['error']));
                }

                reloadFile(fileID,pageObj);

            }).fail(function(jqXHR, textStatus, errorString) {
                alert(sanitize_string("Failed to rename file: " + errorString));
            });
        }, function(obj) {
            var href = obj.closest(".file-url");

            // Restore href
            if (href.length) {
                href.prop("href", href.attr("data-href"));
                href.removeAttr("data-href");
            }
        });
    }

    return false;
}

function renameVersion(fileID)
{
    removeMenu();

    var file = fileWithID(fileID);
    var pageObj = pageObjectForFileID(fileID);
    var titleObj = pageObj.find('.file-revision-name');

    if (titleObj.length) {
        editTextLabel(titleObj, function (new_name) {

        $.post('ajax/file_ops.php', {renameversion: fileID, title: new_name}, function (data) {
            new_name = sanitizeFileTitle(new_name);

            var reply = safeJSONParse(data);

            if (reply['error']) {
                alert(sanitize_string(reply['error']));
            }
            }).fail(function (jqXHR, textStatus, errorString) {
                alert(sanitize_string("Failed to rename version: " + errorString));
            });
        });
    }

    return false;
}

function downloadAll()
{
    var items = selectedFiles();
    if (items.length === 0) return;

    var href_obj = document.createElement('a');
    document.body.appendChild(href_obj);

    var file = items[0];

    processNextDownloadQueueItem(items,(isLink ? file['link_id']:null),100, href_obj);
}

function processNextDownloadQueueItem(items,link_id,delay, href_obj)
{
    if (!items || items.length == 0) {
        if (href_obj) document.body.removeChild(href_obj);
        return;
    }

    var file = items.pop();

    // Upload download count
    file.downloads++;

    const fileObj = pageObjectForFileID(file.id);
    fileObj.find('.file-download-count').text(file.downloads);

    // 100ms timeout for compatibility
    setTimeout(
        function () {
            downloadFileID(file["id"],link_id,href_obj);

            var delay_multiplied = delay * 1.8;
            if (delay_multiplied / delay > 18) delay_multiplied = delay*18;

            processNextDownloadQueueItem(items, link_id, delay_multiplied, href_obj);

        }, delay);
}

function downloadFileID(file_id,link_id,href_obj)
{
    var downloadURL = 'download?id=' + file_id + (link_id ? '&link='+link_id:'');

    // Create dummy href
    if (!href_obj) {
        href_obj = document.createElement('a');
        document.body.appendChild(href_obj);
    }

    href_obj.setAttribute('download', '');
    href_obj.style.display = 'none';


    // Create dummy href
    href_obj.setAttribute('href', downloadURL);
    href_obj.click();
}

function addFileIDToHistory(_fileID)
{
    if (window.history) {
        // Add clicked file ID to the URL path
        var newURL = window.location.href.replace(/show=+\d+/g,"");
        if (newURL.length > 1 && (newURL.substr(-1) === "?" || newURL.substr(-1) === "&" || newURL.substr(-1) === "#")) newURL = newURL.substr(0,newURL.length-1);
        newURL += (newURL.indexOf('?') > -1 ? '&':'?') + 'show='+_fileID;

        window.history.replaceState(window.history.state, '', newURL);
    }
}

function clearSearch()
{
    if (typeof URLSearchParams !== 'undefined') {
        var url = new URL(window.location.href);
        var params = new URLSearchParams(url.search.slice(1));
        params.delete('search');
        params.delete('searchparams');

        window.location.href = 'files' + (params.toString() !== '' ? '?' + params.toString():'');

    } else {
        console.log('Your browser does not support URLSearchParams');
    }
}

function removeMenu()
{
    $(".menu").hide();
    $(".temp-popup-menu").remove();
    $('#context-menu').remove();
}

function sanitizeFileTitle(title)
{
    title = title.replace(new RegExp('["\\\+]', 'g'), '');
    title = title.replace(new RegExp('/', 'g'), '-');

    return title.trim();
}

function loadFiles()
{
    if (isLoadingFiles) return;

    isLoadingFiles = true;
    $("#item-load-spinner").show();

    // Run on thread to prevent it locking the UI
    if (typeof(Worker) !== "undefined") {
        if (fileLoadWorker) fileLoadWorker.terminate();

        fileLoadWorker = new Worker("js/worker.file-load.js?v=" + getJSConnectValue('site.script_version'));

        var search_query = '';

        if (typeof URLSearchParams !== 'undefined') {
            var urlParams = new URLSearchParams(window.location.search);
            search_query = (urlParams.get('search') ? '&search=' + encodeURIComponent(urlParams.get('search')) : '');
        }

        var search_params = (getJSConnectExists('folder.search_params') ? '&searchparams=' + encodeURIComponent(btoa(getJSConnectValue('folder.search_params'))) : '');

        fileLoadWorker.postMessage("path=" + encodeURIComponent(getJSConnectValue('folder.path')) + "&dept=" + getJSConnectValue('folder.dept_id') + "&project=" + getJSConnectValue('project.id') + (getJSConnectValue('folder.rev', -1, false) && getJSConnectValue('folder.rev') > -1 ? "&rev=" + getJSConnectValue('folder.rev'):'') + search_query + search_params + (getJSConnectExists('link') ? "&link=" + getJSConnectValue('link.id'):'') + '&start='+fileStart);

        fileLoadWorker.onmessage = function (event) {
            fileLoadWorker.terminate();
            fileLoadWorker = null;

            $("#item-load-spinner").hide();

            var newFiles = safeJSONParse(event.data);

            if (!newFiles) {
                alert("Unable to load files");
                isLoadingFiles = false;
                return;
            }

            processFiles(newFiles);
            isLoadingFiles = false;
        };

    } else {
        console.log("Unable to load files - this browser does not support Web Workers");
        alert("Unable to load files - this browser does not support Web Workers");
    }
}

function newFolder()
{
    $.post("ajax/file_ops",{newfolder:1, name:"New Folder", dept:getJSConnectValue('folder.dept_id'), parent:getJSConnectValue('folder.path'), project:getJSConnectValue('project.id')},function(data) {
        var json = safeJSONParse(data);

        if (json) {
            if (json["error"]) {
                alert(sanitize_string(json["error"]));
            } else if (json["id"]) {
                var id = json["id"];

                var newFolder = createNewFolderObject(id, json["name"]);

                scrollToFileID(id);
                renameFile(id);
            } else {
                alert("Unknown error");
            }
        }
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to create new folder: " + errorString));
    });
}

function shareCurrentFolder()
{
    shareFolder(getJSConnectValue('folder.dept_id'), getJSConnectValue('folder.path'), $('#share-cur-folder'));
}

function toggleColumn(name)
{
    var curCols = currentFileColumnTitles();

    if (curCols.indexOf(name) > -1) {
        curCols.splice(curCols.indexOf(name),1);
        $('li[data-name="' + name + '"]').removeClass('ui-checked');
    } else {
        curCols.push(name);
        $('li[data-name="' + name + '"]').addClass('ui-checked');
    }

    writeCookie('fileTable_columns',curCols.join(','),365);
    reloadTableColumns();
    reloadAllFiles();
}

function resetFileColumns()
{
    closeMenu();
    writeCookie('fileTable_columns','',-1);
    deleteLocalStorage('fileTable_column_widths');
    reloadTableColumns();
    reloadAllFiles();
}

function upload()
{
    var url = 'upload?upload&dept=' + getJSConnectValue('folder.dept_id') + '&parent=' + encodeURIComponent(getJSConnectValue('folder.path')) + '&project=' + getJSConnectValue('project.id');

    if (getJSConnectValue('folder.rev', -1, false) > -1) {
        url += '&rev=' + getJSConnectValue('folder.rev');
    } else {
        // Get selected items
        var items = selectedFileIDs();

        if (items.length > 0) {
            url += '&rev=' + items[0];
        }
    }

    window.location.href = url;
}

function selectionChanged()
{
    var items = selectedItemIDsByType(null,["Folder","Upload"]);

    if (items.length === 0 && +getJSConnectValue('folder.rev', -1, false) === -1) {
        $("#btnUpload").html("Upload");
    } else {
        $("#btnUpload").html("Upload New Version");
    }
}

function confirmNavEvent(obj)
{
    if ($(obj).hasClass('file-url')) {
        if (fileObjectNameIsEditing($(obj))) {
            return false;
        }
    }

    return true;
}

function showMoveDialogForFileIDs(file_ids)
{
    showItemBrowser(false, true, true, true, getJSConnectValue('upload.dept'), getJSConnectValue('upload.path'), -1, [], [], function(itemID, itemTitle, itemIconURL, deptID, folderPath, deptName, projectID) {
        $.post('ajax/move.php', {ids: file_ids.join(','), dept: deptID, path: folderPath, project: projectID}, function(data) {
            var json = safeJSONParse(data);

            if (json['error']) {
                alert(sanitize_string(json['error']));
            } else if (json['success']) {
                // Remove files from web UI
                for (var i=0; i<file_ids.length; i++) {
                    var file_id = file_ids[i];
                    removeFileWithID(file_id);
                }

                if (projectID != getJSConnectValue('project.id')) {
                    showSuccessAlert('Your files are being moved. This may take a few minutes...','body');
                } else {
                    showSuccessAlert('Your files were moved successfully.','body');
                }

            } else {
                alert('Unknown error');
            }
        });
    });
}

function setupKeyboardShortcuts()
{
    shortcutKeyManager = new ShortcutKeyManager();
    shortcutKeyManager.addKey('shift+n', 'Create new folder', function(e) {
        newFolder();
    });

    shortcutKeyManager.addKey('mod+a', 'Select all files', function(e) {
        e.preventDefault();
        batchFileSelect(true);
    });

    shortcutKeyManager.addKey('f', 'Favorite / unfavorite file', function(e) {
        var selectedFiles = selectedFileIDs();
        if (selectedFiles.length > 0) toggleFavorite(selectedFiles[0]);
    });

    shortcutKeyManager.addKey('f2', 'Rename file', function(e) {
        var selectedFiles = selectedFileIDs();
        if (selectedFiles.length > 0) renameFile(selectedFiles[0]);
    });

    shortcutKeyManager.addKey('t', 'Edit tags', function(e) {
        const selectedFiles = selectedFileIDs();
        if (selectedFiles.length > 0) showEditFileTagsDialogForSelection('finishEditingTagsForSelection()');
    });

}

async function refreshUploadAuthorization(project_id)
{
    try {
        const response = await fetch("../ajax/upload.php?project=" + project_id);
        const result = await response.json();

        if (Object.keys(result).length > 0) {
            setUploadParameters(result["action"], result["method"], result["enctype"], result["keys"]);
        }

    } catch (error) {
        logError(error);
    }
}

function setUploadParameters(action, method, enctype, keys)
{
    const form = document.getElementById("upload-form");
    form.action = action;
    form.method = method;
    form.enctype = enctype;

    // Remove existing inputs
    const inputs = form.getElementsByTagName("input");

    for (const input of inputs) {
        input.remove();
    }

    // Add new ones
    const jsconnectInputs = [];

    for (const key in keys) {
        const val = keys[key];
        const input = document.createElement("input");
        input.id = key;
        input.value = val;
        input.type = "hidden"
        form.appendChild(input);

        // Add to JSConnect
        if (key === "key") continue;
        jsconnectInputs.push([key, val]);
    }

    if ('undefined' === typeof window.jsconnect) {
        logError('JSConnect object not found in window');
        return;
    }

    window.jsconnect.upload.form_inputs = jsconnectInputs;
}

function fileObjectNameIsEditing(obj)
{
    const jsObj = obj[0];
    return jsObj.querySelector(".text-edit") !== null;
}

function showEditFileTagsDialogForSelection(callback)
{
    const ids = selectedFileIDs();
    if (ids.length === 0) return;
    
    showEditFileTagsDialog(ids, callback);
}

function finishEditingTagsForSelection()
{
    const ids = selectedFileIDs();
    if (ids.length === 0) return;

    const destObjs = [];

    for (let i = 0; i < ids.length; i++) {
        destObjs.push(pageObjectForFileID(ids[i]));
    }

    reloadFiles(ids, destObjs);
}

function setupTagEvents(obj)
{
    if (!obj) {
        obj = $('.tag-more');
    } else {
        obj = obj.find('.tag-more');
    }

    obj.on('mouseenter', e => {
        const target = e.target;
        const file_id = +target.getAttribute('data-file-id')

        // Double-check object still exists
        tagPreviewElement = document.getElementById('tag-popover');

        if (tagPreviewElement) {
            if (+tagPreviewElement.getAttribute('data-file-id') !== file_id) {
                tagPreviewElement.close(true);
                tagPreviewElement = null;
            } else {
                return;
            }
        }

        const rect = e.target.getBoundingClientRect();

        const html = `<pop-over id="tag-popover" atX="${rect.left + window.screenX + (rect.width / 2)}" atY="${rect.top + window.scrollY - 10}" direction="above" width="300" height="65" close-on-mouseleave="true" data-file-id="${file_id}"><center><div class="spinner"></div></center></pop-over>`;
        document.body.insertAdjacentHTML('beforeend', html);

        tagPreviewElement = document.getElementById('tag-popover');

        // Load tags
        getFileTags(file_id);
    });
}

async function getFileTags(file_id)
{
    let siteURL = getJSConnectValue("site.url");
    if (siteURL === null) siteURL = "";

    const response = await fetch(siteURL + "/ajax/tags.php?files=" + file_id + (getJSConnectValue('link.id', '') !== '' ? '&link=' + getJSConnectValue('link.id') : ''));
    const json = await response.json();

    if (json.error) {
        alert(sanitize_string(json.error));
    } else if (json.tags) {
        const popup = document.getElementById('tag-popover');
        if (!popup) return;
        popup.innerHTML = '';

        let html = `<div><div class="tag-view wrappable">`;

        json.tags.forEach(obj => {
            html += `<a href="${tagURLForValue(obj)}">
                        <div class="tag">${obj}</div></a>`;
        });

        html += `</div>`;
        popup.insertAdjacentHTML('beforeend', html);
    }
}
var comments = [];
var rawComments = [];
var lastCommentRequest = 0;
var customCommentSource = -1;

$(document).ready(function() {
    $('body').on('click','.comment,.marker',function(e) {
        var commentID = $(this).data('id');
        if (editingComment == commentID) return;

        var target = e.target;

        if ((typeof target.parent !== "undefined" && target.parent.classList.contains("comment-controls")) ||
            target.classList.contains("comment-dropdown")) {
            return;
        }

        var comment = commentWithID(commentID);

        var is_reply = ($(e.target).closest('.reply-label').length != 0);

        seekToComment(comment,!is_reply);

        // If clicking marker, scroll to comment
        if ($(this).hasClass('marker')) {
            scrollToCommentID($(this).data('id'));
        }

        // Bring focus back to movie
        if (e.target.type !== "a" && !$(e.target).hasClass('comment-dropdown-icon')) {
            $('#video_player')[0].focus({preventScroll: true});
        }
    });

    // Context menu
    $(document).on("contextmenu",".comment,.comment-new", function(event) {
        event.preventDefault();
        var menuCopy = $('#comment_dropdown_'+$(this).data('id')).clone();

        if (isFullScreen()) {
            menuCopy.appendTo('#player_container');
        } else {
        menuCopy.appendTo('body');
        }

        menuCopy.show().menu().css({position:"absolute", top: event.pageY + "px", left: event.pageX + "px", maxWidth: "200px"});
    });

    // Favorites
    $(document).on("click",".commentfav", function(e) {
        var comment_id = $(this).closest('.comment, .comment-new').data('id');

        if (!comment_id) {
            alert('Unable to get comment ID.');
            return;
        }

        $.post("ajax/favorites.php",{toggle:comment_id,type:1}, function() {
            var comment = commentWithID(comment_id);

            if ($(e.target).hasClass('favorite')) {
                $(e.target).removeClass('favorite');
                $(e.target).attr('title','Favorite');
                comment['favorite'] = 0;
            } else {
                $(e.target).addClass('favorite');
                $(e.target).attr('title','Unfavorite');
                comment['favorite'] = 1;
            }

        }).fail(function(jqXHR, textStatus, errorString) {
            alert(sanitize_string("Failed to set favorite: " + errorString));
        });
    });

    if (!getJSConnectExists('link.id')) { // Disable for links
        $(document).on("click", ".comment-todo-btn", function (e) {
            $('.tipsy').hide();

            var todoBtn = $(this);
            var commentID = $(this).closest(".comment").data('id');
            var comment = commentWithID(commentID, rawComments);

            if (comment) {
                var newStatus = 0;

                switch (parseInt(comment['todo'])) {
                    case 1: // To-Do
                        todoBtn.removeClass('todo');
                        todoBtn.addClass('done');
                        todoBtn.attr('title', 'Unmark as To-Do');
                        comment['todo'] = 2;
                        newStatus = 2;
                        break;

                    case 2: // Done
                        todoBtn.removeClass('done');
                        todoBtn.attr('title', 'Mark as To-Do');
                        comment['todo'] = 0;
                        break;

                    default:
                        todoBtn.addClass('todo');
                        todoBtn.attr('title', 'Mark as Done');
                        comment['todo'] = 1;
                        newStatus = 1;
                        break;
                }

                changeCommentFilter();

                $.post('ajax/comments', {todo: newStatus, id: commentID}).done(function (data) {
                    if (data == 'OK') {

                    } else if (data.length > 4 && data.substr(0, 4) == 'ERR:') {
                        alert(sanitize_string(data.substr(4)));
                    }
                }).fail(function (jqXHR, textStatus, errorString) {
                    alert(sanitize_string("Failed to set todo comment: " + errorString));
                });

                e.preventDefault();
            }
        });
    }

    // Filters
    document.querySelectorAll('.comment-filter').forEach((obj) => {
        obj.onchecked = () => {
            changeCommentFilter();
        };
    });

    $('#comment-search-filter').keydown(function(e) {
        changeCommentFilter();
    });
});

function setupComments() {
    reloadComments();

    window.setInterval(function() {
        var pageHidden = "hidden" in document && document.hidden;
        if (session_active && !pageHidden) {
            loadComments(false);
        }
    }, 120000);
}

function changeCommentFilter() {
    filterComments();
    renderComments($('#comment-box'));
}

function renderComments(destObj)
{
    console.log('render');
    if (!destObj) destObj = $('#comment-box');

    reorderComments();

    destObj.html('');

    for (var commentID in comments) {
		renderComment(comments[commentID],destObj);
	}
	
	redrawMarkerBar();
    reloadTooltips();
}

function addNewComments(newComments,destObj)
{
    if (newComments.length == 0 || editingComment > -1) return;

    // Remove placeholders
    for (var i=rawComments.length-1;i>=0; i--) {
        if (!rawComments[i]['id']) rawComments.splice(i,1);
    }

    var firstUpdate = (rawComments.length === 0);

    for (var newCommentIndex in newComments) {
        var newComment = newComments[newCommentIndex];
        if (!newComment['body']) continue; // Skip invalid comments

        // Ignore if comment already exists
        if (!firstUpdate) {
            var existingComment = commentWithID(newComment['id'], rawComments);

            if (existingComment) {
                existingComment['body'] = newComment['body'];
                existingComment['color'] = newComment['color'];
                existingComment['timecode'] = newComment['timecode'];
                continue;
            }
        }

        if (newComment['reply'] == -1) {
            rawComments.push(newComment); // Add to end
        } else {
            var replyID = newComment['reply'];
            var comment = commentWithID(replyID,rawComments);
            var replies = repliesForComment(replyID,rawComments);

            if (comment) {
                if (replies.length > 0) { // Add to end of replies
                    var lastReply = replies[replies.length-1];
                    rawComments.splice(rawComments.indexOf(lastReply), 0, newComment);

                } else { // First reply
                    rawComments.splice(rawComments.indexOf(comment), 0, newComment);
                }
            } else {
                // Must be a reply to a new comment so just add to end
                rawComments.push(newComment);
            }
        }
    }

    filterComments();

    if (newComments.length == 1 && newComment['reply'] == -1) {
        // Overwrite placeholder if found
        var destComment = pageObjectForCommentID(newComments[0]['id']);
        if (destComment.length) {
            renderComment(newComments[0],destComment);
        } else {
            renderComments(destObj);
        }

    } else {
        renderComments(destObj);
    }
        // Scroll to last new comment
    if ($(".comment-new").length) {
        var commentBox = $('#comment-box');
        var yPos = $(".comment-new:last").offset().top - commentBox.offset().top + commentBox.scrollTop() - 50;
        commentBox.animate({
            scrollTop: yPos
        }, 300);
    }

    window.setTimeout(function() {
        populateCommentAuthors();
        populateCommentAuthors($('#export_author_filter'));
    },1);
}

function removeAllPlaceholderComments()
{
    const outComments = [];

    // Remove placeholders
    for (let i = rawComments.length - 1; i >= 0; i--) {
        if (!!rawComments[i]['id']) outComments.push(rawComments[i]);
    }

    rawComments = outComments;
    filterComments()
    renderComments();
}

function renderComment(comment, destObj)
{
    var color_name = 'red';
    var color_index = parseInt(comment['color']);

    switch (color_index) {
        case 2:
            color_name = 'yellow';
            break;

        case 3:
            color_name = 'orange';
            break;

        case 4:
            color_name = 'green';
            break;

        case 5:
            color_name = 'blue';
            break;

        case 6:
            color_name = 'cyan';
            break;

        case 7:
            color_name = 'pink';
            break;

        case 8:
            color_name = 'purple';
            break;

        case 9:
            color_name = 'white';
            break;

        case 10:
            color_name = 'black';
            break;
    }

    var username = formatTextBody(comment['username'],false);
    if (!username || typeof(comment['username']) === 'undefined') username = '';

    if (!comment['avatar']) comment['avatar'] = 'avatar?name='+encodeURIComponent(username);

    var body = comment['body'];
    if (body && typeof(comment['body']) !== 'undefined') body = formatTextBody(stripUserTags(body),true);

    var avatarObj = '<div class="comment-avatar"><img src="'+comment['avatar']+'" class="avatar" /><div class="comment-author">'+username.replace(' ','<br>')+'</div></div>';
    var timecodeObj = (comment['timecode'] != '' && comment['reply'] == -1 ? '<div class="comment-timecode">'+comment['timecode']+'</div>':'');
    if (window.jsconnect['file']['type'] == 6 && comment['page']) timecodeObj = '<div class="comment-timecode">Page ' + comment['page'] +'</div>';

    var bodyObj = '<div class="comment-text">'+body+'</div>';
    var dateObj = '<div class="comment-date"></div>';

    var todo = "";
    var attachmentObjs = "";
    var dropdownObj = "";

    // Show done icon for links
    if (comment['is_link'] ) {
        if (+comment['todo'] === 1) {
            todo = '<div class="comment-todo-btn tooltip todo" title="To-Do"></div>';
        } else if (+comment['todo'] === 2) {
            todo = '<div class="comment-todo-btn tooltip done" title="Done"></div>';
        }
    }

    if (!comment['is_link']) {
        switch (parseInt(comment['todo'])) {
            case 1:
                todo = '<div class="comment-todo-btn tooltip todo" title="Mark as Done"></div>';
                break;

            case 2:
                todo = '<div class="comment-todo-btn tooltip done" title="Unmark as To-Do"></div>';
                break;

            default:
                todo = '<div class="comment-todo-btn tooltip" title="Make To-Do comment"></div>';
                break;

        }

        // Comment attachments
        var attachments = comment['attachments'];

        if (attachments) {
            for (var i = 0; i < attachments.length; i++) {
                var attachment = attachments[i];

                attachmentObjs += '<div class="comment-link" data-link-id="' + attachment['link_id'] + '" data-parent-id="' + comment['id'] + '">';

                switch (attachment['type']) {
                    case 0: // File
                        var attachmentFileTypeClass = '';
                        switch (parseInt(attachment['file_type'])) {
                            case 1:
                                attachmentFileTypeClass = ' video';
                                break;

                            case 2:
                                attachmentFileTypeClass = ' audio';
                                break;

                            case 3:
                                attachmentFileTypeClass = ' image';
                                break;
                        }

                        attachmentObjs += '<a href="player?id=' + attachment['id'] + '"><img class="file-thumb small' + attachmentFileTypeClass + '" src="' + attachment['thumbnail'] + '"/> <span class="comment-link-title">' + attachment['title'] + '</span></a>';
                        break;

                    case 1: // Task
                        var taskStatus = 'progress';
                        switch (parseInt(attachment['task_status'])) {
                            case 0:
                                taskStatus = 'pending';
                                break;

                            case 3:
                                taskStatus = 'completed';
                                break;
                        }

                        attachmentObjs += '<div class="task-status ' + taskStatus + '"></div> <a href="tasks.php?id=' + attachment['id'] + '"><span class="comment-link-title">' + attachment['title'] + '</span></a>';
                        break;
                }

                if (comment['can_edit']) attachmentObjs += ' <a href="Javascript:deleteCommentAttachment(\'' + attachment['link_id'] + '\',\'' + comment['id'] + '\')"><span class="ann_delete delete-btn"></span></a>';

                attachmentObjs += '</div>';
            }
        }
    }

    // Dropdown
    dropdownObj += '<div class="comment-dropdown" id="comment_dropdown_container_' + comment['id'] + '">' +
        '<a href="#" onclick="commentDropdownClicked(this,' + comment['id'] + ')"><img class="comment-dropdown-icon" src="img/Dropdown.svg" /></a>' +
        '<ul class="menu" id="comment_dropdown_' + comment['id'] + '" style="display:none;left:-40px;z-index:150000;position:absolute">';

    if (comment['can_edit']) {
        dropdownObj += '<li><a href="#" onclick="editComment(this,\'' + comment['id'] + '\')">Edit</a>' +
            '<li><a href="#" onclick="deleteComment(this,\'' + comment['id'] + '\')">Delete...</a>';

        if (getJSConnectValue('project.can_modify_others_comments')) {
            dropdownObj += '<li><a href="#" onclick="deleteAllCommentsForFile(' + getJSConnectValue('file.id') + ')">Delete All Comments...</a>';
        }
    }

    dropdownObj += '<li><a href="#" onclick="copyCommentText(this,\'' + comment['id'] + '\')">Copy Text</a>';
    dropdownObj += '<li><a href="#" onclick="copyDirectLink(this,\'' + comment['id'] + '\')">Copy Direct Link</a>';

    if (!comment['is_link']) {
        dropdownObj += '<li><a href="#" onclick="createTask(this,\'' + comment['id'] + '\')">Create Task</a>';
    }

    dropdownObj += '</ul></div>';

    var replyObj = '<div class="comment-controls">' + todo + (!comment['is_link'] ? '<div title="'+(comment['favorite'] ? ' Unfavorite':'Favorite')+'" class="commentfav tooltip'+(comment['favorite'] ? ' favorite':'')+'"></div>':'')+' <a title="Reply" class="comment-reply-btn tooltip" href="#" onclick="reply('+(comment['reply'] > -1 ? comment['reply']:comment['id'])+','+comment['pos']+')"><img src="img/Reply.svg"></a></div></div>';
    var annotationObj = (comment['annotation'] > -1 ? '<div class="comment-link" id="ann_'+comment['annotation']+'" data-parent-id="'+comment['id']+'"><span class="ann_icon"></span>Annotation</a>'+(comment['can_edit'] ? ' <a href="#" onclick="deleteAnnotation(\''+comment['annotation']+'\',\''+comment['id']+'\')"><span class="ann_delete delete-btn"></span></a>':'')+'</div>':'');

    var htmlData = '<div class="comment'+(lastCommentRequest > 0 && comment['timestamp'] > lastCommentRequest ? ' comment-new':'')+
        (comment['reply'] > -1 ? ' comment-reply':'')+'" data-id="'+comment['id']+'"' +
        (comment['reply'] > -1 ? ' data-reply-to="' + comment['reply'] + '"':'') + '>' +
        (color_index > 0 ? '<div class="comment-banner '+color_name+'"></div><div class="comment-spacer"></div>':'') +
        '<div class="comment-header">' +
        avatarObj +
        dropdownObj +
        '</div>' +
        '<div class="comment-body">'+timecodeObj+bodyObj+'</div>'+
        '<div class="comment-footer">' +
        dateObj +
        replyObj +
        annotationObj +
        attachmentObjs +
        '</div>'
        ;

    if (destObj.hasClass('comment')) {
        // Remove comment links first
        destObj.parent().find('.comment-link[data-parent-id="' + comment['id'] + '"]').remove();

        destObj[0].outerHTML = htmlData;
    } else {
        destObj.append(htmlData);
    }

    updateDateForComment(comment);
}

function commentWithID(commentID,array)
{
    if (!array) array = comments;

    for (var commentIndex in array) {
        if (array[commentIndex]['id'] == commentID) return array[commentIndex];
    }

    return null;
}

function repliesForComment(commentID,array)
{
    if (!array) array = comments;

    var out_array = [];

    for (var commentIndex in array) {
        var comment = array[commentIndex];
        if (comment['reply'] == commentID) out_array.push(comment);
    }

    return out_array;
}

function reorderComments()
{
    var commentOrder = parseInt(getCookie('comment_order'));

    comments.sort(function(a, b) {
        var comp = 0;
        var aID = parseInt(a['id']);
        var bID = parseInt(b['id']);
        var aReply = parseInt(a['reply']);
        var bReply = parseInt(b['reply']);

        var aParent = null;
        if (aReply > -1) aParent = commentWithID(aReply, rawComments);

        var bParent = null;
        if (bReply > -1) bParent = commentWithID(bReply, rawComments);

        var aObj = a;
        if (aReply != bReply && aParent) aObj = aParent;

        var bObj = b;
        if (aReply != bReply && bParent) bObj = bParent;

        switch (commentOrder) {
            case 1: // Oldest first
                comp = parseInt(aObj['timestamp'])-parseInt(bObj['timestamp']);
                break;

            case 2: // Newest first
                comp = parseInt(bObj['timestamp'])-parseInt(aObj['timestamp']);
                break;

            default: // Timecode
                comp = parseFloat(aObj['pos'])-parseFloat(bObj['pos']);
                break;
        }

        if (comp == 0) {
            if (aID === bReply) {
                comp = -1;
            } else if (bID === aReply) {
                comp = 1;
            } else if (aReply === bReply) {
                comp = aID - bID;
            } else if (aReply > -1 && bReply === -1) {
                comp = aReply - bID;
            } else if (bReply > -1 && aReply === -1) {
                comp = aID - bReply;
            } else {
                comp = parseInt(aObj['timestamp'])-parseInt(bObj['timestamp']);
            }
        }

        return comp;
    });
}

function changeOrder()
{
    writeCookie('comment_order',$('#comment_order_dropdown').val(),365);
    renderComments();
}

function redrawMarkerBar() 
{
	var player = getPlayerObj();
	if (!player || player.duration == 0 || player.duration.isNaN) return;

	var bar = $('.marker-bar');
	bar.html('');

    if (getCookie('player_markers') == 0 || comments.length == 0) {
        bar.hide();
        return;
    } else {
        bar.show();
    }

    var lastCommentPos = -1.0;

    for (var commentIndex in comments) {
		var comment = comments[commentIndex];
		
		var pos = parseFloat(comment['pos']) / parseFloat(player.duration);

        if (pos.isNaN) continue;
        if (lastCommentPos >= 0 && comment['pos'] - lastCommentPos < player.duration * 0.01) continue;
        if (comment['reply'] > 0) continue;

        lastCommentPos = comment['pos'];

        var color_name = 'blank';
        var color_index = parseInt(comment['color']);

        switch (color_index) {
            case 1:
                color_name = 'red';
                break;

            case 2:
                color_name = 'yellow';
                break;

            case 3:
                color_name = 'orange';
                break;

            case 4:
                color_name = 'green';
                break;

            case 5:
                color_name = 'blue';
                break;

            case 6:
                color_name = 'cyan';
                break;

            case 7:
                color_name = 'pink';
                break;

            case 8:
                color_name = 'purple';
                break;

            case 9:
                color_name = 'white';
                break;

            case 10:
                color_name = 'black';
                break;
        }


		bar.append('<div data-id="'+comment['id']+'" class="marker '+color_name+'" style="background-image:url(\'img/marker_gen?'+color_name+'\');left: calc('+((pos*100).toFixed(5))+'% - 8px)"></div>');
	}
}

function filterComments()
{
    comments = [];

    var colorFilterObj = $('#comment-color-filter').data('ddslick');
    var colorFilter = (colorFilterObj != null ? colorFilterObj['selectedData']['value']:-1);
    var authorFilter = $('#comment-author-filter').val();
    var matchText = $('#comment-search-filter').val();
    var favoritesOnly = boolFromString($('#comment-favorite-filter').prop('checked'));
    var annotationsOnly = boolFromString($('#comment-annotation-filter').prop('checked'));
    var todoOnly = boolFromString($('#comment-todo-filter').prop('checked'));
    var hideReplies = boolFromString($('#comment-reply-filter').prop('checked'));
    var hideDone = boolFromString($('#comment-done-filter').prop('checked'));

    // If no filters are set, just copying everything
    if (colorFilter < 0 && !favoritesOnly && (!authorFilter || authorFilter.length == 0) && (!matchText || matchText.length == 0) && !annotationsOnly && !todoOnly && !hideReplies && !hideDone) {
        comments = rawComments;
        return;
    }

    if (matchText && matchText.length > 0) matchText = matchText.toLowerCase();

    for (var commentIndex in rawComments) {
        var comment = rawComments[commentIndex];

        if (favoritesOnly && comment['favorite'] < 1) continue;
        if (colorFilter > -1 && comment['color'] != colorFilter) continue;
        if (authorFilter && authorFilter != '' && authorFilter != comment['username']) continue;
        if (matchText && matchText.length > 0 && typeof comment['body'] !== "undefined" && comment['body'].toLowerCase().indexOf(matchText) == -1) continue;
        if (annotationsOnly && comment['annotation'] == -1) continue;
        if (todoOnly && comment['todo'] == 0) continue;
        if (hideReplies && comment['reply'] > -1) continue;
        if (hideDone && comment['todo'] == 2) continue;

        comments.push(comment);
    }
}

function populateCommentAuthors(selectObj)
{
    if (!selectObj) selectObj = $('#comment-author-filter');

    // Save current selection
    var selectionName = selectObj.val();

    var authors = [];

    for (var commentIndex in rawComments) {
        var comment = rawComments[commentIndex];

        if (authors.indexOf(comment['username']) == -1) authors.push(comment['username']);
    }

    authors.sort();

    selectObj.html('<option value="">All');

    for (var authorIndex in authors) {
        var shortAuthorName = authors[authorIndex];

        if (shortAuthorName) {
            if (shortAuthorName.length > 20) shortAuthorName = shortAuthorName.substr(0, 17) + '...';

            selectObj.append($('<option value="' + authors[authorIndex] + '">' + shortAuthorName + '</option>'));
        }
    }
}

function seekToComment(comment,displayAnnotation)
{
    if (comment) {
        if (comment['annotation'] > -1 && displayAnnotation) {
            showAnnotation(comment['annotation'], comment['pos']);
        } else {
            clearAnnotation();
            if (comment['pos'] > -1) {
                seekToTime(comment['pos']);
            } else if (comment['page'] > 0) {
                goToPage(comment['page']);
            }
        }
    }
}

function scrollToCommentID(comment_id)
{
    var commentObj = $('.comment[data-id="'+comment_id+'"]');
    if (!commentObj || !commentObj.length || typeof commentObj == 'undefined') return;

    // Highlight
    $('.comment').removeClass('comment-new');
    commentObj.addClass('comment-new');

    var commentBox = $('#comment-box');
    if (!commentBox || typeof commentBox == 'undefined') return;

    var yPos = commentObj.offset().top - commentBox.offset().top + commentBox.scrollTop() - 50;
    commentBox.animate({
        scrollTop: yPos
    }, 300);
}

function changeCommentSource()
{
	// Erase existing comments
	comments = [];
	rawComments = [];
	renderComments();
	lastCommentRequest = 0;

	// Load new comments
	customCommentSource = $('#comment_source_dropdown').val();
    reloadComments();
    
    // Enable / disable comment entry
    const commentField = document.getElementById('comment-field');
    const commentSubmit = document.getElementById('comment-submit');

    if (customCommentSource != -1) {
        commentField.setAttribute('disabled', 'disabled');
        commentSubmit.setAttribute('disabled', 'disabled');
    } else {
        commentField.removeAttribute('disabled');
        commentSubmit.removeAttribute('disabled');
    }
}

function deleteCommentWithID(id)
{
    $(".menu").hide();

    if (!confirm('Are you sure you wish to delete this comment?')) {
        return;
    }

    // Traverse backwards
    for (var i=comments.length-1; i >= 0; i--) {
        if (comments[i]['id'] == id ||
            comments[i]['reply'] == id) {

            comments.splice(i,1);
        }
    }

    // Traverse backwards
    for (var i=rawComments.length-1; i >= 0; i--) {
        if (rawComments[i]['id'] == id ||
            rawComments[i]['reply'] == id) {

            rawComments.splice(i,1);
            break;
        }
    }

    $(".comment[data-id=\""+id+"\"]").remove();
    $(".comment-reply[data-reply-to=\""+id+"\"]").remove();
    $(".comment-link[data-parent-id=\""+id+"\"]").remove();

    renderComments();

    $.get('ajax/comments.php?delete='+id,function(data) {
        // Do nothing
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to delete comment: " + errorString));
    });
}

function deleteAllCommentsForFile(id)
{
    $(".menu").hide();

    if (!confirm('Are you sure you wish to delete all comments on this file?')) {
        return;
    }

    $.get('ajax/comments.php?deleteall='+id,function(data) {
        const returnData = safeJSONParse(data);
        if (returnData['success']) {
            comments = [];
            rawComments = [];
            renderComments();
        } else if (returnData['error']) {
            alert(sanitize_string("Failed to delete comments: " + returnData['error']));
        } else {
            alert('Unknown error');
        }
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to delete comments: " + errorString));
    });
}

function pageObjectForCommentID(comment_id)
{
    return $('.comment[data-id='+comment_id+']');
}

function updateDatesForComments()
{
    for (var commentIndex in comments) {
        var comment = comments[commentIndex];
        updateDateForComment(comment);
    }
}

function updateDateForComment(comment,commentObj)
{
    if (!commentObj) commentObj = pageObjectForCommentID(comment['id']);

    if (commentObj.length) {
        var dateObj = commentObj.find('.comment-date');

        if (dateObj.length) {
            var date_string = '';

            if (parseInt(comment['timestamp']) > 0) {
                var dateType = parseInt(window.localStorage.getItem('comment_date_type'));

                switch (dateType) {
                    case 1: // Absolute
                        const m = moment(new Date(parseInt(comment['timestamp']) * 1000));
                        m.local();
                        date_string = m.format('YYYY-MM-DD HH:mm:ss');
                        break;

                    default:
                        date_string = moment(new Date(parseInt(comment['timestamp']) * 1000)).fromNow();
                        if (date_string.length > 3 && date_string.substr(0, 3) === 'in ') date_string = 'just now'; // Prevent future dates if clocks mismatch
                        break;
                }
            }

            dateObj.html(date_string);
        }
    }
}


function copyDirectLink(obj, comment_id)
{
    $(".menu").hide();

    if (typeof URLSearchParams === 'undefined' ||
            typeof navigator.clipboard === 'undefined') {
            alert('Your browser does not support this feature.');
            return;
    }

    var url = new URL(window.location.href);
    var params = new URLSearchParams(url.search);
    params.delete('comment');
    url.searchParams = params;

    var newUrl = url.toString() + '&comment=' + comment_id;

    navigator.clipboard
        .writeText(newUrl)
        .then(() => {
            showSuccessAlert('Copied successfully', '#comment-box');
        })
        .catch(() => {
            alert("Unable to write to clipboard - you may need to manually enable permission for this within your web browser.");
        });
}

function copyCommentText(obj, comment_id)
{
    $(".menu").hide();

    if (typeof navigator.clipboard === 'undefined') {
        alert('Your browser does not support this feature.');
        return;
    }

    const comment = commentWithID(comment_id);
    if (!comment) {
        alert('Could not locate this comment.');
    }

    navigator.clipboard
        .writeText(comment.body)
        .then(() => {
            showSuccessAlert('Copied successfully', '#comment-box');
        })
        .catch(() => {
            alert("Unable to write to clipboard - you may need to manually enable permission for this within your web browser.");
        });
}

function approveFile(file_id,username,depts,match_any) {
    var comment = $('#approval_comment').val();

    $.post("ajax/approval.php?approve",{file_id:file_id,comment:comment},function(result){
        if (result.length > 0) {
            alert(result);
        } else {
            $('#approval-container').remove();

            if (match_any) {
                // Remove all pending approvals except current user
                $('.approval-history:not(.approved):not(.rejected):not([data-user_id='+userID+'])').remove();
            } else {
                // Remove matching departments
                for (var i = 0; i < depts.length; i++) {
                    var dept_id = depts[i];
                    $('.approval-history[data-dept_id=' + dept_id + ']:not(.approved):not(.rejected)').remove();
                }
            }

            var container = $('.approval-history[data-user_id='+userID+']:not(.approved):not(.rejected)');
            if (!container.length) container = $('<div class="approval-history" data-user_id="' + userID + '"><span class="avatar"></span></div>');

            container.addClass('approved');
            var textContainer = container.find('span');
            textContainer.html(username+' approved'+(comment.length > 0 ? '<div class="approval-comment">'+comment+'</div>':'')+'<div class="approval-date">just now</div>');
            container.prependTo($('#approval-history-container')); // Move to top
        }
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to approve file: " + errorString));
    });
}

function rejectFile(file_id,username,depts,match_any) {
    var comment = $('#approval_comment').val();

    $.post("ajax/approval.php?reject",{file_id:file_id,comment:comment},function(result){
        if (result.length > 0) {
            alert(result);
        } else {
            $('#approval-container').remove();

            if (match_any) {
                // Remove all pending approvals except current user
                $('.approval-history:not(.approved):not(.rejected):not([data-user_id='+userID+'])').remove();
            } else {
                // Remove matching departments
                for (var i = 0; i < depts.length; i++) {
                    var dept_id = depts[i];
                    $('.approval-history[data-dept_id=' + dept_id + ']:not(.approved):not(.rejected)').remove();
                }
            }

            var container = $('.approval-history[data-user_id='+userID+']:not(.approved):not(.rejected)');
            if (!container.length) container = $('<div class="approval-history" data-user_id="' + userID + '"><span class="avatar"></span></div>');

            container.addClass('rejected');
            var textContainer = container.find('span');
            textContainer.html(username+' rejected'+(comment.length > 0 ? '<div class="approval-comment">'+comment+'</div>':'')+'<div class="approval-date">just now</div>');
            container.prependTo($('#approval-history-container')); // Move to top
        }
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to reject file: " + errorString));
    });
}
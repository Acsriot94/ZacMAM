var lastCommentRequest = 0;

$(document).ready(function() {
    $("#comment-field").keydown(function(e){
        if (e.keyCode == 13 && !e.shiftKey)
        {
            e.preventDefault();
            submitComment();
        }
    });
});

function commentDropdownClicked(obj,itemID)
{
    $('#comment_dropdown_'+itemID).show().menu();
}

function editComment(obj,id) {
    $(".menu").hide();
    $("#comment_dropdown_container_"+id).hide();

    var comment_text = $("#comment_"+id).find('.comment-text').text();

    if (comment_text != null) {
        $("#comment_"+id).find('.comment-text').html('<textarea id="comment-edit-'+id+'" style="width:100%;height:100px">'+comment_text+'</textarea><p><a href="Javascript:saveComment(this,\''+id+'\')"><button>Save</button>');
    }
}

function deleteComment(obj,id)
{
    $(".menu").hide();
    $("#comment_"+id).hide();
    $.ajax({url: 'ajax/task_comments.php?delete='+id,
        success: function(data) {
        }});
}

function saveComment(obj,id)
{
    $("#comment_dropdown_container_"+id).show();

    var comment_text = $("#comment-edit-"+id).val();

    if (comment_text.length > 0) {
        $("#comment_"+id).find('.comment-text').html(comment_text.replaceAll("\n", "<br>"));
        $.post('ajax/task_comments.php?edit='+id,{body: comment_text},function(data) {

        }).fail(function(jqXHR, textStatus, errorString) {
            alert(sanitize_string("Failed to edit comment: " + errorString));
        });
    }
}

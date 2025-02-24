function showSuccessAlert(status_text,container) {
    status_text = sanitize_string(status_text);
	$(container).prepend("<div id='status_alert' style='padding:5px;background-color:#268026;color:white;position:fixed;top:0;left:0;right:0;width:100%;z-index:99999'>"+status_text+"</div>");
	$('#status_alert').slideDown(300).delay(2500);
	$('#status_alert').fadeOut(400);
}

function showFailureAlert(status_text,container) {
    status_text = sanitize_string(status_text);
    $(container).prepend("<div id='status_alert' style='padding:5px;background-color:#ff4d4d;color:white;position:fixed;top:0;left:0;right:0;width:100%;z-index:99999'>"+status_text+"</div>");
    $('#status_alert').slideDown(300).delay(2500);
    $('#status_alert').fadeOut(400);
}
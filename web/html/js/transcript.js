var transcripts = [];
var lastHighlight = -1;
var auto_transcribe_langs = ['en', 'de', 'es', 'fr', 'hi', 'it', 'ja', 'nl', 'ru', 'zh'];

$(document).ready(function() {
    $('body').on('click','.transcript',function(e) {
        var nodeName = e.target.nodeName.toLowerCase();
        if (nodeName === 'input' || nodeName === 'textarea' || nodeName === "timecode-input") return;

        submitCurrentEditingTranscript();

        var transcriptID = $(this).data('id');
        var transcriptType = $(this).data('type');

        var transcript = transcriptWithID(transcriptID,transcriptType);

        seekToTranscript(transcript);

        // Bring focus back to movie
        $('#video_player').focus();

    }).on('click','.transcript-dropdown',function(e) {
        var transcript_obj = $(e.target).closest('.transcript');
        var transcript_id = transcript_obj.data('id');
        var type = transcript_obj.data('type');

        if (!getJSConnectExists('link.id')) {
            showMenuForButton($(e.target), $('<ul><li><a href="#" onclick="startEditingTranscriptID(' + transcript_id + ',' + type + ');">Edit</a></li><li><a href="#" onclick="deleteTranscript(' + transcript_id + ',' + type + ');">Delete...</li><li><a href="#" onclick="deleteAllTranscripts();">Delete All...</li></ul>'));
        }
    }).on('change','#transcription-language',function(e) {
        var newLang = $('#transcription-language').val();

        if (auto_transcribe_langs.indexOf(newLang) > -1) {
            $('#auto-transcript-generate').removeProp('disabled');
        } else {
            $('#auto-transcript-generate').prop('disabled',true);
        }

        reloadTranscription();

    }).on('click','#auto-transcript-generate',function(e) {

        $.post("ajax/transcript.php", {autotranscribe: getJSConnectValue('file.id'), lang:$('#transcription-language').val()}, function (data) {
            var json = safeJSONParse(data);

            if (json && json['success']) {
                $('#auto-transcript-status').html('Your transcript is being generated. This may take several minutes.');
            } else if (json && json['error']) {
                alert(sanitize_string(json['error']));
            } else {
                alert('Unable to submit auto transcription job - unknown error.');
            }
        }).fail(function (jqXHR, textStatus, errorString) {
            alert(sanitize_string("Failed to submit auto transcription job: " + errorString));
        });
    });
});

function setupTranscription() {
    reloadTranscription();

    window.setInterval(function() {
        if ($('.transcript-edit')[0] != null) return;
        if (!session_active) return;

        var pageHidden = "hidden" in document && document.hidden;
        if (pageHidden) return;

        loadTranscription(false);
    }, 3 * 60 * 1000); // 3 mins
}

function renderTranscription(destObj)
{
    console.log('render transcription');
    if (!destObj) destObj = $('#transcript-box');

    destObj.html('');

    for (var transcriptID in transcripts) {
		renderTranscript(transcripts[transcriptID],destObj);
	}
	
    reloadTooltips();
}

function setTranscription(newTranscripts,destObj)
{
    if (newTranscripts.length == 0) return;

    transcripts = [];

    for (var newTranscriptIndex in newTranscripts) {
        var newTranscript = newTranscripts[newTranscriptIndex];
        if (!newTranscript['sentence']) continue; // Skip invalid transcripts

        transcripts.push(newTranscript);
    }

    renderTranscription(destObj);
    reloadPlayerCaptions();
}

function reloadPlayerCaptions()
{
    var lang = $("#transcription-language").val();

    // Show in player
    $('video track,audio track').remove();
    $('video,audio').prepend('<track src="ajax/transcript?subtitles&file=' + getJSConnectValue('file.id') + (getJSConnectExists('link.id') ? "&link=" + getJSConnectValue('link.id') : "") + '&lang=' + lang + '" kind="subtitles" srclang="' + lang + '" label="Transcript"></track>');
}

function removePlayerCaptions()
{
    $('video track,audio track').remove();
}

function renderTranscript(transcript, destObj)
{
    var types = ['TEXT','AUDIO'];
    var type = transcript['type'];

    if (type < 0 || type > types.length-1) type = 0;
    var typeName = types[type];

    var body = transcript['sentence'];
    if (body && typeof(transcript['sentence']) !== 'undefined') body = formatTextBody(body,true);

    var start_time = parseFloat(transcript['time']);
    var start_timecode = timecodeForFile(start_time);

    var duration = parseFloat(transcript['duration']);
    var duration_timecode = timecodeForFile(duration);

    // Format so it's just seconds and frames
    var duration_components = duration_timecode.split(':');
    if (duration_components.length > 2) {
        duration_components.splice(0,2);
        duration_timecode = duration_components.join(':');
    }

    var startTimecodeObj = '<div class="transcript-time-start">'+start_timecode+'</div>';
    var durationTimecodeObj = '<div class="transcript-time-duration">'+duration_timecode+'</div>';
    var bodyObj = '<div class="transcript-text">'+body+'</div>';

    var dropdownObj = (!getJSConnectExists('link.id') ? '<div class="transcript-dropdown"></div>' : '');

    destObj.append(
    '<div class="transcript" data-id="'+transcript['id']+'" data-type="'+transcript['type']+'">'+
        '<div class="transcript-body">'+durationTimecodeObj+startTimecodeObj+bodyObj+dropdownObj+'</div>'
    );
}

function transcriptWithID(transcriptID,type,array)
{
    if (!array) array = transcripts;

    for (var transcriptIndex in array) {
        var obj = array[transcriptIndex];
        if (obj['id'] == transcriptID && obj['type'] == type) return obj;
    }

    return null;
}

function seekToTranscript(transcript)
{
    if (transcript && transcript['time'] > -1) seekToTime(transcript['time']);
}

function scrollToTranscriptID(transcript_id,type)
{
    var transcriptObj = $('.transcript[data-id="'+transcript_id+'"][data-type="'+type+'"]');
    if (!transcriptObj || !transcriptObj.length || typeof transcriptObj == 'undefined') return;

    var transcriptBox = $('#transcript-box');
    if (!transcriptBox || typeof transcriptBox == 'undefined') return;

    scrollParentToObject(transcriptObj,transcriptBox);
}

function isTranscriptObjectOnScreen(object)
{
    if (!object || typeof object == 'undefined') return false;

    var transcriptBox = $('#transcript-box');
    if (!transcriptBox || typeof transcriptBox == 'undefined') return false;

    return isObjectOnScreen(object,transcriptBox);
}

function pageObjectForTranscriptID(transcript_id,type)
{
    return $('.transcript[data-id='+transcript_id+'][data-type='+type+']');
}

function startEditingTranscriptID(transcript_id,type)
{
    var transcript = transcriptWithID(transcript_id,type);
    if (!transcript) {
        alert('Unable to locate transcript');
        return;
    }

    startEditingTranscript(transcript,type);
}

function startEditingTranscript(transcript,type)
{
    closeMenu();

    var page_obj = pageObjectForTranscriptID(transcript['id'],type);

    page_obj.find('.transcript-time-start').html('<timecode-input size="mini" class="transcript-time-edit tooltip" title="Start time" value="' + timecodeForFile(transcript['time']) + '" />');
    page_obj.find('.transcript-time-duration').html('<timecode-input size="mini" class="transcript-time-edit tooltip" title="Duration" value="' + timecodeForFileAtZero(transcript['duration']) + '" />');
    page_obj.find('.transcript-text').html('<textarea class="transcript-edit">' + transcript['sentence'] + '</textarea>');
    $('.transcript-edit').focus();
    reloadTooltipsForObject(page_obj);
}

function endCurrentTranscriptEditing()
{
    var transcriptEdit = $('.transcript-edit');
    if (transcriptEdit.length == 0) return;

    var obj = transcriptEdit.closest('.transcript');

    endTranscriptEditing(parseInt(obj.data('id')),parseInt(obj.data('type')));
}

function endTranscriptEditing(transcript_id,type)
{
    if ($('.transcript-edit').length == 0) return; // Not editing

    var transcript = transcriptWithID(transcript_id,type);
    var obj = pageObjectForTranscriptID(transcript_id,type);

    if (transcript) {
        obj.find('.transcript-time-start').html(timecodeForFile(parseFloat(transcript['time'])));

        var duration_timecode = timecodeForFile(parseFloat(transcript['duration']));

        // Format so it's just seconds and frames
        var duration_components = duration_timecode.split(':');
        if (duration_components.length > 2) {
            duration_components.splice(0,2);
            duration_timecode = duration_components.join(':');
        }

        obj.find('.transcript-time-duration').html(duration_timecode);
        obj.find('.transcript-text').html(transcript['sentence']);
    }

    removeVisibleTooltips();
}

function submitCurrentEditingTranscript()
{
    var transcriptEdit = $('.transcript-edit');
    if (transcriptEdit.length == 0) return;

    var transcript_obj = transcriptEdit.closest('.transcript');
    var transcript_id = parseInt(transcript_obj.data('id'));

    var start_timecode = transcript_obj.find('.transcript-time-start .transcript-time-edit').val();
    var start_time = parseFloat(secondsFromFileTimecode(start_timecode));

    if (start_time < 0) {
        alert('Invalid start time.');
        return;
    }

    var duration_timecode = transcript_obj.find('.transcript-time-duration .transcript-time-edit').val();
    var duration_time = parseFloat(secondsFromFileTimecodeAtZero(duration_timecode));

    if (duration_time < 0.1) {
        alert('Captions must be at least 0.1 seconds long.');
        return;
    }

    var end_time = start_time + duration_time;

    // Search for conflicts
    for (var i=0; i < transcripts.length; i++) {
        var transcript = transcripts[i];
        if (parseInt(transcript['id']) == transcript_id) continue;

        var t = parseFloat(transcript['time']);
        var d = parseFloat(transcript['duration']);

        // Check transcripts don't overlap (with leeway)
        var time_low = t - (3.0 / 60.0);
        var time_high = t + (3.0 / 60.0);

        if ((start_time <= time_low && end_time > time_high) ||
            (start_time >= time_high && start_time < time_low + d)) {
            alert('The timing of this caption conflicts with an existing caption.');
            return;
        }
    }

    var sentence = transcript_obj.find('.transcript-edit').val();

    submitTranscriptCorrection(transcript_id,parseInt(transcript_obj.data('type')),sentence,start_time,duration_time);
}

function highlightTranscriptAtTime(time)
{
    $(".transcript.highlighted").removeClass("highlighted");

    if (isNaN(time) || time < 0) return;

    for (var i=0; i<transcripts.length; i++) {
        var transcript = transcripts[i];
        var startTime = parseFloat(transcript["time"]);
        var endTime = startTime + parseFloat(transcript["duration"]);

        if (startTime <= time && endTime >= time) {
            var obj = pageObjectForTranscriptID(transcript["id"],transcript["type"]);
            if (obj[0] != null) {
                obj.addClass("highlighted");

                // Autoscroll
                if (!window.localStorage || !window.localStorage.getItem('transcript_autoscroll') ||
                    window.localStorage.getItem('transcript_autoscroll') == 1) {
                    if (lastHighlight != transcript["id"]) scrollToTranscriptID(transcript["id"],transcript["type"]);
                }

                lastHighlight = transcript["id"];
            }
            break;
        }
    }
}

function addTranscriptSentence()
{
    endCurrentTranscriptEditing();

    if (!playerObj) playerObj = getPlayerObj();

    var curTime = playerObj.currentTime;

    // Create new transcript object
    var transcript = {id: -1, type:1, time: curTime, duration:1.0, sentence:''};

    transcripts.push(transcript);

    renderTranscript(transcript,$('#transcript-box'));

    startEditingTranscript(transcript,1);
}
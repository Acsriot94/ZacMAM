var playerObj = null;
var playerPlugin = null;
var timecodeTimer = null;
var syncTimer = null;
var fullScreenHideTimer = null;
var videoLoadStart = new Date();
var stallCount = 0;
var playbackDidEnd = false;
var seeking = false;
var editingComment = -1;
var lastSessionTCReq = 0;
var socketReconnectTimer = null;
var curCommentID = -1;
var renderWatcher = null;
var commentLoadWorker = null;
var comment_socket = null;
var transcriptLoadWorker = null;
var recordingMode = 0;
var recorder = null;
var commentAttachments = [];
var heatmap = null;
var rewindRate = 0.0;

$(document).ready(function() {
    // The link only lasts 4 hours so expire the page if the user leaves the browser open longer than this (only matters with video/audio files)
    window.setTimeout(function() {
        var fileType = +getJSConnectValue('file.type');
        if (fileType === 1 || fileType === 2) {
            session_active = false;
            showSessionTimeoutMessage();
            filePlaybackError();
        }
    }, 4 * 60 * 60 * 1000);

    $("#player_container").mousemove(function(e) {
        if (isFullScreen()) {
            showFullScreenUI();

            if (e.pageX / $(window).width() >= 0.7) {
                if (e.pageY >= 80 && e.pageY <= ($(window).height() - 100) && $(window).width() - e.pageX < 100 && !e.shiftKey) showFullScreenComments();
            } else {
                hideFullScreenComments();
            }
        }
    });

    $("#comment-tabs").tabs();

    // Settings
    $('#settings-autoplay').click(function(e) {
        writeCookie('autoplay',(!!$('#settings-autoplay')[0].getAttribute('checked') ? 1:0),365);
    });

    $('#settings-autopause').click(function(e) {
        window.localStorage.setItem('autopause',(!!$('#settings-autopause')[0].getAttribute('checked') ? 1:0));
    });

    $('#transcript-autoscroll').click(function(e) {
        window.localStorage.setItem('transcript_autoscroll',(!!$('#transcript-autoscroll')[0].getAttribute('checked') ? 1:0));
    });

    $('#settings-loop').click(function(e) {
        writeCookie('loop',(!!$('#settings-loop')[0].getAttribute('checked') ? 1:0),365);
    });

    $('#settings-player-markers').click(function(e) {
        writeCookie('player_markers',(!!$('#settings-player-markers')[0].getAttribute('checked') ? 1:0),365);
        redrawMarkerBar();
    });

    $('#settings-player-play-overlay').click(function(e) {
        var val = (!!$('#settings-player-play-overlay')[0].getAttribute('checked') ? 1:0);
        window.localStorage.setItem('play_overlay',val);

        if (val) {
            if (playerObj.paused) $('#play_banner').show();
        } else {
            $('#play_banner').hide();
        }
    });

    if (!window.localStorage || !window.localStorage.getItem('autopause') || window.localStorage.getItem('autopause') == 1) {
        document.getElementById('settings-autopause').setAttribute('checked', 'checked');
    }

    if (!window.localStorage || !window.localStorage.getItem('play_overlay') || window.localStorage.getItem('play_overlay') == 1) {
        if (document.getElementById('settings-player-play-overlay')) {
            document.getElementById('settings-player-play-overlay').setAttribute('checked', 'checked');
        }
    }

    if (!window.localStorage || !window.localStorage.getItem('transcript_autoscroll') || window.localStorage.getItem('transcript_autoscroll') == 1) {
        if (document.getElementById('transcript-autoscroll')) {
            document.getElementById('transcript-autoscroll').setAttribute('checked', 'checked');
        }
    }

    $('#player-subscribe').click(function(e) {
        var subscribeBtn = $('#player-subscribe');

        if (subscribeBtn.hasClass('subscribed')) {
            subscribeBtn.removeClass('subscribed');
        } else {
            subscribeBtn.addClass('subscribed');
        }

        $.post("ajax/watch",{file:fileID},function(data) {

        }).fail(function(jqXHR, textStatus, errorString) {
            alert(sanitize_string("Failed to subscribe to file: " + errorString));
        });
    });

    $('#player-actions').click(function(e) {
        showMenuForButton($('#player-actions'),$('#player-actions-menu'));
    });

    // Image options
    if (getJSConnectValue('file.type') == 3) {
        $('#image-expand').click(function (e) {
            e.preventDefault();
            imageExpand();
        });

        $('#image-zoom-in').click(function (e) {
            incrementZoomLevel(0.1);
        });

        $('#image-zoom-out').click(function (e) {
            incrementZoomLevel(-0.1);
        });

        $('#image-zoom-fit').click(function (e) {
            zoomImageToFit();
        });

        $('#image-zoom-100').click(function (e) {
            setZoomLevel(1.0);
        });

        $('#player_container').on('wheel', function (e) {
            if (e.originalEvent.metaKey || (!isMac && e.originalEvent.ctrlKey)) {
                incrementZoomLevel(e.originalEvent.deltaY * 0.05);
            }
        });

        $(document).click(function (e) {
            if (e.target === $('#image-expand')[0] || e.target === $('#fullscreen-image')[0] || e.target === $('#fullscreen-image-background')[0]) return;

            closeFullscreenImage();
        });

        $(document).on("click", "#fullscreen-image", function (e) {
            closeFullscreenImage();
        });

        $(document).on("click", "#fullscreen-image-background", function (event) {
            closeFullscreenImage();
        });

        $(document).on("keydown", "#fullscreen-image", function (e) {
            if (event.keyCode === 27) { // Esc
                e.preventDefault();
                closeFullscreenImage();
            }
        });
    }

    if (isEncoding) setupRenderWatcher();

    $(document).on("click","#player_container", function(event) {
        var tag = event.target.tagName.toLowerCase();
        var target = $(event.target);

        if (getJSConnectValue('file.type') == 1) {
            if (!annotationMode && tag !== 'button' && tag !== 'input' && tag !== 'textarea' &&
                !target.hasClass('acorn-controls') && !target.hasClass('timecode_box') &&
                !target.hasClass('marker-bar') && !target.hasClass('marker') &&
                !target.hasClass('ui-slider') && !target.hasClass('ui-tabs-anchor') &&
                !target.hasClass('ui-tabs') && !target.hasClass('ui-tabs-panel')
                && !target.hasClass('comment-container')) {

                event.preventDefault();
                togglePlayback();
                return false;
            }
        }
    });

    setupKeyboardShortcuts();

    $('#comment-color').ddslick({width:45,background:'#494B57',onSelected: function(data){colorIndex=parseInt(data.selectedData.value);changeCommentColor();}}).css('display','inline-block');
    $('#comment-color-filter').ddslick({width:48,background:'#494B57',onSelected: function(data){if (rawComments.length > 0) changeCommentFilter();}});

    $("#player_container").on("contextmenu", function(e) {
    	if ($(e.target).closest('#comment-container').length > 0) return true;
    	
        e.preventDefault(); // Disable right-click

        // Show right-click menu
        $('ul.player-context-menu').remove();

        const menu = $('<ul class="menu" id="player-context-menu"><li><a href="#" onclick="showPlayerSettings()">Playback Settings...</a></li></ul>');

        showMenuForEvent(menu, e);
    });

    $("#comment-field").on("enterKey",function(e){
        if (!e.shiftKey) {
            e.preventDefault();
            $("#comment-submit").trigger("click");
        }
    });

    $("#comment-field").keydown(function(e){
        if (e.keyCode == 13 && !e.shiftKey && !e.target.isShowingUserPopup()) {
            e.preventDefault();
            $(this).trigger("enterKey");
        }
    });

    $("#link_username").keydown(function(e){
        if (e.keyCode == 13) {
            e.preventDefault();
            $("#link_username_submit").trigger("click");
        }
    });

    $("#link_username_submit").click(function(){
        var username = $("#link_username").val().trim();

        if (username.length < 3) {
            alert("You must enter a name consisting of three or more characters.");
            return;
        }

        $.post("link.php?setusername",{username:username},function(result){
            if (result == 'OK') {
                $("#link_username_overlay").hide();
                $("#comment-submit-container").show();
                $("#comment-box").show();
                $('#comment-color').show();
                setupComments();
            } else {
                alert('You entered an invalid name.');
            }
        }).fail(function(jqXHR, textStatus, errorString) {
            alert(sanitize_string("Failed to set username: " + errorString));
        });
    });

    var navBtnTimeout = null;

    // Show next / prev buttons on mouse move
    $('body').mousemove(function(e) {
        if (navBtnTimeout) window.clearTimeout(navBtnTimeout);

       $('.player-nav').animate({opacity:1},200);

        navBtnTimeout = window.setTimeout(function() {
            $('.player-nav').animate({opacity:0},200);
        },3000);
    });

    // Receipts
    $(document).on("click",".user-watch", function(e) {
        var user_id = $(this).data('id');

        if (!user_id) {
            alert('Unable to get user ID.');
            return;
        }

        if ($(e.target).hasClass('unwatch')) {
            $(e.target).removeClass('unwatch');
        } else {
            $(e.target).addClass('unwatch');
        }

        $.post('ajax/receipts.php',{toggle:user_id,file:fileID}, function() {

        }).fail(function(jqXHR, textStatus, errorString) {
            alert(sanitize_string("Failed to toggle receipt: " + errorString));
        });
    });

    // Nudge
    $(document).on("click",".nudge", function(e) {
        var obj = $(this);
        var user_id = obj.data('id');

        if (!user_id) {
            alert('Unable to get user ID.');
            return;
        }

        $.post('include/nudge.php',{nudge:user_id,file:fileID}, function(data) {
            if (data == 'OK') {
                obj.addClass('nudge-sent');
                obj.removeClass('nudge');
                $(e.target).attr('title','Nudge sent');
            } else {
                alert('Unable to nudge user. This user may not have permission to view this file.');
            }
        }).fail(function(jqXHR, textStatus, errorString) {
            alert(sanitize_string("Failed to nudge user: " + errorString));
        });
    });

    $(document).on("click",".acorn-quality-button", function(e) {
        if (!playerObj) playerObj = getPlayerObj();

        var sources = $('source');

        if (sources.length == 0) {
            console.log('Unable to switch quality - no sources found');
            return;
        }

        // Get current src
        var curSrc = playerObj.currentSrc;
        startTimePosition = playerObj.currentTime;
        wasPlaying = !playerObj.paused;

        // Switch to next source
        for (var i=0; i<sources.length; i++) {
            var sourceObj = sources[i];
            var sourceURL = sourceObj.getAttribute('src');

            if (sourceURL == curSrc) { // Current source object
                var newSource = null;

                if (i < sources.length-1) {
                    newSource = sources[i + 1];
                } else {
                    newSource = sources[0];
                }

                playerObj.src = newSource.getAttribute('src');
                $('.acorn-quality-button').removeClass('hd').removeClass('sd');

                if (newSource.id == 'mp4-hd') {
                    $('.acorn-quality-button').addClass('hd');
                    writeCookie('preferSD'); // Erase
                } else {
                    $('.acorn-quality-button').addClass('sd');
                    writeCookie('preferSD',1,365);
                }
            }
        }
    });

    // Downloads
    $('#download-menu a').click(function(e) {
        $('.menu').hide();
    });

    // Favorites
    $('#player-favorite').click(function(e) {
        toggleFavorite();
    });

    $(".player-nav-button").on("mouseover", function(e) {
        var target = $(e.target);
        var container = target.closest('.player-nav');

        if (container[0].id === 'prev-file') {
            var popover = $('.player-nav-popover.left');
            popover.css('display','block');
            popover.css('top','calc(50% - '+((popover.height()/2)-(target.height()/2) + 53)+'px)');
            popover.css('left',(container.offset().left + container.width() + 10) + 'px');
        } else {
            var popover = $('.player-nav-popover.right');
            popover.css('display','block');
            popover.css('top','calc(50% - '+((popover.height()/2)-(target.height()/2) + 53)+'px)');
            popover.css('right',($('body').width() - container.offset().left + 15) + 'px');
        }
    });

    $(".player-nav-button").on("mouseleave", function(e) {
        $('.player-nav-popover').css('display','none');
    });

    $(".auto-advance").on("click", function(e) {
        var autoAdvance = getCookie('auto-advance');
        $('.auto-advance').removeClass('on');

        if (e.target.id == 'auto-advance-back') {
            if (autoAdvance && autoAdvance == 'back') {
                writeCookie('auto-advance','',-1);
            } else {
                writeCookie('auto-advance','back',365);
                $(e.target).addClass('on');

                // If it's not a video or audio file, start advancing to the next file after 2 seconds
                if (getJSConnectValue('file.type') != 1 && getJSConnectValue('file.type') != 2) window.setTimeout(function() { startAutoAdvance(); }, 2000);
            }
        } else {
            if (autoAdvance && autoAdvance == 'forward') {
                writeCookie('auto-advance','',-1);
            } else {
                writeCookie('auto-advance','forward',365);
                $(e.target).addClass('on');

                // If it's not a video or audio file, start advancing to the next file after 2 seconds
                if (getJSConnectValue('file.type') != 1 && getJSConnectValue('file.type') != 2) window.setTimeout(function() { startAutoAdvance(); }, 2000);
            }
        }
    });

    // If it's not a video or audio file, start advancing to the next file after 2 seconds
    if (getJSConnectValue('file.type') != 1 && getJSConnectValue('file.type') != 2) window.setTimeout(function() { startAutoAdvance(); }, 2000);

    $(document).on('click','.comment-date',function(e) {
        if (editingComment > -1) return;
        // Toggle between relative and absolute dates
        var dateType = parseInt(window.localStorage.getItem('comment_date_type'));
        dateType = (dateType === 1 ? 0:1);
        window.localStorage.setItem('comment_date_type',dateType);
        updateDatesForComments();
    });

    window.setInterval(function() {
        updateDatesForComments();
    },60000); // Every 60 secs

    $(document).on('dblclick','.transcript-text',function(e) {
        var nodeName = e.target.nodeName.toLowerCase();
        if (nodeName == 'input' || nodeName == 'textarea') return;

        var transcript_obj = $(e.target).closest('.transcript');

        startEditingTranscriptID(transcript_obj.data('id'),transcript_obj.data('type'));
    });

    $(document).on('keydown','.transcript-edit,.transcript-time-edit,.transcript-duration-edit',function(e) {
        if (e.key == 'Enter') { // Enter
            e.preventDefault();
            submitCurrentEditingTranscript();

        } else if (e.key == 'Escape') { // Escape
            // Remove new sentence if not submitted
            var obj = $(e.target).closest('.transcript');
            if (parseInt(obj.data('id')) == -1) {
                obj.remove();
                deleteTranscriptWithID(-1,parseInt(obj.data('type')));
                return;
            }

            endCurrentTranscriptEditing();
        }
    });

/*    $(document).on('click','body',function(e) {
        var nodeName = e.target.nodeName.toLowerCase();
        if (nodeName == 'input' || nodeName == 'textarea') return;

        var transcript_obj = $('.transcript-edit').closest('.transcript');

        endTranscriptEditing(parseInt(transcript_obj.data('id')),parseInt(transcript_obj.data('type')));
    });*/

    $("#comment-submit").click(function() {
        submitComment();
    });

    if (getJSConnectValue('file.type') == 1 || getJSConnectValue('file.type') == 2) {
        $("#comment-field").keydown(function (e) {
            if (e.key !== 'Enter' && e.key !== 'Backspace' && e.key !== 'Delete') {
                if ($("#comment-field").val().length < 1 && e.keyCode != 13) {
                    var player = getPlayerObj();
                    playAfterComment = !player.paused;

                    if (!window.localStorage || !window.localStorage.getItem("autopause") || window.localStorage.getItem("autopause") == 1) {
                        player.pause();
                    }

                    hold();
                }
            }
        });

        $("#comment-field").on("change keyup copy paste cut", function () {
            if (!this.value && reply_id == -1) unhold();
        });

        $("#comment-field").on("focusout", function () {
            if (!this.value && reply_id > -1) unhold();
        });
    }

    if ("WebSocket" in window) {
        try {
            comment_socket = new WebSocket(socketServerAddress() + "/commentstream/" + getJSConnectValue('file.id'));

            comment_socket.onopen = function () {
                console.log("comment socket opened");
            };

            comment_socket.onclose = function () {
                console.log("comment socket closed");
            };

            comment_socket.onerror = function (evt) {
                console.log("comment socket error: " + evt.data);
            };

            comment_socket.onmessage = function (message) {
                console.log("comment message: " + message.data);
                loadComments(false);
            };
        }

        catch(err) {
            console.log("Error creating websocket: "+err.message);
        }
    }
});

$(document).on('beforeunload', function() {
    if ("WebSocket" in window) {
        if (comment_socket) comment_socket.close();
        comment_socket = null;
    }

    if ('undefined' !== typeof heatmap) heatmap.sync();
});

$(window).on('beforeunload', function() {
    if ("WebSocket" in window) {
        if (comment_socket) comment_socket.close();
        comment_socket = null;
    }

    if ('undefined' !== typeof heatmap) heatmap.sync();
});

$(window).on('unload',function() {
    destroyPlayer();
});

function imageExpand()
{
    var body = $('body');
    var bg = $('<div id="fullscreen-image-background"></div>');
    var fg = $('<div id="fullscreen-image" style="background-image:url(\''+$('#player_container img').prop('src')+'\')" tabindex="1"></div>');

    bg.appendTo(body);
    fg.appendTo(body);

    fg.focus();
}

function closeFullscreenImage() {
    $('#fullscreen-image-background').remove();
    $('#fullscreen-image').remove();
}

function getPlayerObj() {
	if (playerObj == null) playerObj = document.getElementById('video_player');
	return playerObj;
}

function destroyPlayer() {
    if (playerObj == null) return;

    // Required to free up resources in Chrome
    $(playerObj).find('video').prop('src', false);
    $(playerObj).find('audio').prop('src', false);
    $(playerObj).find('source').remove();

    $(playerObj).load(); // Load again to free
}

function canPlayVideo(mime_type)
{
    var vidObj = getPlayerObj();
	if (vidObj && vidObj.canPlayType) {
		if (vidObj.canPlayType(mime_type)) return true;
	}
        
    return false;
}

var remoteToken = null;
var websocket = null;

function toggleSync() {
	if (websocket == null) {
		startSync();
	} else {
		stopSync();
	}
}

function startSync() {
    if (socketReconnectTimer) clearTimeout(socketReconnectTimer);
    socketReconnectTimer = null;
	window.WebSocket = window.WebSocket || window.MozWebSocket;
		  
	if (!window.WebSocket) {
		alert("Your web browser does not support the sync feature.");
		return;
	}

	writeCookie('syncEnabled','1',365);

	$(".acorn-sync-button").css("background-image","url('css/themes/access/access-sync-pending.svg')");

	// Get token
	$.ajax({
		url: "ajax/sync.php"}).done(function(data) {
			remoteToken = data;

            if (remoteToken == 'noauth') {
                stopSync();
                return;
            }

			if (remoteToken == null || remoteToken == '(null)' || remoteToken == '') {
				alert("Unable to create a connection. Please try again.");
				stopSync();
				return;
			}

			// Setup socket
            try {
                websocket = new WebSocket(socketServerAddress() + '/remote/' + remoteToken);

                websocket.onopen = function () {
                    $(".acorn-sync-button").css("background-image", "url('css/themes/access/access-sync-pending.svg')");
                    console.log("socket opened");
                    updateTimecode(true, false);

                    if (!window.hasSession || window.isSessionOwner) sendSocketString('KFILE' + window.fileID);
                };

                websocket.onclose = function () {
                    $(".acorn-sync-button").css("background-image", "url('css/themes/access/access-sync.svg')");
                    console.log("socket closed");

                    // Reconnect in 20 secs
                    if (socketReconnectTimer) clearTimeout(socketReconnectTimer);
                    socketReconnectTimer = window.setTimeout(function () {
                        startSync();
                    }, 20000);
                };

                websocket.onerror = function (evt) {
                    console.log("socket error: " + evt.data);
                    $(".acorn-sync-button").css("background-image", "url('css/themes/access/access-sync.svg')");

                    // Reconnect in 20 secs
                    if (socketReconnectTimer) clearTimeout(socketReconnectTimer);
                    socketReconnectTimer = window.setTimeout(function () {
                        startSync();
                    }, 20000);
                };

                websocket.onmessage = function (message) {
                    var player = getPlayerObj();

                    console.log('data: ' + message.data);

                    if (!window.hasSession || !window.isSessionOwner) {
                        if (message.data == 'KPLAY') {
                            if (player.paused) {
                                if (player.hasOwnProperty('playbackRate'))
                                    player.playbackRate = 1.0;

                                var promise = player.play();

                                if (window.Promise && promise !== undefined) {
                                    promise.then(function() {
                                        // Autoplay started!
                                    }).catch(function(error) {
                                        // Try again muted
                                        player.muted = true;
                                        player.play();
                                    });
                                }
                            } else if (player.hasOwnProperty('playbackRate') && player.playbackRate != 1.0) {
                                player.playbackRate = 1.0;
                            }

                        } else if (message.data == 'KPAUSE') {
                            player.pause();

                        } else if (message.data == 'KREW') {
                            rewind();

                        } else if (message.data == 'KFF') {
                            fastForward();

                        } else if (message.data == 'KHOME') {
                            player.pause();
                            player.currentTime = 0.0;
                            updateTimecode(true, true);

                        } else if (message.data == 'KTCREQ') {
                            if (window.hasSession && window.isSessionOwner)
                                updateTimecode(true, false);

                        } else if (message.data == 'KNOTE') {
                            loadComments(false);

                        } else if (message.data == 'KCONNECT') {
                            if (!window.hasSession) $(".acorn-sync-button").css("background-image", "url('css/themes/access/access-sync-active.svg')");
                            if (!window.hasSession) sendSocketString('KFILE' + window.fileID);
                            updateTimecode(true, true);
                            if (player && !player.paused)
                                sendSocketString('KPLAY');

                        } else if (message.data == 'KDISCONNECT') {
                            $(".acorn-sync-button").css("background-image", "url('css/themes/access/access-sync-pending.svg')");

                        } else if (message.data == 'KWAIT') {
                            $(".acorn-sync-button").css("background-image", "url('css/themes/access/access-sync-pending.svg')");

                        } else if (message.data == 'KALLREADY') {
                            $(".acorn-sync-button").css("background-image", "url('css/themes/access/access-sync-active.svg')");

                        } else if (message.data.length == 17 && message.data.substring(0, 6) == 'KSEEK@') {
                            var timecode = message.data.substring(6);
                            seekToTimecode(timecode);

                        } else if (message.data.length == 13 && (message.data.substring(0, 2) == 'AB' || message.data.substring(0, 2) == 'TC')) {
                            var timecode = message.data.substring(2);
                            seekToTimecode(timecode);

                        } else if (message.data.length > 5 && message.data.substring(0, 5) == 'KFILE') {
                            var newFileID = message.data.substring(5);
                            if (newFileID != window.fileID) window.location = 'player?id=' + newFileID;

                        } else {
                            console.log(message.data);
                        }
                    } else {
                        if (message.data == 'KCONNECT') {
                            $(".acorn-sync-button").css("background-image", "url('css/themes/access/access-sync-active.svg')");
                            if (window.hasSession && window.isSessionOwner) sendSocketString('KFILE' + window.fileID);
                            updateTimecode(true, true);
                            if (player && !player.paused)
                                sendSocketString('KPLAY');
                        } else if (message.data == 'KWAIT') {
                            $(".acorn-sync-button").css("background-image", "url('css/themes/access/access-sync-pending.svg')");
                        } else if (message.data == 'KALLREADY') {
                            $(".acorn-sync-button").css("background-image", "url('css/themes/access/access-sync-active.svg')");
                        }
                    }
                };
            }

        catch (e) {
            showFailureAlert('Unable to start sync. Your browser may not support WebSockets or your security settings are preventing communication.',$('#page'));
        }
	}).fail(function() {
        stopSync();
    });
}

function stopSync() {
	$(".acorn-sync-button").css("background-image","url('css/themes/access/access-sync.svg')");
	
	if (websocket != null && typeof websocket != 'undefined') websocket.close();
	websocket = null;

	clearTimeout(socketReconnectTimer);
	socketReconnectTimer = null;
	
	writeCookie('syncEnabled','0',0);
}

function sendSocketString(val) {
    if (val != null && websocket != null && typeof websocket != 'undefined' && websocket.readyState == 1) {
        websocket.send(val);
    }
}

function sendSocketTimecode(timecode,abs) {
	if (timecode != null && window.isSessionOwner) sendSocketString((abs ? 'AB':'TC')+timecode);
}

window.onunload = function() {
    stopSync();
};

var intervalRewind = null;

function processKeyEvent(e) {
	if (e.target.type == 'textarea' || e.target.type == 'input') {
		return false;
	}

	var player = getPlayerObj();

    if (!window.hasSession || window.isSessionOwner) {

        switch (e.keyCode) {
			case 32:  // Space
                togglePlayback();
				e.preventDefault();
				return false; // Prevent it scrolling
				break;
				
			case 74: case 106: // J
				rewind();
				break;
				
			case 75: case 107: // K
                clearRewind();
                player.playbackRate = 1.0;
				player.pause();
				break;
				
			case 76: case 108: // L
                fastForward();
				break;

			case 13: case 10: case 77: case 109: // Enter or M
                clearRewind();
				e.preventDefault();
				//e.stopImmediatePropagation();
				setTimeout("document.getElementById('comment-field').focus();",1);
//				$('#comment-field').focus();
				return false; // Prevent it automatically submitting
				break;

            case 6: // Down arrow
                player.pause();

                clearRewind();

                if (e.shiftKey) {
                    player.currentTime -= 1.0;
                } else {
                    incrementFrames(-1);
                }
                break;

            case 37: // Left arrow
                clearRewind();

                if (e.shiftKey) {
                    player.currentTime -= 1.0;
                } else {
                    incrementFrames(-1);
                }
				break;

			case 39: // Right arrow
                clearRewind();

                if (e.shiftKey) {
                    player.currentTime += 1.0;
                } else {
                    incrementFrames(1);
                }
				break;

            case 36: // Home
                clearRewind();
                player.currentTime = 0.0;
                break;

            case 35: // End
                clearRewind();
                player.currentTime = player.duration;
                e.preventDefault();
                return false; // Prevent it scrolling
                break;
        }
    }

	return; //using "return" other attached events will execute
}

function togglePlayback()
{
    console.log('toggle playback');

    var player = getPlayerObj();
    if (!player) return;

    clearRewind();

    if (player.paused) {
        if (player.playbackRate) {
            player.playbackRate = 1.0;
        }

        // Reset hold if no text in field
        const commentField = document.getElementById('comment-field');
        if (commentField && commentField.value.trim() === '') unhold();

        shouldPlay = true;
        player.play();
    } else {
        shouldPlay = false;
        wasPlaying = false;
        player.pause();
    }
}

function rewind()
{
    console.log('rewind');

    var player = getPlayerObj();

    // If fast forwarding, slow it down
    if (player.playbackRate > 1.0) {
        player.playbackRate -= 2.0;

        if (player.playbackRate === 0.0) {
            player.playbackRate = 1.0;
        }

        return;
    }

    // Try to play in reverse and catch exception
    // Currently Safari is the only browser to support proper reverse playback
    var expectedRate = 1.0;

    try {
        if (player.playbackRate) {
            expectedRate = player.playbackRate;

            if (expectedRate > -16.0) {
                console.log("3");
                if (expectedRate > 0.0 && expectedRate < 2.0) {
                    expectedRate = -2.0;
                } else {
                    expectedRate -= 2.0;
                }
            }

//            player.pause();

            player.playbackRate = expectedRate;

            if (expectedRate !== player.playbackRate) {
                fakeRewind();
            } else {
                player.play();
            }
        }

    } catch(exception) {
        fakeRewind();
    }
}

function fakeRewind()
{
    var player = getPlayerObj();

    if (rewindRate < 2.0) {
        rewindRate += 0.5;
    }

    if (intervalRewind) {
        window.clearInterval(intervalRewind);
    }

    intervalRewind = window.setInterval(function () {
        player.playbackRate = 1.0;

        if (rewindRate <= 1.0) return;

        if (player.currentTime <= 0.1) {
            player.pause();
            clearRewind();
            player.currentTime = 0.0;
        } else {
            if (player.paused) player.play();

            player.currentTime -= rewindRate;
        }
    }, 100);
}

function clearRewind()
{
    if (intervalRewind) {
        window.clearInterval(intervalRewind);
        intervalRewind = null;
    }

    rewindRate = 0.0;
}

function fastForward()
{
    console.log('fast forward');

    var player = getPlayerObj();

    if (rewindRate > 0) {
        rewindRate -= 0.5;
        return;
    }

    // If the video is paused, just start playing
    if (player.paused) {
        player.playbackRate = 1.0;
        player.play();
        return;
    }
    
    clearRewind();
    player.pause();

    if (player.playbackRate) {
        if (player.playbackRate < 16.0) {
            if (player.playbackRate + 2.0 === 0.0) {
                player.playbackRate = 1.0;
            } else if (player.playbackRate < 2.0) {
                player.playbackRate += 0.5;
            } else {
                player.playbackRate += 2.0;
            }
        }
    }

    if (player.playbackRate === 0.0) {
        player.playbackRate = 1.0;
    }

    player.play();
}

function skipBack()
{
    // Go back 5 secs
    var player = getPlayerObj();

    if (player.currentTime < 5.0) {
        player.currentTime = 0.0;
    } else {
        player.currentTime -= 5.0;
    }
}

function loadRevision()
{
	var dropDownObj = document.getElementById('revisions');
	var optionObj = dropDownObj.options.item(dropDownObj.selectedIndex);

	document.location.href = 'player?id=' + optionObj.value;
}

function seekToTime(timeInSeconds)
{
    if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return;
    
	var player = getPlayerObj();

    if (player && typeof(player.currentTime) != 'undefined') {
        player.currentTime = timeInSeconds;
        updateTimecode(true, true);
    }
}

function seekToPercentage(percent)
{
    if (isNaN(percent) || !isFinite(percent)) return;

    var player = getPlayerObj();

    if (typeof(player.currentTime) != 'undefined') {
        player.currentTime = player.duration * (percent/100.0);
        updateTimecode(true, true);
    }
}

function commentOptionsDropdownClicked() 
{
	$('#comment_options_dropdown').show().menu();
}

function commentDropdownClicked(obj,itemID) 
{
    var container = null;
    if (isFullScreen()) {
        container = $('#player_container');
    }

    showMenuForButton($('#comment_dropdown_container_'+itemID),$('#comment_dropdown_'+itemID), container);
//	$('#comment_dropdown_'+itemID).show().menu();
}

function editComment(obj,id)
{
    cancelCommentEdit(obj, id);

    editingComment = id;
	$(".menu").hide();
	$("#comment_dropdown_container_"+id).hide();

    const commentObj = $(".comment[data-id=\"" + id + "\"]");
    commentObj.find('.comment-date').hide();
    commentObj.find('.comment-controls').hide();

    const comment_text_obj = commentObj.find('.comment-text');
    const comment_text = commentWithID(id)['body'];

	if (comment_text != null) {
        comment_text_obj.hide();

        // Get color index
        const banner_obj = $(".comment[data-id=\""+id+"\"] .comment-banner");
        let color_index = 0;

        if (banner_obj.length) {
            const color_names = ['red','yellow','orange','green','blue','cyan','pink','purple','white','black'];

            for (let i=0; i<color_names.length; i++) {
                if (banner_obj.hasClass(color_names[i])) {
                    color_index = i+1;
                    break;
                }
            }
        }

        // Formulate color dropdown
        const ddData = [
            {text:"",value:0,imageSrc:"img/Swatch_Blank.png"},
            {text:"",value:1,imageSrc:"img/Swatch_Red.png"},
            {text:"",value:2,imageSrc:"img/Swatch_Yellow.png"},
            {text:"",value:3,imageSrc:"img/Swatch_Orange.png"},
            {text:"",value:4,imageSrc:"img/Swatch_Green.png"},
            {text:"",value:5,imageSrc:"img/Swatch_Blue.png"},
            {text:"",value:6,imageSrc:"img/Swatch_Turquoise.png"},
            {text:"",value:7,imageSrc:"img/Swatch_Pink.png"},
            {text:"",value:8,imageSrc:"img/Swatch_Purple.png"},
            {text:"",value:9,imageSrc:"img/Swatch_White.png"},
            {text:"",value:10,imageSrc:"img/Swatch_Black.png"}
        ];

        const color_dropdown = '<div id="comment-color-edit-'+id+'"></div>';

        // Change html
        $(".comment[data-id=\""+id+"\"]").find('.comment-date').before('<div class="comment-edit-area" id="comment-edit-area-'+id+'"><textarea id="comment-edit-'+id+'" style="width:100%;height:150px">'+comment_text+'</textarea><p>'+color_dropdown+'<p><a href="Javascript:cancelCommentEdit(this,\''+id+'\')"><button>Cancel</button> <a href="Javascript:saveComment(this,\''+id+'\')"><button class="actionbtn">Save</button></div>');

        // Skin dropdown
        $('#comment-color-edit-'+id).ddslick({data:ddData,width:45,defaultSelectedIndex:color_index,onSelected: function(data){/*colorIndex=parseInt(data.selectedData.value);changeCommentColor();*/}});

        // Focus textarea
        $(".comment[data-id=\""+id+"\"] textarea").focus();
	}
}

function deleteComment(obj,id) 
{
    deleteCommentWithID(id);
}

function cancelCommentEdit(obj,id)
{
    $(".comment[data-id=\""+id+"\"]").find('.comment-text').show();
    $(".comment[data-id=\""+id+"\"]").find('.comment-date').show();

    $("#comment_dropdown_container_"+id).show();
    $("#comment-edit-area-"+id).remove();

    editingComment = -1;
    loadComments(false);
}

function saveComment(obj,id) 
{
	$("#comment_dropdown_container_"+id).show();

	var comment_text = $("#comment-edit-"+id).val();
//    comment_text = comment_text.replace(new RegExp("\n", 'g'), '<br>');

    var color_index = $('#comment-color-edit-'+id).data('ddslick').selectedIndex;
    var colorName = '';

    switch (color_index) {
        case 1:
            colorName = 'red';
            break;

        case 2:
            colorName = 'yellow';
            break;

        case 3:
            colorName = 'orange';
            break;

        case 4:
            colorName = 'green';
            break;

        case 5:
            colorName = 'blue';
            break;

        case 6:
            colorName = 'cyan';
            break;

        case 7:
            colorName = 'pink';
            break;

        case 8:
            colorName = 'purple';
            break;

        case 9:
            colorName = 'white';
            break;

        case 10:
            colorName = 'black';
            break;
    }

    var banner_obj = $(".comment[data-id=\""+id+"\"] .comment-banner");

    if (color_index == 0) {
        if (banner_obj.length) {
            banner_obj.remove();
            $(".comment[data-id=\""+id+"\"] .comment-spacer").remove();
        }

    } else {
        if (!banner_obj.length) {
            $(".comment[data-id=\""+id+"\"]").prepend('<div class="comment-banner"></div><div class="comment-spacer"></div>');
            banner_obj = $(".comment[data-id=\""+id+"\"] .comment-banner");
        }

        banner_obj.removeClass();
        banner_obj.addClass('comment-banner');
        banner_obj.addClass(colorName);
    }

    $("#comment-edit-area-"+id).remove();
    $("#comment-color-edit-"+id).remove();
    $(".comment[data-id=\""+id+"\"]").find('.comment-text').show();

    editingComment = -1;

    if (comment_text.length > 0) {
		$(".comment[data-id=\""+id+"\"]").find('.comment-text').html(comment_text);
		$(".comment[data-id=\""+id+"\"]").find('.comment-date').html('just now');

		$.post('ajax/comments.php?edit='+id,{body: comment_text,color: color_index},function(data) {
            var json = safeJSONParse(data);

            if (json.error) {
                alert(sanitize_string(json.error));
            } else if (!json.success) {
                alert('Unknown error.');
            } else {
                if (comment_socket != null && typeof comment_socket != 'undefined' && comment_socket.readyState == 1) {
                    comment_socket.send('1');
                }

                loadComments(false);
            }

        }).fail(function(jqXHR, textStatus, errorString) {
            alert(sanitize_string("Failed to edit comment: " + errorString));
        });
	}
}

function nextMarker()
{
    var playerObj = getPlayerObj();
    var curTime = Math.ceil(playerObj.currentTime * 1000.0);

    for (var i = 0; i < comments.length; i++) {
        var comment = comments[i];
        if (Math.ceil(comment['pos'] * 1000.0) > curTime) {
            seekToTime(comment['pos']);
            scrollToCommentID(comment['id']);
            return;
        }
    }
}

function prevMarker()
{
    var playerObj = getPlayerObj();
    var curTime = Math.ceil(playerObj.currentTime * 1000.0);
    var lastObj = null;

    // Higher leeway during playback
    var leeway = 0.05;
    if (!playerObj.paused) leeway = 0.2;
    curTime -= leeway * 1000.0;

    for (var i = 0; i < comments.length; i++) {
        var comment = comments[i];
        if (Math.ceil(comment['pos'] * 1000.0) >= curTime) {
            break;
        }

        lastObj = comment;
    }

    if (lastObj !== null) {
        seekToTime(lastObj['pos']);
        scrollToCommentID(lastObj['id']);
    }
}

$(document).ready(function() {
    $('#timecode_box').on("click",function() {
        if (!window.hasSession || window.isSessionOwner) {
            // Get current timecode position
            var curTimecode = updateTimecode(false,false);
            if (curTimecode == undefined || curTimecode == null || curTimecode == '') curTimecode = '00:00:00:00';

            var timecode = prompt('Enter a timecode position:',curTimecode);

            var dropFrame = getJSConnectValue("file.drop_frame", false);
            var fps = getJSConnectValue("file.fps", 30);
            var startFrame = getJSConnectValue("file.start_frame", 0);

            var startTimecode = timecodeFromFrameCount(startFrame, fps, dropFrame);

            timecode = timecodeFromUserString(timecode, dropFrame, startTimecode);

            if (timecode && timecode.length > 0) {
                seekToTimecode(timecode);
            }
        }
    });
});

function playerDropdownClicked()
{
    showMenuForButton($('#player_dropdown_box button'),$('#player_dropdown'));
}

/* Replies */
var reply_id = -1;
var holdPosition = -1;

function reply(comment_id, position) {
	reply_id = comment_id;
	holdPosition = position;

	// Wait to prevent race condition
    window.setTimeout(function() {
        $('#hold_label').html('Reply');
        $('#comment-field').focus();
    }, 100);
}

/* Holding */

function hold() {
    if (reply_id > -1) return;
	var player = getPlayerObj();

	holdPosition = player.currentTime;	

	var curTimecode = updateTimecode(false,false);
	if (curTimecode == undefined || curTimecode == null || curTimecode == '') curTimecode = '00:00:00:00';
	
	$('#hold_label').html(curTimecode + ' <a href="#" title="Update to current playback position" onclick="hold()"><span class="fa-icon-refresh" style="width:12px; height: 12px"></span></a>');
}

function unhold() {
	holdPosition = -1;
	reply_id = -1;
	$('#hold_label').html('');
}

function showFullScreenUI()
{
    if (!$('.acorn-controls').is(':visible')) {
        $('.acorn-controls').fadeIn(300);
        $('video').css('cursor','default');
    }

    resetFullScreenHideTimer()
}

function hideFullScreenUI()
{
    if (!isFullScreen()) {
        showFullScreenUI();
        return;
    }

    // Only hide during playback
    if (!playerObj.paused) {
        $('.acorn-controls').fadeOut(300);
        $('video').css('cursor','none');
        cancelFullscreenHideTimer();
        hideHeatmap();

    } else {
        showFullScreenUI();
        resetFullScreenHideTimer();
    }
}

function resetFullScreenHideTimer()
{
    cancelFullscreenHideTimer();
    fullScreenHideTimer = window.setTimeout(hideFullScreenUI,3000);
}

function cancelFullscreenHideTimer()
{
    window.clearTimeout(fullScreenHideTimer);
    fullScreenHideTimer = null;
}

function isFullScreen() {
    return (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
}

function showFullScreenComments() {
	if (isIphone || !isFullScreen()) return;

    var comment_tabs = $("#player_container #comment-tabs");
    comment_tabs.addClass('comment-tabs-fullscreen');
	comment_tabs.show("slide", { direction: "right" }, 400);
}

function hideFullScreenComments() {
	if (isIphone || !isFullScreen()) return;
	$("#player_container #comment-tabs").hide("slide", { direction: "right" }, 400);

	// Release focus on comment box when hidden
    var container = $("#player_container");
    if (container.length) container.focus();
}

/* Settings */

function autoPauseChanged()
{
	writeCookie('autopause',document.getElementById('autopause').checked,365);
}

function autoTaskChanged()
{
	writeCookie('autotask',document.getElementById('createtask').checked,365);
}

function showPlayerSettings()
{
    $('.menu').hide();
    $("#settings_dialog").dialog({title:'Playback Settings'});
}

/* Tasks */

function createTask(obj,comment_id) 
{
	$(".menu").hide();

    $.get('task_modify.php?createfromcomment='+comment_id,function(data) {
        if (data.length < 4 || data.substr(0,3) != 'ID:' || data == 'ID:-1') {
            showFailureAlert('Failed to create task','#comment-box');
            return;
        }

        var comment = commentWithID(comment_id);
        comment['task'] = data.substr(3);
        comment['task_status'] = 0;

        var taskTitle = comment['body'];
        if (taskTitle.length > 50) taskTitle = taskTitle.substr(0,50)+'...';
        comment['task_title'] = taskTitle;

        renderComments($('#comment-box'));

		showSuccessAlert('Task created successfully','#comment-box');
	});
}

/* Exporting */

function showMarkerExportDialog()
{
    $(".menu").hide();
    commentExportFormatChanged();
    $("#comment_export_dialog").dialog({title:'Export Comments',width:400});
}

function commentExportFormatChanged()
{
    var selectedVal = $('#comment_export_format').val();

    if (selectedVal == 1) { // Avid
        $("#comment_export_track_row").show();
    } else {
        $("#comment_export_track_row").hide();
    }
}

function showSubtitleExportDialog()
{
    $(".menu").hide();
    $("#subtitle_export_dialog").dialog({title:'Export Captions',width:400});

    // Set language from currently selected language
    let curLang = document.getElementById('transcription-language').value;
    if (!curLang) curLang = 'en';

    document.getElementById('subtitle_export_language').value = curLang;
}

// Events

function createPlaybackEvents(thePlayer,file_id,mime_codec,file_size,mime_type) {
    if (!thePlayer) return;

    thePlayer.addEventListener('play', function() {
        $('.spinner').hide();
        $('#play_banner').hide();

        if (annotationMode && hasAnnotation()) {
            thePlayer.pause();
            if (confirm('Discard this annotation?')) {
                clearAnnotation();
            } else {
                return;
            }
            thePlayer.play();
        }

        shouldPlay = true;
//		window.clearInterval(intervalRewind);
        updateTimecode(true,false);
//        updateCaption();
        timecodeTimer = window.setInterval(function() { updateTimecode(false,false) }, 80);
        syncTimer = window.setInterval(function() { updateTimecode(true,(thePlayer.paused)) }, 20000);
        console.log('play');
    }, false);

    thePlayer.addEventListener('playing', function() {
        // Fix for Safari black screen bug
        var oldHeight = $('#video_player').height();
        $('#video_player').height(oldHeight+1);
        $('#video_player').height('');

        $('.spinner').hide();
        if (!annotationMode) $('#play_banner').hide();
        updateTimecode(true,(thePlayer.paused));
        if (!seeking && (!window.hasSession || window.isSessionOwner)) sendSocketString('KPLAY');
        wasPlaying = true;
        shouldPlay = true;
        requestSessionTimecode();
        if (!thePlayer.paused) clearAnnotation();
        console.log('playing');
    }, false);

    thePlayer.addEventListener('pause', function() {
        $('.spinner').hide();
        if (shouldShowPlayBanner()) $('#play_banner').show();
        wasPlaying = false;
        shouldPlay = false;
        window.clearInterval(intervalRewind);
        updateTimecode(true,true);
//        updateCaption();
        if (timecodeTimer) window.clearInterval(timecodeTimer);
        if (syncTimer) window.clearInterval(syncTimer);
        if (!window.hasSession || window.isSessionOwner) sendSocketString('KPAUSE');
        if ('undefined' !== typeof heatmap) heatmap.sync();
        console.log('pause');
    }, false);

    thePlayer.addEventListener('ended', function() {
        seeking = false;
        $('.spinner').hide();
        if (shouldShowPlayBanner()) $('#play_banner').show();
        updateTimecode(true,true);
//        updateCaption();
        shouldPlay = false;
        clearRewind();
        if (timecodeTimer) window.clearInterval(timecodeTimer);
        if (syncTimer) window.clearInterval(syncTimer);
        if (!window.hasSession || window.isSessionOwner) sendSocketString('KPAUSE');
        console.log('ended');
        playbackDidEnd = true;
        
        // Loop
        if (getCookie('loop') == 1) {
            seekToTime(0);
            thePlayer.play();
        } else {
            startAutoAdvance();
        }
    }, false);

    // Safari sends this erroneously
/*    player.addEventListener('stalled', function() {
            window.clearInterval(intervalRewind);
            updateTimecode(true, true);
            sendSocketString('KPAUSE');
            sendSocketString('KWAIT');

            if (!(player.buffered.start(0) == 0 && player.buffered.end(0) == player.duration))
                $('.spinner').show();
            console.log('stalled');
     }, false);
*/

    thePlayer.addEventListener('timeupdate', function() {
        if ('undefined' !== typeof heatmap) heatmap.checkBounds(thePlayer.currentTime);
    });

    thePlayer.addEventListener('waiting', function() {
//        window.clearInterval(intervalRewind);
        updateTimecode(true,true);
        if (!window.hasSession || window.isSessionOwner) sendSocketString('KPAUSE');
        sendSocketString('KWAIT');
        if (!isIOS) $('.spinner').show();
        console.log('waiting');

        if (!playbackDidEnd && !seeking && shouldPlay) {
//            if (file_size < 1024*1024*1024) logQC(2,1,file_id);

            stallCount++;

            if ((file_size < 1024*1024*1024 && stallCount == 4) || stallCount == 7) {
                $('.info-alert').remove();
                // Disabled until there's a better solution for users who navigate around the file frequently
//                $('#page').prepend('<div class="info-alert">It looks like you may have a slow connection. Either pause playback for 20 seconds to allow it to buffer or click the cloud button to download it to your computer.</div>');
            }
        }

        }, false);

    thePlayer.addEventListener('seeking', function() {
        seeking = true;
        if (!window.hasSession || window.isSessionOwner) sendSocketString('KPAUSE');
        sendSocketString('KWAIT');
        updateTimecode(true,true);
//        updateCaption();
        if (!isIOS) $('.spinner').show();
//        if (!player.paused) clearAnnotation();

        if (annotationPos === null || (thePlayer.currentTime.toFixed(6) != parseFloat(annotationPos).toFixed(6))) {
            clearAnnotation();
        }

        console.log('seeking');
    }, false);

    thePlayer.addEventListener('seeked', function() {
        seeking = false;
        updateTimecode(true,true);
//        updateCaption();
        sendSocketString('KREADY');

        if (wasPlaying && (!window.hasSession || window.isSessionOwner)) sendSocketString('KPLAY');

        $('.spinner').hide();
        console.log('seeked');
    }, false);

    thePlayer.addEventListener('canplay', function() {
        recenterElements();
//		window.clearInterval(intervalRewind);
        $('.spinner').hide();
        sendSocketString('KREADY');
        updateTimecode(true,true);
//        if (shouldPlay) player.play();
        if (shouldShowPlayBanner()) $('#play_banner').show();
        requestSessionTimecode();
        resizeAnnotation();

        console.log('canplay');

        var d = new Date();
        var diff = d.getMilliseconds() - videoLoadStart.getMilliseconds();

//        if (diff > 0) logQC(1,diff,file_id);

        if (shouldPlay && !annotationMode && thePlayer.duration > (60*10)) {
            autoplayAfterDelay();
        }

    }, false);

    thePlayer.addEventListener('canplaythrough', function() {
        recenterElements();
//		window.clearInterval(intervalRewind);
        $('.spinner').hide();
        sendSocketString('KREADY');
        updateTimecode(true,true);
        requestSessionTimecode();
        resizeAnnotation();

        console.log('canplaythrough');

        var d = new Date();
        var diff = d.getMilliseconds() - videoLoadStart.getMilliseconds();

//        if (diff > 0) logQC(1,diff,file_id);

        if (shouldPlay && !annotationMode && thePlayer.paused) {
            autoplayAfterDelay();
        }

    }, false);

    thePlayer.addEventListener('loadedmetadata', function() {
        recenterElements();
        if (startTimePosition > -1 && thePlayer.duration > 0 && (startTimePosition / thePlayer.duration) < 0.9) seekToTime(startTimePosition);
        redrawMarkerBar();

        if (heatmap === null) {
            heatmap = new Heatmap(getJSConnectValue("file.id"));
        }

        if ('undefined' !== typeof heatmap) heatmap.setDuration(thePlayer.duration);

        // Make full screen
        if (getJSConnectValue('file.type') == 1) {
            if (window.URLSearchParams) {
                var params = new URLSearchParams(window.location.search);
                if (params.has('fullscreen')) {
//                    params.delete('fullscreen');
//                    window.location.search = params.toString();
                    $('.acorn-fullscreen-button').trigger('click');
                }
            }
        }

        resizeAnnotation();
    }, false);

    thePlayer.getElementsByTagName('source')[0].addEventListener('error', function(e) {

        if (timecodeTimer) window.clearInterval(timecodeTimer);
        if (syncTimer) window.clearInterval(syncTimer);

        if (canPlayVideo(mime_codec) && mime_type == 'video/mp4') {
//            $('#page').prepend("<div class=\"error-alert\" id=\"loading-error-alert\">Unable to load media. This file may be empty or unsupported by this browser. <a href=\"download?id=" + file_id + "\">Download Now</a> | <a href=\"encode?file=" + file_id + "\">Convert to Playable</a></div>");
        }

        console.log('Error loading video or audio data.');
        console.log(e.message ?? 'Unknown error');

        filePlaybackError();

    }, false);

    thePlayer.getElementsByTagName('source')[0].addEventListener('abort', function() {
        clearRewind();
        console.log('Aborted loading video or audio data.');
        $('.spinner').hide();
    }, false);
}

function createImageEvents(thePlayer) {
    if (!thePlayer) return;

    thePlayer.addEventListener('error', function() {
        console.log('Error loading image data.');

        filePlaybackError();

    }, false);

    thePlayer.addEventListener('abort', function() {
        console.log('Aborted loading image data.');
        $('.spinner').hide();
    }, false);
}

function filePlaybackError()
{
    clearRewind();

    console.log('File playback error.');

    var download_box = $('.download-container').detach();
    $('#player_container').css('height','540px').css('width', '100%').css('max-height','540px').css('border','thin solid').css('padding-top','0').children().remove();
    download_box.css('display','block').appendTo('#player_container');

    $('.spinner').hide();

    if (isEncoding && !$('.info-alert')) {
        $('#content').prepend('<div class="info-alert" id="encoding_alert">This file is in the queue to be converted to a playable version but can be downloaded for playback on your computer in the meantime.</div>');
    }

    $('#image-control-container').hide();
    $('#doc-control-container').hide();
    $('#annotation_btn').hide();
}

function requestSessionTimecode() {
    if (window.hasSession && !window.isSessionOwner) {
        var curTime = new Date().getTime();
        if (lastSessionTCReq == 0 || lastSessionTCReq < (curTime - 10000)) { // 10 secs
            lastSessionTCReq = new Date().getTime();
            sendSocketString('KTCREQ');
        }
    }
}

// Thumbnail

function changeThumbToCurrent(file_id) {
    $('.menu').hide();

    var playbackPos = 0;

    if (getJSConnectValue('file.type') == 1) {
        var player = getPlayerObj();

        playbackPos = player.currentTime;

        if (isNaN(playbackPos)) {
            showFailureAlert('Unable to set thumbnail. The video may not be fully loaded.', $('#page'));
            return;
        }
    }

    $.post("include/thumb.php",{thumb:playbackPos,file:file_id}, function(data) {

    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to set thumbnail: " + errorString));
    });

    alert('Thumbnail updated. It may take up to 30 seconds for the new thumbnail to be shown on the Files page.');
}

// Misc

function gatherFileMetadata(file_id) {
    $('.menu').hide();

    $.post("ajax/file_ops.php",{gathermetadata:file_id}, function(data) {
        var jsonData = safeJSONParse(data);
        if (jsonData && jsonData["success"]) {
            showSuccessAlert("Metadata successfully gathered.", $('#page'));
            window.location.reload();
        } else {
            alert(sanitize_string("Failed to gather metadata: " + jsonData["error"] ? jsonData["error"] : "Unknown error."));
        }
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to gather metadata: " + errorString));
    });
}

function showInfo() {
    $('#info_dialog').dialog({title:'Info'});
}

function recenterElements() {
//    $("#player_container").css({'min-height':$('video').data('height')});
    $('#play_banner').css('top','calc(50% - 32px)','left','calc(50% - 32px');
}

function revisionDropdownClicked() {
	$('#revision_dropdown').show().menu();
}

function changeRevision(file_id,link_id) {

	var player = getPlayerObj();

    var url = 'player?id='+file_id+(link_id ? '&link='+link_id:'');

    if (player) {
        var curTime = player.currentTime;

        url += '&time=' + encodeURIComponent(curTime);
    }

    window.location.href = url;
}

function hideSpecAlerts() {
    $('#spec-alert').hide();

    writeCookie('hide_spec_alerts','1',365);
}

function autoplayAfterDelay()
{
    if (!shouldPlay) return;

    var thePlayer = getPlayerObj();
    if (!thePlayer || typeof thePlayer == 'undefined') return;

    var theDuration = thePlayer.duration;

    if (typeof theDuration == 'undefined' || isNaN(theDuration) || theDuration <= 0) theDuration = 1;

    var waitTime = Math.ceil(600 * (theDuration/240));
    waitTime += (stallCount*100);
    if (waitTime > 2200) waitTime = 2200;
    if (waitTime < 600) waitTime = 600;

    console.log('preparing to autoplay');

    window.setTimeout(function () {
        if (!shouldPlay) return;
        console.log('autoplaying...');

        var playPromise = thePlayer.play();

        if (typeof playPromise != 'undefined') {
            playPromise.then(function () {
                console.log('autoplay success');
            }).catch(function (error) {
                console.log('autoplay failed: '+error);
            });
        }

        }, waitTime);
}

function removeOriginalFile(file_id) {
    $('.menu').hide();

    if (confirm("Are you sure you wish to remove the original file? This cannot be undone.")) {
        $.post("ajax/file_ops.php",{removeOriginal:file_id}, function(data) {
            var json = safeJSONParse(data);

            if (json.error) {
                showFailureAlert(sanitize_string(json.error), $('#page'));
            } else if (!json["success"]) {
                showFailureAlert("Unknown error", $('#page'));
            } else {
                showSuccessAlert('Original file removed.',$('#page'));
            }
        }).fail(function(jqXHR, textStatus, errorString) {
            alert(sanitize_string("Failed to remove file: " + errorString));
        });
    }
}

function removePlayableFile(file_id) {
    $('.menu').hide();

    if (confirm("Are you sure you wish to remove all playable copies of this file? They can be recreated by going to Actions > Create Playable Versions.")) {
        $.post("ajax/file_ops.php",{removePlayable:file_id}, function(data) {
            var json = safeJSONParse(data);

            if (json.error) {
                showFailureAlert(sanitize_string(json.error), $('#page'));
            } else if (!json["success"]) {
                showFailureAlert("Unknown error", $('#page'));
            } else {
                window.location.reload();
            }
        }).fail(function(jqXHR, textStatus, errorString) {
            alert(sanitize_string("Failed to remove file: " + errorString));
        });
    }
}

function reloadComments()
{
    if (editingComment > -1) return;

    lastCommentRequest = 0;
    loadComments(true);
}

function loadComments(show_spinner,comment_id)  {

    if (editingComment > -1 && (!comment_id || editingComment == comment_id)) return;

    // Show loading spinner
    if (show_spinner) $("#comment-box").html('<center><img src="img/spinner-white.svg"></center>');

    var commentSource = comment_file_id;
    if (customCommentSource > -1) commentSource = customCommentSource;

    var prevRequest = lastCommentRequest;
    lastCommentRequest = Math.round(new Date().getTime() / 1000);

    // Run on thread to prevent it locking the UI
    if (typeof(Worker) !== "undefined") {
        if (commentLoadWorker) commentLoadWorker.terminate();

        commentLoadWorker = new Worker("js/worker.comments.js?v=" + getJSConnectValue('site.script_version'));

        commentLoadWorker.postMessage("file="+commentSource+"&lastrequest="+prevRequest+"&colorfilter="+colorFilterIndex+(comment_id ? "&comment="+comment_id:"")+(window.jsconnect && "link" in window.jsconnect && "id" in window.jsconnect["link"] ? "&link_id="+window.jsconnect["link"]["id"]:""));

        commentLoadWorker.onmessage = function (event) {
            commentLoadWorker.terminate();
            commentLoadWorker = null;

            var data = event.data;
            if (show_spinner) $("#comment-box").html('');

            window.setTimeout(function() {
                var obj = safeJSONParse(data);

                if (!obj) {
                    alert('Unable to load comments');
                    return;
                }

                if (!obj['error']) {
                    addNewComments(obj, $('#comment-box'));

                    // Autoselect comments
                    if (autoSelectCommentID > -1) {
                        scrollToCommentID(autoSelectCommentID);

                        var commentObj = commentWithID(autoSelectCommentID);
                        if (commentObj) seekToComment(commentObj, true);

                        autoSelectCommentID = -1;
                    }
                }
            },1);
        };

    } else {
        console.log('Unable to load comments - this browser does not support Web Workers');
        alert('Unable to load comments - this browser does not support Web Workers');
    }
}

function reloadTranscription()
{
    transcripts = [];

    loadTranscription(true);
}

function loadTranscription(show_spinner)
{
   // Show loading spinner
    if (show_spinner) $("#transcript-box").html('<center><img src="img/spinner-white.svg"></center>');

    // Run on thread to prevent it locking the UI
    if (typeof(Worker) !== "undefined") {
        if (transcriptLoadWorker) transcriptLoadWorker.terminate();

        transcriptLoadWorker = new Worker("js/worker.transcript.js?v=" + getJSConnectValue('site.script_version'));

        var lang = $("#transcription-language").val();
        var linkID = getJSConnectValue('link.id');

        transcriptLoadWorker.postMessage("file=" + getJSConnectValue('file.id') + "&lang=" + lang + (linkID ? '&link=' + linkID : ''));

        transcriptLoadWorker.onmessage = function (event) {
            transcriptLoadWorker.terminate();
            transcriptLoadWorker = null;

            var data = event.data;
            if (show_spinner) $("#transcript-box").html('');

            window.setTimeout(function() {
                var obj = safeJSONParse(data);

                if (!obj) {
                    alert('Unable to load transcript');
                    return;
                }

                if (!obj['error']) {
                    setTranscription(obj, $('#transcript-box'));
                }
            },1);
        };

    } else {
        console.log('Unable to load transcript - this browser does not support Web Workers');
        alert('Unable to load transcript - this browser does not support Web Workers.');
    }
}

// Encoding

function setupRenderWatcher()
{
    if (typeof(Worker) !== "undefined") {
        if (renderWatcher) renderWatcher.terminate();

        renderWatcher = new Worker("js/worker.render-watcher.js?v=" + getJSConnectValue('site.script_version'));
        renderWatcher.postMessage(getJSConnectValue('file.id'));

        renderWatcher.onmessage = function (event) {
            var data = event.data.trim();

            var optimizeObj = $('#optimizing-progress');

            if (data.length > 9 && data.substr(0,9) == 'PROGRESS:') {
                var percent = data.substr(9).trim();
                optimizeObj[0].setAttribute('progress', percent);
                optimizeObj.parent().prop('title', 'Optimizing for playback... (' + percent + '%)');

            } else if (data.length > 6 && data.substr(0,6) == 'QUEUE:') {
                var position = data.substr(6).trim();
                optimizeObj[0].setAttribute('progress', 0);
                optimizeObj.parent().prop('title','Optimizing for playback... (queue position ' + position + ')');

            } else if (data == 'DONE') {
                renderWatcher.terminate();
                renderWatcher = null;

                // Replace optimize object
                var parent = optimizeObj.parent('a')[0];

                const success = document.createElement('div');
                success.id = 'optimizing-progress';
                success.style.background = "url('img/Success.svg') no-repeat center/51%";
                success.style.display = 'inline-block';
                success.classList.add('done');
                parent.replaceChild(success, optimizeObj[0]);
                parent.setAttribute('title', 'Load optimized version');
                parent.setAttribute('href', 'Javascript:window.location.reload();');

                if ($('.info-alert').length) {
                    $('.info-alert').remove();
                    $('#content').prepend('<div class="info-alert">An optimized version of this file is available. <a href="Javascript:window.location.reload();"><button>Reload</a><div class="spacer"></div></div>');
                }
            }
        };
    }
}

// Auto-advance

function startAutoAdvance()
{
    var autoAdvance = getCookie('auto-advance');
    if (autoAdvance !== 'back' && autoAdvance !== 'forward') return;

    var obj = (autoAdvance === 'back' ? $('#auto-advance-back') : $('#auto-advance-forward'));
    if (!obj.length) return;

    obj.addClass('countdown');

    var iteration = 0;
    var timer = setInterval(function() {
        var autoAdvance = getCookie('auto-advance');
        if (autoAdvance !== 'back' && autoAdvance !== 'forward') {
            clearInterval(timer);
            $('#auto-advance-back').html('&#10226;');
            $('#auto-advance-forward').html('&#10227;');
            obj.removeClass('countdown');
            obj[0].style.setProperty('background-image','none','important');
            return;
        }

        // Make sure buttons are showing
        $('.player-nav').css('opacity','1');

        switch (iteration) {
            case 0:
                obj[0].style.setProperty('background-image','linear-gradient(90deg, #04933d 50%, transparent 50%)','important'); // 50%
                break;
            case 1:
                obj[0].style.setProperty('background-image','linear-gradient(180deg, transparent 50%, red 50%),linear-gradient(90deg, #04933d 50%, transparent 50%)','important'); // 75%
                break;
            case 2:
                obj[0].style.setProperty('background-image','none','important'); // 100%
                clearInterval(timer);

                if (autoAdvance === 'back') {
                    if (isFullScreen()) $('#prev-file a').attr('href',$('#prev-file a').attr('href')+'&fullscreen');
                    $('#prev-file a button')[0].click();
                } else {
                    if (isFullScreen()) $('#next-file a').attr('href',$('#next-file a').attr('href')+'&fullscreen');
                    $('#next-file a button')[0].click();
                }
                break;
            default:
                clearInterval(timer);
                return;
        }

        iteration++;
    }, 1000);
}

function showDownloadDropdown()
{
    showMenuForButton($('#player-action-download'),$('#download-menu'));
}

function showShareDropdown()
{
    showMenuForButton($('#player-share'),$('#share-menu'));
}

function shouldShowPlayBanner()
{
    return (!window.hasSession || window.isSessionOwner) && !annotationMode && !isIphone &&
        (!window.localStorage || !window.localStorage.getItem('play_overlay') || window.localStorage.getItem('play_overlay') == 1);

}

function showUsersTab()
{
    $('#info-tabs').tabs('option', 'active', 2);
}

function submitExportComments(e)
{
    $('#comment_export_dialog').dialog('close');

    var selectedVal = $('#comment_export_format').val();

    if (selectedVal == 9) { // Print
        // Get params
        var url = 'print?' + $('#comment-export-form').serialize();

        var win = window.open(url, '_blank');
        win.focus();
        e.returnValue = false;
        return false;
    }

    return true;
}

function submitTranscriptCorrection(transcript_id,type,sentence,start_time,duration)
{
    if (sentence.length == 0) {
        alert('Content cannot be empty.');
        return;
    }

    if (start_time < 0) {
        alert('Invalid start time.');
        return;
    }

    if (duration <= 0) {
        alert('Invalid duration.');
        return;
    }

    var lang = $("#transcription-language").val();

    var transcript = transcriptWithID(transcript_id,type);
    transcript['sentence'] = sentence;
    transcript['time'] = start_time;
    transcript['duration'] = duration;

    endTranscriptEditing(transcript_id,type);

    $.post('ajax/transcript', {
        edit: transcript_id,
        type: type,
        sentence: sentence,
        time: start_time,
        duration: duration,
        file: getJSConnectValue('file.id'),
        lang: lang
    }, function (data) {
        var json = safeJSONParse(data);

        if (json) {
            if (json["error"]) {
                alert(sanitize_string(json["error"]));
                reloadTranscription();
            } else if (json["id"]) {
                if (transcript_id == -1) {
                    var new_transcript_id = parseInt(json["id"]);

                    var transcript = transcriptWithID(-1,type);
                    transcript['id'] = new_transcript_id;

                    var page_obj = pageObjectForTranscriptID(-1,type);
                    page_obj.data('id',new_transcript_id);
                    page_obj.attr('data-id',new_transcript_id);
                }

                reloadPlayerCaptions();

            } else {
                alert("Unknown error.");
                reloadTranscription();
            }
        } else {
            alert("Error in output.");
            reloadTranscription();
        }
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to edit transcript: " + errorString));
    });
}

function deleteTranscript(transcript_id,type)
{
    closeMenu();

    if (confirm('Are you sure you wish to delete this caption?')) {
        deleteCaptionWithID(transcript_id,type);
    }
}

function deleteAllTranscripts() {
    closeMenu();

    if (confirm('Are you sure you wish to delete all captions?')) {
        deleteAllCaptions();
    }
}

function deleteCaptionWithID(transcript_id,type)
{
    for (var i=0; i<transcripts.length; i++) {
        if (transcripts[i]['id'] == transcript_id && transcripts[i]['type'] == type) {
            transcripts.splice(i,1);
            break;
        }
    }

    $('.transcript[data-id='+transcript_id+'][data-type='+type+']').remove();

    var lang = $("#transcription-language").val();

    if (transcript_id > -1) {
        $.post('ajax/transcript', {
            delete: transcript_id,
            type: type,
            lang: lang
        }, function (data) {
            var json = safeJSONParse(data);

            if (json) {
                if (json["error"]) {
                    alert(sanitize_string(json["error"]));
                    reloadTranscription();
                } else if (!json["success"]) {
                    alert("Unknown error.");
                    reloadTranscription();
                }
            } else {
                alert("Error in output.");
                reloadTranscription();
            }
        }).fail(function(jqXHR, textStatus, errorString) {
            alert(sanitize_string("Failed to delete transcript: " + errorString));
        });
    }
}

function deleteAllCaptions()
{
    transcripts = [];
    $('.transcript').remove();

    var lang = $("#transcription-language").val();

    $.post('ajax/transcript', {
        deleteall: getJSConnectValue('file.id'),
        lang: lang
    }, function (data) {
        var json = safeJSONParse(data);

        if (json) {
            if (json["error"]) {
                alert(sanitize_string(json["error"]));
                reloadTranscription();
            } else if (!json["success"]) {
                alert("Unknown error.");
                reloadTranscription();
            } else {
                reloadTranscription();
                removePlayerCaptions();
            }
        } else {
            alert("Error in output.");
            reloadTranscription();
        }
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to delete transcriptions: " + errorString));
    });
}

function toggleAudioRecording(sender)
{
    if (recordingMode > 0) {
        if (confirm('Discard this recording?')) {
            //TODO
            if (recordingMode == 2) recordingMode = 0;
        }
    }

    if (recordingMode == 1) {
        recordingMode = 0;
    } else {
        recordingMode = 1;
    }

    if (recorder) {
        recorder.abort();
        recorder = null;
    }

    if (recordingMode == 1) {
        sender.style.background = '#9c1c14';

        var commentField = $('#comment-field');
        var canvas = $('<canvas id="record-canvas"></canvas>');
        canvas.insertAfter(commentField);
        canvas.width(commentField.width()).prop('width',commentField.width());
        canvas.height(commentField.height()).prop('height',commentField.height());
        canvas.position(commentField.position().left,commentField.position().top);
        commentField.css('display','none');
        $('#comment-submit').css('display','inline');

        recorder = new Recorder();
        recorder.audioCanvas = canvas[0];
        recorder.recordVideo = false;
        recorder.record();

    } else {
        sender.style.background = 'transparent';

        $('#record-canvas').remove();
        $('#comment-field').css('display','block');
        $('#comment-submit').css('display','none');
    }
}

function toggleVideoRecording(sender)
{
    if (recordingMode > 0) {
        if (confirm('Discard this recording?')) {
            //TODO

            if (recordingMode == 1) recordingMode = 0;
        }
    }

    if (recordingMode == 2) {
        recordingMode = 0;
    } else {
        recordingMode = 2;
    }

    if (recorder) {
        recorder.abort();
//        recorder = null;
    }

    if (recordingMode == 2) {
        sender.style.background = '#9c1c14';

        var commentField = $('#comment-field');
        var canvas = $('<canvas id="record-canvas"></canvas>');
        canvas.insertAfter(commentField);
        canvas.width(commentField.width()).prop('width',commentField.width());
        canvas.height(200).prop('height',200);
        canvas.position(commentField.position().left,commentField.position().top);
        commentField.css('display','none');
        $('#comment-submit').css('display','inline');

        recorder = new Recorder();
        recorder.videoCanvas = canvas[0];
        recorder.recordVideo = true;
        recorder.recordAudio = true;
        recorder.record();

    } else {
        sender.style.background = 'transparent';

        $('#record-canvas').remove();
        $('#comment-field').css('display','block');
        $('#comment-submit').css('display','none');
    }
}

function attachFile(sender)
{
    closeMenu();
    showFileBrowser(-1,attachExistingFile)
}

function attachExistingFile(file_id,file_title,file_icon)
{
    addCommentBoxAttachment(file_id,0,file_title,file_icon,null);
}

function addCommentBoxAttachment(file_id,type,file_title,file_icon,file_obj)
{
    var attachment = {id:file_id, type:0, unique_id: Date.now() + '_' + file_id + '_' + commentAttachments.length};
    if (file_obj) attachment['file'] = file_obj;

    commentAttachments.push(attachment);

    var comment_attachment_obj = $('#comment-box-attachments');

    if (!file_icon) file_icon = 'img/Unknown_Doc.svg';

    comment_attachment_obj.html(comment_attachment_obj.html() + '<div class="comment-attachment" data-id="' + attachment['unique_id'] + '"><div class="icon"><progress-bar-circular class="upload-progress" width="30" height="30" image-url="' + file_icon + '" use-color-image="true" progress="0"></progress-bar-circular></div> ' + file_title + '<a href="#" onclick="removeCommentBoxAttachment(\'' + attachment['unique_id'] + '\')"> <div class="delete-btn"></div></a></div>');
}

function removeCommentBoxAttachment(unique_id)
{
    for (var i=0; i<commentAttachments.length; i++) {
        var attachment = commentAttachments[i];

        if (attachment['unique_id'] == unique_id) {
            commentAttachments.splice(i,1);
            break;
        }
    }

    $('#comment-box-attachments .comment-attachment[data-id=' + unique_id + ']').remove();
}

function deleteCommentAttachment(attachment_id,comment_id)
{
    if (confirm("Are you sure you wish to delete this attachment?")) {
        $('.comment-link[data-link-id=' + attachment_id + ']').remove();

        var comment = commentWithID(comment_id);

        if (!comment) {
            alert('Unable to locate comment.');
            return;
        }

        var attachments = comment['attachments'];

        for (var i = 0; i < attachments.length; i++) {
            var attachment = attachments[i];
            if (attachment['link_id'] == attachment_id) {
                attachments.splice(i, 1);
                break;
            }
        }

        $.ajax("ajax/comments.php?deleteattachment=" + attachment_id + (window.jsconnect && "link" in window.jsconnect && "id" in window.jsconnect["link"] ? "&link_id=" + window.jsconnect["link"]["id"] : ""));
    }
}

function submitComment()
{
    // Ignore if uploading
    if (uploads.length > 0) return;

    var scriptStart = Date.now();

    var position = 0;
    var _reply_id = reply_id;
    var timecode = '';

    if (+getJSConnectValue('file.type') === 1 || +getJSConnectValue('file.type') === 2) {
        var player = getPlayerObj();
        if (player != null) {
            if (holdPosition > -1) {
                position = holdPosition;
            } else {
                position = player.currentTime;
            }
        }

        timecode = $("#hold_label")[0].textContent;
    }

    var commentField = $("#comment-field");
    var body_text = commentField.val().trim();
    commentField.attr('disabled','disabled');

    if (body_text.length === 0) {
        if (hasAnnotation()) {
            alert("Please type a comment for this annotation before submitting it.");
        }

        if (commentAttachments.length > 0) {
            alert("Please type a comment for these attachments before submitting.");
        }

        commentField.removeAttr('disabled');
        commentField.focus();
        return;
    }

    // Upload attachments first
    for (var i=0; i<commentAttachments.length; i++) {
        var attachment = commentAttachments[i];
        if (attachment['file']) {
            var fileObj = attachment['file'];

            addFileToQueue(fileObj,null,function(upload) {
                upload.representedObject = attachment;
            });
        }
    }

    if (uploads.length > 0) return;

    var attachmentJSON = JSON.stringify(commentAttachments);

    var params = {submit:1,body:body_text,position:position,file:comment_file_id,replyto:_reply_id,color:colorIndex,comment_attachments:attachmentJSON};
    if (annotationMode && hasAnnotation()) params["annotation"] = getAnnotationData();

    if (+getJSConnectValue('file.type') === 6 && curPDFPage) { // Document
        params['page'] = curPDFPage;
    }

    if (getJSConnectExists("link.id")) params["link_id"] = getJSConnectValue("link.id");

    $(".tipsy").hide();
    unhold();

    // Add placeholder
    var placeholder = {body: stripUserTags(body_text),can_edit:false,date:"now",pos:position,username:user_name,timestamp:(Date.now()/1000),reply:_reply_id,is_link:true,timecode:timecode,color:colorIndex};

    addNewComments([placeholder]);

    $.post("ajax/comments.php",params,function(result) {
        commentField.removeAttr('disabled');

        // Wait before focus to prevent race condition
        window.setTimeout(function() {
            commentField.focus();
        }, 1);

        var json = safeJSONParse(result);

        if (json && json["id"]) {
            var commentID = parseInt(json["id"]);
            loadComments(false,commentID);
        } else if (json && json["error"]) {
            alert(sanitize_string(json["error"]));
            removeAllPlaceholderComments();
        } else {
            logError("Unknown error when submitting comment.");
            alert("Unknown error when submitting comment.");
            removeAllPlaceholderComments();
        }

        if (comment_socket && comment_socket.readyState === 1) comment_socket.send("1");
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Error posting comment: " + errorString));
        removeAllPlaceholderComments();
    });

    exitAnnotationMode();

    commentField.prop("title","");
    commentField.tipsy("disable");
    commentField.val("");

    commentAttachments = [];
    $('#comment-box-attachments').html('');

    if (is_auto_subscribed) {
        $("#player-subscribe").addClass("subscribed");
    }

    if (+getJSConnectValue('file.type') === 1 || +getJSConnectValue('file.type') === 2) {
        if (player != null) {
            if (!window.hasSession || window.isSessionOwner) {
                clearRewind();

                if (playAfterComment) {
                    clearAnnotation();
                    player.play();
                }
            }

            unhold();
        }
    }
}

function pageObjectForCommentBoxAttachment(attachment)
{
    return pageObjectForCommentBoxAttachmentID(attachment['unique_id']);
}

function pageObjectForCommentBoxAttachmentID(unique_id)
{
    return $('.comment-attachment[data-id=' + unique_id + ']');
}

function zoomImageToFit()
{
    var imageObj = $('#image_viewer');
    var originalW = imageObj[0].naturalWidth;
    var originalH = imageObj[0].naturalHeight;

    var playerContainer = $('#player_container');
    var playerW = playerContainer.width() * 0.95;
    var playerH = playerContainer.height() * 0.95;

    var newZoom = playerW / originalW;
    var newWidth = originalW * newZoom;
    var newHeight = originalH * newZoom;

    if (newHeight > playerH) {
        newZoom = playerH / originalH;
    }

    setZoomLevel(newZoom);
}

function currentZoomLevel()
{
    var imageObj = $('#image_viewer');
    if (!imageObj.length) return 1;

    var originalW = imageObj[0].naturalWidth;

    var imageW = imageObj.width();

    return imageW / originalW;
}

function incrementZoomLevel(amount)
{
    var zoomLevel = currentZoomLevel();
    zoomLevel += amount;

    setZoomLevel(zoomLevel);
}

function setZoomLevel(zoom)
{
    if (zoom < 0.05 || zoom > 10.0) return;

    var imageObj = $('#image_viewer');
    if (!imageObj.length) return;

    var originalW = imageObj[0].naturalWidth;
    var originalH = imageObj[0].naturalHeight;

    imageObj.css('width',(originalW*zoom)+'px').css('height',(originalH*zoom)+'px');
    $('#player_container svg').css('width',(originalW*zoom)+'px').css('height',(originalH*zoom)+'px');

    $('#image-zoom-100').html(Math.round(zoom*100)+'%');

    resizeAnnotation();
}

function setupKeyboardShortcuts() {
    var container = $("#player_container");
    if (!container.length) return;

    container.focus();
//    container.addEventListener("keydown",processKeyEvent,false);

    shortcutKeyManager = new ShortcutKeyManager();

    if ((getJSConnectValue('file.type') == 1 || getJSConnectValue('file.type') == 2) && (!window.hasSession || window.isSessionOwner)) {
        shortcutKeyManager.addKey('space', 'Play / pause', function (e) {
            togglePlayback();
            e.preventDefault();
            return false; // Prevent it scrolling
        });

        shortcutKeyManager.addKey('j', 'Rewind', function (e) {
            rewind();
        });

        shortcutKeyManager.addKey('k', 'Pause', function (e) {
            clearRewind();
            var player = getPlayerObj();
            player.pause();
        });

        shortcutKeyManager.addKey('l', 'Fast forward', function (e) {
            fastForward();
        });

        shortcutKeyManager.addKey('home', 'Go to start', function (e) {
            clearRewind();
            var player = getPlayerObj();
            player.currentTime = 0.0;
        });

        shortcutKeyManager.addKey('end', 'Go to end', function (e) {
            clearRewind();
            var player = getPlayerObj();
            player.currentTime = player.duration;
            e.preventDefault();
        });

        shortcutKeyManager.addKey('right', 'Step forward 1 frame', function (e) {
            clearRewind();
            incrementFrames(1);
        });

        shortcutKeyManager.addKey('left', 'Step backward 1 frame', function (e) {
            clearRewind();
            incrementFrames(-1);
        });

        shortcutKeyManager.addKey('shift+right', 'Go forward 1 second', function (e) {
            clearRewind();
            var player = getPlayerObj();
            player.currentTime += 1.0;
        });

        shortcutKeyManager.addKey('shift+left', 'Go backward 1 second', function (e) {
            clearRewind();
            var player = getPlayerObj();
            player.currentTime -= 1.0;
        });
    }

    shortcutKeyManager.addKey('up', 'Go to previous marker', function (e) {
        e.preventDefault();
        prevMarker();
    });

    shortcutKeyManager.addKey('down', 'Go to next marker', function (e) {
        e.preventDefault();
        nextMarker();
    });

    shortcutKeyManager.addKey('enter', 'Add comment', function (e) {
        clearRewind();
        e.preventDefault();
        //e.stopImmediatePropagation();
        showFullScreenComments();
        setTimeout(function() {
            document.getElementById('comment-field').focus();
        }, 1);
        return false; // Prevent it automatically submitting
    });

    shortcutKeyManager.addKey('m', 'Add comment', function (e) {
        clearRewind();
        e.preventDefault();
        //e.stopImmediatePropagation();
        showFullScreenComments();
        setTimeout(function() {
            document.getElementById('comment-field').focus();
        }, 1);
        return false; // Prevent it automatically submitting
    });

    shortcutKeyManager.addKey('f', 'Favorite / unfavorite file', function (e) {
        toggleFavorite();
    });

    shortcutKeyManager.addKey('shift+f', 'Full screen', function (e) {
        toggleFullScreen();
    });

    if (getJSConnectValue('file.type') == 6) { // Document
        shortcutKeyManager.addKey('=', 'Zoom in', function (e) {
            incrementDocZoomLevel(0.1);
        });

        shortcutKeyManager.addKey('-', 'Zoom out', function (e) {
            incrementDocZoomLevel(-0.1);
        });

        shortcutKeyManager.addKey('left', 'Previous page', function (e) {
            goToPrevPage();
        });

        shortcutKeyManager.addKey('right', 'Next page', function (e) {
            goToNextPage();
        });

    } else if (getJSConnectValue('file.type') == 3) { // Image
        shortcutKeyManager.addKey('=', 'Zoom in', function (e) {
            incrementZoomLevel(0.1);
        });

        shortcutKeyManager.addKey('-', 'Zoom out', function (e) {
            incrementZoomLevel(-0.1);
        });
    }

    shortcutKeyManager.addKey('shift+n', 'Go to next file', function (e) {
        const button = document.querySelector('.player-nav#next-file .player-nav-button');
        if (button) button.click();
    });

    shortcutKeyManager.addKey('shift+p', 'Go to previous file', function (e) {
        const button = document.querySelector('.player-nav#prev-file .player-nav-button');
        if (button) button.click();
    });
}

function toggleFavorite()
{
    var target = $('#player-favorite');
    $.post("ajax/favorites.php",{toggle:fileID,type:0}, function() {
        if (target.hasClass('subscribed')) {
            target.removeClass('subscribed');
            target.attr('title','Favorite');
        } else {
            target.addClass('subscribed');
            target.attr('title','Unfavorite');
        }
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to set favorite: " + errorString));
    });
}

function toggleFullScreen()
{
    var fullscreenBtn = $('.acorn-fullscreen-button');

    if (fullscreenBtn.length) {
        fullscreenBtn.trigger('click');
        return;
    }

    fullscreenBtn = $('#image-expand');

    if (fullscreenBtn.length) {
        fullscreenBtn.trigger('click');
    }
}

function toggleHeatmaps()
{
    var heatmapObj = $('.heatmap');
    if (heatmapObj.is(':visible')) {
        hideHeatmap();

    } else {
        viewHeatmap(-1, null);
//        showHeatmap();
    }
}

function showHeatmap()
{
    var bottom = $('.acorn-controls').outerHeight();
//    if ($('.marker-bar').is(':visible')) bottom += $('.marker-bar').outerHeight();

    var heatmapObj = $('.heatmap');
    heatmapObj.css('display', 'block');
    heatmapObj.css('height', 0);
    heatmapObj.css('bottom', bottom + 'px');

    heatmapObj.animate({ height:'30px' }, 200);
}

function hideHeatmap()
{
    var heatmapObj = $('.heatmap');
    if (heatmapObj.is(':visible')) {
        heatmapObj.animate({height: 0}, 200, 'linear', function () {
            heatmapObj.css('display', 'none');
        });
    }
}

function viewHeatmap(user_id, ip)
{
    $('.heatmap').css('background-image',"url('img/heatmap?ts=" + Date.now() + "&file=" + getJSConnectValue('file.id') + "&user=" + user_id + "&ip=" + ip + "')");
    showHeatmap();
}

function getVideoFrameAsUrl(type)
{
    if (typeof type === 'undefined' || !type) {
        type = 'image/png';
    }

    const video = document.querySelector('video');
    const canvas = document.createElement('canvas');
    canvas.height = video.videoHeight;
    canvas.width = video.videoWidth;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(type);
}

function downloadVideoFrame(type)
{
    const url = getVideoFrameAsUrl(type);

    const a = document.createElement("a");
    a.href = url;
    a.download = getJSConnectValue('file.title', '') + ' Frame';
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    a.remove();
}

function timecodeForPercentPosition(pos) {
    var player = getPlayerObj();
    if (!player) return "00:00:00:00";

    var duration = player.duration;

    if (duration == undefined || isNaN(duration)) {
        return "00:00:00:00";
    }

    var seconds = parseFloat(pos) * parseFloat(player.duration);

    var timecode = timecodeFromSeconds(seconds, getJSConnectValue('file.fps'), getJSConnectValue('file.start_frame'), getJSConnectValue('file.drop_frame'));

    return timecode;
}

function incrementFrames(num) {
    var player = getPlayerObj();
    player.pause();

    var curTime = player.currentTime;
    var newTime = curTime + (num * (1.0 / parseFloat(getJSConnectValue('file.fps'))));

    seekToTime(newTime);
}

function timecodeForFile(seconds)
{
    return timecodeFromSeconds(seconds, getJSConnectValue('file.fps'), getJSConnectValue('file.start_frame'), getJSConnectValue('file.drop_frame'));
}

function timecodeForFileAtZero(seconds)
{
    return timecodeFromSeconds(seconds, getJSConnectValue('file.fps'), 0, getJSConnectValue('file.drop_frame'));
}

function secondsFromFileTimecode(timecode)
{
    return timecodeToSeconds(timecode,getJSConnectValue('file.fps'), getJSConnectValue('file.drop_frame'), getJSConnectValue('file.start_frame'));
}

function secondsFromFileTimecodeAtZero(timecode)
{
    return timecodeToSeconds(timecode,getJSConnectValue('file.fps'), getJSConnectValue('file.drop_frame'), 0);
}

function seekToTimecode(timecode)
{
    var seconds = secondsFromFileTimecode(timecode);
    seekToTime(seconds);
}

function updateTimecode(sync, abs) {
    // Ignore if not video or audio
    if (getJSConnectValue('file.type') != 1 && getJSConnectValue('file.type') !=2) return;

    var player = getPlayerObj();

    var curTime = player.currentTime;
    var duration = player.duration;

    if (curTime == undefined || duration == undefined || isNaN(curTime) || isNaN(duration)) {
        if (isIOS) {
            $("#timecode_box").html("Click to play");
            if (!isIphone) $("#play_banner").show();
        } else {
            $("#timecode_box").html("Loading...");
        }

        if (!isIOS) $(".spinner").show();
        return null;
    }

    var timecode = timecodeFromSeconds(curTime, getJSConnectValue('file.fps'), getJSConnectValue('file.start_frame'), getJSConnectValue('file.drop_frame'));
    var durationTC = timecodeFromSeconds(duration,getJSConnectValue('file.fps'),0,false);
    $("#timecode_box").html(timecode + " / " + durationTC);

    if (sync) {
        sendSocketTimecode(timecode,abs);
    }

    highlightTranscriptAtTime(curTime);

    return timecode;
}

async function finishEditingTagsForFileID(file_id)
{
    let siteURL = getJSConnectValue("site.url");
    if (siteURL === null) siteURL = "";

    const response = await fetch(siteURL + "/ajax/tags.php?files=" + file_id);
    const json = await response.json();

    if (json.error) {
        alert(sanitize_string(json.error));
    } else if (json.tags) {
        const tagView = document.querySelector('.tag-view');
        tagView.innerHTML = '';

        for (const tag of json.tags) {
            tagView.insertAdjacentHTML('beforeend', `<a href="${tagURLForValue(tag)}"><div class="tag">${tag}</div></a>`);
        }
    }
}
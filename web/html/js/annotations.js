var draw = null;
var rect = null;
var mouseDown = false;
var annotationMode = false;
var colorIndex = 0;
var annotationPos = 0.0;
var lastDraw = 0;

$(window).load(function() {
    if (!draw) setupSVG();

    $(document).on("mousedown touchstart", "#player_container svg", function (e) {
        if (annotationMode) mouseDown = true;

    }).on("mouseup touchend", "#player_container svg", function (e) {

    	if (annotationMode) {
        	mouseDown = false;

        	simplifyPoints();
        	rect = null;

            var commentField = $('#comment-field');
            commentField.prop('title','Now enter a note to describe the annotation');
            commentField.tipsy({trigger: 'focus',gravity:'e'});

            commentField.focus();
        }

    }).on("mousemove", "#player_container svg", function (e) {
        if (mouseDown) {
            drawDrag(e);
        }
    });

    // This doesn't work via JQuery so we have to do it through regular JS
    var svgObj = $("#player_container svg");

    if (svgObj.length) {
        svgObj[0].addEventListener("touchmove", function (e) {
            e.preventDefault();
            drawDrag(e);
        });
    }
});

function drawDrag(e)
{
    if (annotationMode) {
        var time = Date.now();
        if (time - lastDraw < 2) return;
        lastDraw = time;

        if (!draw) setupSVG();

        var player = getPlayerObj();
        if (player && !player.paused) {
            player.pause();
            hold();
            annotationPos = player.currentTime;
        }

        var xPos = 0;
        var yPos = 0;
        if (e.pageX || e.pageY) {
            xPos = e.pageX;
            yPos = e.pageY;
        } else if (e.clientX || e.clientY) {
            xPos = e.clientX + document.body.scrollLeft
                + document.documentElement.scrollLeft;
            yPos = e.clientY + document.body.scrollTop
                + document.documentElement.scrollTop;
        }

        var imageObj = $("#image_viewer");
        var playerObj = $("#video_player");

        if (playerObj.length) { // Video
            var container = $("#player_container");

            var offset = container.offset();
            var playerWidth = playerObj.width();
            var playerHeight = playerObj.height();
            xPos -= offset.left;
            yPos -= offset.top;

            // Make range 0-960 and 0-540
            xPos = (xPos / playerWidth) * 960;
            yPos = (yPos / playerHeight) * 540;

        } else if (imageObj.length) { // Image

            var container = $("#player_container");

            var offset = container.offset();
            var imageWidth = imageObj[0].naturalWidth;
            var imageHeight = imageObj[0].naturalHeight;
            xPos -= imageObj.offset().left;
            yPos -= imageObj.offset().top;

            var playerPercentX = xPos / imageObj.width();
            var playerPercentY = yPos / imageObj.height();

            xPos = imageWidth * playerPercentX;
            yPos = imageHeight * playerPercentY;
        }

        if (!rect) {
            rect = draw.path().M({x: xPos, y: yPos});
            rect.stroke({color: currentColorCode(), opacity: 0.6, width: strokeWidth()});
            rect.fill({opacity: 0.0});
        } else {
            rect.L({x: xPos, y: yPos});
        }
    }
}

function resizeAnnotation() {
    if (!draw) setupSVG();
    if (draw) {
        var imageObj = $('#image_viewer');
        var playerObj = $("#video_player");
        if (!playerObj.length) playerObj = imageObj;

        var width = playerObj.width();
        var height = playerObj.height();

        if (width == 0) width = (imageObj.length ? imageObj[0].naturalWidth:960);
        if (height == 0) height = (imageObj.length ? imageObj[0].naturalHeight:540);

        draw.size(width,height);
    }
}

function clearAnnotation() {
    if (!draw) setupSVG();
    if (draw !== undefined && draw) draw.clear();

    $("#player_container svg").hide();

    exitAnnotationMode();
}

function exitAnnotationMode() {
    annotationMode = false;
    $('#annotation_btn').css('background','transparent');
    $('#player_container').css('cursor','default');
}

function hasAnnotation() {
    try {
        if (!draw) setupSVG();
        return ((getJSConnectValue('file.type') == 1 || getJSConnectValue('file.type') == 3) && draw && draw.children().length > 0);
    }

    catch (e) {
        return false;
    }
}

function getAnnotationData()
{
    if (!draw) setupSVG();
    simplifyPoints();

    return draw.svg();
}

function simplifyPoints()
{
    if (!draw) setupSVG();

    // Simplify points
    draw.each(function(i, children) {
        var segmentCount = 0;

        try {
            segmentCount = this.getSegmentCount();
        }

        catch(e) {
            console.log('Error getting segment count');
        }

        var removeCount = 0;

        if (segmentCount > 0) {
            var lastSegmentX = -1;
            var lastSegmentY = -1;

            for (var i=segmentCount-2; i>=0; i--) {
                var segment = this.getSegment(i);

                if (lastSegmentX > -1 && lastSegmentY > -1) {
                    var diffX = lastSegmentX - segment.coords[0];
                    var diffY = lastSegmentY - segment.coords[1];

                    // Make sure diff is positive
                    if (diffX < 0.0) diffX *= (-1.0);
                    if (diffY < 0.0) diffY *= (-1.0);

                    if (diffX < 3.0 &&
                        diffY < 3.0) {

                        // Only remove 5 in a row
                        if (removeCount < 5) {
                            this.removeSegment(i+1);
                            removeCount++;
                        } else {
                            removeCount = 0;
                        }
                    } else {
                        removeCount = 0;
                    }
                }

                lastSegmentX = segment.coords[0];
                lastSegmentY = segment.coords[1];
            }
        }
    })
}

function toggleAnnotation(sender)
{
    if (isIphone) return;

    if (!draw) setupSVG();

    if (annotationMode && hasAnnotation()) {
        if (confirm('Discard this annotation?')) {
            clearAnnotation();
        }
        return;
    }

    annotationMode = !annotationMode;

    if (annotationMode) {
        if (draw !== undefined && draw) draw.clear();
        sender.style.background = '#35639C';
        $('#player_container').css('cursor','crosshair');
        $('#play_banner').hide();
        $("#player_container svg").show();

    } else {
        sender.style.background = 'transparent';
        $('#player_container').css('cursor','default');
        $("#player_container svg").hide();
    }
}

function showAnnotation(annotation_id,position)
{
    if (isIphone) return;

    if (!draw) setupSVG();
    clearAnnotation();

    var params = {annotation_id:annotation_id};
    if (window.jsconnect && "link" in window.jsconnect && "id" in window.jsconnect["link"]) params["link_id"] = window.jsconnect["link"]["id"];

    $.post("ajax/comments.php?annotation",params,function(result){
        if (result != null && result.length > 0) {
            if (result.length > 4 && result.substr(0,4) == 'ERR:') {
                alert('Error: '+result.substr(4));
                return;
            }

            // Pause playback and seek to position
            var player = getPlayerObj();
            if (player) {
                shouldPlay = false;
                wasPlaying = false;
                player.pause();
                seekToTime(position);
            }

            // To prevent race conditions from the seek operation, wait a few ms before
            // showing annotation
            window.setTimeout(function() {
                annotationPos = position;

            if (draw) {
                // Strip svg sizing on images
//                if (getJSConnectValue('file.type') == 3) {
                    var regex = /(?!<svg [^>])( width="\d+")( height="\d+")/g;
                    result = result.replace(regex, '');
//                }

                draw.absorb(result);

                $('#play_banner').hide();
                $("#player_container svg").show();
            }

            }, 20);
        }
    }).fail(function(jqXHR, textStatus, errorString) {
        alert(sanitize_string("Failed to get annotation: " + errorString));
    });
}

function deleteAnnotation(annotation_id,comment_id)
{
    if (confirm("Are you sure you wish to delete this annotation?")) {
        clearAnnotation();

        $('#ann_' + annotation_id).remove();

        var comment = commentWithID(comment_id);
        comment['annotation'] = -1;

        $.ajax("ajax/comments.php?deleteannotation=" + annotation_id);
    }
}

function currentColorCode()
{
    switch (colorIndex) {
        case 1: // Red
            return '#ff6554';

        case 2: // Yellow
            return '#f8f876';

        case 3: // Orange
            return '#ffa255';

        case 4: // Green
            return '#58ff55';

        case 5: // Blue
            return '#5585ff';

        case 6: // Turquoise
            return '#55daff';

        case 7: // Pink
            return '#ffa1c5';

        case 8: // Purple
            return '#c455ff';

        case 9: // White
            return '#fff';

        case 10: // Black
            return '#000';

        default: // No color
            return '#bbb';
    }
}

function changeCommentColor()
{
    if (!draw) setupSVG();

    if (hasAnnotation()) {
        draw.each(function(i, children) {
            this.stroke({ color: currentColorCode(), opacity: 0.6, width: strokeWidth() });
        });
    }
}

function strokeWidth()
{
    var strokeWidth = 5;
    if (getJSConnectValue('file.type') != 3) return strokeWidth;

    var imageObj = $('#image_viewer');
    if (imageObj.length && (imageObj[0].naturalWidth == 0 || imageObj[0].naturalHeight == 0)) return strokeWidth;

    var width = (imageObj.length ? imageObj[0].naturalWidth:960);
    var height = (imageObj.length ? imageObj[0].naturalHeight:540);

    var avgDiff = (width / 960) * (height / 540) / 2;
    strokeWidth *= avgDiff * 0.5;

    if (strokeWidth < 5) strokeWidth = 5;

    return (strokeWidth > 40 ? 40:strokeWidth);
}

function setupSVG()
{
    if (isIphone) return;
    if (getJSConnectValue('file.type') !== 1 && getJSConnectValue('file.type') !== 3) return;

    var imageObj = $('#image_viewer');
    if (imageObj.length && (imageObj[0].naturalWidth == 0 || imageObj[0].naturalHeight == 0)) return;

    var width = (imageObj.length ? imageObj[0].naturalWidth:960);
    var height = (imageObj.length ? imageObj[0].naturalHeight:540);

    draw = SVG('player_container').viewbox(0,0,width,height);
    draw.attr('preserveAspectRatio', 'none');

    resizeAnnotation();

    $("#player_container").parent().parent().on('webkitfullscreenchange mozfullscreenchange fullscreenchange',resizeAnnotation);
    $(window).resize(resizeAnnotation);
    $("#player_container svg").hide();
}
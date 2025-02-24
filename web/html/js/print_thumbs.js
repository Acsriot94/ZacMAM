
function generateNextThumb() {
    if (thumbsCancelled) return;

    var w = thumbVideo.videoWidth;
    var h = thumbVideo.videoHeight;

    if (w > 0 && h > 0) {
        canvas.width = 120;
        canvas.height = 120/Math.ceil(w/h);

        thumbIndex++;

        if (thumbTimes.length <= thumbIndex) {
            thumbsFinished();
        } else {
            var newTime = parseFloat(thumbTimes[thumbIndex]);

            if (newTime != thumbVideo.currentTime) {
                thumbVideo.currentTime = newTime;
            } else {
                // Trigger seeked manually to prevent it hanging
                var event = new Event('seeked');
                thumbVideo.dispatchEvent(event);
            }
        }
    }
}

function incrementProgress()
{
    document.getElementById('progress_bar').setAttribute('value',(parseInt(document.getElementById('progress_bar').getAttribute('value'))+1));
}

function thumbsFinished()
{
    document.getElementById('progress').setAttribute('style','display:none');

    showPrintDialog();
}

function cancelThumbGeneration()
{
    thumbsCancelled = true;
    thumbsFinished();
}

function showPrintDialog()
{
    window.setTimeout(function() {
        window.print();
    },1000);
}
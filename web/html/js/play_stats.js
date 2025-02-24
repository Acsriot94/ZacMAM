var startTime = 0;
var droppedFrames = 0;
var decodedFrames = 0;
var decodedAudioBytes = 0;
var minAudioBitrate = 0;
var maxAudioBitrate = 0;
var decodedVideoBytes = 0;
var minVideoBitrate = 0;
var maxVideoBitrate = 0;

var decodedMean = new Mean();
var audioMean = new Mean();
var videoMean = new Mean();
var dropMean = new Mean();

$(document).ready(function() {
   startPlaybackLogging();
});

function startPlaybackLogging() {
    if (document.cookie.indexOf("playback_stats") == -1 || document.cookie[document.cookie.indexOf("playback_stats")] == 0) return;

    startTime = Date.now();
    window.setInterval(function() {refreshPlaybackStats();},1000);

    refreshPlaybackStats();
}

function refreshPlaybackStats() {
    if (document.cookie.indexOf("playback_stats") == -1 || document.cookie[document.cookie.indexOf("playback_stats")] == 0) return;

    var player = getPlayerObj();

    if (player.readyState <= HTMLMediaElement.HAVE_CURRENT_DATA || player.paused) {
        return;
    }

    var decodedFramesPerSec = 0;
    if (player.webkitDecodedFrameCount) {
        decodedFramesPerSec = (player.webkitDecodedFrameCount - decodedFrames);
        decodedFrames = player.webkitDecodedFrameCount;
    } else if (player.mozDecodedFrames) {
        decodedFramesPerSec = (player.mozDecodedFrames - decodedFrames);
        decodedFrames = player.mozDecodedFrames;
    }

    var audioBytesDecodedPerSec = 0;

    if (player.webkitAudioDecodedByteCount) {
        audioBytesDecodedPerSec = player.webkitAudioDecodedByteCount - decodedAudioBytes;
        decodedAudioBytes = player.webkitAudioDecodedByteCount;
    }

    if (audioBytesDecodedPerSec > maxAudioBitrate) maxAudioBitrate = audioBytesDecodedPerSec;
    if (minAudioBitrate == 0 || audioBytesDecodedPerSec < minAudioBitrate) minAudioBitrate = audioBytesDecodedPerSec;

    var videoBytesDecodedPerSec = 0;

    if (player.webkitVideoDecodedByteCount) {
        videoBytesDecodedPerSec = player.webkitVideoDecodedByteCount - decodedVideoBytes;
        decodedVideoBytes = player.webkitVideoDecodedByteCount;
    }

    if (videoBytesDecodedPerSec > maxVideoBitrate) maxVideoBitrate = videoBytesDecodedPerSec;
    if (minVideoBitrate == 0 || videoBytesDecodedPerSec < minVideoBitrate) minVideoBitrate = videoBytesDecodedPerSec;

    var droppedFramesPerSec = 0;
    if (player.webkitDroppedFrameCount) {
        droppedFramesPerSec = player.webkitDroppedFrameCount - droppedFrames;
        droppedFrames = player.webkitDroppedFrameCount;
    } else if (player.mozPresentedFrames && player.mozDecodedFrames) {
        droppedFramesPerSec = player.mozPresentedFrames - player.mozPresentedFrames - droppedFrames;
        droppedFrames = player.mozPresentedFrames - player.mozPresentedFrames;
    }

    decodedMean.record(decodedFramesPerSec);
    audioMean.record(audioBytesDecodedPerSec);
    videoMean.record(videoBytesDecodedPerSec);
    dropMean.record(droppedFramesPerSec);

    var stats_html = "<table><tr><td>Frames: "+decodedFrames+" ("+decodedFramesPerSec+" fps)<td>Video: "+(decodedVideoBytes/1024/1024).toFixed(2)+" MB ("+(videoBytesDecodedPerSec*8/1024/1024).toFixed(2)+" Mb/s)<td>Audio: "+(decodedAudioBytes/1024/1024).toFixed(2)+" MB ("+(audioBytesDecodedPerSec*8/1024/1024).toFixed(2)+" Mb/s)<td>Dropped frames: "+droppedFrames+" ("+droppedFramesPerSec+" fps)";
    stats_html += "<tr><td colspan='4'>Video Rate: "+(videoMean.mean()*8/1024/1024).toFixed(2)+" Mb/s (avg) "+(maxVideoBitrate*8/1024/1024).toFixed(2)+" Mb/s (max) "+(minVideoBitrate*8/1024/1024).toFixed(2)+" Mb/s (min)";
    stats_html += "<tr><td colspan='4'>Audio Rate: "+(audioMean.mean()*8/1024/1024).toFixed(2)+" Mb/s (avg) "+(maxAudioBitrate*8/1024/1024).toFixed(2)+" Mb/s (max) "+(minAudioBitrate*8/1024/1024).toFixed(2)+" Mb/s (min)</table>";

    $('#player_stats').html(stats_html);

/*    console.log('bytes received: '+player.webkitBytesReceived);
    console.log('download time: '+player.webkitDownloadTime);
    console.log('network wait time: '+player.webkitNetworkWaitTime);
    console.log('presented frames: '+player.webkitPresentedFrames);
    console.log('jitter: '+player.webkitPlaybackJitter);*/
}

function Mean() {
    this.count = 0;
    this.sum = 0;

    this.record = function(val) {
        this.count++;
        this.sum += val;
    };

    this.mean = function() {
        return this.count ? (this.sum / this.count).toFixed(3) : 0;
    };
}

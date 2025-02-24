function Recorder() {
    this.fftSize = 2048;
    this.mediaRecorder = null;
    this.audioContext = null;
    this.audioCanvas = null;
    this.videoCanvas = null;
    this.mediaStream = null;
    this.mediaChunks = [];
    this.analyzer = null;
    this.visualizerData = null;
    this.recordVideo = true;
    this.recordAudio = true;
    this.aborted = false;
}

Recorder.prototype = {
    constructor: Recorder
};

Recorder.prototype.record = function()
{
    try {
        this.aborted = false;

        if (typeof navigator.mediaDevices === 'undefined') {
            alert('Your browser is preventing media recording. Check that this site has permission to record media.');
            return;
        }

        var thisObj = this;
        if (this.audioCanvas) this.audioContext = new (window.AudioContext || webkitAudioContext)();

        navigator.mediaDevices.getUserMedia({video:this.recordVideo, audio: this.recordAudio})
            .then(function(mediaStream) {
                thisObj.mediaStream = mediaStream;
                thisObj.mediaRecorder = new MediaRecorder(thisObj.mediaStream);

                thisObj.mediaRecorder.addEventListener("dataavailable", function(event) {
                    thisObj.mediaChunks.push(event.data);
                });

                thisObj.mediaRecorder.addEventListener("start", function(event) {
                    console.log('Media recording started');
                    if (thisObj.audioCanvas) thisObj.setupAudioVisualizer();
                    if (thisObj.videoCanvas) thisObj.setupVideoPreview();
                });

                thisObj.mediaRecorder.addEventListener("stop", function(event) {
                    console.log('Media recording stopped');

                    if (!thisObj.aborted) {
                        thisObj.getDataURL();
                    }

                    // Stop all tracks to release mic/camera
                    var tracks = thisObj.mediaStream.getTracks();

                    for (var i=0; i<tracks.length; i++) {
                        tracks[i].stop();
                    }

                    thisObj.mediaChunks = [];
                    thisObj.analyzer = null;
                    thisObj.mediaRecorder = null;
                    thisObj.mediaStream = null;
                    thisObj.visualizerData = null;
                    thisObj.audioContext = null;

                    if (thisObj.videoObj) {
                        thisObj.videoObj.srcObject = null;
                        thisObj.videoObj = null;
                    }
                });

                thisObj.mediaRecorder.addEventListener("error", function(event) {
                    console.log('Media recording error: '+event.data);
                });

                thisObj.mediaRecorder.start();
            })
            .catch(function(err) {
                console.log(err);
            });
    }

    catch (err) {
        console.log(err);
    }
};

Recorder.prototype.getDataURL = function()
{
    try {
        if (this.mediaRecorder && this.mediaRecorder.state == 'recording') this.mediaRecorder.stop();

        var blob = null;

        if (this.recordVideo) {
            blob = new Blob(this.mediaChunks, {'type':'video/webm;codecs=vp8'});
        } else {
            blob = new Blob(this.mediaChunks, {'type':'audio/webm;codecs=opus'});
        }

        var dataURL = window.URL.createObjectURL(blob);

        console.log(dataURL);
    }

    catch (err) {
        console.log(err);
    }
};

Recorder.prototype.abort = function()
{
    this.aborted = true;

    if (this.mediaRecorder && this.mediaRecorder.state == 'recording') this.mediaRecorder.stop();
};

Recorder.prototype.setupAudioVisualizer = function()
{
    var source = this.audioContext.createMediaStreamSource(this.mediaStream);

    this.analyzer = this.audioContext.createAnalyser();
    this.analyzer.fftSize = this.fftSize;
    var bufferLength = this.analyzer.frequencyBinCount;
    this.visualizerData = new Uint8Array(bufferLength);

    source.connect(this.analyzer);

    this.draw();
};

Recorder.prototype.setupVideoPreview = function()
{
    this.videoObj = document.createElement('video');
    this.videoObj.srcObject = this.mediaStream;
    this.videoObj.muted = true;

    var thisObj = this;
    this.videoObj.addEventListener('loadedmetadata', function () {
        thisObj.draw();
    });

    // we need to play the video to trigger the loadedmetadata event
    this.videoObj.play();
};

Recorder.prototype.draw = function()
{
    if (!this.mediaRecorder) return;

    if (this.audioCanvas) {
        var cWidth = this.audioCanvas.width;
        var cHeight = this.audioCanvas.height;

        var bufferLength = this.analyzer.frequencyBinCount;
        this.analyzer.getByteTimeDomainData(this.visualizerData);

        var canvasCtx = this.audioCanvas.getContext("2d");
        canvasCtx.fillStyle = 'rgb(12,33,66)';
        canvasCtx.fillRect(0, 0, cWidth, cHeight);

        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'rgb(80,157,243)';

        canvasCtx.beginPath();

        var sliceWidth = cWidth * 1.0 / bufferLength;
        var x = 0;

        for (var i = 0; i < bufferLength; i++) {

            var v = this.visualizerData[i] / 128.0;
            var y = v * cHeight / 2;

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        canvasCtx.lineTo(cWidth, cHeight / 2);
        canvasCtx.stroke();

    } else if (this.videoCanvas) {
        var cWidth = this.videoCanvas.width;
        var cHeight = this.videoCanvas.height;

        var canvasCtx = this.videoCanvas.getContext("2d");
        canvasCtx.drawImage(this.videoObj, 0, 0, cWidth, cHeight);
    }

    var thisObj = this;
    requestAnimationFrame(function () {
        thisObj.draw();
    });

};
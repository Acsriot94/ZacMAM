var audioCtx = null;
var audioAnalyser = null;
var audioSource = null;
var audioBufferLength = 0;
var audioBufferArray = [];
var canvas = null, canvasCtx = null;

function drawAudioWaveform() {
    requestAnimationFrame(drawAudioWaveform);
    audioAnalyser.getByteTimeDomainData(audioBufferArray);

    canvasCtx.fillStyle = 'rgb(0, 0, 0)';
    canvasCtx.fillRect(0, 0, 960, 540);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(255, 255, 255)';

    canvasCtx.beginPath();

    var sliceWidth = 960 / audioBufferLength;
    var x = 0;

    for(var i = 0; i < audioBufferLength; i++) {

        var v = audioBufferArray[i] / 128.0;
        var y = v * 540/2;

        if (i === 0) {
            canvasCtx.moveTo(x, y);
        } else {
            canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height/2);
    canvasCtx.stroke();
}

function setupAudioWaveform() {
    // Disabled for now
    return;
    
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioAnalyser = audioCtx.createAnalyser();

    var audioObj = $('audio')[0];
    audioSource = audioCtx.createMediaElementSource(audioObj);
    audioSource.connect(audioAnalyser);
    audioAnalyser.connect(audioCtx.destination);

    audioAnalyser.fftSize = 2048;
    audioBufferLength = audioAnalyser.frequencyBinCount;
    audioBufferArray = new Uint8Array(audioBufferLength);
    audioAnalyser.getByteTimeDomainData(audioBufferArray);

    canvas = $('#audio-waveform')[0];
    canvasCtx = canvas.getContext('2d');
    canvasCtx.clearRect(0, 0, 960, 540);

    drawAudioWaveform();
}


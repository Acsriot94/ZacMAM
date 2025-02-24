
onmessage = function (event) {
    // Timeout after 5 secs
    setTimeout(function() {
        postMessage({fail:'timeout'});
    },5000);

    generateLocalThumbForUpload(event.data);
};

function generateLocalThumbForUpload(obj)
{
    try {
        var mimeType = obj.file.type;
        var fileExt = obj.file.name.split('.').pop().toLowerCase();

        if (mimeType == 'binary/octet-stream' || mimeType == 'application/octet-stream') {
            switch (fileExt) {
                case 'mp4':
                    mimeType = 'video/mp4';
                    break;

                case 'mov':
//                    mimeType = 'video/mp4';
                    break;
            }
        }

//        if (mimeType == 'video/quicktime') mimeType = 'video/mp4';

        if (mimeType.match(/image.*/)) {
            var reader = new FileReader();

            reader.onload = function (e) {
//                obj.thumbURL = reader.result;
                postMessage({index:obj.index, thumbURL:reader.result});
            };

            reader.onerror = function (e) {
                postMessage({fail:'error'});
            };

            reader.readAsDataURL(obj.file);

        } else if (mimeType.match(/video.*/)) {
            var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
            if (isChrome) {
                console.log('Skipping generating video thumb on Chrome...');
                postMessage({fail:'chrome'});
                return;
            }

            var thumbVideo = document.createElement("video");

            if (thumbVideo.canPlayType(mimeType)) {
                var reader = new FileReader();

                reader.onload = function (e) {
                    try {
                        var blob = new Blob([reader.result], {type: mimeType});
                    }

                    catch (err) {
                        console.log('Error generating thumbnail: '+err.message);
                        postMessage();
                        return;
                    }

                    var url = (URL || webkitURL).createObjectURL(blob);
                    thumbVideo.src = url;
                    thumbVideo.preload = 'auto';

                    thumbVideo.addEventListener("loadeddata", function () {
                        var w = thumbVideo.videoWidth;
                        var h = thumbVideo.videoHeight;

                        if (w > 0 && h > 0) {
                            // Resize to save memory
                            var thumbWidth = 120;
//                            if (fileView == 1) thumbWidth = 240;

                            var thumbHeight = Math.ceil((h / w) * thumbWidth);

                            // Capture thumbnail
                            var canvas = document.createElement("canvas");
                            canvas.width = thumbWidth;
                            canvas.height = thumbHeight;
                            var context = canvas.getContext('2d');
                            context.drawImage(thumbVideo, 0, 0, thumbWidth, thumbHeight);

                            var thumbURL = canvas.toDataURL();

                            // Cleanup
                            (URL || webkitURL).revokeObjectURL(url);

//                            obj.thumbURL = thumbURL;

                            postMessage({index:obj.index, thumbURL:thumbURL});
                        }
                    });

                    thumbVideo.addEventListener("error", function (e) {
                        console.log('Error loading thumb video - probably an unsupported codec');
                        postMessage({fail:'unsupported codec'});
                    });
                };

                reader.onerror = function (e) {
                    console.log('Error reading thumb video - ' + e.name);
                    postMessage({fail:'error'});
                };

                reader.readAsArrayBuffer(obj.file);

            } else {
                postMessage({fail:'unplayable'});
            }

        } else {
            postMessage({fail:'mime'});
        }
    }

    catch (e) {
        console.log('Error - unable to generate thumbnail for file');
        postMessage({fail:'error'});
    }
}
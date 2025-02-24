var ImageCanvas;
        var base64Image;
        
        function createSnapshot(fname){
                var video           = document.getElementById('video_player');
                //var outDiv = document.getElementById('output');
                ImageCanvas = capture(video,0,fname); 
                //outDiv.innerHTML = ''; 
                //outDiv.appendChild(ImageCanvas);
        }
        
        function capture(video, width,fname)
        {
            if (width != 0) {
                    var w = width;
                    var h = video.videoHeight * (width / video.videoWidth);
            } else {
                    var w = video.videoWidth;
                    var h = video.videoHeight;
            }
            var canvas = document.createElement('canvas');
            canvas.width  = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, w, h);
            var data=canvas.toDataURL();
            $.post("server.php",{data:data,fname:fname},function(data){  });
            return canvas;
        } 

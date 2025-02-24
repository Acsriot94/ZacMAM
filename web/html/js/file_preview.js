var preview_heatmap = null;

function showPreviewForFile(file,animate) {
    $('#file-preview').remove();
    $(".tipsy").remove();

    if (typeof file === 'undefined') return;

    var fileType = parseInt(file['type']);

    if (fileType >= 0 && fileType != 4) {
        const fileObj = $('.file-obj[data-id=' + file['id'] + ']');

        // Mark as viewed
        file.unviewed = false;
        fileObj.find('.file-unviewed').hide();

        // Increment view count
        file.views++;
        fileObj.find('.file-view-count').text(file.views);
    }

    // Sync heatmap
    if (preview_heatmap !== null) {
        preview_heatmap.sync();
    }

    let div = document.createElement('div');
    document.body.appendChild(div);
    div = $(div);

    let mediaLoaded = false;
    let animationComplete = false;

    // If image, preload
    let imgPreload = null;
    if (parseInt(file['type']) === 3) {
        imgPreload = $('<img id="preview-image" style="min-width:30vh;max-height:calc(70vh - 50px)" src="preview?id='+file['id']+(isLink ? '&link='+linkID:'') + '&rand=' + Math.floor(Math.random() * 10000) + '">');

        imgPreload.on('load',function(e) {
            mediaLoaded = true;
            if (animationComplete && imgPreload) {
                div.css('background-image','none');
                div.addClass('open');
                imgPreload.appendTo(div);
                addControlButtons(div, file['id']);
                recenterPreview(div);
            }
        });
    }

    div.addClass('modal-overlay');
    div.attr('id','file-preview');
    div.css('background', '');
    div.css('background-repeat','no-repeat');
    div.css('background-position','center center');
    div.css('background-size','contain');
    div.css('background-origin','content-box');
    div.css('max-width','70vw');

    div.html('<h3 style="text-align:center;margin:0;margin-bottom:5px;position:relative;top:-10px;text-overflow:ellipsis;'+(fileType !== 4 ? 'max-width:90%;':'')+'overflow:hidden;white-space:nowrap">'+file['title']+'</h3>'+(fileType !== 4 ? '<a href="#" onclick="loadFileInPlayer('+file['id']+')"><div id="open-player" class="tooltip" title="Open in Player"></div></a>':''));

    // Grab eventual size
    const eventual_width = div.outerWidth();
    const pageObj = document.getElementById('page');

//    div.css('max-width','5vw');
    //div.offset({top: window.innerHeight / 2, left: ((pageObj.innerWidth - div.width()) / 2)});

    // Zoom thumb to center
    div.addClass('animate-open');

//    div.animate({'min-width':'500px', 'min-height':'281px', 'max-height':'70vh', 'max-width':'70vw',left:'calc(50% - 35vw)',top:'calc(50% - 140)','margin-left':(eventual_width / (-2))+"px",'margin-top':'-140px','opacity':'1.0'}, (animate ? 200:0),function() {
        animationComplete = true;

        // Load content
        switch (fileType) {
            case 1:
                preview_heatmap = new Heatmap(file["id"]);
                div.css('background-image','url("img/spinner-white.svg")');
                div.css('background-repeat','no-repeat');
                div.css('background-position','center');
                div.css('background-size','20%');

                const videoObj = $('<video id="preview-video" style="display:none;width:100%;max-height:calc(70vh - 70px);margin:0 auto" controls="controls" controlsList="nodownload" preload="preload" autoplay="autoplay" ondblclick="loadFileInPlayer('+file['id']+')"><source type="video/mp4; codecs="avc1.42E01E" src="preview?id=' + file['id']+(isLink ? '&link='+linkID:'') + '&rand=' + Math.floor(Math.random() * 10000) + '"></source></video>');
                videoObj.appendTo(div);

                videoObj.on('loadeddata',function(e) {
                    videoObj.css('display', 'block');
                    div.css('background-image', 'none');
                    div.addClass('open');

                    mediaLoaded = true;
                    addControlButtons(div, file['id']);
                    recenterPreview(div);

                    if (localStorage.getItem('acornvolume')) {
                        videoObj[0].volume = localStorage.getItem('acornvolume');
                    }
                });

                videoObj.on('loadedmetadata',function(e) {
                    if (preview_heatmap !== null) preview_heatmap.setDuration(videoObj[0].duration);
                });

                videoObj.on('volumechange',function(e) {
                    localStorage.setItem('acornvolume', videoObj[0].volume);
                });

                videoObj.on('error',function(e) {
                    console.log('Error loading preview');
                });

                videoObj.on("pause", function(e) {
                    if (preview_heatmap !== null) preview_heatmap.sync();
                });

                videoObj.on("ended", function(e) {
                    if (preview_heatmap !== null) preview_heatmap.sync();
                });

                videoObj.on("timeupdate", function(e) {
                    if (preview_heatmap !== null) preview_heatmap.checkBounds(videoObj[0].currentTime);
                });

                break;

            case 2:
                preview_heatmap = new Heatmap(file["id"]);

                div.css('background-image','url("img/spinner-white.svg")');
                div.css('background-repeat','no-repeat');
                div.css('background-position','center');
                div.css('background-size','20%');

                const audioObj = $('<audio id="preview-audio" style="display:none;width:100%;calc(height:100%-30px)" controls="controls" preload="preload" autoplay="autoplay"><source src="preview?id='+file['id']+(isLink ? '&link='+linkID:'') + '&rand=' + Math.floor(Math.random() * 10000) + '"></source></audio>');
                audioObj.appendTo(div);

                audioObj.on('loadeddata',function(e) {
                    div.css('background-image','none');
                    audioObj.css('display','block');
                    div.addClass('open');

                    mediaLoaded = true;
                    addControlButtons(div, file['id']);
                    recenterPreview(div);

                    if (localStorage.getItem('acornvolume')) {
                        audioObj[0].volume = localStorage.getItem('acornvolume');
                    }

                    preview_heatmap.setDuration(audioObj.duration);
                });

                audioObj.on('volumechange',function(e) {
                    localStorage.setItem('acornvolume', audioObj[0].volume);
                });

                audioObj.on('error',function(e) {
                    console.log('Error loading preview');
                });

                audioObj.on("pause", function(e) {
                    if (preview_heatmap !== null) preview_heatmap.sync();
                });

                audioObj.on("ended", function(e) {
                    if (preview_heatmap !== null) preview_heatmap.sync();
                });

                audioObj.on("timeupdate", function(e) {
                    if (preview_heatmap !== null) preview_heatmap.checkBounds(audioObj[0].currentTime);
                });

                break;

            case 3:
                div.css('background-image','url("img/spinner-white.svg")');
                div.css('background-repeat','no-repeat');
                div.css('background-position','center');
                div.css('background-size','20%');

                if (mediaLoaded && imgPreload) {
                    div.css('background-image','none');
                    div.addClass('open');
                    imgPreload.appendTo(div);
                    addControlButtons(div, file['id']);
                    recenterPreview(div);
                }
                break;

            case 4: // Folder
                div.css('background-image','url("img/spinner-white.svg")');
                div.css('background-repeat','no-repeat');
                div.css('background-position','center');
                div.css('background-size','20%');

                $.get("ajax/files.php?path=" + folderPath+(folderPath.length > 1 ? '/' : '') + encodeURIComponent(file['title'])+"&dept="+deptID + "&project=" + getJSConnectValue("project.id") + (isLink ? "&link="+linkID:''),function(data) {
                    div.css('background-image','none');
                    div.addClass('open');

                    const tableObj = $('<div style="overflow-y:auto;max-height:60vh"><table class="preview-folder"></table></div>');
                    tableObj.appendTo(div);

                    var previewFiles = safeJSONParse(data);

                    if (previewFiles) {
                        for (var i=0; i<previewFiles.length; i++) {
                            var item=previewFiles[i];

                            var fileURL = 'player?id=' + item['id'];

                            if (item['type'] == 4) {
                                fileURL = 'files?dept=' + item['dept'] + '&folder=' + encodeURIComponent(item['path'] + (item['path'].length > 1 ? '/' : '')) + encodeURIComponent(item['title']);
                                if (item['app_id']) fileURL += '&app=' + item['app_id'];
                            }

                            if (item['link_id']) fileURL += '&link=' + item['link_id'];

                            $('.preview-folder').append('<tr><td width="120" align="center"><a href="'+fileURL+'"><img src="' + item['icon_path'] + '"></a><td><a href="'+fileURL+'">' + item['title'] + '</a>');
                            recenterPreview(div);
                        }
                    }

                    addControlButtons(div, file['id']);
                });
                break;

            default:
                setGenericFileStyle(div, file['title']);
                addControlButtons(div, file['id']);
                $('#file-preview .file-controls').css("position", "absolute").css("bottom", "5px").css("left", 0).css("right", 0);
                break;
            }

        reloadTooltipsForObject(div);
//    });
}

function recenterPreview(clone)
{
    return;
    clone.css('margin','0');
    clone.css('left','calc(50% - '+Math.floor(clone.outerWidth(true)/2)+'px)');
    clone.css('top','calc(50% - '+Math.floor(clone.outerHeight(true)/2)+'px)');

}

function setGenericFileStyle(clone,title)
{
    clone.css('background-size','40%');
}

function addControlButtons(clone,file_id)
{
    // Remove old controls if present
    $('#file-preview .file-controls').remove();

    var controls = $('.file-controls[data-id=' + file_id + ']').clone();

    clone.append(controls);

    reloadTooltipsForObject(controls);
}

function endPreview()
{
    // Sync heatmap
    if (preview_heatmap !== null) {
        preview_heatmap.sync();
        preview_heatmap = null;
    }

    var previewObj = $('#file-preview');
    if (previewObj.length) {
        previewObj.animate({opacity:0}, 200,function() {
            previewObj.remove();
        });
    }
}

function loadFileInPlayer(file_id)
{
    var file_obj = pageObjectForFileID(file_id);

    if (file_obj.length) {
        var fileURL = file_obj.find('.file-title').parent('a').attr('href');

        if ($('#preview-video').length) {
            fileURL += '&time=' + $('#preview-video')[0].currentTime;
        } else if ($('#preview-audio').length) {
            fileURL += '&time=' + $('#preview-audio')[0].currentTime;
        }

        window.location.href = fileURL;
    }
}
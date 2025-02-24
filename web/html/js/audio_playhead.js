
$(window).load(function() {
    var posterObj = $('.player-audio-poster');

    posterObj.mouseenter(function(e) {
        $('.audio-playhead-user').css('display','block');
    });

    posterObj.mousemove(function(e) {
        var pos = e.clientX - posterObj.offset().left;
        var percent = (pos / posterObj.width()) * 100;
        if (percent > 100) percent = 100;

        $('.audio-playhead-user').css('left',percent+'%');

        if (e.buttons === 1) seekToPercentage(percent);
    });

    posterObj.mouseleave(function(e) {
        $('.audio-playhead-user').css('display','none');
    });

    posterObj.click(function(e) {
        var pos = e.clientX - posterObj.offset().left;
        var percent = (pos / posterObj.width()) * 100;

        seekToPercentage(percent);
    });

    window.setInterval(function() {
       var player = getPlayerObj();
       if (!player) return;

        var percent = (player.currentTime / player.duration) * 100;
        $('.audio-playhead').css('left',percent+'%');
    },33);

});
function renderEncodeSettings(settings,defaults,dest_obj) {
    var html = '';

    if (settings['video']) {
        html += '<h2>Video</h2>';
        html += '<table>';
        html += createSettingsFromArray(settings['video'],(defaults['video'] ? defaults['video']:null));
        html += '</table>';
    }

    if (settings['audio']) {
        html += '<h2>Audio</h2>';
        html += '<table>';
        html += createSettingsFromArray(settings['audio'],(defaults['audio'] ? defaults['audio']:null));
        html += '</table>';
    }

    if (settings['timecode']) {
        html += '<h2>Timecode</h2>';
        html += '<table>';
        html += createSettingsFromArray(settings['timecode'],(defaults['timecode'] ? defaults['timecode']:null));
        html += '</table>';
    }

    dest_obj.html(html);
}

function createSettingsFromArray(settings,defaults)
{
    var html = '';

    for (var i=0; i<settings.length; i++) {
        var option = settings[i];
        html += '<tr><td>' + option['name'];

        var type = parseInt(option['type']);

        switch (type) {
            case 1: // Select
                html += '<td><select name="' + option['key'] + '">';

                var vals = option['values'];

                for (var j=0; j<vals.length; j++) {
                    var val = vals[j];
                    html += '<option value="' + val['value'] + '"' + (defaults && defaults[option['key']] && defaults[option['key']] == val['value'] ? ' selected="selected"':'') + '>' + val['name'];
                }

                html += '</select>';
                break;

            default: // Text
                html += '<td><input name="' + option['key'] + '" type="text" value="' + (defaults && defaults[option['key']] ? defaults[option['key']]:option['value']) + '"/>';
                break;
        }
    }

    return html;
}
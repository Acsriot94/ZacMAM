function ShortcutKeyManager() {
    this.keys = [];
}

ShortcutKeyManager.prototype.addKey = function(key, description, func, object) {
    this.keys.push({key: key, description: description});

    if (object) {
        Mousetrap(object[0]).bind(key, func);
    } else {
        Mousetrap.bind(key, func);
    }

    this.addShortcutIcon();
};

ShortcutKeyManager.prototype.showShortcutOverlay = function() {
    if (this.keys.length === 0) return;

    $('.modal-overlay').remove();

    var div = '<div id="keyboard-shortcut-overlay" class="modal-overlay" style="opacity:0"><center><h3>Keyboard Shortcuts</h3></center><table>';

    for (var i=0; i < this.keys.length; i++) {
        var key = this.keys[i];
        div += '<tr><td>' + this.formatKeyName(key['key'], true) + '</td><td>' + key['description'] + '</td></tr>';
    }

    div += '</table></div>';

    var body = $('body');

    $(div).appendTo(body);

    var overlay = $('#keyboard-shortcut-overlay');
    overlay.css('left', 'calc(50% - ' + (overlay.width() / 2) + 'px)');
    overlay.css('top', 'calc(50% - ' + (overlay.height() / 2) + 'px)');

    overlay.animate({opacity:1.0}, 400);

    var self = this;

    body.on('click', function(e) {
        self.closeShortcutOverlay();
    });

    body.on('keydown', function(e) {
        if (e.key == "Escape") {
            self.closeShortcutOverlay();
        }
    });
};

ShortcutKeyManager.prototype.closeShortcutOverlay = function()
{
    var overlay = $('#keyboard-shortcut-overlay');

    overlay.fadeOut(400, function(e) {
        overlay.remove();
    });
}

ShortcutKeyManager.prototype.addShortcutIcon = function() {
    if (isIphone) return;
    if ($('#shortcut-key-button').length) return; // Already exists

    $('#footer #navwrapper #nav_left').append($('<div id="shortcut-key-button" title="Keyboard Shortcuts" class="tooltip"></div>'));
    reloadTooltips();

    var self = this;
    $('#shortcut-key-button').on('click', function(e) {
        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();

        self.showShortcutOverlay();
    });
};

ShortcutKeyManager.prototype.formatKeyName = function(name, styled) {
    var components = name.split('+');
    var newComponents = [];

    for (var i=0; i < components.length; i++) {
        var component = components[i];
        if (component === 'mod') {
            component = (isMac ? 'cmd' : 'ctrl');
        }

        // Capitalize first letter
        component = component.substr(0, 1).toUpperCase() + component.substr(1);

        newComponents.push(component);
    }

    return (styled ? '<span class="key">':'') + newComponents.join((styled ? '</span>':'') + ' + ' + (styled ? '<span class="key">':'')) + (styled ? '</span>':'');
};

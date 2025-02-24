window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
	var ua = navigator.userAgent.toLowerCase();
	if (errorMsg && errorMsg.length > 2 && url && url.length > 0 && lineNumber > 1 && !(errorMsg == 'InvalidAccessError' && lineNumber < 2) && errorMsg.indexOf('NPObject') == -1 && ua.indexOf('spider') == -1 && ua.indexOf('bot') == -1 && ua.indexOf('station/') == -1) {
		var data = {'type': 'Script Error', 'script': url, 'line': lineNumber, 'message': errorMsg, 'column': column};
		if (errorObj) data['stack'] = errorObj.stack;

		logError(data);
	}
};

$(document).ajaxError(function(event, jqXHR, ajaxSettings, errorString) {
	var data = {'type': 'AJAX Error', 'message': errorString, 'statusCode': jqXHR.status, 'statusText': jqXHR.statusText, 'readyState': jqXHR.readyState};//, 'script': url, 'line': lineNumber, 'message': errorMsg, 'column': column};
	data['responseHeaders'] = jqXHR.getAllResponseHeaders();
	data['httpMethod'] = ajaxSettings.type;
	data['ajaxURL'] = ajaxSettings.url;

	if (jqXHR.readyState == 0 || jqXHR.status == 0) return; // The user navigated away
	logError(data);
});

var agent = navigator.userAgent;
var isTouchDevice = ('ontouchstart' in window || 'onmsgesturechange' in window);
var isIphone = (window.matchMedia("(max-width: 960px)").matches && isTouchDevice);
var isIOS = (isIphone || (agent.indexOf('iPad') != -1) || (agent.indexOf('iOS') != -1));
var isIE = (!isIphone && ((agent.indexOf('MSIE') != -1) || (agent.indexOf('Trident') != -1)));
var isMac = (agent.indexOf('Mac') !== -1 || agent.indexOf('OS X') !== -1);
var isAdobePanel = (agent.toLowerCase() === 'kollabadobepanel');

function logError(data)
{
	if (typeof data === 'string' || data instanceof String) {
		data = {'message': data};
	}

	data['browser'] = navigator.userAgent;
	data['url'] = location.href;

	console.log(data);

	if (location.href.toLowerCase().startsWith("chrome-extension://")) return;

	var xhttp = new XMLHttpRequest();

	xhttp.open('POST', '../ajax/errorlog', true);
	xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xhttp.send('data=' + encodeURIComponent(JSON.stringify(data)));
}

function userDropdownClicked()
{
	$('#user_dropdown').show().menu();

	const dropdown = document.getElementById('user_dropdown');
	const container = document.getElementById('avatar-container');
	dropdown.style.top = (container.offsetTop - dropdown.offsetHeight) + 'px';
}

function projectDropdownClicked() 
{
	$('#project_dropdown').show().menu();
}

function eventDropdownClicked()
{
	showMenuForButton($('#event-icon'),$('<ul id="event_dropdown" class="menu"></ul>'));

	if ($('#event_dropdown').children().length == 0) {
		$('#event_dropdown').html('<li>&nbsp;<img style="width:22px;position:absolute;left:calc(50% - 10px)" src="img/spinner-white.svg" />');
	}

    $('#event_badge').hide();

	$.get('ajax/alerts?project=' + getJSConnectValue('project.id'),function(data) {
		var alerts = safeJSONParse(data);

		if (!alerts) {
			alert('Unable to get alert information.');
			return;
		}

		var htmlString = '';

		if (alerts.length == 0) {
			if ($('#event_dropdown').children().length < 2) {
				$('#event_dropdown').html('No recent alerts');
				return;
			}

		} else {
            for (var i=0; i<alerts.length; i++) {
				var event = alerts[i];
				htmlString += (event['url'] ? '<a href="' + event['url'] + '">' : '') + '<li><div class="event-icon"><img src="' + event['icon_path'] + '"></div><div class="event-text">' + event['event'] + '<div class="event-date">' + moment(new Date(parseInt(event['date']) * 1000)).fromNow() + '</div></div></li>' + (event['url'] ? '</a>' : '');
			}

			$('#event_dropdown').html(htmlString);
		}
	});

    $.get('ajax/event_reset');
}

/**
 * @return {boolean}
 */
function ClickOutsidePopup(e)
{
	var el = e.target;
	var popup = $('.menu:visible')[0];
    if (typeof popup === 'undefined') return true;
      
    while (true){
		if (el == popup) {
			return true;
        } else if (el == document) {
            $(".menu").hide();
			$('#context-menu').remove();
            $('#temp-popup-menu').remove();
			$('.temp-popup-menu').remove();
			return false;
        } else {
            el = $(el).parent()[0];
        }
    }
}

$(document).ready(function() {
	fitNavBarToScreen();

	$(document).bind('mousedown.popup touchend.popup', ClickOutsidePopup);
	
	reloadTooltips();

	$(document).on('click', 'a[href=#]', function (e) {
		e.preventDefault();
		e.stopPropagation();
		return false;
	});

	$(document).on('keydown', 'body', function (e) {
		if (e.key == 'Escape') {
			closePopup();
			closeMenu();
		}
	});

	$(document).on('click', 'body', function (e) {
		var target = $(e.target);

		if (!target.hasClass('popup') && !target.parents('.popup').length && !target.parents('pop-over').length) {
			closePopup();
		}
	});

	$(document).on('click', '.checkbox-text', function (e) {
		var label = $(e.target);
		var checkbox_id = label.data('for');

		// Find closest checkbox
		var checkbox = $(e.target).siblings('input[type=checkbox]' + (checkbox_id ? '[id="' + checkbox_id + '"]':''));
		if (!checkbox.length) checkbox = $(e.target).closest('input[type=checkbox]');

		if (checkbox.length) {
			checkbox.trigger('click', e);
		}

		return false;
	});

	$(window).resize(function(e) {
		fitNavBarToScreen();
	});

	$(document).on('click','#navbar-uncollapse',function(e) {
		expandNavBar();
	});

	$(document).on('click','#navbar-collapse',function(e) {
		collapseNavBar();
	});

	if (getJSConnectValue('site.relative_root') !== null) {
		$('.slide-out-div').tabSlideOut({
			tabHandle: '.handle',                              //class of the element that will be your tab
			pathToTabImage: getJSConnectValue('site.relative_root') + 'img/Feedback.svg',          //path to the image for the tab *required*
			imageHeight: '120px',                               //height of tab image *required*
			imageWidth: '28px',                               //width of tab image *required*
			tabLocation: 'right',                               //side of screen where tab lives, top, right, bottom, or left
			speed: 300,                                        //speed of animation
			action: 'click',                                   //options: 'click' or 'hover', action to trigger animation
			topPos: '200px',                                   //position from the top
			fixedPosition: true                               //options: true makes it stick(fixed position) on scroll
		});
	}

	document.addEventListener("visibilitychange", function() {
		if (document.visibilityState === 'visible') {
			if (typeof checkSession === "function") {
				checkSession();
			}
		}
	});
});

function submitFeedback() {
	if (typeof relativeSiteRoot == 'undefined') return;

	var message = document.getElementById('feedbackMessage').value;
	
	 $.post(relativeSiteRoot+"ajax/feedback.php",{message: message},function(data,status){
	 if (status != 'success') 
	 	alert('Error submitting feedback.');

		$(".handle").click();
		document.getElementById('feedbackMessage').value = '';
	 }).fail(function(jqXHR, textStatus, errorString) {
		 alert(sanitize_string("Failed to send feedback: " + errorString));
	 });
}

function loadUISkin(index) {
    writeCookie('ui_skin',index,365);
    window.location.reload();
}

function writeCookie(name,value,days)
{
	var date, expires;
	if (days) {
		date = new Date();
		date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
		expires = "; expires=" + date.toGMTString();
	} else {
        expires = ";expires=Thu, 01 Jan 1970 00:00:01 GMT";
		value = "";
    }

    document.cookie = name + "=" + value + expires + "; path=" + siteSubfolder + "; samesite=" + (isAdobePanel ? "none" : "lax");
}

function getCookie(name) {
	var match = document.cookie.match(new RegExp(name + '=([^;]+)'));
	if (match) return match[1];

	return null;
}

function writeLocalStorage(name,value)
{
	if (!window.localStorage) {
		console.log('Unable to write data to local storage - browser settings may be preventing this.');
		return false;
	}

	window.localStorage.setItem(name,value);

	return true;
}

function getLocalStorage(name,default_val)
{
	if (!window.localStorage) {
		console.log('Unable to read from local storage - browser settings may be preventing this.');
		return default_val;
	}

	var val = window.localStorage.getItem(name);

	if (val) {
		return val;
	} else {
		return default_val;
	}
}

function deleteLocalStorage(name)
{
	if (!window.localStorage) {
		console.log('Unable to write data to local storage - browser settings may be preventing this.');
		return false;
	}

	window.localStorage.removeItem(name);

	return true;
}

function writeSessionCookie(params)
{
	var name = params["name"];
	if (!name || name.length === 0) return false;

	var id = params["id"];
	if (!id || id.length === 0) return false;

	var path = params["path"];
	if (!path || path.length === 0) path = "/";

	var exp_date = new Date();
	exp_date.setTime(exp_date.getTime() + (180 * 60 * 1000)); // 3 hrs

	document.cookie = name + "=" + id + "; expires=" + exp_date.toGMTString() + "; path=" + path;

	return true;
}

function toggleAlerts() {
	$('.menu').hide();

    var alertItem = $('#alert_toggle').parent();

	if (getCookie('disable_alerts') != 1) {
		alertItem.addClass('ui-checked');
        $('#alert_off_icon').css('display','block');
        writeCookie('disable_alerts','1',365);
	} else {
        alertItem.removeClass('ui-checked');
        $('#alert_off_icon').css('display','none');
        writeCookie('disable_alerts','0',0);
	}
}

function reloadTooltips() {
	if (!isTouchDevice) {
        $('.tooltip:not(.horizontal), .hover-help.vertical').tipsy({target: 'hover', gravity: $.fn.tipsy.autoNS});
        $('.tooltip.horizontal, .hover-help:not(.vertical)').tipsy({target: 'hover', gravity: $.fn.tipsy.autoWE});
    }

	$('.autotooltip').tipsy({target: 'manual',offset:2}).tipsy('show');
}

function reloadTooltipsForObject(obj)
{
    if (!isTouchDevice) {
        obj.find('.tooltip:not(.horizontal)').tipsy({target: 'hover', gravity: $.fn.tipsy.autoNS});
        obj.find('.tooltip.horizontal').tipsy({target: 'hover', gravity: $.fn.tipsy.autoWE});
    }

    obj.find('.autotooltip').tipsy({target: 'manual',offset:2}).tipsy('show');
}

function removeVisibleTooltips()
{
	$('.tipsy').remove();
}

function showMenuForEvent(menu_obj,event)
{
	showMenuAtPosition(menu_obj,event.pageX,event.pageY);
}

function showMenuAtPosition(menu_obj,x,y)
{
	var menuCopy = showMenu(menu_obj);
	menuCopy.css('top',y+'px');
	menuCopy.css('left',x+'px');
}

function showMenuForButton(button_obj,menu_obj,container=null)
{
	var menuCopy = showMenu(menu_obj, container);

	if (!button_obj.length || typeof button_obj === "undefined") return;

	var button_pos = button_obj.offset();

	var menuTop = button_pos.top+button_obj.outerHeight()+2;

	menuCopy.css('top',menuTop+'px');

	var proposedLeft = button_pos.left-(menuCopy.outerWidth()/2)+(button_obj.outerWidth()/2);

	if (proposedLeft + menuCopy.outerWidth() >= $(window).width()) {
		proposedLeft = $(window).width()-menuCopy.outerWidth()-5;
	}

	menuCopy.css('left',proposedLeft+'px');
}

function showMenu(menu_obj,container=null)
{
	if (container === null) container = $('body');

	// Remove old menus
	$('.temp-popup-menu').remove();

	// Make copy of menu and add to root DOM
	var menuCopy = menu_obj.clone();
	menuCopy.appendTo(container);

	menuCopy.position(0,0);
	menuCopy.addClass('menu').addClass('temp-popup-menu');

	menuCopy.show().menu({position: { my: "left top", at: "right+2 top-2" }});

	menuCopy.css('position','absolute');
	menuCopy.css('left',0);

	return menuCopy;
}

function slideToggleObject(obj, timing, title_obj, text_closed, text_open)
{
	if (!obj.length) return;
	if (!text_open) text_open = text_closed;

	if (title_obj.length) {
		if (obj.is(":visible")) {
			title_obj.html(text_closed);
		} else {
			title_obj.html(text_open);
		}

		obj.slideToggle(timing, "linear");
	}
}

function showPopupAtPoint(div, x, y, width, height, direction)
{
	closePopup();

	const html = `<pop-over width="${width}" height="${height}" atX="${x}" atY="${y}" direction="${direction}">` + div[0].outerHTML + `</pop-over>`;
	document.body.insertAdjacentHTML('beforeend', html);
}

function showPopupForElement(element, div, width, height, direction)
{
	var pos = element.offset();
	var x = pos.left + (element.width() / 2);

	// Figure out direction
	if (direction === null || direction === "auto") {
		if (pos.top + element.width() + height >= $(document).height() * 0.95) {
			direction = "above";
		} else {
			direction = "below";
		}
	}

	var y = pos.top + element.height() + 3;
	if (direction == "above") {
		y = pos.top - 10;
	}

	if (y < 0) y = 0;
	if (x < 0) x = 0;

	showPopupAtPoint(div, x, y, width, height, direction);
}

function closePopup()
{
	if ($('pop-over').length) {
		$('pop-over').remove();
	}
}

function safeJSONParse(str, error_info)
{
	try {
		return JSON.parse(str);
	}

	catch (e) {
		var data = {'message':'Invalid JSON string at URL: '+window.location.href+'<p>String: '+str+'<p>Stack: '+e.stack+'<p>Browser: '+navigator.userAgent};
		console.log(data);

        var xhttp = new XMLHttpRequest();

        xhttp.open('POST', '../ajax/errorlog', true);
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhttp.send('data=' + encodeURIComponent(JSON.stringify(data)));
    }

    return null;
}

function refreshStorageSpace()
{
    $.get('ajax/storage',function(data) {
        var storage = safeJSONParse(data);

        if (!storage) {
        	console.log('Unable to get storage space info - user may not be logged in');
            return;
        }

        var storage_indicator = $('#storage');
        if (!storage_indicator.length) return;

        if (storage['bytes'] > 0) {
        	storage_indicator.html(formatFileSize(storage['bytes']));
		}

        storage_indicator.removeClass('good').removeClass('warning').removeClass('exceeded').removeClass('nostorage');

        if (storage['percent']) {
            var percent = parseInt(storage['percent']);

            if (percent < 75) {
                storage_indicator.addClass('good');
            } else if (percent < 99) {
                storage_indicator.addClass('warning');
            } else {
                storage_indicator.addClass('exceeded');
            }
        } else {
            storage_indicator.addClass('nostorage');
        }

		var trashTotal = $('#trash-total');
		if (storage['trash'] > 0) {
			trashTotal.html(formatFileSize(storage['trash']));
		} else {
			trashTotal.html('');
		}
	});
}

function formatFileSize(size)
{
    var sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    if (size <= 0) return '0 B';
    var i;
    return ((size/Math.pow(1024, (i = Math.floor(Math.log(size) / Math.log(1024))))).toFixed(2) + ' ' + sizes[i]);
}

function resizeTextToFit(element)
{
	if (!element || typeof element == 'undefined') return;

	if (element.scrollWidth <= element.clientWidth) return;

	// We only want to scale down long text, so first we reset
    // font-size to 100%, in case this function is called multiple times.
/*    element.style.fontSize = '100%';
    element.style.letterSpacing = '';
*/

    let fontSize = 100;
	const computedStyles = window.getComputedStyle(element);
	const letterSpacing = parseFloat(computedStyles.getPropertyValue('letter-spacing'));

	const diff = element.clientWidth / element.scrollWidth;

	fontSize *= diff;
	if (fontSize < 78) fontSize = 78;

	element.style.fontSize = fontSize + '%';
	element.style.letterSpacing = (letterSpacing * (fontSize / 100)) + 'px';
}

function scrollParentToObject(object,parent)
{
	if (typeof object == 'undefined' || !object || !object.length) return;
	if (typeof parent == 'undefined' || !parent || !parent.length) return;

	if (!isObjectOnScreen(object,parent)) {
		var yPos = object.offset().top - parent.offset().top + parent.scrollTop() - 50;
		parent.animate({
			scrollTop: yPos
		}, 300);
	}
}

function isObjectOnScreen(object,parent)
{
	if (typeof object == 'undefined' || !object || !object.length) return;
	if (typeof parent == 'undefined' || !parent|| !parent.length) return;

	var childTop = object.offset().top-parent.offset().top;
	var parentTop = parent.scrollTop();

	var childHeight = object.height();
	var parentHeight = parent.height();

	return (childTop >= parentTop && childTop+childHeight+50 <= parentTop + parentHeight);
}

function stripSlashes(str)
{
	return (str + '').replace(/\\(.?)/g, function (s, n1) {
		switch (n1) {
			case '\\':
				return '\\';
			case '0':
				return '\u0000';
			case '':
				return '';
			default:
				return n1;
		}
	});
}

function escapeSingleQuotes(str)
{
	return str.replace(/'/g, "\\'");
}

function fitNavBarToScreen()
{
	var navBar = $('#navbar.vertical');
	if (navBar.length == 0) return;

	if ($(window).width() < 1120) {
		collapseNavBar(false);
	} else {
		expandNavBar();
	}
}

function collapseNavBar()
{
	var navBar = $('#navbar.vertical');
	if (navBar.length == 0) return;

	navBar.addClass('collapsed');
	$('#navbar-uncollapse').remove();
	$('#pagewrapper').removeClass('vertical').append('<div id="navbar-uncollapse">&gt;&gt;</div>');
}

function expandNavBar()
{
	var navBar = $('#navbar.vertical');
	if (navBar.length == 0) return;

	navBar.removeClass('collapsed');
	$('#pagewrapper').addClass('vertical');
	$('#navbar-uncollapse').remove();
}

function strip_html_tags(string,allowed_tags)
{
	var regex_str = "<";

	if (allowed_tags) {
		for (var i = 0; i < allowed_tags.length; i++) {
			regex_str += "(?!" + allowed_tags[i] + ">)";
		}
	}

	regex_str += "[^>]+>";

	var re = new RegExp(regex_str, "g");

	return string.replace(re,"");
}

function sanitize_string(string)
{
	return strip_html_tags(string,[]);
}

function sanitize_url(string)
{
	string = strip_html_tags(string,[]);
	string = string.replace('"', "");
	string = string.replace("'", "");
	string = string.replace(";", "");

	return string;
}

function getJSConnectExists(key)
{
	return getJSConnectValue(key, null, false) !== null;
}

function getJSConnectValue(key, defaultVal = null, logMissingKeys = true)
{
	if ('undefined' === typeof window.jsconnect) {
		logError('JSConnect object not found in window');
		return defaultVal;
	}

	// Split up key
	var components = key.split(".");
	var obj = window.jsconnect;

	for (var i=0; i<components.length; i++) {
		var subkey = components[i];
		if (!subkey in obj) {
			if (logMissingKeys) logError('JSConnect subkey "' + subkey + '" not found');
			return defaultVal;
		}

		obj = obj[subkey];
		if (typeof obj === 'undefined') {
			if (logMissingKeys) logError('JSConnect subkey "' + subkey + '" not found');
			return defaultVal;
		}
	}

	return obj;
}

function getCurrentProjectID()
{
	return getJSConnectValue('project.id');
}

function closeMenu()
{
	$('.menu:visible').remove();
	$('#context-menu').remove();
	$('#temp-popup-menu').remove();
	$('.temp-popup-menu').remove();
}

function editTextLabel(text_obj, success_callback, cancel_callback)
{
	// Store current value
	var currentText = text_obj.html();

	text_obj.html('<input type="text" class="text-edit" data-old-value="'+currentText+'" value="'+currentText+'" />');

	var textBox = text_obj.find('.text-edit');

	textBox.focus();
	textBox.select();

	textBox.on('keydown',function(e) {
		if (e.keyCode === 13 && !e.shiftKey) { // Enter
			var newText = textBox.val();

			if (newText.length > 0) {
				text_obj.html(newText);
				success_callback(newText);
			} else {
				text_obj.html(currentText);
			}
		} else if (e.keyCode === 27) { // Esc
			text_obj.html(currentText);
			if (cancel_callback) {
				cancel_callback(text_obj);
			}
		}
	});
}

function cancelTextLabelEditing(callback)
{
	$('.text-edit').each(function() {
		var parent = $(this).parent();
		parent.html($(this).data('old-value'));

		if (callback) {
			callback(parent);
		}
	});
}

function encodePathForURI(path)
{
	var encoded_str = encodeURIComponent(path);

	// Some software behaves weirdly with ! symbols in URLs
	// so encode those too just in case
	encoded_str = encoded_str.replace('!', '%21');

	return encoded_str;
}

function boolFromString(str)
{
	const regex = /^\s*(true|1|on)\s*$/i;
	return regex.test(str);
}

async function postData(url = "", data = {})
{
	const response = await fetch(url, {
		method: "POST",
		mode: "cors",
		cache: "no-cache",
		credentials: "same-origin",
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		redirect: "follow",
		referrerPolicy: "no-referrer",
		body: new URLSearchParams(data)
	});
	return response.json(); // Parses JSON response into native JavaScript objects
}

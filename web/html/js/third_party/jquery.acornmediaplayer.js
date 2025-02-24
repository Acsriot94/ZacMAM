/*
 * Acorn Media Player - jQuery plugin 1.7
 *
 * Copyright (C) 2012 Ionut Cristian Colceriu
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * www.ghinda.net
 * contact@ghinda.net
 *
 * Contributors:
 * Steve Oldham - https://github.com/stephenoldham
 *
 *
 */

(function($) {
	$.fn.acornMediaPlayer = function(options) {
		/*
		 * Define default plugin options
		 */
		var defaults = {
			theme: 'access',
			nativeSliders: false,
			volumeSlider: 'horizontal',
			captionsOn: true,
			tooltipsOn: false
		};
		options = $.extend(defaults, options);
		
		/* 
		 * Function for generating a unique identifier using the current date and time
		 * Used for generating an ID for the media elmenet when none is available
		 */
		var uniqueID = function() {
			var currentDate = new Date();
			return currentDate.getTime();
		};
		
		/* 
		 * Detect support for localStorage
		 */
		function supports_local_storage() {
			try {
				var supported = ('localStorage' in window && window.localStorage !== null);

				// Even if it's supported, security settings may prevent it so try to access it
				if (supported) localStorage.getItem('acornvolume');
				return supported;

			} catch(e){
				return false;
			}
		}
		
		/* Detect Touch support
		 */
		var is_touch_device = 'ontouchstart' in document.documentElement;
		
		/*
		 * Get the volume value from localStorage
		 * If no value is present, define as maximum
		 */

		try {
			var volume = (supports_local_storage) ? localStorage.getItem('acornvolume') : 1;
			if (!volume) {
				volume = 1;
			}
		}

		catch (e) {
			volume = 1;
		}
		
		/* 
		 * Main plugin function
		 * It will be called on each element in the matched set
		 */
		var acornPlayer = function() {
			// set the acorn object, will contain the needed DOM nodes and others
			var acorn = {
				$self: $(this)
			};
			
			var seeking; // The user is seeking the media
			var wasPlaying; // Media was playing when the seeking started
			var fullscreenMode; // The media is in fullscreen mode
			var captionsActive; // Captions are active
			
			/* Define all the texts used
			 * This makes it easier to maintain, make translations, etc.
			*/
			var text = {
				play: 'Play',
				playTitle: 'Start playback',
				pause: 'Pause',
				pauseTitle: 'Pause playback',
				mute: 'Mute',
				unmute: 'Unmute',
				fullscreen: 'Full screen',
				fullscreenTitle: 'Toggle full screen mode',
				volumeTitle: 'Volume control',
				seekTitle: '',
				captions: 'Captions',
				captionsTitle: 'Toggle captions',
				captionsChoose: 'Choose caption',
				transcript: 'Transcript',
				transcriptTitle: 'Show transcript',
				syncTitle: 'Sync',
				skipBackTitle: 'Back 5 seconds',
				infoTitle: 'Info',
				qualityTitle: 'Change Quality',
				heatmapTitle: 'Toggle Heatmaps'
			};
			
			// main wrapper element
			var $wrapper = $('<div class="acorn-player" role="application"></div>').addClass(options.theme);

			/*
			 * Define attribute tabindex on the main element to make it readchable by keyboard
			 * Useful when "aria-describedby" is present
			 *
			 * It makes more sense for screen reader users to first reach the actual <video> or <audio> elment and read of description of it,
			 * than directly reach the Media Player controls, without knowing what they control.
			 */
			acorn.$self.attr('tabindex', '0');		
			
			/*
			 * Check if the main element has an ID attribute
			 * If not present, generate one
			 */
			acorn.id = acorn.$self.attr('id');
			if (!acorn.id) {
				acorn.id = 'acorn' + uniqueID();
				acorn.$self.attr('id', acorn.id);
			}
			
			/* 
			 * Markup for the fullscreen button
			 * If the element is not <video> we leave if blank, as the button is useless on <audio> elements
			 */
			var fullscreenBtnMarkup = (acorn.$self.is('video')) ? '<button class="acorn-fullscreen-button" title="'+text.fullscreen+'" aria-controls="' + acorn.id + '"></button>' : '';
			
			/* * Markup for volume button
			   * Volume is not available on iOS
			*/
			
			var volumeBtnMarkup = '';
			
			if (!navigator.userAgent.match(/(iPad|iPhone|iPod|iOS)/g)) {
				volumeBtnMarkup = '<div class="acorn-volume-box">' +
								  '<button class="acorn-volume-button" title="'+text.mute+'" aria-controls="' + acorn.id + '"></button>' +
								  '<input type="range" class="acorn-volume-slider" value="1" min="0" max="1" step="0.05" aria-controls="' + acorn.id + '"/>' +
								  '</div>';
			}

            var qualityBtnMarkup = '';

            if (acorn.$self.find('#mp4-hd').length && acorn.$self.find('#mp4-sd').length) {
                qualityBtnMarkup = '<button class="acorn-quality-button '+(getCookie('preferSD') ? 'sd':'hd')+'" title="'+text.qualityTitle+'" aria-controls="' + acorn.id + '"></button>';
            }

            /*
             * Markup for player tooltips
             * If tooltips are not required we leave it blank
             */
			var tooltipMarkup = (options.tooltipsOn) ? '<div class="acorn-tooltip"><div>' : '';

			/*
			 * Complete markup
			 */
			var template = 	'<div class="acorn-controls">' +
								'<div class="marker-bar"></div>' +
								'<div class="player-control-container">' +
								'<button class="acorn-play-button" title="'+text.play+'" aria-controls="' + acorn.id + '"></button>' +
								'<input type="range" class="acorn-seek-slider" value="0" min="0" max="150" step="0.1" aria-controls="' + acorn.id + '"/>' +
/*								'<button class="acorn-rew-button" aria-controls="' + acorn.id + '"></button>' +
								'<button class="acorn-ff-button" aria-controls="' + acorn.id + '"></button>' +*/
								'<button class="acorn-skip-back-button" title="Back 5 seconds" aria-controls="' + acorn.id + '"></button>' +
								volumeBtnMarkup +
								fullscreenBtnMarkup +
								(isIphone && getCookie('beta_custom_mobile_player') == 1 ? '':
								'<button class="acorn-sync-button" title="Playback Sync" aria-controls="' + acorn.id + '"></button>' +
								'<button class="acorn-heatmap-button" title="Heatmaps" aria-controls="' + acorn.id + '"></button>' +
/*								'<button class="acorn-info-button" title="Info" aria-controls="' + acorn.id + '"></button>' +*/
								qualityBtnMarkup +
				                '<button class="acorn-caption-button" title="' + text.captionsTitle + '"  aria-controls="' + acorn.id + '"></button>' +
				                '<div class="acorn-caption-selector"></div>'
								) +
								'<div style="width:100%;text-align:center" id="timecode_box" class="timecode_box">Loading...</div>' +
/*								'<button class="acorn-transcript-button" title="' + text.transcriptTitle + '">' + text.transcript + '</button>' +*/
							'</div>' +
							'</div>' +
							tooltipMarkup;

			var captionMarkup = '<div class="acorn-caption"></div>';
			var transcriptMarkup = '<div class="acorn-transcript" role="region" aria-live="assertive"></div>';				
			
			/*
			 * Append the HTML markup
			 */
			
			// append the wrapper
			acorn.$self.after($wrapper);
			
			// For iOS support, I have to clone the node, remove the original, and get a reference to the new one.
			// This is because iOS doesn't want to play videos that have just been `moved around`.
			// More details on the issue: http://bugs.jquery.com/ticket/8015
			$wrapper[0].appendChild( acorn.$self[0].cloneNode(true) );
			
			acorn.$self.remove();
			acorn.$self = $wrapper.find('video, audio');
			
			// append the controls and loading mask
			acorn.$self.after(template).after('<div class="loading-media"></div>');
			
			/*
			 * Define the newly created DOM nodes
			 */
			acorn.$container = acorn.$self.parent('.acorn-player');

			acorn.$controls = $('.acorn-controls', acorn.$container);
            acorn.$markerBar = $('.marker-bar', acorn.$container);
			acorn.$playBtn = $('.acorn-play-button', acorn.$container);
/*			acorn.$rewBtn = $('.acorn-rew-button', acorn.$container);
			acorn.$ffBtn = $('.acorn-ff-button', acorn.$container);*/
			acorn.$skipBackBtn = $('.acorn-skip-back-button', acorn.$container);
			acorn.$seek = $('.acorn-seek-slider', acorn.$container);
			acorn.$timer = $('.acorn-timer', acorn.$container);
			acorn.$volume = $('.acorn-volume-slider', acorn.$container);
			acorn.$volumeBtn = $('.acorn-volume-button', acorn.$container);
			acorn.$fullscreenBtn = $('.acorn-fullscreen-button', acorn.$container);
			acorn.$syncBtn = $('.acorn-sync-button', acorn.$container);
			acorn.$heatmapBtn = $('.acorn-heatmap-button', acorn.$container);
			acorn.$infoBtn = $('.acorn-info-button', acorn.$container);
            acorn.$tooltip = $('.acorn-tooltip', acorn.$container);

			/*
			 * Append the markup for the Captions and Transcript
			 * and define newly created DOM nodes for these
			 */
			acorn.$controls.after(captionMarkup);
			acorn.$container.after(transcriptMarkup);
			
			acorn.$transcript = acorn.$container.next('.acorn-transcript');
			acorn.$transcriptBtn = $('.acorn-transcript-button', acorn.$container);
		
			acorn.$caption = $('.acorn-caption', acorn.$container);
			acorn.$captionBtn = $('.acorn-caption-button', acorn.$container);
			acorn.$captionSelector = $('.acorn-caption-selector', acorn.$container);

            /*
             * Time formatting function
             * Takes the number of seconds as a parameter and return a readable format "minutes:seconds"
             * Used with the number of seconds returned by "currentTime"
             */
			var timeFormat = function(sec) {
				var m = Math.floor(sec/60)<10?"0" + Math.floor(sec/60):Math.floor(sec/60);
				var s = Math.floor(sec-(m*60))<10?"0" + Math.floor(sec-(m*60)):Math.floor(sec-(m*60));
				return m + ":" + s;
			};
			
			/*
			 * PLAY/PAUSE Behaviour			 
			 *
			 * Function for the Play button
			 * It triggers the native Play or Pause events
			 */
			var playMedia = function() {
				if (!acorn.$self.prop('paused')) {
					acorn.$self.trigger('pause');
				} else {
					//acorn.$self.trigger('play');
					acorn.$self[0].playbackRate = 1.0;
					acorn.$self[0].play();
				}
			};
			
			/* 
			 * Functions for native playback events (Play, Pause, Ended)
			 * These are attached to the native media events.
			 *
			 * Even if the user is still using some form of native playback control (such as using the Context Menu)
			 * it will not break the behviour of our player.
			 */
			var startPlayback = function() {
				acorn.$playBtn.addClass('acorn-paused-button');
			};
			
			var stopPlayback = function() {
				acorn.$playBtn.removeClass('acorn-paused-button');
			};
			
			/*
			 * SEEK SLIDER Behaviour
			 * 
			 * Updates the Timer and Seek Slider values
			 * Is called on each "timeupdate"
			 */
			var seekUpdate = function() {

				var currenttime = acorn.$self.prop('currentTime');
				acorn.$timer.text(timeFormat(currenttime));	
				
				// If the user is not manually seeking
				if (!seeking) {
					// Check type of sliders (Range <input> or jQuery UI)
					if (options.nativeSliders) {
						acorn.$seek.attr('value', currenttime);
					} else {
						acorn.$seek.slider('value', currenttime);
					}
				}
				
				// If captions are active, update them
				if (captionsActive) {
					updateCaption(); 
				}

				updateTimecode((acorn.$self.prop('paused')),(acorn.$self.prop('paused')));
			};
			
			/*
			 * Time formatting function
			 * Takes the number of seconds as a paramenter
			 * 
			 * Used with "aria-valuetext" on the Seek Slider to provide a human readable time format to AT
			 * Returns "X minutes Y seconds"
			 */
			var ariaTimeFormat = function(sec) {
				var m = Math.floor(sec/60)<10?"" + Math.floor(sec/60):Math.floor(sec/60);
				var s = Math.floor(sec-(m*60))<10?"" + Math.floor(sec-(m*60)):Math.floor(sec-(m*60));
				var formatedTime;
									
				var mins = 'minutes';
				var secs = 'seconds';
				
				if (m == 1) {
					mins = 'minute';
				}
				if (s == 1) {
					secs = 'second';
				}
				
				if (m === 0) {
					formatedTime = s + ' ' + secs;
				} else {						
					formatedTime = m + ' ' + mins + ' ' + s + ' ' + secs;
				}				
				
				return formatedTime;
			};
			
			/* 
			 * jQuery UI slider uses preventDefault when clicking any element
			 * so it stops the Blur event from being fired.
			 * This causes problems with the Caption Selector.
			 * We trigger the Blur event manually.
			 */
			var blurCaptionBtn = function() {
				acorn.$captionBtn.trigger('blur');				
			};
			
			/*
			 * Triggered when the user starts to seek manually
			 * Pauses the media during seek and changes the "currentTime" to the slider's value
			 */
			var startSeek = function(e, ui) {
                if (!window.isSessionOwner) {
                    if (options.nativeSliders) {
                        acorn.$seek.val = acorn.$self[0].currentTime;
                    } else {
                        ui.value = acorn.$self[0].currentTime;
                    }

                    return;
                }

                if (!acorn.$self.get(0).paused) {
					wasPlaying = true;
				}
				
				acorn.$self.trigger('pause');
				seeking = true;
				
				var seekLocation;
				if (options.nativeSliders) {
					seekLocation = acorn.$seek.val();
				} else {
					seekLocation = ui.value;
				}

                if (acorn.$self.get(0).readyState >= 3) {
                    acorn.$self.get(0).currentTime = seekLocation;
                    console.log('seek loc: '+seekLocation);
                }
				
				// manually blur the Caption Button
				blurCaptionBtn();
			};
			
			/*
			 * Triggered when user stopped manual seek
			 * If the media was playing when seek started, it triggers the playback,
			 * and updates ARIA attributes
			 */
			var endSeek = function(e, ui) {
                if (!window.isSessionOwner) {
                    if (options.nativeSliders) {
                        acorn.$seek.val = acorn.$self[0].currentTime;
                    } else {
                        ui.value = acorn.$self[0].currentTime;
                    }

                    return;
                }

                // Final seek position
                var seekLocation;
                if (options.nativeSliders) {
                    seekLocation = acorn.$seek.val();
                } else {
                    seekLocation = ui.value;
                }

                console.log('seek loc: '+seekLocation);

                if (seekLocation != acorn.$self.get(0).currentTime) acorn.$self.get(0).currentTime = seekLocation;

                if (wasPlaying) {
					acorn.$self.trigger('play');
					wasPlaying = false;
				}
				seeking = false;			
				var sliderUI = $(ui.handle);
				sliderUI.attr("aria-valuenow", parseInt(ui.value, 10));
				sliderUI.attr("aria-valuetext", ariaTimeFormat(ui.value));
			};
			
			/*
			 * Transforms element into ARIA Slider adding attributes and "tabindex"
			 * Used on jQuery UI sliders
			 * 
			 * Will not needed once the jQuery UI slider gets built-in ARIA 
			 */ 
			var initSliderAccess = function (elem, opts) {
				var accessDefaults = {
				 'role': 'slider',
				 'aria-valuenow': parseInt(opts.value, 10),
				 'aria-valuemin': parseInt(opts.min, 10),
				 'aria-valuemax': parseInt(opts.max, 10),
				 'aria-valuetext': opts.valuetext,
				 'tabindex': '0'
				};
				elem.attr(accessDefaults);        
			};
			
			/*
			 * Init jQuery UI slider
			 */
			var initSeek = function() {
				
				// get existing classes
				var seekClass = acorn.$seek.attr('class');
								
				// create the new markup
				var	divSeek = '<div class="' + seekClass + '" title="' + text.seekTitle + '"></div>';
				acorn.$seek.after(divSeek).remove();
				
				// get the newly created DOM node
				acorn.$seek = $('.' + seekClass, acorn.$container);
				
				// create the buffer element
				var bufferBar = '<div class="ui-slider-range acorn-buffer"></div>';
				acorn.$seek.append(bufferBar);
				
				// get the buffer element DOM node
				acorn.$buffer = $('.acorn-buffer', acorn.$container);					
				
				// set up the slider options for the jQuery UI slider
				var sliderOptions = {
					value: 0,
					step: 0.03,
					orientation: 'horizontal',
					range: 'min',
					min: 0,
					max: 100
				}; 
				// init the jQuery UI slider
				acorn.$seek.slider(sliderOptions);
				
				// Setup TC hover overlay
				acorn.$seek.hover(showTCHover,hideTCHover);
                acorn.$seek.mousemove(showTCHover);
            };
			 
			var showTCHover = function(event) {
				if (!acorn.$seek.length) return;

				var hoverObj = $('.tc_hover');
				hoverObj.show();

                var offset = acorn.$seek.offset();
                var parentOffset = $('#player_container').offset();
				var percentPosition = (event.pageX-offset.left)/acorn.$seek.width();
				var newTC = timecodeForPercentPosition(percentPosition);

                hoverObj.css('left',event.pageX-offset.left - (hoverObj.width()/2));

				if ($('#hoverscrub').length) {
					var imgPath = $('#hoverscrub').attr('src');

					let frameNumber = Math.ceil(percentPosition * 100.0) - 1;
					if (frameNumber > 99) frameNumber = 99;
					if (frameNumber < 0) frameNumber = 0;

					if (document.querySelector('.tc_hover thumbnail-image')) {
						const hoverThumbnail = document.querySelector('.tc_hover .player-hoverscrub');
						const hoverTimecode = document.querySelector('.tc_hover .hover-timecode');

						hoverThumbnail.setAttribute('hover-frame', frameNumber);
						hoverTimecode.innerHTML = newTC;

					} else {
						hoverObj.html('<thumbnail-image class="player-hoverscrub" hover-src="' + imgPath + '" hover-frame="' + frameNumber + '" no-scrub="true"></thumbnail-image><div class="hover-timecode">' + newTC + '</div>');
					}
					
					hoverObj.css('top',offset.top-parentOffset.top-$('.player-hoverscrub').height()-45);

				} else {
					hoverObj.css('top',offset.top-parentOffset.top-45);
					hoverObj.html(newTC);
				}
			};

			var hideTCHover = function() {
				$('.tc_hover').hide();
			};
			 
			/*
			 * Seek slider update, after metadata is loaded
			 * Attach events, add the "duration" attribute and generate the jQuery UI Seek Slider
			 */
			var updateSeek = function() {
				try {
                    if (!acorn.$seek.length) return;

                    // Get the duration of the media
					var duration = acorn.$self[0].duration;

					// Check for the nativeSliders option
					if (options.nativeSliders) {
						acorn.$seek.attr('max', duration);
						acorn.$seek.bind('change', startSeek);

						if (window.isSessionOwner) {
							acorn.$seek.bind('mousedown', startSeek);
							acorn.$seek.bind('mouseup', endSeek);
						}

					} else {

						// set up the slider options for the jQuery UI slider
						var sliderOptions = {
							value: 0,
							step: 0.03,
							orientation: 'horizontal',
							range: 'min',
							min: 0,
							max: duration,
							slide: startSeek,
							stop: endSeek
						};
						// init the jQuery UI slider
						acorn.$seek.slider('option', sliderOptions);

						// add valuetext value to the slider options for better ARIA values
						sliderOptions.valuetext = ariaTimeFormat(sliderOptions.value);
						// accessify the slider
						initSliderAccess(acorn.$seek.find('.ui-slider-handle'), sliderOptions);

						// manully blur the Caption Button when clicking the handle
						$('.ui-slider-handle', acorn.$seek).click(blurCaptionBtn);

						// show buffering progress on progress
						acorn.$self.bind('progress', showBuffer);
					}

					// remove the loading element
					acorn.$self.next('.loading-media').remove();
				}

				catch (e) {
					// Ignore error
				}
				
			};
			
			/*
			 * Show buffering progress
			 */
			var showBuffer = function(e) {
				var max = parseInt(acorn.$self.prop('duration'), 10);
				var tr = this.buffered;
				if (tr && tr.length) {
					var buffer = parseInt(this.buffered.end(0)-this.buffered.start(0), 10);
					var bufferWidth = (buffer*100)/max;
					
					acorn.$buffer.css('width', bufferWidth + '%');
				}				
			};
			
			/*
			 * VOLUME BUTTON and SLIDER Behaviour
			 *
			 * Change volume using the Volume Slider
			 * Also update ARIA attributes and set the volume value as a localStorage item
			 */
			var changeVolume = function(e, ui) {
				// get the slider value
				setVolume(ui.value, acorn.$self.prop('muted'));

				// manually trigger the Blur event on the Caption Button
				blurCaptionBtn();
			};

			var setVolume = function(volume, muted) {
				// set the value as a localStorage item
				localStorage.setItem('acornvolume', volume);

				if (options.nativeSliders) {
					acorn.$volume.val(volume);
				} else {
					acorn.$volume.slider('value', volume);
				}

				// Check if muted
				if (muted) {
					acorn.$volumeBtn.addClass('acorn-volume-mute');
				} else {
					acorn.$volumeBtn.removeClass('acorn-volume-mute');
				}

				// set the new volume on the media
				acorn.$self.prop('volume', volume);
				acorn.$self.prop('muted', muted);

				// set the ARIA attributes
				acorn.$volume.$handle.attr("aria-valuenow", Math.round(volume*100));
				acorn.$volume.$handle.attr("aria-valuetext", Math.round(volume*100) + ' percent');

			};

			/*
			 * Mute and Unmute volume
			 * Also add classes and change label on the Volume Button
			 */
			var muteVolume = function() {					
				if (acorn.$self.prop('muted') === true) {
					acorn.$self.prop('muted', false);
					if (options.nativeSliders) {
						acorn.$volume.val(volume);
					} else {
						acorn.$volume.slider('value', volume);
					}
					
					acorn.$volumeBtn.removeClass('acorn-volume-mute');
				} else {
					acorn.$self.prop('muted', true);
					
					if (options.nativeSliders) {
						acorn.$volume.val('0');
					} else {
						acorn.$volume.slider('value', '0');
					}
					
					acorn.$volumeBtn.addClass('acorn-volume-mute');
				}
			};
			
			/*
			 * Init the Volume Button and Slider
			 *
			 * Attach events, create the jQuery UI Slider for the Volume Slider and add ARIA support
			 */
			var initVolume = function() {
				if (options.nativeSliders) {
					acorn.$volume.bind('change', function() {
						acorn.$self.prop('muted',false);
						volume = acorn.$volume.val();
						acorn.$self.prop('volume', volume);
					});
				} else {
					var volumeClass = acorn.$volume.attr('class');
				
					var	divVolume = '<div class="' + volumeClass + '" title="' + text.volumeTitle + '"></div>';
					acorn.$volume.after(divVolume).remove();
					
					acorn.$volume = $('.' + volumeClass, acorn.$container);
					
					var volumeSliderOptions = {
						value: volume,
						orientation: options.volumeSlider,
						range: "min",
						max: 1,
						min: 0,
						step: 0.1,
						animate: true,
						slide: changeVolume
					};
					
					acorn.$volume.slider(volumeSliderOptions);
					
					acorn.$volume.$handle = acorn.$volume.find('.ui-slider-handle');
					
					// change and add values to volumeSliderOptions for better values in the ARIA attributes
					volumeSliderOptions.max = 100;
					volumeSliderOptions.value = volumeSliderOptions.value * 100;
					volumeSliderOptions.valuetext = volumeSliderOptions.value + ' percent';
					initSliderAccess(acorn.$volume.$handle, volumeSliderOptions);
					
					// manully blur the Caption Button when clicking the handle
					$('.ui-slider-handle', acorn.$volume).click(blurCaptionBtn);
				}
				
				acorn.$volumeBtn.click(muteVolume);
			};

			var rewindPlayer = function() {
				rewind();
			};

			var fastForwardPlayer = function() {
				fastForward();
			};

			var skipBackPlayback = function() {
				skipBack();
			};
				/*
                 * FULLSCREEN Behaviour
                 *
                 * Resize the video while in Fullscreen Mode
                 * Attached to window.resize
                 */
			var resizeFullscreenVideo = function() {
/*				acorn.$self.attr({
					'width': $(window).width(),
					'height': $(window).height()
				});
 */
			};
			
			/* 
			 * Enter and exit Fullscreen Mode
			 * 
			 * Resizes the Width & Height of the <video> element
			 * and add classes to the controls and wrapper
			 */
			var goFullscreen = function() {
                var obj = acorn.$self[0].parentNode.parentNode;
                var failed = false;

                if (fullscreenMode) {
                    if (document.exitFullscreen) {
                        document.exitFullscreen().catch(e => { failed = true; exitFullScreenPseudo()});
					} else if (document.webkitExitFullScreen) {
                        document.webkitExitFullScreen();
					} else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    } else if (document.mozCancelFullScreen) {
                        document.mozCancelFullScreen();
                    } else if (document.msExitFullscreen) {
                        document.msExitFullscreen();
					} else {
                    	failed = true;
						exitFullScreenPseudo();
                    }

                    if (!failed) {
						fullscreenExited(false);
					}

                } else {

					if (obj.requestFullscreen) {
						obj.requestFullscreen().catch(e => { failed = true; enterFullScreenPseudo()});
					} else if (obj.webkitRequestFullScreen) {
						obj.webkitRequestFullScreen();
                    } else if (obj.webkitEnterFullScreen) {
                        obj.webkitEnterFullScreen();
                    } else if (obj.webkitRequestFullscreen) {
                        obj.webkitRequestFullscreen();
                    } else if (obj.webkitEnterFullscreen) {
                        obj.webkitEnterFullscreen();
					} else if (obj.mozRequestFullScreen) {
						obj.mozRequestFullScreen();
                    } else if (obj.msRequestFullscreen) {
                        obj.msRequestFullscreen();
                    } else {
						console.log("Faking full-screen because this browser doesn't support it.");
						failed = true;
						enterFullScreenPseudo();
					}

					if (!failed) {
						fullscreenEntered(false);
					}
                }
			};

			var enterFullScreenPseudo = function(e) {
				var obj = acorn.$self[0].parentNode.parentNode;

				$('body').css('overflow', 'hidden');
				$('#navbar, #footer').css('display', 'none');

				obj.style.maxWidth = '';
				acorn.$self[0].parentNode.style.maxWidth = '';

				acorn.$self.addClass('fullscreen-video').attr({
					width: $(window).width(),
					height: $(window).height()
				});

				$(window).resize(resizeFullscreenVideo);
				fullscreenEntered(true);
			};

			var exitFullScreenPseudo = function(e) {
				var obj = acorn.$self[0].parentNode.parentNode;

				$('body').css('overflow', 'auto');
				$('#navbar, #footer').css('display', 'block');

				$(window).unbind('resize');
				fullscreenExited(true);
			};

            var fullScreenChanged = function(e) {
                console.log('full screen change');

                if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
                	fullscreenExited(false)
                } else {
					fullscreenEntered(false);
                }
            };

            function fullscreenEntered(pseudomode) {
                var obj = acorn.$self[0].parentNode.parentNode;
                var container = $(acorn.$self[0].parentNode);

                $(obj).addClass('fullscreen-video');
                container.addClass('fullscreen-video');

                if (!pseudomode) {
                    obj.style.maxWidth = '100%'; //Math.floor(window.screen.width * window.devicePixelRatio) + 'px';
                    obj.style.maxHeight = '100%'; //Math.floor(window.screen.height * window.devicePixelRatio) + 'px';
                }

                // Accommodate portrait video
/*                if (acorn.$self.hasClass('constrained')) {
                    acorn.$self[0].style.height = $(window).height()+'px';
                } else {
                    acorn.$self[0].style.height = '100%';
                }*/

                acorn.$self[0].style.height = '100%';

                obj.style.width = '100%';
                obj.style.position = 'relative';

                if (!pseudomode) {
                    acorn.$self[0].style.maxWidth = '100%'; //Math.floor(window.screen.width * window.devicePixelRatio) + 'px';
                    acorn.$self[0].style.maxHeight = '100%'; //Math.floor(window.screen.height * window.devicePixelRatio) + 'px';
                    container[0].style.maxWidth = '100%'; //Math.floor(window.screen.width * window.devicePixelRatio) + 'px';
                    container[0].style.maxHeight = '100%'; //Math.floor(window.screen.height * window.devicePixelRatio) + 'px';
                }

//                    $('.acorn-controls').css({'position':'absolute','bottom':0,'left':0,'right':0});

				/*                    acorn.$self[0].style.marginTop = 'auto';
				 acorn.$self[0].style.marginBottom = 'auto';*/
				/*                    acorn.$self[0].style.top = 0;
				 acorn.$self[0].style.bottom = 0;*/

                // Move comments to hover sidebar
                if (!isIphone) {
                    $('#player_container').append($('#comment-tabs').hide());
					document.getElementById("player-rightbar").classList.add("fullscreen");
					document.getElementById("comment-tabs").classList.add("fullscreen");
                }

                fullscreenMode = true;
                annotationMode = false;

                acorn.$controls.addClass('fullscreen-controls');

                resizeAnnotation();
                resetFullScreenHideTimer();
                resizeFullscreenVideo();
				redrawMarkerBar();
                obj.focus();
			}

			function fullscreenExited(pseudomode) {
                var obj = acorn.$self[0].parentNode.parentNode;
                var container = $(acorn.$self[0].parentNode);

                var w = acorn.$self.attr('data-width');
                var h = acorn.$self.attr('data-height');

                // Account for portrait videos
                if (w < h && h > 960) {
                    w=960;
                    h=540;
                }

                acorn.$self.removeClass('fullscreen-video');/*.attr({
                    'width': w,
                    'height': h
                });*/

                acorn.$controls.removeClass('fullscreen-controls');
                container.removeClass('fullscreen-video');
                $(obj).removeClass('fullscreen-video');

                fullscreenMode = false;

				var comment_tabs = $("#player_container #comment-tabs");
				comment_tabs.removeClass('comment-tabs-fullscreen');

				restoreWindowedVideo();
                console.log('full screen false');
            }

            function restoreWindowedVideo() {
                console.log('restored');
                var obj = acorn.$self[0].parentNode.parentNode;

                if (obj) {
                    obj.style.maxHeight = '';
                    obj.style.width = '';
                    obj.style.height = '';
                    obj.style.paddingTop = 0;
                }

                acorn.$self[0].parentNode.style.maxHeight = '';
               acorn.$self[0].style.width = '';

				acorn.$self[0].style.maxWidth = '';
				acorn.$self[0].style.maxHeight = '';

				acorn.$self.attr({
					'width': '',
					'height': ''
				});

                recenterElements();

                cancelFullscreenHideTimer();
                $('.acorn-controls').show();
				redrawMarkerBar();

                resizeAnnotation();
                
                // Move comments back
                if (!isIphone && document.getElementById("comment-tabs") !== null) {
					$('#player-rightbar').append($('#player_container #comment-tabs').show());
					document.getElementById("player-rightbar").classList.remove("fullscreen");
					document.getElementById("comment-tabs").classList.remove("fullscreen");
				}
            }

			/* 
             * Tooltip Controls
             * 
             * Show/Hide tooltip for all buttons with title attribute
             */
            var showTooltip = function(e) {
                if ($(this).attr('title')){
                    acorn.$tooltip.html($(this).attr('title')).addClass('show-tooltip');
                }
            };
            var hideTooltip = function(e) {
                if ($(this).attr('title')){
                    acorn.$tooltip.removeClass('show-tooltip');
                }
            };
			
			/* 
			 * CAPTIONS Behaviour
			 *		
			 * Turning off the captions
			 * When selecting "None" from the Caption Selector or when the caption fails to load
			 */			
			var captionBtnActiveClass = 'acorn-caption-active';
			var captionBtnLoadingClass = 'acorn-caption-loading';
			var transcriptBtnActiveClass = 'acorn-transcript-active';
			
			var captionRadioName = 'acornCaptions' + uniqueID();
			 
			var captionOff = function() {
//				captions = [];
				acorn.$caption.html('');
				acorn.$caption.hide();
				captionsActive = false;

				acorn.$transcriptBtn.removeClass(transcriptBtnActiveClass).hide();
				acorn.$transcript.hide();
				acorn.$transcript.html('');

				acorn.$captionBtn.removeClass(captionBtnActiveClass);
			};
			
			/*
			 * Update caption based on "currentTime"
			 * Borrowed and adapted from Bruce Lawson's “Accessible HTML5 Video with JavaScripted captions”
			 * http://dev.opera.com/articles/view/accessible-html5-video-with-javascripted-captions/
			 */
			var updateCaption = function() {
				if (!captionsActive) return;

				var now = acorn.$self[0].currentTime; // how soon is now?
				var text = "";
				for (var i = 0; i < captions.length; i++) {
					if (now >= captions[i].start && now <= captions[i].end) {
						text = stripSlashes(captions[i].content); // yes? then load it into a variable called text
						break;
					}
				}
				acorn.$caption.html(text); // and put contents of text into caption div
			};
			
			/*
			 * Initialize the Caption Selector
			 * Used when multiple <track>s are present
			 */
			var initCaptionSelector = function() {

				// calculate the position relative to the parent controls element
				var setUpCaptionSelector = function() {
					var pos = acorn.$captionBtn.offset();
					var top = pos.top - acorn.$captionSelector.outerHeight(true);
					var left = pos.left - ((acorn.$captionSelector.outerWidth(true) - acorn.$captionBtn.outerWidth(true))/2);
					
					var parentPos = acorn.$controls.offset();
					
					left = left - parentPos.left;
					top = top - parentPos.top;

					acorn.$captionSelector.css({
							'top': top,
							'left': left
						});
				};
				
				acorn.$fullscreenBtn.click(setUpCaptionSelector);
				$(window).resize(function() {
					setUpCaptionSelector();		
				});
				
				setUpCaptionSelector();
				
				/*
				 * Show and hide the caption selector based on focus rather than hover.
				 * This benefits both touchscreen and AT users.
				 */
				var hideSelector; // timeout for hiding the Caption Selector				
				var showCaptionSelector = function() {
					if (hideSelector) {
						clearTimeout(hideSelector);
					}
					acorn.$captionSelector.show();
				};
				var hideCaptionSelector = function() {
					hideSelector = setTimeout(function() {
						acorn.$captionSelector.hide();						
					}, 200);
				};
				
				/* Little TEMPORARY hack to focus the caption button on click
				   This is because Webkit does not focus the button on click */
				acorn.$captionBtn.click(function() {
					$(this).focus();
				});
				
				acorn.$captionBtn.bind('focus', showCaptionSelector);
				acorn.$captionBtn.bind('blur', hideCaptionSelector);
				
				$('input[name=' + captionRadioName + ']', acorn.$container).bind('focus', showCaptionSelector);
				$('input[name=' + captionRadioName + ']', acorn.$container).bind('blur', hideCaptionSelector);
				
				/*
				 * Make the Caption Selector focusable and attach events to it
				 * If we wouldn't do this, when we'd use the scroll on the Caption Selector, it would dissapear
				 */
				acorn.$captionSelector.attr('tabindex', '-1');
				acorn.$captionSelector.bind('focus', showCaptionSelector);
				acorn.$captionSelector.bind('blur', hideCaptionSelector);
			};
			
			/*
			 * Current caption loader
			 * Loads a SRT file and uses it as captions
			 * Takes the url as a parameter
			 */
			var loadCaption = function(url) {
				// add a loading class to the Caption Button when starting to load the caption
				acorn.$captionBtn.addClass(captionBtnLoadingClass);
				// make an AJAX request to load the file
				$.ajax({
					url: url,
					success: function(data) {
						/*
						 * On success use a SRT parser on the loaded data
						 * Using JavaScript SRT parser by Silvia Pfeiffer <silvia@siliva-pfeiffer.de>
						 * parseSrt included at the end of this file
						 */
						captions = parseSrt(data);

						// show the Transcript Button
						acorn.$transcriptBtn.show();

						/*
						 * Generate the markup for the transcript
						 * Markup based on Bruce Lawson's “Accessible HTML5 Video with JavaScripted captions”
						 * http://dev.opera.com/articles/view/accessible-html5-video-with-javascripted-captions/
						 */
						var transcriptText = '';
						$(captions).each(function() {
							transcriptText += '<span data-begin="' + this.start + '" data-end=' + this.end + '>' + this.content.replace("'","") + '</span>';
						});
						// append the generated markup
						acorn.$transcript.html(transcriptText);

						// show caption
						if (captions.length > 0) {
							acorn.$caption.show();
							captionsActive = true;
						}

						// in case the media is paused and timeUpdate is not triggered, trigger it
						if (acorn.$self.prop('paused')) {
							updateCaption();
							updateTimecode(true,true);
						}

						acorn.$captionBtn.addClass(captionBtnActiveClass).removeClass(captionBtnLoadingClass);
					},
					error: function() {
						// if an error occurs while loading the caption, turn captions off
						captionOff();
						// if a console is available, log error
						if (console) {
							console.log('Error loading captions');
						}
					}
				});
			};
			
			/*			 
			 * Show or hide the Transcript based on the presence of the active class
			 */
			var showTranscript = function() {
                return;

				if ($(this).hasClass(transcriptBtnActiveClass)) {
					acorn.$transcript.hide();						
				} else {
					acorn.$transcript.show();
				}
				$(this).toggleClass(transcriptBtnActiveClass);
			};

			/*
			 * Caption loading and initialization
			 */
			var initCaption = function() {

				// get all <track> elements
				acorn.$track = $('track', acorn.$self);
				
				// if there is at least one <track> element, show the Caption Button
				if (acorn.$track.length) {
					acorn.$captionBtn.show();
				} else {
					acorn.$captionBtn.hide();
					acorn.$caption.hide();
				}
				
				// check if there is more than one <track> element
				// if there is more than one track element we'll create the Caption Selector
//				if (acorn.$track.length > 1) {
				// TEMP: Made it so that caption selector can't be triggered
				if (false) {
					// set a different "title" attribute
					acorn.$captionBtn.attr('title', text.captionsChoose);
					
					// markup for the Caption Selector
					var captionList = '<ul><li><label><input type="radio" name="' + captionRadioName + '" checked="true" />None</label>';
					acorn.$track.each(function() {
						var tracksrc = $(this).attr('src');
						captionList += '<li><label><input type="radio" name="' + captionRadioName + '" data-url="' + $(this).attr('src') + '" />' + $(this).attr('label') + '</label>';
					});
					captionList += '</ul>';
					
					// append the generated markup
					acorn.$captionSelector.html(captionList);
					
					// change selected caption
					var changeCaption = function() {
						// get the original <track> "src" attribute from the custom "data-url" attribute of the radio input
						var tracksrc = $(this).attr('data-url');
						if (tracksrc) {
							loadCaption(tracksrc);						
						} else {
							// if there's not "data-url" attribute, turn off the caption
							captionOff();
						}
					};
					
					// attach event handler
					$('input[name=' + captionRadioName + ']', acorn.$container).change(changeCaption);
				
					// initialize Caption Selector
					initCaptionSelector();
					
					// load first caption if captionsOn is true
					var firstCaption = acorn.$track.first().attr('src');
					if (options.captionsOn) {
						loadCaption(firstCaption);
						$('input[name=' + captionRadioName + ']', acorn.$container).removeAttr('checked');
						$('input[name=' + captionRadioName + ']:eq(1)', acorn.$container).attr('checked', 'true');
					}
				} else if (acorn.$track.length >= 1) { // TEMP
					// if there's only one <track> element
					// load the specific caption when activating the Caption Button
					var tracksrc = acorn.$track.attr('src');
					
					acorn.$captionBtn.on('click', function(e) {
						e.originalEvent.stopImmediatePropagation();
						e.stopImmediatePropagation();

						if ($(this).hasClass(captionBtnActiveClass)) {
							captionOff();
							options.captionsOn = false;
						} else {
							loadCaption(tracksrc);
						}

						acorn.$captionBtn.blur();
					});

					// load default caption if captionsOn is true
					if (options.captionsOn) loadCaption(tracksrc);
				}
				
				// attach event to Transcript Button
				acorn.$transcriptBtn.bind('click', showTranscript);
			};
			
			/*
			 * Initialization self-invoking function
			 * Runs other initialization functions, attaches events, removes native controls
			 */
			var init = function() {
				// attach playback handlers
				acorn.$playBtn.bind( (is_touch_device) ? 'touchstart' : 'click', playMedia);
//				if (!window.hasSession || window.isSessionOwner) acorn.$self.bind( (is_touch_device) ? 'touchstart' : 'click' , playMedia);

				acorn.$self.bind('play', startPlayback);
				acorn.$self.bind('pause', stopPlayback);
				acorn.$self.bind('ended', stopPlayback);
				
				// update the Seek Slider when timeupdate is triggered
				acorn.$self.bind('timeupdate', seekUpdate);

				// bind Rew / FF buttons
/*				acorn.$rewBtn.click(rewindPlayer);
				acorn.$ffBtn.click(fastForwardPlayer);*/
				acorn.$skipBackBtn.click(skipBackPlayback);

				// bind Fullscreen Button
				acorn.$fullscreenBtn.click(goFullscreen);
                $(document).on('webkitfullscreenchange mozfullscreenchange MSFullscreenChange fullscreenchange',fullScreenChanged);

				// bind Sync Button
				acorn.$syncBtn.click(toggleSync);

				// bind Info Button
				acorn.$infoBtn.click(showInfo);

				// bind Heatmaps button
				acorn.$heatmapBtn.click(toggleHeatmaps);

				// bind Tooltip Events
                if (options.tooltipsOn){
                    acorn.$controls.find('button').mouseover(showTooltip).mouseout(hideTooltip);
                }
				
				// initialize volume controls
				initVolume();				
				
				// set the new volume on the media
				acorn.$self.prop('volume', volume);

				acorn.$self.bind('volumechange', function(e) {
					setVolume(acorn.$self.prop('volume'),acorn.$self.prop('muted'));
				});

				// set the ARIA attributes
				acorn.$volume.$handle.attr("aria-valuenow", Math.round(volume*100));
				acorn.$volume.$handle.attr("aria-valuetext", Math.round(volume*100) + ' percent');

				// add the loading class
				$wrapper.addClass('');
				
				if (!options.nativeSliders) initSeek();

				// once the metadata has loaded
				acorn.$self.bind('loadedmetadata', function() {
					/* I use an interval to make sure the video has the right readyState
					 * to bypass a known webkit bug that causes loadedmetadata to be triggered
					 * before the duration is available
					 */

                    // Reset before getting size
                    acorn.$self.css('min-height','300px');

					/*
					 * Use HTML5 "data-" attributes to set the original Width&Height for the <video>
					 * These are used when returning from Fullscreen Mode
					 */
                    acorn.$self.attr('data-width', acorn.$self.width());
                    acorn.$self.attr('data-height', acorn.$self.width() / (acorn.$self[0].videoWidth / acorn.$self[0].videoHeight));

                    var t = window.setInterval(function() {
								if (acorn.$self[0].readyState > 0) {									
									updateSeek();
									
									clearInterval(t);
								}
							}, 500);
					
					initCaption();

					// Hide volume controls if no audio
                    if (!hasAudioTracks(acorn.$self[0])) {
                        $('.acorn-volume-box').hide();
					}
				});
			
				// trigger update seek manualy for the first time, for iOS support
				updateSeek();

				// remove the native controls
				acorn.$self.removeAttr('controls');
				
				if (acorn.$self.is('audio')) {
					/*
					 * If the media is <audio>, we're adding the 'audio-player' class to the element.
					 * This is because Opera 10.62 does not allow the <audio> element to be targeted by CSS
					 * and this can cause problems with themeing.
					 */
					acorn.$container.addClass('audio-player');
				}

				// Reload captions when caption tracks change
				acorn.$self[0].textTracks.addEventListener("addtrack", initCaption, false);
				acorn.$self[0].textTracks.addEventListener("removetrack", initCaption, false);

			}();
		
		};
		
		// iterate and reformat each matched element
		return this.each(acornPlayer);
	};
})(jQuery);

/* 
 * parseSrt function
 * JavaScript SRT parser by Silvia Pfeiffer <silvia@siliva-pfeiffer.de>
 * http://silvia-pfeiffer.de/ 
 * 
 * Tri-licensed under MPL 1.1/GPL 2.0/LGPL 2.1
 *  http://www.gnu.org/licenses/gpl.html  
 *  http://www.gnu.org/licenses/lgpl.html
 *  http://www.mozilla.org/MPL/
 *
 * The Initial Developer of the Original Code is Mozilla Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Silvia Pfeiffer <silvia@siliva-pfeiffer.de>
 *
 *
 */
function parseSrt(data) {
    var srt = data.replace(/\r+/g, ''); // remove dos newlines
    srt = srt.replace(/^\s+|\s+$/g, ''); // trim white space start and end
    srt = srt.replace(/<[a-zA-Z\/][^>]*>/g, ''); // remove all html tags for security reasons

    // get captions
    var captions = [];
    var caplist = srt.split('\n\n');
    for (var i = 0; i < caplist.length; i=i+1) {
        var caption = "";
        var content, start, end, s;
        caption = caplist[i];
        s = caption.split(/\n/);
        if (s[0].match(/^\d+$/) && s[1].match(/\d+:\d+:\d+/)) {
            // ignore caption number in s[0]
            // parse time string
            var m = s[1].match(/(\d+):(\d+):(\d+)(?:,(\d+))?\s*--?>\s*(\d+):(\d+):(\d+)(?:,(\d+))?/);
            if (m) {
                start =
                  (parseInt(m[1], 10) * 60 * 60) +
                  (parseInt(m[2], 10) * 60) +
                  (parseInt(m[3], 10)) +
                  (parseInt(m[4], 10) / 1000);
                end =
                  (parseInt(m[5], 10) * 60 * 60) +
                  (parseInt(m[6], 10) * 60) +
                  (parseInt(m[7], 10)) +
                  (parseInt(m[8], 10) / 1000);
            } else {
                // Unrecognized timestring
                continue;
            }
            // concatenate text lines to html text
            content = s.slice(2).join("<br>");
        } else {
            // file format error or comment lines
            continue;
        }
        captions.push({start: start, end: end, content: content});
    }

    return captions;
}


function hasAudioTracks(obj)
{
    // Disabled due to Safari bugs
    return true;

    if (typeof obj.hasAudio !== 'undefined') return obj.hasAudio;
    if (typeof obj.mozHasAudio !== 'undefined') return obj.mozHasAudio;
    if (typeof obj.audioDecodedByteCount !== 'undefined') return (obj.audioDecodedByteCount > 0);
    if (typeof obj.webkitAudioDecodedByteCount !== 'undefined') return (obj.webkitAudioDecodedByteCount > 0);
    if (typeof obj.audioTracks !== 'undefined' && obj.audioTracks) return (obj.audioTracks.length > 0);

    // No way to determine, so just assume it does have audio
	return true;
}

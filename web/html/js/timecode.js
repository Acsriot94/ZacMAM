function getCurrentTimecode(object)
{
	return timecodeFromSeconds(object.currentTime,24.0,0,false);
}

function getDuration(object)
{
	var duration = object.duration;
	if (isNaN(duration)) duration = 0;
	return timecodeFromSeconds(duration,24.0,0,false);
}

function timecodeFromSeconds(seconds,fps,startFrame,dropFrame)
{
	var frames = framesFromSeconds(seconds,fps,startFrame);
	return timecodeFromFrameCount(frames,fps,dropFrame);
}

function framesFromSeconds(seconds,fps,startFrame)
{
	// Sanity checks
	if (fps <= 0) fps = 30.0;
	if (startFrame < 0) startFrame = 0;

	var totalFrames = Math.floor(seconds * fps);
	totalFrames += startFrame;
	
	return totalFrames;
}

function secondsFromFrames(frames,fps,startFrame)
{
	// Sanity checks
	if (fps <= 0) fps = 30.0;
	if (startFrame < 0) startFrame = 0;

	return ((frames-startFrame) / fps);
}

function timecodeToSeconds(timecode,fps,dropFrame,startFrame)
{
	// Sanity checks
	if (fps <= 0) fps = 30.0;
	if (startFrame < 0) startFrame = 0;

	var frames = frameCountFromTimecode(timecode,fps,dropFrame,startFrame);

	var totalSeconds = parseFloat(frames) / parseFloat(fps);	
	return parseFloat(totalSeconds);
}

function frameCountFromTimecode(timecode,fps,dropFrame,startFrame)
{
	if (startFrame < 0) startFrame = 0;
	
	// Check that format is valid (drop-frame timecode is only valid for 29.97fps media)
	if (fps > 30 || fps < 29.97) dropFrame = false;
	var timebase = Math.ceil(fps);

	var componentArray = timecode.split(/[:;]+/);
	if (componentArray.length < 4) return -1;
	
	var totalFrames = 0;
	
	totalFrames += (parseInt(componentArray[0]) * timebase * 60 * 60);
	totalFrames += (parseInt(componentArray[1]) * timebase * 60);
	totalFrames += (parseInt(componentArray[2]) * timebase);
	totalFrames += parseInt(componentArray[3]);
				
	// Account for drop frame timecode
	if (dropFrame) {
		var minCount = Math.round((totalFrames / timebase) / 60.0); // How many minutes?
		var tenMinCount = Math.floor(minCount / 10.0); // How many 10 minute segments?

		totalFrames -= (2*(minCount - tenMinCount));
	}
		
	totalFrames -= startFrame;

	return totalFrames;
}

function timecodeFromFrameCount(frameCount,fps,dropFrame)
{
	// Sanity checks
	if (fps <= 0) fps = 30.0;
		
	var totalFrames = parseFloat(frameCount);
	
	var frames=0,seconds=0,minutes=0,hours=0;
	
	// Account for drop frame timecode
	if (dropFrame) {
		// Remove 2 frames from each minute, except for the 10th minutes
		// (e.g. 18 frames from each 10 minutes)
		var minCount = parseFloat(Math.floor((totalFrames / fps) / 60.0)); // How many minutes?
		var tenMinCount = parseFloat(Math.floor(minCount / 10.0)); // How many 10 minute segments?

		totalFrames += (2*(minCount - tenMinCount));
	}
	
	var totalSeconds = parseFloat(Math.floor(totalFrames / parseFloat(Math.ceil(fps))));
	    
	frames = Math.round(modulus(totalFrames,Math.ceil(fps)));
	seconds = Math.floor(totalSeconds % 60.0);
	minutes = Math.floor((totalSeconds / 60.0) % 60.0);
	hours = Math.floor(((totalSeconds / 60.0) / 60.0) % 24.0);

	var fpsLength = stringLengthForNumber(Math.ceil(fps));

	if (dropFrame) {
		return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds) + ';' + pad(frames, (fpsLength < 2 ? 2 : fpsLength));
	} else {
		return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds) + ':' + pad(frames, (fpsLength < 2 ? 2 : fpsLength));
	}
}

function timecodeFromUserString(userString, dropFrame, startTimecode)
{
	// Strip unsupported characters
	userString = userString.replace(/[^0-9:;,.]/g, "");

	// Turn . or , into 00, but only if they're at the end
	if (userString.endsWith("....")) userString = "00:00:00:00";
	if (userString.endsWith("...")) userString = userString.substr(0, userString.length - 3) + ":00:00:00";
	if (userString.endsWith("..")) userString = userString.substr(0, userString.length - 2) + ":00:00";
	if (userString.endsWith(".")) userString = userString.substr(0, userString.length - 1) + ":00";

	// Tokenize
	var tokens = userString.split(/([:;,.])/g);

	if (tokens.length === 0) return startTimecode;

	// Split up numbers longer than 2 characters if the user entered something like 01231412
	var tempString = "";
	var shouldReSplit = false;

	for (var i = 0; i < tokens.length; i++) {
		var token = tokens[i];

		if (token.length > 2 && Number.isInteger(parseInt(token))) {
			// Insert colons
			var colonCount = Math.ceil(token.length / 2);

			// Start backwards
			var tempString2 = "";
			for (var j = 0; j < colonCount; j++) {
				var subLength = 2;
				var startPos = token.length - ((j + 1) * subLength);
				if (startPos < 0) {
					startPos = 0
					subLength = 1;
				}

				tempString2 = token.substr(startPos, subLength) + (tempString2.length >= 2 ? ":":"") + tempString2;
			}

			shouldReSplit = true;

			if (tempString.length > 0 && tempString.substr(tempString.length - 1) !== ":") tempString += ":";
			tempString += tempString2;

		} else {
			tempString += token;
		}
	}

	// Split again if needed
	if (shouldReSplit) {
		tokens = tempString.split(/([\:\;\,\.])/g);
	}

	// Truncate if too long
	if (tokens.length > 7) tokens.length = 7;

	// Prepend start timecode if too short
	if (tokens.length < 7) {
		// Tokenize start timecode
		var startTokens = startTimecode.split(/([\:\;\,\.])/g);

		tokens = startTokens.slice(0, 7 - tokens.length).concat(tokens);
	}

	// Make sure numbers are two digits
	for (var i = 0; i < tokens.length; i++) {
		var token = tokens[i];

		if (token.length === 1 && Number.isInteger(parseInt(token))) {
			tokens[i] = "0" + token;
		}
	}

	// Set drop-frame correctly
	if (tokens.length < 7) {
		console.log("Unable to parse timecode");
		return startTimecode;
	}

	tokens[5] = (dropFrame ? ";":":");

	// Create string
	var timecode = tokens.join("");

	if (validateTimecode(timecode)) {
		return timecode;
	} else {
		console.log("Failed to validate timecode " + timecode);
		return startTimecode;
	}
}

function validateTimecode(timecode) 
{
	return timecode.match(/^([0-9][0-9]):([0-5][0-9]):([0-5][0-9])[:|;]([0-9][0-9])$/);
}

function pad(num, length=2)
{
	let outStr = "";

	// Get string length
	const curLength = stringLengthForNumber(num);

	for (let i = 0; i < length - curLength; i++) {
		outStr += "0";
	}

	outStr += num;

	return outStr;
}

function stringLengthForNumber(num)
{
	return num.toString().length;
}

function modulus(a, b) 
{
	var result = Math.floor( a / b );
	return parseFloat(a - ( result ) * b);
}
<?php

if (isset($_POST['path'])) {
    require_once __DIR__ . '/../include/ConfigurationParser.php';

    try {
        $parser = ConfigurationParser::parserWithContentsOfFile();
        $parser->config['ffmpeg_path'] = $_POST['path'];
        $parser->save();
    } catch (\Exception $e) {
        echo $e->getMessage() . '<br>';
    }
}

function processPage() 
{
	include_once __DIR__ . '/../../../config/config.php';

	?><h1>Check FFMPEG</h1><table><?php

	$ffmpeg_success = false;

	// Check pre-existing path
	if (!empty($_ffmpeg_path) && file_exists($_ffmpeg_path)) {
        $ffmpeg_success = true;
    }
	
	// Try to work out the path
	if (!$ffmpeg_success) {
        $ffmpeg_path = whichFile('ffmpeg');

        if (strlen($ffmpeg_path) > 0) {
			$ffmpeg_success = true;

            require_once __DIR__ . '/../include/ConfigurationParser.php';
            $parser = ConfigurationParser::parserWithContentsOfFile();

            $parser->config['ffmpeg_path'] = $ffmpeg_path;

            try {
                $parser->save();
            } catch (\Exception $e) {
                $ffmpeg_success = false;
                echo $e->getMessage() . '<br>';
            }
        }
	}		

    if ($ffmpeg_success) {
        ?><tr><td><div class="install-success"></div><td><h2>FFMPEG installed</h2><?php

    } else {
        ?><tr><td><div class="install-failed"></div><td><h2>FFMPEG is not installed</h2>
		<tr><td><td>If you have already installed it, please specify the absolute path to the "ffmpeg" tool below:
		<p><form method="post"><input type="text" name="path" value=""> <input type="submit" value="Save"></form>
		<p>Otherwise, follow these steps to install FFMPEG:<ol><?php

		if (isMac()) {
			?><li>Download and run the <a href="http://www.macports.org/" target="_blank">MacPorts</a> installer.
			<li>Launch the Terminal located in your /Applications/Utilities folder and type the following: <pre>sudo port install ffmpeg +gpl +lame +x264 +x265</pre>
			<li>Reload this page. If it still shows up as not installed, please try entering the path to the ffmpeg tool manually, which you can obtain by typing the following into the Terminal: <pre>which ffmpeg</pre>
			<?php

		} else if (isWin()) {
            ?><li>Download the <a href="https://chocolatey.org" target="_blank">Chocolatey package manager</a> by following the instructions on the website
            <li>Go to Start > Run, type <b>cmd</b> and press enter.
            <li>In the command prompt type the following: <pre>cinst ffmpeg</pre>
            <li>Reload this page. If it still shows up as not installed, please try entering the path to the ffmpeg tool manually: <pre>C:\Chocolatey\bin\ffmpeg.bat</pre>
            <?php

		} else { // Linux
            ?><li>Launch a command prompt and type the following: <pre>sudo apt-get install ffmpeg</pre>
            <li>Reload this page. If it still shows up as not installed, please try entering the path to the ffmpeg tool manually, which you can obtain by typing the following into the Terminal: <pre>which ffmpeg</pre>
            <?php
        }

        ?></ol><?php
	}

    ?></table><?php

	return $ffmpeg_success;
}

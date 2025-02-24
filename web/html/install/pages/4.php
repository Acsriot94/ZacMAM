<?php

if (isset($_POST['path'])) {
    require_once __DIR__ . '/../include/ConfigurationParser.php';
    $parser = ConfigurationParser::parserWithContentsOfFile();

    $parser->config['imagick_path'] = $_POST['path'];

    try {
        $parser->save();
    } catch (\Exception $e) {
        echo $e->getMessage() . '<br>';
    }
}

function processPage() 
{
	include_once __DIR__ . '/../../../config/config.php';

	?><h1>Check ImageMagick</h1><table><?php

	$success = false;

	// Check pre-existing path
	if (!empty($_imagick_path) && file_exists($_imagick_path)) {
        $success = true;
    }
	
	// Try to work out the path
	if (!$success) {
		$path = whichFile('convert');

		if (strlen($path) > 0) {
			$success = true;
            require_once __DIR__ . '/../include/ConfigurationParser.php';

            try {
                $parser = ConfigurationParser::parserWithContentsOfFile();
                $parser->config['imagick_path'] = $path;
                $parser->save();
            } catch (\Exception $e) {
                echo $e->getMessage() . '<br>';
            }
		}
	}		

	if ($success) {
		?><tr><td><div class="install-success"></div><td><h2>ImageMagick installed</h2><?php
	} else {
        ?><tr><td><div class="install-failed"></div><td><h2>ImageMagick is not installed</h2>
        <tr><td><td>If you have already installed it, please specify the absolute path to the "convert" tool below:';
		<p><form method="post"><input type="text" name="path" value="<?=$_imagick_path?>"> <input type="submit" value="Save"></form>
		<p>Otherwise, follow these steps to install it:<ol><?php

		if (isMac()) {
            ?><li>Download and run the <a href="http://www.macports.org/" target="_blank">MacPorts</a> installer.
			<li>Launch the Terminal located in your /Applications/Utilities folder and type the following: <pre>sudo port install ImageMagick</pre>
			<li>Reload this page. If it still shows up as not installed, please try entering the path to the convert tool manually, which you can obtain by typing the following into the Terminal: <pre>which convert</pre>
            <?php
			
		} else if (isWin()) {
            ?><li>Download and run the <a href="http://www.imagemagick.org/script/binary-releases.php#windows" target="_blank">ImageMagick</a> installer.
            <li>Reload this page. If it still shows up as not installed, please try entering the path to the convert tool manually, which you can obtain by typing the following into the Terminal: <pre>where convert</pre>
            <?php
		
		} else {
            ?>
            <li>Launch a command prompt and type the following: <pre>sudo apt-get install imagemagick</pre>
            <li>Reload this page. If it still shows up as not installed, please try entering the path to the convert tool manually, which you can obtain by typing the following into the Terminal: <pre>where convert</pre>
            <?php
        }

        ?></ol><?php
	}

    ?></table><?php

	return $success;
}

<?php

if (isset($_POST['storage_path'])) {
    require_once __DIR__ . '/../include/ConfigurationParser.php';

    try {
        $parser = ConfigurationParser::parserWithContentsOfFile();
        $parser->config['storage_path'] = $_POST['storage_path'];
        $parser->save();
    } catch (\Exception $e) {
        echo $e->getMessage() . '<br>';
    }
}

function processPage() 
{
	include_once __DIR__ . '/../../../config/config.php';

    ?><h1>Storage Path</h1><?php

    if (isDockerInstallation()) {
        ?>This does not need to be configured on Docker installations.<?php
        return true;
    }

    ?>
    <p>Set the location that will be used to store uploaded files.
    <?php
    if (isMac()) echo '<p>To specify a location on another drive, prefix the path with /Volumes, e.g. /Volumes/My Drive/My Folder.';

    echo "<p><form method=\"post\"><input name=\"storage_path\" value=\"$_storage_path\"> <input type=\"submit\" value=\"Save and Verify\"></form>";

	$success = false;

    clearstatcache();

    if (!empty($_storage_path) && file_exists($_storage_path) && is_writable($_storage_path)) {
		?><table><tr><td><div class="install-success"></div><td><h2>Storage path exists and is writable</h2></table><?php
        $success = true;
	} else {
        ?><table><tr><td><div class="install-failed"></div><td><h2>Storage path is not writable</h2></table><?php
	}
	
	return $success;
}
<?php

function processPage() 
{
    include_once __DIR__ . '/../../../config/config.php';

    // Check for previous versions
	if (!empty($_db_host) && !empty($_db_user) && !empty($_db_pass) && !empty($_db_name)) {
        try {
            $_db = @mysqli_connect($_db_host,$_db_user,$_db_pass, null, $_db_port ?? 3306);

            if ($_db) {
                @mysqli_select_db($_db,$_db_name);

                $q = @mysqli_query($_db,"SELECT version FROM kollab_version LIMIT 1");

                if (@mysqli_num_rows($q) > 0) {
                    ?><div class="install-banner">Kollaborate is already installed on this server and reinstalling it will overwrite all settings. Would you like to upgrade your existing installation instead?<p><a href="../upgrade/"><button class="actionbtn">Upgrade</button></a></div><?php
                }
            }
        } catch (\Exception $e) {
            error_log($e->getMessage());
        }
	}

	?><h1>Initial Check</h1><table><?php

    $status = true;

    // Check permissions on config directory
    if (is_writable(__DIR__ . '/../../../config/')) {
        ?><tr><td valign="top"><div class="install-success"></div><td><h2>Configuration folder is writable</h2><?php
    } else {
		?><tr><td valign="top"><div class="install-failed"></div><td><h2>Configuration folder is not writable</h2>
        <p>Please change permissions on the config folder in your Kollaborate root directory so it is writable.<?php
        $status = false;
	}

    // Check if errors are being output to the screen
	if (ini_get('display_errors') == 1) {
		?><tr><td valign="top"><div class="install-failed"></div><td><h2>Unsupported PHP configuration</h2>
		<p>Please edit your PHP configuration file at <b><?=php_ini_loaded_file()?></b> and set <b>display_errors</b> to 0.<?php
		$status = false;
	}

    if (ini_get('display_startup_errors') == 1) {
        ?><tr><td valign="top"><div class="install-failed"></div><td><h2>Unsupported PHP configuration</h2>
            <p>Please edit your PHP configuration file at <b><?=php_ini_loaded_file()?></b> and set <b>display_startup_errors</b> to 0.<?php
        $status = false;
    }

    if (ini_get('open_basedir') !== '') {
        ?><tr><td valign="top"><div class="install-failed"></div><td><h2>Unsupported PHP configuration</h2>
        <p>Please edit your PHP configuration file at <b><?=php_ini_loaded_file()?></b> and set <b>open_basedir</b> to an empty string.<?php
        $status = false;
    }

    // Write htaccess
    $htaccess_path = __DIR__.DIRECTORY_SEPARATOR.'..'.DIRECTORY_SEPARATOR.'..'.DIRECTORY_SEPARATOR.'.htaccess';

    // Check for empty .htaccess file
    if (file_exists($htaccess_path) && (filesize($htaccess_path) === 0 || filesize($htaccess_path) === false)) {
        unlink($htaccess_path);
    }

    if (!file_exists($htaccess_path)) {
        if (!copy(__DIR__.DIRECTORY_SEPARATOR.'..'.DIRECTORY_SEPARATOR.'htaccess.txt',$htaccess_path)) {
            ?><p><table><tr><td><div class="install-failed"></div><td><h2>Web root is not writable</h2>
                    <p>Please change permissions on your web root directory <b><?=$_site_root?></b> so it is writable by Apache.</table><?php
            $status = false;
        }
    }

    // Save config file
    require_once __DIR__ . '/../include/ConfigurationParser.php';

    try {
        $parser = ConfigurationParser::parserWithContentsOfFile();
        $parser->save();
    } catch (\Exception $e) {
        ?><p><table><tr><td><div class="install-failed"></div><td><h2>Failed to write configuration file</h2>
                        <p><?=$e->getMessage()?></table><?php
        $status = false;
    }

    // Check for Apache htaccess settings - disabled on Docker installations
    // TODO: Seems to occur on HTTPS connections - look into this further
    if (!isDockerInstallation()) {
        $url = 'http'.(isHTTPSRequest() ? 's':'')."://$_SERVER[HTTP_HOST]";

        $request_uri = $_SERVER['REQUEST_URI'];
        if (strlen($request_uri) > 1 && substr($request_uri,0,1) != '/') $request_uri = "/$request_uri";
        $url .= $request_uri;

        if (strlen($url) > 7 && substr($url,-7) == '?page=1') $url = substr($url,0,-7);
        if (strlen($url) > 2 && substr($url,-2) == '//') $url = substr($url,0,-1);
        if (strlen($url) > 1 && substr($url,-1) != '/') $url .= '/';
        $url .= 'htaccess_tester';

        $headers = get_headers($url);

        if ((is_array($headers) && count($headers) === 0) || strpos($headers[0],'200 OK') === false) {
            error_log("Unable to get headers from $url");
            error_log('raw headers: '.print_r($headers,true));

            ?><tr><td><div class="install-failed"></div><td><h2>Custom htaccess files need to be enabled</h2>
            <p>Please edit your Apache configuration and change <b>AllowOverride</b> from None to <b>All</b>.<?php
            $status = false;
        }
    }

    ?></table>
    
    <?php

	return $status;
}

function isHTTPSRequest() : bool
{
    if (array_key_exists('HTTP_X_FORWARDED_PROTO', $_SERVER)) {
        return (strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) == 'https');
    } else if (array_key_exists('X_FORWARDED_PROTO', $_SERVER)) {
        return (strtolower($_SERVER['X_FORWARDED_PROTO']) == 'https');
    } else if (array_key_exists('HTTPS', $_SERVER)) {
        return ($_SERVER['HTTPS'] != 'off');
    }

    return false;
}

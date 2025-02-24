<?php
/*
 * Kollaborate
 * (C) 2013-2023 Digital Rebellion LLC
 * 
 * (Kollaborate Server-only) Generate configuration files for the user to download
 */

include_once __DIR__ . '/../../config/config.php';

$php_path = PHP_BINDIR.'/php';

// Check if PHP_BINARY is defined (PHP 5.4+)
if (!file_exists($php_path) && defined('PHP_BINARY') && strlen(PHP_BINARY) > 0) $php_path = PHP_BINARY;

@session_start();

// Check if password is needed
$installer_pass = getenv('KOLLAB_INSTALLER_PASSWORD');
if ($installer_pass !== null && trim($installer_pass) !== '') {
    if (!isset($_SESSION['INSTALLER_PASS']) || $_SESSION['INSTALLER_PASS'] !== $installer_pass) {
        // Redirect to main installer
        header('Location:../install');
        exit;
    }
}

if (isset($_GET['tasks'])) {
    $node_path = whichFile('node');
    if (!$node_path) $node_path = whichFile('nodejs');

    $php_ini_path = php_ini_loaded_file();

    $file = "crontab -l > temp-crontab\n";

    $site_root_parent = dirname($_site_root ?? $_SERVER['DOCUMENT_ROOT']);

    $file .= "echo \"*/2 * * * * $php_path -c $php_ini_path $site_root_parent/utils/mail_queue.php\" >> temp-crontab\n";
    $file .= "echo \"*/3 * * * * $php_path -c $php_ini_path $site_root_parent/utils/webhook_process.php\" >> temp-crontab\n";
    $file .= "echo \"@reboot $node_path $site_root_parent/websocket/socket_server.js\" >> temp-crontab\n";
    $file .= "echo \"0 0 * * * $php_path -c $php_ini_path $site_root_parent/utils/daily.php\" >> temp-crontab\n";
    $file .= "echo \"*/10 * * * * $php_path -c $php_ini_path $site_root_parent/utils/permanent_delete.php\" >> temp-crontab\n";

    $file .= "crontab temp-crontab\n";
    $file .= "rm temp-crontab\n";

    serve_data($file,'task-setup.sh');
    exit;
}

function serve_data($data, $title, $contenttype = 'application/octet-stream') {

    // Avoid sending unexpected errors to the client - we should be serving a file,
    // we don't want to corrupt the data we send
    @error_reporting(0);

    session_write_close();

    // Get the data range requested (if any)
    $filesize = strlen($data);

    // Send standard headers
    header("Content-Type: $contenttype");
    header("Content-Length: $filesize");
    header('Content-Disposition: attachment; filename="'.$title.'"');
    header('Accept-Ranges: bytes');

    // if requested, send extra headers and part of file...
    echo $data;

    // Exit here to avoid accidentally sending extra content on the end of the file
    exit;
}

function whichFile($cmd,$ext=NULL) {
    $folders = array('/bin','/opt/local/bin','usr/bin','/usr/local/bin',"C:\\Windows\\System32","C:\\Program Files\\nodejs","C:\\Program Files (x86)\\nodejs");
    if ($ext) {
        $cmd .= ".$ext";
    } else if (isWin()) {
        $cmd .= '.exe';
    }

    foreach ($folders as $folder) {
        if (file_exists($folder.DIRECTORY_SEPARATOR.$cmd)) return $folder.DIRECTORY_SEPARATOR.$cmd;
    }

    return NULL;
}

function isWin() {
    return stripos(php_uname(), 'win') !== false && stripos(php_uname(), 'darwin') === false && stripos(php_uname(), 'linux') === false;
}
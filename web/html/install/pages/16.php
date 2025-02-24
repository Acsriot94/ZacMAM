<?php

function processPage()
{
    ?><h1>Final Checks</h1><?php

    include_once __DIR__ . '/../../../config/config.php';

    $success = true;

    // Set umask to 0 to make permissions work properly
    $old_umask = umask(0);

    // Create upload folder
    if (!empty($_storage_path) && !file_exists($_storage_path.DIRECTORY_SEPARATOR.'uploads')) {
        // Set umask to 0 to make permissions work properly
        $old_umask = umask(0);

        if (!mkdir($_storage_path.DIRECTORY_SEPARATOR.'uploads',0777,true)) {
            echo("<p>Unable to create directory $_storage_path".DIRECTORY_SEPARATOR."uploads. Please create this directory manually and give it read and write permissions for the Apache user.");
            $success = false;
        }

        umask($old_umask);
    }

    // Create users folder
    if (!empty($_storage_path) && !file_exists($_storage_path.DIRECTORY_SEPARATOR.'users')) {
        // Set umask to 0 to make permissions work properly
        $old_umask = umask(0);

        if (!mkdir($_storage_path.DIRECTORY_SEPARATOR.'users',0777,true)) {
            echo("<p>Unable to create directory $_storage_path".DIRECTORY_SEPARATOR."users. Please create this directory manually and give it read and write permissions for the Apache user.");
            $success = false;
        }

        umask($old_umask);
    }

    // Create projects folder
    if (!empty($_storage_path) && !file_exists($_storage_path.DIRECTORY_SEPARATOR.'projects')) {
        // Set umask to 0 to make permissions work properly
        $old_umask = umask(0);

        if (!mkdir($_storage_path.DIRECTORY_SEPARATOR.'projects',0777,true)) {
            echo("<p>Unable to create directory $_storage_path".DIRECTORY_SEPARATOR."projects. Please create this directory manually and give it read and write permissions for the Apache user.");
            $success = false;
        }

        umask($old_umask);
    }
    
    // Create avatars folder
    if (!empty($_storage_path) && !file_exists($_storage_path.DIRECTORY_SEPARATOR.'avatars')) {
        // Set umask to 0 to make permissions work properly
        $old_umask = umask(0);

        if (!mkdir($_storage_path.DIRECTORY_SEPARATOR.'avatars',0777,true)) {
            echo("<p>Unable to create directory $_storage_path
            ".DIRECTORY_SEPARATOR.'avatars. Please create this directory manually and give it read and write permissions for the Apache user.');
            $success = false;
        }

        umask($old_umask);
    }

    // Create custom folder
    $custom_path = normalizePath((($_site_root ?? '').DIRECTORY_SEPARATOR.'..'.DIRECTORY_SEPARATOR.'custom'));

    if (!empty($_site_root) && !file_exists($custom_path)) {
        // Set umask to 0 to make permissions work properly
        $old_umask = umask(0);

        if (!mkdir($custom_path,0777,true)) {
            echo("<p>Unable to create directory $custom_path. Please create this directory manually and give it read and write permissions for the Apache user.");
            $success = false;
        }

        umask($old_umask);
    }

    // Check post size
    if (return_bytes(ini_get('post_max_size')) > 0 && return_bytes(ini_get('post_max_size')) < 2*1024*1024*1024) {
        ?><p><table><tr><td><img src="../img/Error.svg" /><td><b>post_max_size</b> is smaller than 2 GB. Please modify your php.ini file to set this to a higher value.</table><?php
        $success = false;
    }

    // Check max upload size
    if (return_bytes(ini_get('upload_max_filesize')) > 0 && return_bytes(ini_get('upload_max_filesize')) < 2*1024*1024*1024) {
        ?><p><table><tr><td><img src="../img/Error.svg" /><td><b>upload_max_filesize</b> is smaller than 2 GB. Please modify your php.ini file to set this to a higher value.</table><?php
        $success = false;
    }

    if ($success) {
        // Connect to db server
        if (!empty($_db_host) && !empty($_db_user) && !empty($_db_pass) && !empty($_db_name)) {

            $_db = mysqli_connect($_db_host, $_db_user, $_db_pass, null, $_db_port ?? 3306);
            if (!$_db) {
                echo '<p>No connection with MySQL server. Please make sure your MySQL username and password is correct in config.php.<br>';
                exit;
            }

            if (mysqli_select_db($_db,$_db_name)) {

                // Get admin details
                $q = mysqli_query($_db,"SELECT user_id FROM kollab_users LIMIT 1");

                if (mysqli_num_rows($q) == 0) {
                    echo '<p>Error: no admin account could be found. Please go back and try setting it up again.';
                    return false;
                }

                ?><table><tr><td><div class="install-success"></div><td><h2>Kollaborate Server successfully installed</h2></table>
                <p>Login to the admin area to set up users and change additional settings including custom colors and site features.
                <p>Click Finish to continue.</p>
        <?php
            } else {
                echo '<p>Unable to select database. Please double-check your database setup.';
                $success = false;
            }
        } else {
            echo '<p>Could not locate database configuration. Please run the installer again.';
            $success = false;
        }
    } else {
        ?><table><tr><td><div class="install-failed"></div><td><h2>Problems found</h2></table>
        <p>Please fix the above errors and then refresh the page to finish installation.
        <?php
    }

    umask($old_umask);

    return $success;
}

function return_bytes($val): int
{
    $val = trim($val);
    $last = strtolower($val[strlen($val)-1]);

    if (!is_numeric($val)) $val = substr($val,0,-1);

    switch($last) {
        case 'g':
            $val *= 1024*1024*1024;
            break;
        case 'm':
            $val *= 1024*1024;
            break;
        case 'k':
            $val *= 1024;
            break;
    }

    return $val;
}

function normalizePath(string $path) : string
{
    $path = str_replace(['/', '\\'], '/', $path);
    $parts = array_filter(explode('/', $path), 'strlen');

    $absolutes = [];

    foreach ($parts as $part) {
        if ($part === '.') continue;

        if ($part === '..') {
            array_pop($absolutes);
        } else {
            $absolutes[] = $part;
        }
    }

    $output = implode('/', $absolutes);

    if (str_starts_with($path, '/')) {
        if (!str_starts_with($output, '/')) {
            $output = '/' . $output;
        }
    }

    return $output;
}
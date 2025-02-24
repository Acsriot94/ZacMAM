<?php

if (isset($_POST['db_host'])) {
    require_once __DIR__ . '/../include/ConfigurationParser.php';

    try {
        $parser = ConfigurationParser::parserWithContentsOfFile();
        $parser->config['db_host'] = $_POST['db_host'];
        $parser->config['db_user'] = $_POST['db_user'];
        $parser->config['db_pass'] = $_POST['db_pass'];
        $parser->config['db_port'] = $_POST['db_port'];
        $parser->config['db_name'] = $_POST['db_name'];
        $parser->save();
    } catch (\Exception $e) {
        echo $e->getMessage() . '<br>';
    }
}

function processPage()
{
	include_once __DIR__ . '/../../../config/config.php';

	?><h1>Database Setup</h1>
    <p>Specify the MySQL or MariaDB database user and password. This database will store projects, users, comments and other data.
    <form method="post">
    <table>
    <tr><td>Host: <td><input type="text" name="db_host" value="<?=$_db_host?>">
    <tr><td>Username: <td><input type="text" name="db_user" value="<?=$_db_user?>">
    <tr><td>Password: <td><input type="password" name="db_pass" value="<?=$_db_pass?>">
    <tr><td>Port: <td><input type="text" name="db_port" value="<?=$_db_port ?? 3306?>">
    <tr><td>Database Name: <td><input type="text" name="db_name" value="<?=$_db_name?>">
    <tr><td><td><input type="submit" value="Save">
    </table>
    </form>

    <p>On many systems the default MySQL username is <b>root</b> and the default password is blank. However this is highly insecure, so we recommend changing the password to something more secure and ideally renaming the root account entirely. This can be done in a database tool like <a href="https://www.phpmyadmin.net">phpMyAdmin</a>.
    <?php
	$success = false;

    try {
        $link = @mysqli_connect($_db_host, $_db_user, $_db_pass, null, $_db_port ?? 3306);
    } catch (\Exception $e) {
        error_log($e->getMessage());
    }

    if (!mysqli_connect_errno()) {
        // Get MySQL version
        preg_match_all('/\d+(?:\.\d+)+/',mysqli_get_server_info($link),$version_numbers);

        $is_mariadb = (stripos(mysqli_get_server_info($link), 'MariaDB') !== false);

        if (count($version_numbers) > 0 && count($version_numbers[0]) > 0) {
            $version_num = $version_numbers[0][0];

            if ($is_mariadb && count($version_numbers[0]) > 1) $version_num = $version_numbers[0][1];

            $version = explode('.', $version_num);

            if ($is_mariadb) {
                if ($version[0] > 10) {
                    $mysqli_version_match = true;
                } else if ($version[0] == 10 && $version[1] >= 4) {
                    $mysqli_version_match = true;
                } else {
                    $mysqli_version_match = false;
                }

            } else {
                if ($version[0] > 8) {
                    $mysqli_version_match = true;
                } else if ($version[0] == 8 && $version[1] >= 0) {
                    $mysqli_version_match = true;
                } else {
                    $mysqli_version_match = false;
                }
            }
        } else {
            $mysqli_version_match = false;
        }

        ?><table><tr><td><div class="install-success"></div><td><h2>Successfully connected to database</h2><?php

        if (!$mysqli_version_match) {
            ?><tr><td><div class="install-failed"></div><td><h2>MySQL 8.0+ / MariaDB 10.4+ is not installed</h2>
            <p>Detected version: <?=implode('.',$version_numbers)?> (<?=mysqli_get_server_info($link)?>)
            <p>Download the latest version of MySQL <a href="https://dev.mysql.com/downloads/mysql/">here</a>.<?php
        }

        // Check SQL mode
        $q = mysqli_query($link, 'SELECT @@sql_mode;');
        $result = mysqli_fetch_assoc($q);
        $sql_mode = (count($result) > 0 ? $result[0]:'');

        if (strpos($sql_mode, 'STRICT_TRANS_TABLES') !== false || strpos($sql_mode, 'STRICT_ALL_TABLES') !== false) {
            ?><tr><td><div class="install-failed"></div><td><h2>Your SQL mode setting is too strict</h2>
            <p>Detected version: <?=implode('.',$version_numbers)?>
            <p>Please modify your my.cnf MySQL configuration file to remove the <b>STRICT_TRANS_TABLES</b> and <b>STRICT_ALL_TABLES</b> options from the SQL mode.<?php
        }


        ?></table><?php
        $success = true;
    } else {
        ?><table><tr><td><div class="install-failed"></div><td><h2>Failed to connect to database</h2><p><p>Please make sure your username and password is correct.</p></table><?php
    }

	return $success;
}
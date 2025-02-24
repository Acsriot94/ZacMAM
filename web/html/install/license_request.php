<?php
/*
 * Kollaborate
 * (C) 2013-2023 Digital Rebellion LLC
 * 
 * (Kollaborate Server-only) Page to manually request license file
 */

include_once __DIR__ . '/../../config/config.php';

// Create server block
$server_block = ioncube_server_data(); // @phan-suppress-current-line PhanUndeclaredFunction

$errors = '';

if (isset($_POST['autolicense'])) {
    //open connection
    $ch = curl_init();

    $params = array(
        'username' => $_POST['email'],
        'password' => $_POST['pass'],
        'license_data' => $server_block,
    );

    //set the url, number of POST vars, POST data
    curl_setopt($ch,CURLOPT_URL, 'https://www.kollaborate.tv/api/0/server/licenses/create');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch,CURLOPT_POST, count($params));
    curl_setopt($ch,CURLOPT_POSTFIELDS,http_build_query($params));
    curl_setopt($ch, CURLOPT_VERBOSE, 1);
//    curl_setopt($ch, CURLOPT_SSLVERSION, 3);

    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

    //execute post
    $result = json_decode(curl_exec($ch),true);

    //close connection
    curl_close($ch);

    if (isset($result['id'])) { // Download the license
        serve_data($result['data']);

    } else if (isset($result['error'])) {
        $errors = $result['error'];
    } else {
        $errors = 'Unknown error';
    }
}

function serve_data($data) {
    // Avoid sending unexpected errors to the client - we should be serving a file,
    // we don't want to corrupt the data we send
    @error_reporting(0);

    session_write_close();

    // Get the data range requested (if any)
    $filesize = strlen($data);

    // Send standard headers
    header("Content-Type: application/octet-stream");
    header("Content-Length: $filesize");
    header('Content-Disposition: attachment; filename="kollab_server.lnc"');

    echo $data;

    // Exit here to avoid accidentally sending extra content on the end of the file
    exit;
}

// Show UI
?>
<!DOCTYPE html>
<html>
    <head>
        <title>License Request - Kollaborate Server</title>
        <meta http-equiv='content-type' content='text/html; charset=utf-8' />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel='stylesheet' href='../dist/style.css' type='text/css' media='all' />
        <link rel='stylesheet' href='../css/style-mobile.css' type='text/css' media='all and (max-device-width: 480px)' />
        <script src="../js/third_party/jquery-1.9.1.js" type="text/javascript"></script>
        <script src="../js/third_party/jquery-ui-1.10.1.custom.js" type="text/javascript"></script>
        <link href="../css/smoothness/jquery-ui-1.10.1.custom.css" rel="stylesheet">
        <script src="../js/third_party/jquery.tabSlideOut.v1.3.js" type="text/javascript"></script>
        <script src="../js/core.js" type="text/javascript"></script>
    </head>
<body>

<div id="wrapper">
    <div id="header"><img style="max-width:50%" src="../img/Kollab_logo.png" /></a></div>
    <div id="pagewrapper">
    <div id="page">
    <div id="content">

<?=($errors != '' ? "<div style=\"padding:10px;background-color:#ccc;border:thin solid #bbb\">$errors</div>":'')?>

<h1>License Request</h1>
Type your kollaborate.tv login information below and then click Create License.
<form method="post" action="license_request.php">
    <table>
        <tr><td>Email<td><input type="text" name="email" style="width:400px">
        <tr><td>Password<td><input type="password" name="pass" style="width:400px">
    </table>
    <input type="hidden" name="autolicense">
    <input type="submit" value="Create License">
</form>
<p>If the license request was successful, you'll be asked to download <b>kollab_server.lnc</b>. This file should be placed in your <b><?=dirname($_site_root)?></b> directory.

</div>
</div>
</div>
</div>
</body>
</html>
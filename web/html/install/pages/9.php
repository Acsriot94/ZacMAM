<?php
include_once __DIR__ . '/../../../config/config.php';

// Create server block
$server_block = NULL;
if (function_exists('ioncube_server_data')) $server_block = ioncube_server_data(); // @phan-suppress-current-line PhanUndeclaredFunction

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

/*    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);*/

    if (isset($_POST['proxy'])) {
        curl_setopt($ch,CURLOPT_PROXY,$_POST['proxy']);

        if (isset($_POST['proxy_user'],$_POST['proxy_pass'])) {
            curl_setopt($ch, CURLOPT_PROXYUSERPWD, "$_POST[proxy_user]:$_POST[proxy_pass]");
        }
    }

    //execute post
    $result = json_decode(curl_exec($ch),true);

    //close connection
    curl_close($ch);

    if (isset($result['id'])) {
        // Try to install the license automatically
        $data = $result['data'];

        if (strlen($data) > 0) {
            // Get root parent
            $parent_dir = dirname($_site_root);

            if (strlen($parent_dir) > 0 && file_exists($parent_dir)) {
                error_log('Writing to parent folder '.$parent_dir);

                $full_path = $parent_dir . DIRECTORY_SEPARATOR . 'kollab_server.lnc';

                // Delete existing file
                if (file_exists($full_path)) {
                    unlink($full_path);
                }

                // Write data to license file
                if (file_put_contents($full_path, $data) > 0) {
                    header('Location: '.$_SERVER['REQUEST_URI']);
                    exit;
                }
            }

            // Allow the user to download the file
            serve_data($data);
        } else {
            $_SESSION['errors'] = 'No data received from server';
        }

    } else if (isset($result['error'])) {
        $_SESSION['errors'] = $result['error'];
    } else {
        $_SESSION['errors'] = 'Network error. Please check your PHP log for more information about this problem.';
        error_log('Network error');
        error_log(print_r($result,true));
    }
}

function processPage()
{
    global $_site_root,$server_block;

    $proxy_url = (isset($_POST['proxy']) ? $_POST['proxy']:'');
    $proxy_user = (isset($_POST['proxy_user']) ? $_POST['proxy_user']:'');

    ?><h1>License Kollaborate Server</h1><?php

    $success = false;

    if (licenseExists()) {
        ?><table><tr><td><div class="install-success"></div><td><h2>License is installed</h2></table>
        <p><a href="#" onclick="$('#license').toggle();">Re-license this server</a>
        <?php
        $success = true;
    }

    if (!$success && $server_block == NULL) {
        ?><div class="install-failed"></div><h2>Error</h2><p>Unable to generate server information. Is the Ioncube Loader installed correctly?<?php
    } else {
        ?><div id="license"<?= ($success ? ' style="display:none"' : '') ?>>
            <?= (isset($_SESSION['errors']) ? "<div class=\"error-alert\">$_SESSION[errors]</div>" : '') ?>

            <h2>Request a License</h2>

        <div id="tabs">
            <form method="post">
                <ul>
                    <li><a href="#tabs-1">Login</a></li>
                    <li><a href="#tabs-2">Proxy Settings</a></li>
                </ul>

                <div id="tabs-1">
                    Type your kollaborate.tv login information below and then click Create License.
                        <table>
                            <tr>
                                <td>Email
                                <td><input type="text" name="email" style="width:400px">

                            <tr>
                                <td>Password
                                <td><input type="password" name="pass" style="width:400px">

                        </table>
                        <input type="submit" name="autolicense" value="Create License">
                </div>

                <div id="tabs-2">
                        <table>
                            <tr>
                                <td>HTTP Proxy URL
                                <td><input type="text" name="proxy" value="<?=$proxy_url?>" placeholder="(Optional)" style="width:400px"/>
                            <tr>
                                <td>Proxy Username
                                <td><input type="text" name="proxy_user" value="<?=$proxy_user?>" placeholder="(Optional)" style="width:400px"/>
                            <tr>
                                <td>Proxy Password
                                <td><input type="text" name="proxy_pass" value="" placeholder="(Optional)" style="width:400px"/>
                        </table>
                </div>
            </form>
        </div>

            <h2>License Installation</h2>
            <ol>
                <li>If the license request was successful, you may be asked to download <b>kollab_server.lnc</b>. This
                    file should be placed in your <b><?=(isDockerInstallation() ? 'KollaborateServer/web' : dirname($_site_root)) ?></b> directory.
                <li>Refresh this page
            </ol>
        </div>

        <script>
            $( function() {
                $( "#tabs" ).tabs();
            } );
        </script>
        <?php
    }

    unset($_SESSION['errors']);

	return $success;
}

function licenseExists() {
    // Loop backwards from current root to root
    $path = __DIR__;

    while (true) {
        $license_path = $path.DIRECTORY_SEPARATOR.'kollab_server.lnc';

        if (file_exists($license_path)) {
            error_log('License found at '.$license_path);
            return true;
        }

        if (dirname($path) == $path) break;

        $path = dirname($path);
    }

    return false;
}

function serve_data($data) {
    // Avoid sending unexpected errors to the client - we should be serving a file,
    // we don't want to corrupt the data we send
    @error_reporting(0);

    @session_write_close();

    // Get the data range requested (if any)
    $filesize = strlen($data);

    // Send standard headers
    header("Content-Type: application/octet-stream");
    header("Content-Length: $filesize");
    header('Content-Disposition: attachment; filename="kollab_server.lnc"');
    header('Accept-Ranges: bytes');

    echo $data;

    // Exit here to avoid accidentally sending extra content on the end of the file
    exit;
}

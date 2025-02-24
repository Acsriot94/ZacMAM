<?php
/*
 * Kollaborate
 * (C) 2013-2023 Digital Rebellion LLC
 * 
 * (Kollaborate Server-only) Page to show installer to user
 */

use Twig\Extra\String\StringExtension;

require_once __DIR__ . '/../../vendor/autoload.php';

$page_count = 16;
$page = 1;
if (isset($_GET['page'])) $page = (int)$_GET['page'];

@session_start();

// Ask for password if setup in environment
$installer_pass = getenv('KOLLAB_INSTALLER_PASSWORD');
if ($installer_pass !== null && trim($installer_pass) !== '') {
    if (!isset($_SESSION['INSTALLER_PASS']) || $_SESSION['INSTALLER_PASS'] !== $installer_pass) {
        if (isset($_POST['installer_pass']) && $_POST['installer_pass'] === $installer_pass) {
            $_SESSION['INSTALLER_PASS'] = $installer_pass;
        } else {
            renderPageHeader('Password Required - Install Kollaborate Server');
            ?><h1>Installer Password Required</h1>
            <div id="content">
                <p>Please enter the installer password to continue.
                <p><?=(isDockerInstallation() ? 'You can locate the password in your config.env file.':'You can locate the password in the KOLLAB_INSTALLER_PASSWORD environment variable.')?>
                    <form method="post">
                    <p><input type="password" name="installer_pass" placeholder="Installer password" autofocus />
                    <p><input type="submit" value="Continue" />
                </form>
            </div>
            <?php
            exit;
        }
    }
}

if (!file_exists("pages/$page.php")) {
	echo '<h1>Error: Page not found</h1>
	<a href="index.php?page='.($page+1).'"><button>Next Page</button</a>';
	exit;
}

// Setup default configuration
if (!file_exists('../../config/config.php')) {
	require_once __DIR__ . '/include/ConfigurationParser.php';

    $parser = ConfigurationParser::parserWithDefaultConfiguration();
    if (isMac()) $parser->config['db_host'] = '127.0.0.1';

    try {
        $parser->save();
    } catch (\Exception $e) {
        error_log($e->getMessage());
    }
}

if (!file_exists('../../config/config.php')) {
	echo '<h1>Error</h1>';
	echo '<p>Unable to create default configuration. Please make sure that the <b>config</b> folder inside your Kollaborate installation is writable and then reload the page.';
	exit;
}

// Embed subpage
require("pages/$page.php");

// Add UI
renderPageHeader("Install Kollaborate Server - $page of $page_count");
?>
<span style="float:right">Step <?=$page?> of <?=$page_count?></span>
<div id="content">

<?php
if ($page == 1) {
    // Check if running on localhost / 127.0.0.1
    if ($_SERVER['HTTP_HOST'] == 'localhost' || $_SERVER['HTTP_HOST'] == '127.0.0.1') {
        ?><div class="error-alert">It looks like you're accessing the installer over the localhost URL. Please change the URL in the address bar to use the server's private or public IP address or domain name.</div><?php
    }

    if (isset($_SESSION['installer_last_page']) && $_SESSION['installer_last_page'] > 1 && $_SESSION['installer_last_page'] < $page_count) {
		?><div class="install-banner">It looks like the last installation didn't finish. Would you like to resume where you left off? <a href="index.php?page=<?=$_SESSION['installer_last_page']?>"><button class="actionbtn">Resume</button></a></div><?php
	}
}

?><div id="error" class="error-alert" style="display:none"></div><?php

$success = processPage();

?></div><div style="width:100%;max-width:800px;position:fixed;bottom:0;padding:10px 5px;background-color:var(--page-bg-color);"><?php

if ($success) {
    if ($page == $page_count) {
    	echo '<div style="float:right"><a href="../projects"><button class="actionbtn">Finish</button></a></div>';
    } else {
        echo '<div style="float:right"><a href="Javascript:nextPage();"><button class="actionbtn">Continue &gt;</button></a></div>';
    }
} else {
    if ($page == $page_count) {
        echo '<div style="float:right"><a href="/admin"><button disabled class="actionbtn" id="cont-btn">Finish</button></a><p><check-box id="install-continue" onclick="toggleContinue(this)" small="small" text="Ignore this error"></check-box></div>';
    } else {
        echo '<div style="float:right"><a href="index.php?page='.($page+1).'"><button disabled id="cont-btn">Continue &gt;</button></a><p><check-box id="install-continue" onclick="toggleContinue(this)" small="small" text="Ignore this error"></check-box></div>';
    }
}

if ($page > 1) {
	echo '<div style="float:left"><a href="index.php?page='.($page-1).'"><button>&lt; Back</button></a></div>';
}

if ($page < $page_count) {
	$_SESSION['installer_last_page'] = $page;
} else {
	unset($_SESSION['installer_last_page']);
}
?>
</div>

<script>
function nextPage()
{
    if (typeof endPage == 'function') {
        var err = endPage();
		if (err && err.length > 0) {
            $('#error').html(err);
            $('#error').show();
            return;
        }
    }

    $('#error').hide();
	window.location.href = "index.php?page=<?=($page+1)?>";
}
</script>
<?php
renderPageFooter();

function nextPage() : void
{
    global $page;

    header('Location:index.php?page=' . ($page+1));
    exit;
}

function isMac() : bool
{
	return (stripos(php_uname(), 'darwin') !== false);
}

function isWin() : bool
{
	return stripos(php_uname(), 'win') && !isMac() && !isLinux();
}

function isLinux() : bool
{
	return (stripos(php_uname(), 'linux') !== false || stripos(php_uname(), 'unix') !== false);
}

function is64Bit() : bool
{
    return (stripos(php_uname(), 'x86_64') !== false);
}

function whichFile($cmd,$ext=NULL) : ?string
{
    $folders = array('/bin','/opt/local/bin','/usr/bin','/usr/local/bin',"C:\\Windows\\System32","C:\\Program Files\\nodejs","C:\\Program Files (x86)\\nodejs");
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

function isDockerInstallation() : bool
{
    return (file_exists('/kollabserver/docker'));
}

function renderPageHeader(string $page_title='Install Kollaborate Server') : void
{
    $loader = new \Twig\Loader\FilesystemLoader(__DIR__ . '/../../templates');
    $twig_params = ['auto_reload' => true];
    if (getenv('kollab_twig_cache_path')) $twig_params['cache'] = getenv('kollab_twig_cache_path');

    $twig = new \Twig\Environment($loader, $twig_params);

    $twig->addExtension(new StringExtension());

    echo $twig->render('pages/install/header.twig', ['title' => $page_title]);
}

function renderPageFooter() : void
{
    $loader = new \Twig\Loader\FilesystemLoader(__DIR__ . '/../../templates');
    $twig_params = ['auto_reload' => true];
    if (getenv('kollab_twig_cache_path')) $twig_params['cache'] = getenv('kollab_twig_cache_path');

    $twig = new \Twig\Environment($loader, $twig_params);

    $twig->addExtension(new StringExtension());

    echo $twig->render('pages/install/footer.twig', []);
}

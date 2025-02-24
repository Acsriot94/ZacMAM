<?php

function processPage() 
{
	?><h1>Check Apache and PHP versions</h1><table><?php

    if (function_exists('apache_get_version')) {
        preg_match('/\d+(?:\.\d+)+/',apache_get_version(),$version_numbers);

        error_log('Apache version: '.implode('.',$version_numbers));

        if (count($version_numbers) > 0) {
            $version = explode('.',$version_numbers[0]);

            if ($version[0] >= 2) {
                $apache_version_match = true;
            } else {
                $apache_version_match = false;
            }
        } else {
            $apache_version_match = false;
        }

        if ($apache_version_match) {
            ?><tr><td><div class="install-success"></div><td><h2>Apache 2.0+ installed</h2><?php
        } else {
            ?><tr><td style="vertical-align:top"><div class="install-failed"></div><td><h2>Apache 2.0+ is not installed</h2>
                <p>Detected version: <?=implode('.',$version_numbers)?>
                <p>Download the latest version of Apache <a href="http://httpd.apache.org/">here</a>. If using MAMP, upgrade to a later version <a href="http://www.mamp.info">here</a>.
                <p>If you have already installed Apache 2.0 or higher, add the following line to your httpd.conf file, restart Apache and refresh the page:<pre>ServerTokens Full</pre><?php
        }
    } else {
        $apache_version_match = true;
    }

    $php_version = explode('.', phpversion());

    $php_version_match = false;
    if ($php_version[0] > 8) {
        $php_version_match = true;
    } else if ($php_version[0] == 8 && $php_version[1] >= 1) {
        $php_version_match = true;
    }

    $php_major_minor_version = "$php_version[0].$php_version[1]";

	if ($php_version_match) {
        ?><tr><td><div class="install-success"></div><td><h2>PHP 8.1 installed</h2><?php
	} else {
        ?><tr><td style="vertical-align:top"><div class="install-failed"></div><td><h2>PHP 8.1 is not installed</h2>
            <p>Detected version: <?=phpversion()?>
		    <p>Download the latest version of PHP <a href="https://php.net/downloads.php">here</a>.<?php
	}

    ?></table><?php

	$module_match = true;

    if (function_exists('apache_get_modules')) {
        ?><h2>Extensions</h2>
        <table>
        <?php

        $modules = apache_get_modules();

        if (in_array('mod_rewrite',$modules)) {
            ?><tr><td style="vertical-align:top"><div class="install-success"></div><td>Apache module mod_rewrite<?php
        } else {
            ?><tr><td style="vertical-align:top"><div class="install-failed"></div><td>Apache module mod_rewrite
                <p>On Ubuntu you may need to type <pre>sudo a2enmod rewrite</pre>. Otherwise perform these steps:

                <p><ol>
                    <li>Open your httpd.conf file in a text editor
                    <li>Add the line <pre>LoadModule rewrite_module modules/<?=(isWin() ? 'mod_rewrite.dll':'mod_rewrite.so')?></pre>
                    <li>Restart Apache
                </ol>
                <?php

            $module_match = false;
        }

        if (in_array('mod_headers',$modules)) {
            ?><tr><td style="vertical-align:top"><div class="install-success"></div><td>Apache module mod_headers<?php
        } else {
            ?><tr><td style="vertical-align:top"><div class="install-failed"></div><td>Apache module mod_headers
                <p>On Ubuntu you may need to type <pre>sudo a2enmod headers</pre>. Otherwise perform these steps:

                <p><ol>
                    <li>Open your httpd.conf file in a text editor
                    <li>Add the line <pre>LoadModule rewrite_module modules/<?=(isWin() ? 'mod_rewrite.dll':'mod_rewrite.so')?></pre>
                    <li>Restart Apache
                </ol>
            <?php

            $module_match = false;
        }

        if (extension_loaded('gd')) {
            ?><tr><td style="vertical-align:top"><div class="install-success"></div><td>PHP gd extension<?php
        } else {
            ?><tr><td style="vertical-align:top"><div class="install-failed"></div><td>PHP gd extension
                <p>PHP should ship with gd in most instances, however on Linux you may need to type the following to install it:
                    <br><pre>apt-get install php<?=$php_major_minor_version?>-gd</pre>
                    <br><pre>sudo phpenmod gd</pre>
                <?php
            $module_match = false;
        }

        if (extension_loaded('curl')) {
            ?><tr><td style="vertical-align:top"><div class="install-success"></div><td>PHP curl extension<?php
        } else {
            ?><tr><td style="vertical-align:top"><div class="install-failed"></div><td>PHP curl extension
                <p><ol>
                    <li>Open <b><?=php_ini_loaded_file()?></b> in a text editor
                    <li>Add or uncomment the line <pre><?=(isWin() ? 'extension=php_curl.dll':'extension=php_curl.so')?></pre>
                    <li>Restart Apache
                </ol>
            <?php if (isMac()) {
                ?><p>You may first need to install curl:
                <ol>
                    <li>Download MacPorts
                    <li>Type <pre>sudo port install php<?=$php_major_minor_version?>-curl</pre></pre>
                    <li>Restart Apache
                </ol>
            <?php } else if (isLinux()) {
                ?><p>You may first need to install curl:
                <ol>
                    <li>Type <pre>sudo apt-get install php<?=$php_major_minor_version?>-curl</pre></pre>
                    <li>Type <pre>sudo phpenmod curl</pre>
                    <li>Restart Apache
                </ol>
            <?php } ?>
            <?php

            $module_match = false;
        }

        if (extension_loaded('json')) {
            ?><tr><td style="vertical-align:top"><div class="install-success"></div><td>PHP JSON extension<?php
        } else {
            ?><tr><td style="vertical-align:top"><div class="install-failed"></div><td>PHP JSON extension
                <p><ol>
                    <li>Open <b><?=php_ini_loaded_file()?></b> in a text editor
                    <li>Add or uncomment the line <pre><?=(isWin() ? 'extension=php_json.dll':'extension=php_json.so')?></pre>
                    <li>Restart Apache
                </ol>
                <?php if (isMac()) {
                    ?><p>You may first need to install JSON:
                    <ol>
                        <li>Download MacPorts
                        <li>Type <pre>sudo port install php<?=$php_major_minor_version?>-json</pre></pre>
                        <li>Restart Apache
                    </ol>
                <?php } else if (isLinux()) {
                    ?><p>You may first need to install JSON:
                    <ol>
                        <li>Type <pre>sudo apt-get install php<?=$php_major_minor_version?>-json</pre></pre>
                        <li>Type <pre>sudo phpenmod json</pre>
                        <li>Restart Apache
                    </ol>
                <?php } ?>
            <?php

            $module_match = false;
        }

        if (extension_loaded('xml')) {
            ?><tr><td style="vertical-align:top"><div class="install-success"></div><td>PHP XML extension<?php
        } else {
            ?><tr><td style="vertical-align:top"><div class="install-failed"></div><td>PHP XML extension
            <p><ol>
                <li>Open <b><?=php_ini_loaded_file()?></b> in a text editor
                <li>Add or uncomment the line <pre><?=(isWin() ? 'extension=php_xml.dll':'extension=php_xml.so')?></pre>
                <li>Restart Apache
            </ol>
            <?php if (isMac()) {
                ?><p>You may first need to install XML:
                <ol>
                    <li>Download MacPorts
                    <li>Type <pre>sudo port install php<?=$php_major_minor_version?>-xml</pre>
                    <li>Restart Apache
                </ol>
            <?php } else if (isLinux()) {
                ?><p>You may first need to install XML:
                <ol>
                    <li>Type <pre>sudo apt-get install php<?=$php_major_minor_version?>-xml</pre>
                    <li>Type <pre>sudo phpenmod xml</pre>
                    <li>Restart Apache
                </ol>
            <?php } ?>
            <?php

            $module_match = false;
        }

        ?></table><?php
    }

	return ($apache_version_match && $php_version_match && $module_match);
}

<?php

function processPage()
{
    include_once __DIR__ . '/../../../config/config.php';

	?><h1>Check Node.js</h1><?php

    if (isDockerInstallation()) {
        ?>This does not need to be configured on Docker installations.<?php
        return true;
    }

    ?><table><?php

    $node_success = false;
    $npm_success = false;

    // Try to work out the path
    if (!$node_success) {
        $node_path = whichFile('node');
        if (!$node_path) $node_path = whichFile('nodejs');

        if (isWin()) {
            $npm_path = whichFile('npm', 'cmd');
        } else {
            $npm_path = whichFile('npm');
        }

        if (strlen($node_path) > 0) {
            $node_success = true;
        }

        if (strlen($npm_path) > 0) {
            $npm_success = true;
        }
    }

    if ($node_success && $npm_success) {
        ?>
        <tr>
            <td>
                <div class="install-success"></div>
            <td><h2>Node.js and NPM installed</h2><?php
    } else {
        ?>
        <tr>
            <td>
                <div class="install-failed"></div>
            <td><h2>Node.js and NPM are not installed</h2>
        <tr>
            <td>
            <td>Follow these steps to install Node.js:
                <ol>
                    <li>Visit <a href="http://nodejs.org">nodejs.org</a> and click the install button on the
                        homepage to install the most suitable version for your operating system
                    <li>Run the installer to install Node.js
                    <li>Refresh this page
                </ol><?php
    }

    ?></table><?php

    return ($node_success && $npm_success);
}

<?php

function processPage()
{
	include_once __DIR__ . '/../../../config/config.php';

    ?><h1>Setup Scheduled Tasks</h1><?php

    if (isDockerInstallation()) {
        ?>This does not need to be configured on Docker installations.<?php
        return true;
    }

        ?><table><tr><td><td>The installer cannot automatically determine if the scheduled tasks are set up on this platform. If you have not installed them, perform the following steps:
        <ol>
            <li>Download the <a href="filegen.php?tasks">task-setup.sh</a> script to your home directory
            <li>In a command-line window, type <pre>chmod +x task-setup.sh</pre>
            <li>Run the script by typing <pre>./task-setup.sh</pre>
            <li>When you have run all scripts on this page, click Continue below</pre>
        </ol>
    </table>
    <p>Note: you may need to reboot the server for the tasks to start running.
    <?php

    // Always return true because we can't know if it was installed correctly
	return true;
}
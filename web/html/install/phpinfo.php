<?php
/*
 * Kollaborate
 * (C) 2013-2023 Digital Rebellion LLC
 * 
 * (Kollaborate Server-only) Page to show PHP info to user
 * Note that this can open up your server to exploitation. 
 * The install folder should be deleted after setup has finished.
 */

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

phpInfo();
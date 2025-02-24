<?php
/**
 * Kollaborate
 * (C) 2013-2023 Digital Rebellion LLC
 * 
 * (Kollaborate Server-only) Script to handle events sent by the ionCube loader
 */

//@phan-file-suppress PhanUndeclaredConstant

function ioncube_event_handler($err_code, $params) {
    include_once __DIR__ . '/../config/config.php';

    switch ($err_code) {
		case ION_CORRUPT_FILE:
			echo 'Your Kollaborate installation may be corrupt. Please re-download from <a href="https://www.kollaborate.tv/server">https://www.kollaborate.tv/server</a>.<p>Error: ION_CORRUPT_FILE';
			break;

		case ION_EXPIRED_FILE:
			echo 'Your Kollaborate installation has expired. Please download a newer version from <a href="https://www.kollaborate.tv/server">https://www.kollaborate.tv/server</a>.<p>Error: ION_EXPIRED_FILE';
			break;

		case ION_NO_PERMISSIONS:
			echo "Your server is not authorized to run Kollaborate Server. Please <a href=\"$_url/install/\" target=\"_blank\">run the installer</a> to install a license.<p>Error: ION_NO_PERMISSIONS";
			break;

		case ION_CLOCK_SKEW:
			echo 'Your system clock is invalid. Please set the clock to the correct time and then refresh this page.<p>Error: ION_CLOCK_SKEW';
			break;

		case ION_LICENSE_NOT_FOUND:
			echo "License not found. Please <a href=\"$_url/install/\" target=\"_blank\">run the installer</a> to install a license.<p>Error: ION_LICENSE_NOT_FOUND";
			break;

		case ION_LICENSE_CORRUPT:
			echo "Your license is corrupt. Please <a href=\"$_url/install/\" target=\"_blank\">run the installer</a> to install a license.<p>Error: ION_LICENSE_CORRUPT";
			break;

		case ION_LICENSE_EXPIRED:
			echo "Your license has expired. Please <a href=\"$_url/install/\" target=\"_blank\">run the installer</a> to install a new license.<p>Error: ION_LICENSE_EXPIRED";
			break;

		case ION_LICENSE_PROPERTY_INVALID:
			echo "Your license is invalid. Please <a href=\"$_url/install/\" target=\"_blank\">run the installer</a> to install a license.";
			break;

		case ION_LICENSE_HEADER_INVALID:
			echo "Your license is corrupt and may have been altered. Please <a href=\"$_url/install/\" target=\"_blank\">run the installer</a> to install a license.<p>Error: ION_LICENSE_HEADER_INVALID";
			break;

		case ION_LICENSE_SERVER_INVALID:
			echo "Your license is not authorized for this server. Please <a href=\"$_url/install/\" target=\"_blank\">run the installer</a> to install a license.<p>Error: ION_LICENSE_SERVER_INVALID";
			break;

		case ION_UNAUTH_INCLUDING_FILE:
			echo 'Your Kollaborate installation may be corrupt. Please re-download from <a href="https://www.kollaborate.tv/server">https://www.kollaborate.tv/server</a>.<p>Error: ION_UNAUTH_INCLUDING_FILE';
			break;

		case ION_UNAUTH_INCLUDED_FILE:
			echo 'Your Kollaborate installation may be corrupt. Please re-download from <a href="https://www.kollaborate.tv/server">https://www.kollaborate.tv/server</a>.<p>Error: ION_UNAUTH_INCLUDED_FILE';
			break;

		case ION_UNAUTH_APPEND_PREPEND_FILE:
			echo 'Error: you must disable the "auto-append-file" and "auto-prepend-file" options in your php.ini file in order to run Kollaborate Server.<p>Error: ION_UNAUTH_APPEND_PREPEND_FILE';
			break;
			
		default:
			echo 'Unknown error. Please report this to <a href="https://www.digitalrebellion.com/contact" target="_blank">Digital Rebellion support</a>.';
			break;
	}		
}

<?php
// Database login information
$_db_host = 'database';
$_db_user = 'kollaborate'; // Change this to a user with lower privileges
$_db_pass = 'Ufsvyy24E91OfnzknfnJ'; // Change this to a secure password
$_db_port = 3306;
$_db_name = 'kollaborate';

$_title   = 'Kollaborate';
$_url     = 'http://1.2.3.4'; // This is the full URL to the Kollaborate installation
$_company = 'Company';
$_email   = 'name@example.com'; // The email address that system-generated emails will originate from

/* Site root - The location of Kollaborate relative to the web server's root directory
This allows Kollaborate to locate its files even if you've installed it to a subfolder
Example value: $_SERVER['DOCUMENT_ROOT'].'/kollaborate'
Default value: $_SERVER['DOCUMENT_ROOT']
*/
$_site_root = $_SERVER['DOCUMENT_ROOT'];

// Storage location - put this outside of the web root
$_storage_path = '/kollabserver/storage';

/* Tool paths
ImageMagick - default on Linux is '/usr/bin/convert', Mac is '/opt/local/bin/convert'
FFMPEG - default on Mac is '/opt/local/bin/ffmpeg'
*/
$_imagick_path = '/usr/bin/convert';
$_ffmpeg_path = '/usr/bin/ffmpeg';

/* Websocket settings */
$_websocket_port = 8000; // Backend port
$_websocket_use_web_ports = true; // Only if routing through proxy
$_ssl_cert = ''; // Path to .pem certificate file - only if not routing websockets through proxy
$_ssl_private_key = ''; // Path to .key file - only if not routing websockets through proxy
$_ssl_certificate_authority = ''; // Path to .pem intermediate certificate - only if not routing websockets through proxy

// EULA version - increase this to force users to agree to a new EULA
$_eula_version = 1;

/* Other options */
$_disable_not_optimized_banners = false; // Disable "movie not optimized" banners
$_disable_user_project_creation = false; // Prevent non-admins from creating projects

/* Email Routing - route emails through Digital Rebellion servers to ensure they won't end up in spam inboxes.
Requires an Email Routing subscription available from http:/www.kollaborate.tv/server
*/
$_use_email_routing = false;
$_email_routing_access_key = ''; // Your access key on http:/www.kollaborate.tv/server
$_email_routing_user_key = ''; // Your user key on http:/www.kollaborate.tv/server

/* Encoding */
$_encoding_max_duration = 180; // Max duration in minutes
$_trash_max_days = 30; // Max days before trashing deleted files / projects
$_hide_private_files = false; // Hide My Private Files section

/* Web Hooks */
$_webhook_url = '';
$_webhook_key = '';


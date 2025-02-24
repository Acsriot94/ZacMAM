<?php

function processPage()
{
    require_once __DIR__ . '/../../../config/config.php';

    ?><h1>Setting Up Databases...</h1><?php

    $success = true;

    // Connect to db server
    $_db = mysqli_connect($_db_host, $_db_user, $_db_pass, null, $_db_port ?? 3306);
    
    if (!$_db) {
        echo 'No connection with MySQL server. Please make sure your MySQL username and password is correct in config.php.';
        return false;
    }

    try {
        if (@mysqli_select_db($_db, $_db_name ?? '')) {
            // Check installation doesn't already exist
            try {
                $q = @mysqli_query($_db, "SELECT version FROM kollab_version LIMIT 1");

                if (@mysqli_num_rows($q) > 0 && !isset($_GET['override'])) {
                    $next_page = $_GET['page']+1;

                    ?><h2>Warning</h2>
                    If you continue with this step, all projects, users, comments and data will be deleted.
                    <p><a href="index.php?page=<?=$next_page?>"><button>Skip this step</button></a> <a href="<?=$_SERVER['REQUEST_URI']?>&override"><button class="actionbtn">Continue and erase data</button></a>
                    <?php
                    return false;
                }
            } catch (\Exception $e) {
                error_log($e->getMessage());
            }

            // Erase existing database
            mysqli_query($_db, "DROP DATABASE `$_db_name`");
        }
    } catch (\Exception $e) {
        error_log($e->getMessage());
    }
    
	// Create database
	if (!mysqli_query($_db, "CREATE DATABASE IF NOT EXISTS `$_db_name`")) {
		echo 'Unable to create database: '.mysqli_error($_db);
		return false;
	}

    mysqli_select_db($_db ?? '',$_db_name ?? '');

    // Create tables
    require_once __DIR__ . '/../../include/connect.php';
    require_once __DIR__ . '/../../include/DB/TableStructure/Schema.php';
    require_once __DIR__ . '/../../include/db_schema.php';

    // Update db global var to point to correct instance
    global $db;
    $db = new \Kollab\DB\DatabaseConnection();
    $db->connect($_db_host ?? '', $_db_user ?? '', $_db_pass ?? '', $_db_name ?? '', $_db_port ?? 3306);

    $schema = getDBSchema();
    $schema->createTables(true);

    // Create encryption keys if they don't exist
    if (!file_exists(realpath(__DIR__ . '/../../../config/keys.php'))) {
        require_once __DIR__ . '/../../include/Operations/Admin/CreateKeysOperation.php';

        try {
            $op = new \Kollab\Operations\Admin\CreateKeysOperation();
            $op->execute();
        } catch (\Exception $e) {
            echo $e->getMessage();
            exit;
        }
    }

    // Add current version
    require_once __DIR__ . '/../../include/version.php';
    if (!mysqli_query($_db, "INSERT INTO kollab_version SET version='$_current_version', version_string='$_current_version_string', date=".time())) {
        echo 'kollab_version insert: '.mysqli_error($_db).'<br>';
    }

    if (!mysqli_query($_db, "INSERT INTO `kollab_apps` (`app_id`, `title`, `unique_id`, `client_secret`, `max_revisions`, `private_storage`, `public_storage`)
    VALUES
    (1,'Preference Manager','Otb2vsEE5X3Eul7rsUoL','ASjbuWXnVKTkov5oPbWMgjN5ipDy7LiS75rPzZrG','10',1,0),
        (2,'App Preferences','Lh2S75kdXpjWU8Pg44Ib','F9G0GJt08LWJbEHx9jJjDCWEGCOjzQyM34q4z1mY','10',1,0),
        (3,'Post Haste','rtVqgTAKqd9MNckecciz','lCUnXOjjwydDNJwRvvMzeEdl8KIEqq77mGdlMUAE','10',1,1),
        (4,'Cut Notes','gpH4goVmd4miw9Jl6z4k','FUHi98Db6GZOGYyF3TqcscseMOKvZQgyyEhzyejc','10',1,1),
        (5,'Kollaborate Transfer','YHBugzEKjm1JMlUxcC4r','pjUJt8K5Y25Y9FrvAlB6KY8MjP9923R5xi3u4CsD',-1,0,1),
	    (6,'Adobe Premiere Pro Plugin','V592fGGybN7iv3XyBbHM',NULL,-1,0,1),
	    (7,'Final Cut Pro X Plugin','MANOq6ciWji5kYIT9vNs',NULL,-1,0,1),
	    (8,'Kollaborate Folder Watcher','uCmpk88BTkRHNau8uyNT','dZG7ViyLR4GU0j0rKS8zHJdi8mOvJNFynYlhde7H',-1,0,1),
	    (9,'Kollaborate Cloud Encoder','DGDh77O7sCnsQHAPusq5',NULL,-1,0,1),
        (10,'CinePlay for Mac','S0sDFAz4gm7PgX3BtvYl','EFJBaHMVNsYKfZQx9LJvWJRI4tndMfD4A4jE07OZ',-1,0,0),
        (11,'Kollaborate Plugin Hub','KoQNYwYDFKfJu98s45S0','jJgXobecudjs9g6pm0gyitA6GLQl1B9KIiZdkw0m',-1,0,0),
        (12,'CinePlay for iOS','DbIvRuQ3SIQegGT9g62Y','Op9C7mkw6TpO7AauiQ3vi2vENceZmEXRaresb7uO',-1,0,0),
        (13,'CinePlay for Apple TV','AujEhvvCdkYA1JNMC3mX','sEwdKA9kRpiSqtZmUYpg89U8BWsA2z5JCZ7pQtDZ',-1,0,0)
        ")) {
        echo 'kollab_apps insert: '.mysqli_error($_db).'<br>';
    }

    // Link types
    // To allow inserting with ID of 0
    mysqli_query($_db, "SET SESSION sql_mode='NO_AUTO_VALUE_ON_ZERO'");

    if (!mysqli_query($_db, "INSERT INTO `kollab_link_types` (`link_type_id`, `title`, `opposite_id`)
    VALUES
    (0,'Unspecified',0),
        (1,'Higher quality version',2),
        (2,'Lower quality version',1),
        (3,'Alternate version',3),
        (4,'Alternate language version',4),
        (5,'With text',6),
        (6,'Without text',5),
        (7,'With music',8),
        (8,'Without music',7),
        (9,'Stereo mix',10),
        (10,'Surround mix',9),
        (11,'Temp audio',12),
        (12,'Final audio',11),
        (13,'Clocked',14),
        (14,'Not clocked',13),
        (15,'Project file',-1),
        (16,'Edit Decision List',-1),
        (17,'Color Decision List',-1),
        (18,'LUT',-1),
        (19,'Notes',-1),
        (20,'Frame Grab',-1),
        (21,'Script',-1),
        (22,'Music',-1),
        (23,'Voiceover',-1),
        (24,'Interchange Data',-1),
        (25,'Subtitles',-1);")) {
        echo 'kollab_link_types insert: '.mysqli_error($_db).'<br>';
    }

    if (!mysqli_query($_db, "INSERT INTO `kollab_permission_roles` (
            `permission_role_id`, 
            `title`, 
            `project_id`, 
            `admin`, 
            `can_upload`, 
            `can_access`, 
            `can_delete`, 
            `can_approve`, 
            `can_download`, 
            `can_share`,
            `view_all_comments`,
            `can_modify_others_files`,
            `can_modify_others_comments`)
            VALUES
                (1,'Admin',-1,1,1,1,1,1,1,1,1,1,1),
                (2,'Manager',-1,0,1,1,1,1,1,1,1,1,1),
                (3,'Uploader',-1,0,1,1,1,0,1,0,1,0,0),
                (4,'Viewer',-1,0,0,1,0,1,1,0,1,0,0)")) {
        echo 'kollab_permission_roles - unable to insert values: '.mysqli_error($_db).'<br>';
    }

    // Departments
    if (!mysqli_query($_db, "INSERT INTO `kollab_departments` (`department_id`, `name`, `project_id`)
    VALUES
	(1,'Camera',-1),
	(2,'Sound',-1),
	(3,'Post Production',-1),
	(4,'Visual Effects',-1),
	(5,'Producing',-1),
	(6,'Directing',-1),
	(7,'Grip / Electric',-1),
	(8,'Art Department',-1),
	(9,'Makeup / Costume',-1),
	(10,'Writing',-1),
	(11,'Special Effects',-1),
	(12,'Casting',-1),
	(13,'Clients',-1),
	(-1,'(No Department)',-1),
	(14,'Agency',-1),
	(15,'Graphics',-1),
	(16,'Animation',-1),
    (17,'Vendor',-1),
	(18,'Dailies',-1)
	")) {
        echo 'kollab_departments insert: '.mysqli_error($_db).'<br>';
    }

    if (!mysqli_query($_db, "INSERT INTO `kollab_encoding_profiles` (
            `name`, 
            `file_type_id`, 
            `settings`)
            VALUES
                ('Default Video Encoding Profile', 1, '{\"codec\": \"h264\",\"max_frame_width\": 1280,\"min_bitrate\": 2000,\"avg_bitrate\": 2500,\"max_bitrate\": 3300,\"speed\": \"fast\",\"codec_settings\": {\"profile\": \"baseline\",\"level\": \"3.1\"},\"audio\": {\"codec\": \"aac\",\"avg_bitrate\": 128,\"speed\": \"medium\",\"codec_settings\": [],\"mixdown\": 0,\"sample_rate\": 44100}}'),
                ('Default Audio Encoding Profile', 2, '{\"codec\": \"mp3\",\"avg_bitrate\": 196,\"speed\": \"medium\",\"codec_settings\": [],\"mixdown\": 0,\"sample_rate\": 44100}')
                ")) {
        echo 'kollab_encoding_profiles - unable to insert values: '.mysqli_error($_db).'<br>';
    }

    require_once __DIR__ . '/../../include/Util/WorkflowUtils.php';
    \Kollab\Util\WorkflowUtils::addSiteDefaultFileWorkflows();
    \Kollab\Util\WorkflowUtils::addSiteDefaultUploadWorkflows();

    ?><table><tr><td><div class="install-success"></div><td><h2>Completed</h2></table><?php

    return $success;
}
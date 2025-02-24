<?php
use Kollab\Objects\Users\User;

require_once __DIR__ . '/../../include/Objects/Users/User.php';

$email = '';

if (isset($_POST['submit'])) {
    include_once __DIR__ . '/../../../config/config.php';
    require_once __DIR__ . '/../../include/password_utils.php';

    // Connect to db server
    $_db = mysqli_connect($_db_host, $_db_user, $_db_pass, null, $_db_port ?? 3306);
    if (!$_db) {
        echo 'No connection with MySQL server. Please make sure your MySQL or MariaDB username and password is correct in config.php.<br>';
        exit;
    }

    $first_name = mysqli_real_escape_string($_db,$_POST['first_name']);
    $last_name = (isset($_POST['last_name']) ? mysqli_real_escape_string($_db,$_POST['last_name']):'');
    $email = mysqli_real_escape_string($_db,$_POST['email']);
    $pass1 = mysqli_real_escape_string($_db,$_POST['pass1']);
    $pass2 = mysqli_real_escape_string($_db,$_POST['pass2']);

    $errs_found = false;

    if (strlen($first_name) == 0) {
        echo 'Error: You must specify a first name.<br>';
        $errs_found = true;
    }

    if (strlen($email) == 0) {
        echo 'Error: You must specify an email address.<br>';
        $errs_found = true;
    }

    if (strlen($pass1) == 0) {
        echo 'Error: You must specify a password.<br>';
        $errs_found = true;
    }

    if (strlen($pass2) == 0) {
        echo 'Error: You must specify a password confirmation.<br>';
        $errs_found = true;
    }

    if ($pass1 != $pass2) {
        echo 'Error: Passwords must match.<br>';
        $errs_found = true;
    }

    if ($errs_found) exit;

    if (mysqli_select_db($_db,$_db_name)) {
        // Check that there is only 1 super admin for security reasons
        $q = mysqli_query($_db,"SELECT * FROM kollab_users WHERE u_type=1 LIMIT 1");

        if (mysqli_num_rows($q) > 0) {
            echo 'Unable to create account. A super admin already exists.';
            exit;
        }

        $user_obj = new User(-1);
        $user_obj->first_name = $first_name;
        $user_obj->last_name = $last_name;
        $user_obj->email = $email;
        $user_obj->u_type = 1;

        try {
            $user_obj->save();
            $user_obj->changePassword($pass1);

        } catch (\Exception $e) {
            echo 'Failed to create user account: ' . $e->getMessage();
            exit;
        }

    } else {
        echo 'Unable to select database. Please make sure your database configuration is correct.<br>';
        exit;
    }

    exit;
}

function processPage() 
{
	include_once __DIR__ . '/../../../config/config.php';

	?><h1>Create Super Admin Account</h1>
    <p>Create a user account to administrate the site.
    <form method="post" id="frmsettings">
    <table>
        <tr><td>First name: <td><input type="text" name="first_name" autofocus required>
        <tr><td>Last name: <td><input type="text" name="last_name">
        <tr><td>Email address: <td><input type="text" name="email" required>
        <tr><td>Password: <td><input type="password" name="pass1" required>
        <tr><td>Confirm Password: <td><input type="password" name="pass2" required>
    </table>
    <input type="hidden" name="submit">
    </form>
    <script>
    function endPage()
	{
        var returnVal = "Unknown error";

		$.ajax({
		type:"POST",
		url:"<?=$_SERVER['REQUEST_URI']?>",
		data:$("#frmsettings").serialize(),
		async:false
        }).done(function(data) {
            if (data.length > 0) {
                returnVal = data;
            } else {
            	returnVal = null;
            }
            
        }).fail(function(text) {
            returnVal = text;
        });

        return returnVal;
	}
	</script>

    <?php
	return true;
}
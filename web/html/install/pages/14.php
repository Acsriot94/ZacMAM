<?php

if (isset($_POST['submit'])) {
    require_once __DIR__ . '/../include/ConfigurationParser.php';

    try {
        $parser = ConfigurationParser::parserWithContentsOfFile();

        $parser->config['email_smtp_host'] = $_POST['email_smtp_host'] ?? '';
        $parser->config['email_smtp_use_auth'] = (isset($_POST['email_smtp_use_auth']) && $_POST['email_smtp_use_auth'] == 'on');
        $parser->config['email_smtp_user'] = $_POST['email_smtp_user'] ?? '';
        $parser->config['email_smtp_password'] = $_POST['email_smtp_password'] ?? '';
        $parser->config['email_smtp_encryption_type'] = $_POST['email_smtp_encryption_type'] ?? '';
        $parser->config['email_smtp_port'] = $_POST['email_smtp_port'] ?? 0;

        $parser->save();
    } catch (\Exception $e) {
        echo $e->getMessage() . '<br>';
    }
    exit;
}


function processPage() 
{
    include_once __DIR__ . '/../../../config/config.php';

    ?><h1>Email Sending (optional)</h1>
    <p>Enter your email provider's SMTP authorization information below. This is optional but Kollaborate will not be able to send emails until this is complete. You can skip it and add these details later from the Configure page of the Admin Area.
    <p>You can get an SMTP server linked to your site's domain with Google Workspaces, Amazon SES and a variety of other corporate mail providers.
    <p>Note: Gmail users may need to set up an App Password for Kollaborate in their Google account if they have two-factor authentication switched on.

    <form method="post" id="frmSMTP">
    <table>
        <tr><td>SMTP Host<td><input type="text" name="email_smtp_host" value="<?= $_email_smtp_host ?? '' ?>"/>
        <tr><td>Use Authentication<td><check-box id="email_smtp_use_auth" name="email_smtp_use_auth"<?=(($_email_smtp_use_auth ?? true) == true ? ' checked="checked"':'')?> text="(select if server needs an email and password - this is recommended)"></check-box>
        <tr><td>Username<td><input type="text" name="email_smtp_user" value="<?= $_email_smtp_user ?? '' ?>"/> (this is normally the email address of the sending account)
        <tr><td>Password<td><input type="password" name="email_smtp_password" value="<?= $_email_smtp_password ?? '' ?>"/>
        <tr><td>Encryption Type<td><select name="email_smtp_encryption_type">
                    <option value="">None</option>
                    <option value="ssl"<?= (strtolower($_email_smtp_encryption_type ?? 'ssl') === 'ssl' ? ' selected="selected"':'') ?>>SSL</option>
                    <option value="tls"<?= (strtolower($_email_smtp_encryption_type ?? 'ssl') === 'tls' ? ' selected="selected"':'') ?>>TLS</option>
                </select>
        <tr><td>Port<td><input type="number" name="email_smtp_port" value="<?= $_email_smtp_port ?? 0 ?>"/> (0 = default port for encryption type)
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
                data:$("#frmSMTP").serialize(),
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


<?php

if (isset($_POST['submit'])) {
    require_once __DIR__ . '/../include/ConfigurationParser.php';

    if (strlen($_POST['url']) == 0)
        echo 'Error: You must specify a URL.<br>';

    if (strlen($_POST['email']) == 0)
        echo 'Error: You must specify an email.<br>';

    // Check URL - Disabled for performance reasons
/*    $url_headers = @get_headers($_POST['url']);
    if ($url_headers[0] == 'HTTP/1.1 404 Not Found') {
        echo 'Error: Could not resolve URL. Make sure the URL is correct.<br>';
    }
*/
    try {
        $parser = ConfigurationParser::parserWithContentsOfFile();
        $parser->config['url'] = $_POST['url'];
        $parser->config['email'] = $_POST['email'];
        $parser->save();
    } catch (\Exception $e) {
        echo $e->getMessage() . '<br>';
    }
    exit;
}

function processPage() 
{
	include_once __DIR__ . '/../../../config/config.php';

	?><h1>Site Settings</h1>
    <form method="post" id="frmsettings">
    <table>
    <tr><td>URL: <td><input type="text" name="url" value="<?=$_url?>"><td>The absolute URL to be visited by users (e.g. http://www.mysite.com/kollaborate).
    <tr><td>Email address: <td><input type="text" name="email" value="<?=$_email?>"><td>The From address to use for site-generated emails.
    <input type="hidden" name="submit">
    </table>
    </form>
    <script>
    function endPage()
	{
        var returnVal = null;

		$.ajax({
		type:"POST",
		url:"<?=$_SERVER['REQUEST_URI']?>",
		data:$("#frmsettings").serialize(),
		async:false
        }).success(function(data) {
            if (data.length > 0) {
                returnVal = data;
            }
        });

        return returnVal;
	}
	</script>

    <?php
	return true;
}


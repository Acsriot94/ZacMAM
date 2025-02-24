<?php

include_once __DIR__ . '/../../../config/config.php';

// Connect to db server
$_db = mysqli_connect($_db_host, $_db_user, $_db_pass, $_db_name, $_db_port ?? 3306);
if (!$_db) {
    echo 'No connection with MySQL or MariaDB server. Please make sure your MySQL username and password is correct in config.php.<br>';
    exit;
}

if (isset($_POST['submit'])) {
    $urls = $_POST['url'] ?? [];
    $passwords = $_POST['password'] ?? [];
    $uuids = $_POST['uuid'] ?? [];

    mysqli_query($_db,'DELETE FROM kollab_servers WHERE type=0');

    for ($i=0; $i < count($urls); $i++) {
        $url = mysqli_real_escape_string($_db,$urls[$i]);
        $password = mysqli_real_escape_string($_db,$passwords[$i]);
        $uuid = mysqli_real_escape_string($_db,$uuids[$i]);

        mysqli_query($_db, "INSERT INTO kollab_servers SET url='$url', password='$password', uuid='$uuid', type=0");
    }

    exit;
}

function processPage() 
{
    global $_db;

    ?><h1>Encoding Servers (optional)</h1>
    <p>Specify a list of Kollaborate Encoder installations for server-side video, audio and image encoding. You must have encoder licenses linked to your account and you may need to reinstall your Kollaborate Server license in order for the installer to detect them.
    <form method="post" id="frmsettings">
    <input type="hidden" name="submit" value="1">
    <table id="server_table" style="width:100%">
        <th>Server IP and port<th>Password<th>UUID<th>Actions
        <?php
        $q = mysqli_query($_db,'SELECT server_id,url,password,uuid FROM kollab_servers WHERE type=0');

        while ($server = mysqli_fetch_assoc($q)) {
        ?><tr><td><b><?=$server['url']?></b><input type="hidden" name="server_id[]" value="<?=$server['server_id']?>"/>
                    <input type="hidden" name="url[]" value="<?=$server['url']?>"/>
                <td><?=(isset($server['password']) ? $server['password']:'')?><input type="hidden" name="password[]" value="<?=(isset($server['password']) ? $server['password']:'')?>"/>
                <td><?=(isset($server['uuid']) ? $server['uuid']:'')?><input type="hidden" name="uuid[]" value="<?=(isset($server['uuid']) ? $server['uuid']:'')?>"/>
                <td><a href="#" onclick="removeServer(this)">Remove</a><?php
        }
        ?>
    </table>
    </form>
    <p><a href="#" onclick="showAddDialog()"><button>Add Server</button></a>
    <p>Only encode videos less than <input type="text" name="encoding_max_duration" maxlength="4" style="width:50px" value="<?=(isset($_encoding_max_duration) ? $_encoding_max_duration:'90')?>"> minutes (0 = no limit)
    <div id="add-dialog" style="display:none;padding:20px">
        <h3 style="margin-top:10px">Add new server</h3>
        <p>URL and port<span class="hover-help" title="The HTTP URL address of the encoding server. Specify the port if not 80 or 443 (e.g. http://1.2.3.4:8001)."></span>
        <br><input type="text" id="ip" value="" placeholder="e.g. http://1.2.3.4:8001" style="width:100%" />
        <p>Password<span class="hover-help" title="An optional password for the encoding server. Remember to also add the password to the encoder's config file."></span>
        <br><input type="text" id="pass" value="" placeholder="Optional" style="width:100%" />
        <p>UUID <span class="hover-help" title="An ID to identify this server to the web server if it can\'t be reliably identified from its IP address (e.g. if you have two servers on the same IP). Remember to also add the UUID to the encoder\'s config file."></span>
        <br><input type="text" id="uuid" value="" placeholder="Optional" style="width:100%">
        <p><center><button onclick="addServer()">Add Server</button></center>
    </div>
    <script>
        function showAddDialog() {
            $("#add-dialog").dialog({title:'Add Encoding Server',width:400});
            reloadTooltips();
        }

    function addServer() {
        $('#add-dialog').dialog('close');

        var ip = $('#ip').val();
        var pass = $('#pass').val();
        if (ip.length == 0) return;
        var uuid = $('#uuid').val();

        if (!ip.toLowerCase().startsWith('http')) {
            ip = 'http://' + ip;
        }

        if (ip.split(':').length < 2) {
            ip = ip + ":8001";
        }

        $('#server_table').append('<tr><td><b>'+ip+'</b><input type="hidden" name="server_id[]" value="-1"><input type="hidden" name="url[]" value="'+ip+'"></td><td>'+pass+'<input type="hidden" name="password[]" value="'+pass+'"></td><td>'+uuid+'<input type="hidden" name="uuid[]" value="'+uuid+'"></td><td><a href="#" onclick="removeServer(this)">Remove</a></td></tr>');
        $('#ip').val('');
        $('#pass').val('');
        $('#uuid').val('');
    }

    function removeServer(obj) {
        // Get row
        $(obj).parent().parent().remove();
    }

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


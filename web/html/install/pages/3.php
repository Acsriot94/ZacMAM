<?php

function processPage() 
{
    ?><h1>Check IonCube Loader</h1><table><?php

	if (extension_loaded("IonCube Loader")) {
		?><tr><td><div class="install-success"></div><td><h2>Installed</h2></table><?php
		return true;
	}

    // Get platform details
    $sysinfo = get_sysinfo();
    $arch_type = (is64Bit() ? 'x86_64':'x86');
    $uname = php_uname();

    if ((stripos($uname, 'darwin') !== false)) {
        $platform_type = 'OS X';
    } else if ((stripos($uname, 'win') !== false)) {
        if (is_bool($sysinfo['THREAD_SAFE'])) {
            $platform_type = 'Windows VC14';
        } else {
            $platform_type = 'Windows VC14 (non-TS)';
        }
    } else if ((stripos($uname, 'freebsd') !== false)) {
        $platform_type = 'FreeBSD';
    } else if ((stripos($uname, 'openbsd') !== false)) {
        $platform_type = 'OpenBSD';
    } else if ((stripos($uname, 'solaris') !== false)) {
        $platform_type = 'Solaris';
    } else {
        $platform_type = 'Linux';
    }

    $php_version = explode('.', phpversion());

    $loader_name = get_loader_name();
    $extension_dir = ini_get('extension_dir');
    if (substr($extension_dir,strlen($extension_dir)-1,1) == DIRECTORY_SEPARATOR) $extension_dir = substr($extension_dir,0,strlen($extension_dir)-1);
    $zend_extension_lines = zend_extension_lines($extension_dir);

    ?><tr><td width="55"><div class="install-failed"></div><td><h2>Not Installed</h2>
    <tr><td colspan="2">Follow these steps to install the relevant IonCube encoder for your platform:
    <ol>
            <li>Visit <a href="https://www.ioncube.com/loaders.php" target="_blank">https://www.ioncube.com/loaders.php</a> and download the plugin for <b><?=$platform_type?> (<?=$arch_type?>)</b>.
            <li>Copy the <b><?=$loader_name?></b> plugin for PHP <?=$php_version[0].'.'.$php_version[1]?> to <b><?=$extension_dir?></b>.
            <li>Open the <b><?=$sysinfo['PHP_INI']?></b> file in a text editor.
            <li>Add the following line before any other zend_extension lines: <pre style="max-width:600px;overflow:scroll"><?=$zend_extension_lines[0]?></pre>
            <li>Save the file then restart your web server.
            <li>Refresh this page.
    </ol></p>
	</table><?php

	return false;
}

function get_sysinfo() : array
{
    static $sysinfo;

    if (empty($sysinfo)) {
        $sysinfo = ic_system_info();
    }
    return $sysinfo;
}

function ic_system_info() : array
{
    $thread_safe = null;
    $debug_build = null;
    $cgi_cli = false;
    $is_cgi = false;
    $is_cli = false;
    $php_ini_path = '';
    $php_ini_dir = '';
    $php_ini_add = '';
    $is_supported_compiler = true;
    $php_compiler = isWin()?'VC6':'';

    ob_start();
    phpinfo(INFO_GENERAL);
    $php_info = ob_get_contents();
    ob_end_clean();


    $breaker = (php_sapi_name() == 'cli')?'\n':'<tr>';
    $lines = explode($breaker,$php_info);

    foreach ($lines as $line) {
        if (preg_match('/command/i',$line)) {
            continue;
        }

        if (preg_match('/thread safety/i', $line)) {
            $thread_safe = (preg_match('/(enabled|yes)/i', $line) != 0);
        }

        if (preg_match('/debug build/i', $line)) {
            $debug_build = (preg_match('/(enabled|yes)/i', $line) != 0);
        }

        if (preg_match('~configuration file.*(</B><TD ALIGN="left">| => |v">)([^ <]*)~i',$line,$match)) {
            $php_ini_path = $match[2];

            if (!@file_exists($php_ini_path)) {
                $php_ini_path = '';
            }
        }
        if (preg_match('~dir for additional \.ini files.*(</B><TD ALIGN="left">| => |v">)([^ <]*)~i',$line,$match)) {
            $php_ini_dir = $match[2];
            if (!@file_exists($php_ini_dir)) {
                $php_ini_dir = '';
            }
        }
        if (preg_match('~additional \.ini files parsed.*(</B><TD ALIGN="left">| => |v">)([^ <]*)~i',$line,$match)) {
            $php_ini_add = $match[2];
        }
/*        if (preg_match('/compiler/i',$line)) {
            $supported_match = join('|',supported_win_compilers());
            $is_supported_compiler = preg_match("/($supported_match)/i",$line);
            if (preg_match("/(VC[0-9]+)/i",$line,$match)) {
                $php_compiler = strtoupper($match[1]);
            } else {
                $php_compiler = '';
            }
        }*/
        $php_compiler = '';
    }
    $is_cgi = strpos(php_sapi_name(),'cgi') !== false;
    $is_cli = strpos(php_sapi_name(),'cli') !== false;
    $cgi_cli = $is_cgi || $is_cli;

    $ss = server_software_info();

    if (!$php_ini_path && function_exists('php_ini_loaded_file')) {
        $php_ini_path = php_ini_loaded_file();
        if ($php_ini_path === false) {
            $php_ini_path = '';
        }
    }
    if (!empty($php_ini_path)) {
        $real_path = @realpath($php_ini_path);
        if (false !== $real_path) {
            $php_ini_path = $real_path;
        }
    }

    $php_ini_basename = basename($php_ini_path);

    return [
        'THREAD_SAFE'        => $thread_safe,
        'DEBUG_BUILD'        => $debug_build,
        'PHP_INI'            => $php_ini_path,
        'PHP_INI_BASENAME'   => $php_ini_basename,
        'PHP_INI_DIR'        => $php_ini_dir,
        'PHP_INI_ADDITIONAL' => $php_ini_add,
        'PHPRC'              => getenv('PHPRC'),
        'CGI_CLI'            => $cgi_cli,
        'IS_CGI'             => $is_cgi,
        'IS_CLI'             => $is_cli,
        'PHP_COMPILER'       => $php_compiler,
        'SUPPORTED_COMPILER' => $is_supported_compiler,
        'FULL_SS'            => $ss['full'],
        'SS'                 => $ss['short']
        ];
}

function server_software_info() : array
{
    $ss = [];
    $ss['full'] = $_SERVER['SERVER_SOFTWARE'];

    if (preg_match('/apache/i', $ss['full'])) {
        $ss['short'] = 'Apache';
    } else if (preg_match('/IIS/',$ss['full'])) {
        $ss['short'] = 'IIS';
    } else {
        $ss['short'] = '';
    }
    return $ss;
}

function get_loader_name() : string
{
    $u = php_uname();
    $sys = get_sysinfo();
    $os = substr($u,0,strpos($u,' '));
    $os_key = strtolower(substr($u,0,3));

    $php_version = phpversion();
    $php_family = substr($php_version,0,3);

    $loader_sfix = (($os_key == 'win') ? '.dll' : (($sys['THREAD_SAFE'])?'_ts.so':'.so'));
    $loader_name = "ioncube_loader_${os_key}_${php_family}${loader_sfix}";

    return $loader_name;
}

function zend_extension_lines(string $loader_dir) : array
{
    $zend_extension_lines = [];
    $sysinfo = get_sysinfo();
    $qt = (isWin()?'"':'');

    if (!is_bool($sysinfo['THREAD_SAFE']) || !$sysinfo['THREAD_SAFE']) {
        $path = $qt . $loader_dir . DIRECTORY_SEPARATOR . get_loader_name() . $qt;
        $zend_extension_lines[] = "zend_extension = " . $path;
    }
    if ((!is_bool($sysinfo['THREAD_SAFE']) && !is_php_version_or_greater(5,3)) || $sysinfo['THREAD_SAFE']) {
        $line_start = is_php_version_or_greater(5,3)?'zend_extension':'zend_extension_ts';
        $path = $qt . $loader_dir . DIRECTORY_SEPARATOR . get_loader_name() . $qt;
        $zend_extension_lines[] = $line_start . " = " . $path;
    }
    return $zend_extension_lines;
}

function is_php_version_or_greater(int $major, int $minor, int $release = 0) : bool
{
    $version = php_version();
    return ($version['major'] > $major ||
        ($version['major'] == $major && $version['minor'] > $minor) ||
        ($version['major'] == $major && $version['minor'] == $minor && $version['release'] >= $release));
}

function php_version() : array
{
    $v = explode('.',PHP_VERSION);

    return [
        'major'      =>  $v[0],
        'minor'      =>  $v[1],
        'release'    =>  $v[2]
        ];
}

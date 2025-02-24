<?php
/*
ConfigurationParser class for unencrypted installer use
*/

class FileNotFoundException extends Exception {

}

class FileWriteFailedException extends Exception {

}

class ConfigurationParser
{
    public $config = [];

    public static function parserWithDefaultConfiguration(): self
    {
        return self::parserWithContentsOfFile(__DIR__ . '/../../config/config.default.php');
    }

    public static function parserWithContentsOfFile(?string $config_file = NULL) : self
    {
        if (empty($config_file)) $config_file = __DIR__ . '/../../../config/config.php';

        if (!file_exists($config_file) || filesize($config_file) === 0) {
            $config_file = __DIR__ . '/../../../config/config.default.php';
        }

        // Open file
        $config_string = file_get_contents($config_file);

        if (!$config_string) {
            throw new FileNotFoundException("Unable to open config file $config_file - this file may not exist or you may not have permission to view it.");
        }

        $lines = explode("\n", $config_string);

        $out_array = [];

        foreach ($lines as $line) {
            $line = trim($line);

            // Every variable begins with $
            if (strlen($line) > 0 && substr($line, 0, 1) == '$') {
                // Get semicolon position
                $line_end = strrpos($line, ';');

                if ($line_end > 0) {
                    // Split =
                    $components = explode('=', substr($line, 0, $line_end));

                    if (count($components) >= 2) {
                        $key = substr(trim($components[0]), 2);
                        $val = trim(implode('=', array_slice($components, 1)), " \n\r\t'\"");

                        if ($key == 'webhook_key' && $val == '') {
                            $val = self::randomString(20);
                        }

                        $out_array[$key] = $val;
                    }
                }
            }
        }

        $obj = new ConfigurationParser();
        $obj->config = $out_array;
        return $obj;
    }

    public function save(?string $destination=null): void
    {
        if (!$destination) $destination = __DIR__ . '/../../../config/config.php';

        $output = "<?php\n";

        foreach ($this->config as $key => $val) {
            if ($key != 'site_root') {
                $output .= '$_' . $key . ' = ' . $this->valueStringForOutput($val) . ";\n";
            }
        }

        // Work out site root
        $cur_path = dirname($_SERVER['SCRIPT_FILENAME'], 2);
        if ($cur_path == $_SERVER['DOCUMENT_ROOT']) {
            $output .= '$_site_root = $_SERVER[\'DOCUMENT_ROOT\']' . ";\n";
        } else {
            $output .= '$_site_root = $_SERVER[\'DOCUMENT_ROOT\'].\'' . substr($cur_path, strlen($_SERVER['DOCUMENT_ROOT'])) . "';\n";
        }

        if (file_put_contents($destination, $output) === false) {
            throw new FileWriteFailedException("Unable to write configuration file $destination. You may not have sufficient access permissions for the config directory.");
        }
    }

    public function valueStringForOutput($val) : string {
        if ($val === null || $val === '') {
            return "''";
        }

        if ($val === true || $val === false || $val == 'true' || $val == 'false' || $val == 'on') {
            return ($val === true || $val == 'true' || $val == 'on' ? 'true' : 'false');
        } elseif (is_numeric($val)) {
            return $val;
        } else if (str_starts_with($val, '__DIR__')) {
            // Ensure it ends with a ' character
            if (!str_ends_with($val, "'")) {
                $val .= "'";
            }
            return $val;
        } else {
            // Ensure leading and trailing characters
            if (!str_starts_with($val, "'")) {
                $val = "'" . $val;
            }

            if (!str_ends_with($val, "'") || strlen($val) === 1) {
                $val .= "'";
            }

            return $val;
        }
    }

    private static function randomString(int $length = 8): string
    {
        $chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        $output = '';
        for ($i = 0; $i < $length; ++$i)
        {
            $output .= $chars[mt_rand(0, strlen($chars)-1)];
        }

        return $output;
    }
}
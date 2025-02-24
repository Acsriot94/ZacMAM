<?php
namespace Kollab;
require_once __DIR__ . '/autoload.php';

use Kollab\Exceptions\FileNotFoundException;
use Kollab\Exceptions\FileWriteFailedException;

class ConfigurationParser
{
    public $config = [];

    public static function parserWithDefaultConfiguration(): self
    {
        return self::parserWithContentsOfFile(__DIR__ . '/../../config/config.default.php');
    }

    public static function parserWithContentsOfFile(?string $config_file = NULL) : self
    {
        if (empty($config_file)) $config_file = __DIR__ . '/../../config/config.php';

        if (!file_exists($config_file) || filesize($config_file) === 0) {
            $config_file = __DIR__ . '/../../../config/config.default.php';
        }

        // Open file
        $config_string = file_get_contents($config_file);

        if (!$config_string) {
            throw new FileNotFoundException("Unable to open config file $config_file - this file may not exist or you may not have permission to view it.");
        }

        return self::parserWithContentsOfString($config_string);
    }

    public static function parserWithContentsOfString(string $config_string) : self
    {
        $lines = explode("\n", $config_string);

        $out_array = [];

        $full_line = '';

        foreach ($lines as $line) {
            $line = trim($line);

            // Every variable begins with $
            if ((strlen($line) > 0 && substr($line, 0, 1) == '$') || !empty($full_line)) {
                $full_line .= $line;

                // Get semicolon position
                $line_end = strrpos($full_line, ';');

                if ($line_end > 0) {
                    // Split =
                    $components = explode('=', substr($full_line, 0, $line_end));

                    if (count($components) >= 2) {
                        $key = substr(trim($components[0]), 2);
                        $val = trim(implode('=', array_slice($components, 1)), " \n\r\t'\"");

                        if ($key == 'webhook_key' && $val == '') {
                            $val = Random::string(8);
                        }

                        // Turn true / false into bools
                        if ($val === 'true') $val = true;
                        if ($val === 'false') $val = false;

                        $out_array[$key] = $val;
                    }

                    $full_line = '';
                } else {
                    $full_line .= "\n";
                }
            }
        }

        $obj = new ConfigurationParser();
        $obj->config = $out_array;
        return $obj;
    }

    public function save(?string $destination=null): void
    {
        if (!$destination) $destination = __DIR__ . '/../../config/config.php';

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
        } else if (Text::startsWith('__DIR__', $val)) {
            return Text::ensureTrailingCharacter("'", $val);
        } else {
             return Text::ensureLeadingAndTrailingCharacters("'", "'", $val);
        }
    }
}
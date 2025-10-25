<?php

$config_file = __DIR__ . '/settings.json';

if (file_exists($config_file)) {
    $config_data = json_decode(file_get_contents($config_file), true);
} else {
    json_error('Arquivo de configurações não encontrado. Execute a configuração inicial.', 500);
}

define('SEUGENIO_HOST', $config_data['host']);
define('SEUGENIO_ID', $config_data['id']);
define('SEUGENIO_API_KEY', $config_data['api_key']);
define('CURL_TIMEOUT', $config_data['timeout']);
define('MAX_MESSAGE_LENGTH', $config_data['max_message_length']);
define('MAX_PHONE_LENGTH', $config_data['max_phone_length']);
define('DEFAULT_DDD', $config_data['default_ddd'] ?? '');
define('DEFAULT_NUMBER', $config_data['default_number'] ?? '');
define('ENABLE_LOGS', $config_data['debug_mode']);
define('ALLOWED_IPS', $config_data['allowed_ips']);
define('API_SECRET_KEY', $config_data['api_secret_key']);
define('DEBUG_MODE', $config_data['debug_mode']);
define('CORS_ENABLED', $config_data['cors_enabled']);
define('CORS_ORIGINS', $config_data['cors_origins']);
define('LOG_DIR', __DIR__ . '/logs/');

function seugenio_get_default_headers() {
    return [
        'Content-Type: application/json',
        'Accept: application/json',
        'Authorization: Basic ' . base64_encode(SEUGENIO_ID . ':' . SEUGENIO_API_KEY),
        'User-Agent: WhatsApp-Client/1.0'
    ];
}

function seugenio_is_configured() {
    return SEUGENIO_ID !== '' && SEUGENIO_API_KEY !== '';
}

function is_ip_allowed($ip = null) {
    if (empty(ALLOWED_IPS)) {
        return true;
    }
    
    $ip = $ip ?: $_SERVER['REMOTE_ADDR'];
    return in_array($ip, ALLOWED_IPS);
}

function is_origin_allowed($origin = null) {
    if (DEBUG_MODE) {
        return true;
    }
    
    if (!CORS_ENABLED) {
        return true;
    }
    
    $origin = $origin ?: ($_SERVER['HTTP_ORIGIN'] ?? '');
    return in_array($origin, CORS_ORIGINS);
}

function validate_phone_number($phone) {
    $phone = preg_replace('/[^0-9]/', '', $phone);
    
    if (strlen($phone) < 10) {
        return false;
    }
    
    if (strlen($phone) > MAX_PHONE_LENGTH) {
        return false;
    }
    
    return $phone;
}

function validate_message($message) {
    $message = trim($message);
    
    if (empty($message)) {
        return false;
    }
    
    if (strlen($message) > MAX_MESSAGE_LENGTH) {
        return false;
    }
    
    return $message;
}

function log_request($endpoint, $data, $response, $status_code) {
    if (!ENABLE_LOGS) {
        return;
    }
    
    if (!is_dir(LOG_DIR)) {
        mkdir(LOG_DIR, 0755, true);
    }
    
    $log_entry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'endpoint' => $endpoint,
        'data' => $data,
        'response' => $response,
        'status_code' => $status_code
    ];
    
    $log_file = LOG_DIR . 'api_requests_' . date('Y-m-d') . '.log';
    file_put_contents($log_file, json_encode($log_entry) . "\n", FILE_APPEND | LOCK_EX);
}

function get_frontend_config() {
    return [
        'max_message_length' => MAX_MESSAGE_LENGTH,
        'max_phone_length' => MAX_PHONE_LENGTH,
        'default_ddd' => DEFAULT_DDD,
        'default_number' => DEFAULT_NUMBER,
        'is_configured' => seugenio_is_configured(),
        'version' => get_api_version()
    ];
}

function get_api_version() {
    $api_proxy_file = __DIR__ . '/api_proxy.php';
    if (file_exists($api_proxy_file)) {
        $content = file_get_contents($api_proxy_file);
        if (preg_match("/'version'\s*=>\s*'([^']+)'/", $content, $matches)) {
            return $matches[1];
        }
    }
}

function format_phone_with_default($phone) {
    $phone = preg_replace('/[^0-9]/', '', $phone);
    if (strlen($phone) <= 9 && !empty(DEFAULT_DDD)) {
        $phone = DEFAULT_DDD . $phone;
    }
    if (empty($phone) && !empty(DEFAULT_NUMBER)) {
        $phone = DEFAULT_DDD . DEFAULT_NUMBER;
    }
    
    return $phone;
}

function sanitize_input($data) {
    if (is_array($data)) {
        return array_map('sanitize_input', $data);
    }
    
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}

function json_response($data, $status_code = 200) {
    http_response_code($status_code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function json_error($message, $status_code = 400, $details = null) {
    $error = ['error' => $message];
    if ($details) {
        $error['details'] = $details;
    }
    json_response($error, $status_code);
}

if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

if (!isset($_SERVER['HTTP_ACCEPT']) || strpos($_SERVER['HTTP_ACCEPT'], 'text/html') === false) {
    if (DEBUG_MODE) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
    } else {
        if (CORS_ENABLED) {
            $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
            if (in_array($origin, CORS_ORIGINS)) {
                header("Access-Control-Allow-Origin: $origin");
            }
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization');
        }
    }

    if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit(0);
    }
}
?>
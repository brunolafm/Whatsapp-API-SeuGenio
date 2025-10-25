<?php
require_once __DIR__ . '/config.php';


if (basename($_SERVER['PHP_SELF']) === 'api_proxy.php') {
    header('Content-Type: application/json; charset=utf-8');
}

if (basename($_SERVER['PHP_SELF']) === 'api_proxy.php' && isset($_SERVER['REQUEST_METHOD']) && !in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PATCH'])) {
    json_error('Método não permitido. Use POST ou PATCH.', 405);
}

if (basename($_SERVER['PHP_SELF']) === 'api_proxy.php' && !seugenio_is_configured()) {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }
    if (!$input || !in_array($input['action'], ['get_config', 'save_config'])) {
        json_error('Credenciais da API não configuradas em config.php', 500);
    }
}

if (basename($_SERVER['PHP_SELF']) === 'api_proxy.php' && !is_ip_allowed()) {
    json_error('Acesso negado para este IP', 403);
}

if (basename($_SERVER['PHP_SELF']) === 'api_proxy.php' && !is_origin_allowed()) {
    json_error('Acesso negado para esta origem', 403);
}

if (basename($_SERVER['PHP_SELF']) === 'api_proxy.php') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }

    $input = sanitize_input($input);

    $action = $input['action'] ?? 'send_message';

function handle_send_message($input) {
    $target = validate_phone_number($input['target'] ?? '');
    $message = validate_message($input['message'] ?? '');
    
    if (!$target) {
        json_error('Número de telefone inválido', 400);
    }
    
    if (!$message) {
        json_error('Mensagem inválida ou muito longa', 400);
    }
    
    $endpoint = SEUGENIO_HOST . '/message/text';
    $payload = [
        'target' => $target,
        'message' => $message
    ];
    
    $response = make_api_request($endpoint, $payload);
    log_request('send_message', $payload, $response['body'], $response['status_code']);
    
    http_response_code($response['status_code']);
    echo $response['body'];
}

function handle_send_media($input) {
    $target = validate_phone_number($input['target'] ?? '');
    $fileUrl = $input['fileUrl'] ?? $input['media_url'] ?? '';
    $caption = $input['caption'] ?? '';
    $type = $input['type'] ?? $input['media_type'] ?? 'image';
    $live = $input['live'] ?? false;
    
    if (!$target) {
        json_error('Número de telefone inválido', 400);
    }
    
    if (!$fileUrl) {
        json_error('URL da mídia é obrigatória', 400);
    }
    
    $endpoint = SEUGENIO_HOST . '/message/media';
    $payload = [
        'target' => $target,
        'fileUrl' => $fileUrl,
        'type' => $type
    ];
    
    if (!empty($caption)) {
        $payload['caption'] = $caption;
    }
    
    if ($type === 'audio' && $live) {
        $payload['live'] = $live;
    }
    
    
    $response = make_api_request($endpoint, $payload);
    log_request('send_media', $payload, $response['body'], $response['status_code']);
    
    http_response_code($response['status_code']);
    echo $response['body'];
}

function handle_get_status($input) {
    $endpoint = SEUGENIO_HOST . '/instance/status';
    
    $response = make_api_request($endpoint, [], 'GET');
    log_request('get_status', [], $response['body'], $response['status_code']);
    if ($response['status_code'] === 200) {
        $data = json_decode($response['body'], true);
        if ($data && isset($data['data']) && isset($data['data']['connected']) && $data['data']['connected'] === true) {
            $profile_endpoint = SEUGENIO_HOST . '/instance/profile';
            $profile_response = make_api_request($profile_endpoint, [], 'GET');
            
            if ($profile_response['status_code'] === 200) {
                $profile_data = json_decode($profile_response['body'], true);
                if ($profile_data && isset($profile_data['data'])) {
                    $data['data']['profile'] = $profile_data['data'];
                }
            }
        }
        http_response_code($response['status_code']);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    } else {
        http_response_code($response['status_code']);
        echo $response['body'];
    }
}

function handle_get_qr_code($input) {
    $status_endpoint = SEUGENIO_HOST . '/instance/status';
    $status_response = make_api_request($status_endpoint, [], 'GET');
    if ($status_response['status_code'] === 200) {
        $status_data = json_decode($status_response['body'], true);
        if ($status_data && isset($status_data['data'])) {
            $state = $status_data['data']['state'] ?? '';
            $status = $status_data['data']['status'] ?? '';
            $phase = $status_data['data']['phase'] ?? '';
            if ($state === 'active' && $status === 'connected' && $phase === 'authenticated') {
                json_response([
                    'success' => false,
                    'message' => 'Instância já conectada',
                    'data' => [
                        'connected' => true,
                        'state' => $state,
                        'status' => $status,
                        'phase' => $phase,
                        'message' => 'A instância já está conectada e autenticada. QR Code não é necessário.'
                    ]
                ]);
                return;
            }
        }
    }
    $endpoint = SEUGENIO_HOST . '/instance/qr-code';
    
    try {
        $response = make_api_request($endpoint, [], 'GET');
        log_request('get_qr_code', [], $response['body'], $response['status_code']);
        
        if (empty($response['body'])) {
            error_log("DEBUG get_qr_code: Resposta vazia do endpoint. Status: " . $response['status_code']);
            json_error('Resposta vazia do servidor de QR Code', 500);
            return;
        }
        
        http_response_code($response['status_code']);
        echo $response['body'];
    } catch (Exception $e) {
        error_log("DEBUG get_qr_code: Exception: " . $e->getMessage());
        json_error('Erro ao obter QR Code: ' . $e->getMessage(), 500);
    }
}

function handle_get_contacts($input) {
    $response = [
        'error' => 'Endpoint não disponível',
        'message' => 'A API SeuGênio não possui endpoint para listar contatos',
        'available_endpoints' => [
            'contact/status' => 'Verificar status de um contato específico',
            'contact/avatar' => 'Obter foto do perfil de um contato',
            'contact/on-whatsapp' => 'Validar se número está no WhatsApp',
            'contact/block-status' => 'Bloquear/desbloquear contato'
        ],
        'usage' => 'Use os endpoints de contato com parâmetro ?target=numero'
    ];
    
    log_request('get_contacts', [], json_encode($response), 200);
    
    http_response_code(200);
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

function handle_get_chats($input) {
    $response = [
        'error' => 'Endpoint não disponível',
        'message' => 'A API SeuGênio não possui endpoint para listar chats',
        'available_functionality' => [
            'message/text' => 'Enviar mensagens de texto',
            'message/media' => 'Enviar mídia (imagem, vídeo, áudio, documento)',
            'message/localization' => 'Enviar localização',
            'message/contact' => 'Enviar contato',
            'message/reaction' => 'Enviar reação',
            'message (DELETE)' => 'Apagar mensagem'
        ],
        'note' => 'A API SeuGênio é focada em envio de mensagens, não em listagem de conversas'
    ];
    
    log_request('get_chats', [], json_encode($response), 200);
    
    http_response_code(200);
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

function handle_disconnect($input) {
    $endpoint = SEUGENIO_HOST . '/instance/logout';
    
    try {
        $response = make_api_request($endpoint, [], 'POST');
        log_request('disconnect', [], $response['body'], $response['status_code']);
        if ($response['status_code'] === 200) {
            http_response_code(200);
            echo $response['body'];
            return;
        }
        if ($response['status_code'] === 500) {
            $response_data = json_decode($response['body'], true);
            if ($response_data && isset($response_data['error']) && 
                strpos($response_data['error'], 'Syntax error') !== false) {
                json_response(['error' => 'Erro de Autenticação: Verifique suas credenciais (Host, Instance ID e Token)', 'auth_error' => true], 200);
                return;
            }
            if ($response_data && isset($response_data['error']) && 
                strpos($response_data['error'], 'Resposta inválida da API') !== false) {
                json_response([
                    'success' => true,
                    'message' => 'Instância desconectada com sucesso',
                    'data' => [
                        'disconnected' => true,
                        'message' => 'A instância foi desconectada. Use o botão "QR Code" para reconectar.'
                    ]
                ]);
                return;
            }
        }
        http_response_code($response['status_code']);
        echo $response['body'];
        
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Syntax error') !== false) {
            json_error('Erro de Autenticação: Verifique suas credenciais (Host, Instance ID e Token)', 401);
            return;
        }
        if (strpos($e->getMessage(), 'Resposta inválida da API') !== false) {
            json_response([
                'success' => true,
                'message' => 'Instância desconectada com sucesso',
                'data' => [
                    'disconnected' => true,
                    'message' => 'A instância foi desconectada. Use o botão "QR Code" para reconectar.'
                ]
            ]);
            return;
        }
        
        json_error('Erro ao desconectar instância: ' . $e->getMessage(), 500);
    }
}

function handle_reconnect($input) {
    $endpoint = SEUGENIO_HOST . '/instance/reboot';
    
    try {
        $response = make_api_request($endpoint, [], 'POST');
        log_request('reconnect', [], $response['body'], $response['status_code']);
        if ($response['status_code'] === 200) {
            http_response_code(200);
            echo $response['body'];
            return;
        }
        if ($response['status_code'] === 500) {
            $response_data = json_decode($response['body'], true);
            if ($response_data && isset($response_data['error']) && 
                strpos($response_data['error'], 'Syntax error') !== false) {
                json_response(['error' => 'Erro de Autenticação: Verifique suas credenciais (Host, Instance ID e Token)', 'auth_error' => true], 200);
                return;
            }
            if ($response_data && isset($response_data['error']) && 
                strpos($response_data['error'], 'Resposta inválida da API') !== false) {
                json_response([
                    'success' => true,
                    'message' => 'Instância reiniciada com sucesso',
                    'data' => [
                        'rebooted' => true,
                        'message' => 'A instância foi reiniciada. Aguarde alguns segundos para estabilizar.'
                    ]
                ]);
                return;
            }
        }
        http_response_code($response['status_code']);
        echo $response['body'];
        
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Syntax error') !== false) {
            json_error('Erro de Autenticação: Verifique suas credenciais (Host, Instance ID e Token)', 401);
            return;
        }
        if (strpos($e->getMessage(), 'Resposta inválida da API') !== false) {
            json_response([
                'success' => true,
                'message' => 'Instância reiniciada com sucesso',
                'data' => [
                    'rebooted' => true,
                    'message' => 'A instância foi reiniciada. Aguarde alguns segundos para estabilizar.'
                ]
            ]);
            return;
        }
        
        json_error('Erro ao reiniciar instância: ' . $e->getMessage(), 500);
    }
}

function handle_save_config($input) {
    $required = ['host', 'id', 'api_key'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            json_error("Campo obrigatório: $field", 400);
        }
    }
    if (!filter_var($input['host'], FILTER_VALIDATE_URL)) {
        json_error('URL inválida', 400);
    }
    $config = [
        'host' => trim($input['host']),
        'id' => trim($input['id']),
        'api_key' => trim($input['api_key']),
        'timeout' => max(5, min(120, intval($input['timeout'] ?? 30))),
        'max_message_length' => max(100, min(10000, intval($input['max_message'] ?? MAX_MESSAGE_LENGTH))),
        'max_phone_length' => 20,
        'default_ddd' => trim($input['default_ddd'] ?? ''),
        'default_number' => trim($input['default_number'] ?? ''),
        'debug_mode' => isset($input['debug_mode']) ? (bool)$input['debug_mode'] : true,
        'allowed_ips' => [],
        'api_secret_key' => '',
        'cors_enabled' => isset($input['cors_enabled']) ? (bool)$input['cors_enabled'] : false,
        'cors_origins' => $input['cors_origins'] ?? ['http://localhost', 'https://seudominio.com'],
        'updated_at' => date('Y-m-d H:i:s')
    ];
    $settings_file = __DIR__ . '/settings.json';
    if (file_put_contents($settings_file, json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
        json_error('Erro ao salvar configurações', 500);
    }
    $log_dir = __DIR__ . '/logs/';
    if (!is_dir($log_dir)) {
        mkdir($log_dir, 0755, true);
    }
    
    $log_entry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'action' => 'config_save',
        'host' => $config['host'],
        'id' => $config['id']
    ];
    
    $log_file = $log_dir . 'config_changes_' . date('Y-m-d') . '.log';
    file_put_contents($log_file, json_encode($log_entry) . "\n", FILE_APPEND | LOCK_EX);
    json_response([
        'success' => true,
        'message' => 'Configurações salvas com sucesso!',
        'timestamp' => $config['updated_at']
    ]);
}

function handle_get_config($input) {
    $settings_file = __DIR__ . '/settings.json';
    
    if (file_exists($settings_file)) {
        $config_data = json_decode(file_get_contents($settings_file), true);
        json_response($config_data);
    } else {
        json_error('Arquivo de configurações não encontrado', 404);
    }
}

function handle_start_instance($input) {
    $endpoint = SEUGENIO_HOST . '/instance/start';
    
    try {
        $response = make_api_request($endpoint, [], 'POST');
        log_request('start_instance', [], $response['body'], $response['status_code']);
        if ($response['status_code'] === 500) {
            $response_data = json_decode($response['body'], true);
            if ($response_data && isset($response_data['error']) && 
                strpos($response_data['error'], 'already started') !== false) {
                json_response([
                    'success' => true,
                    'message' => 'Instância já está iniciada',
                    'data' => [
                        'already_started' => true,
                        'message' => 'A instância já está em execução e funcionando normalmente.'
                    ]
                ]);
                return;
            }
        }
        if ($response['status_code'] === 200) {
            http_response_code(200);
            echo $response['body'];
            return;
        }
        http_response_code($response['status_code']);
        echo $response['body'];
        
    } catch (Exception $e) {
        json_error('Erro ao iniciar instância: ' . $e->getMessage(), 500);
    }
}

function handle_update_friendly_name($input) {
    $friendly_name = $input['friendly_name'] ?? 'Instância WhatsApp';
    
    $endpoint = SEUGENIO_HOST . '/instance/update-friendly-name';
    $payload = [
        'friendlyName' => $friendly_name
    ];
    
    $response = make_api_request($endpoint, $payload, 'PATCH');
    log_request('update_friendly_name', $payload, $response['body'], $response['status_code']);
    
    http_response_code($response['status_code']);
    echo $response['body'];
}

function handle_send_location($input) {
    $payload = [
        'target' => $input['target'],
        'coords' => [
            'lat' => floatval($input['lat']),
            'long' => floatval($input['long'])
        ]
    ];
    
    $endpoint = SEUGENIO_HOST . '/message/localization';
    
    $response = make_api_request($endpoint, $payload, 'POST');
    log_request('send_location', $payload, $response['body'], $response['status_code']);
    
    http_response_code($response['status_code']);
    echo $response['body'];
}

function handle_send_contact($input) {
    $payload = [
        'target' => $input['target'],
        'displayName' => $input['displayName'],
        'fileUrl' => $input['fileUrl']
    ];
    
    $endpoint = SEUGENIO_HOST . '/message/contact';
    
    $response = make_api_request($endpoint, $payload, 'POST');
    log_request('send_contact', $payload, $response['body'], $response['status_code']);
    
    http_response_code($response['status_code']);
    echo $response['body'];
}

function handle_send_reaction($input) {
    $payload = [
        'target' => $input['target'],
        'reaction' => $input['reaction'],
        'messageKey' => [
            'remoteJid' => $input['messageKey']['remoteJid'],
            'fromMe' => $input['messageKey']['fromMe'],
            'id' => $input['messageKey']['id']
        ]
    ];
    
    $endpoint = SEUGENIO_HOST . '/message/reaction';
    
    $response = make_api_request($endpoint, $payload, 'POST');
    log_request('send_reaction', $payload, $response['body'], $response['status_code']);
    
    http_response_code($response['status_code']);
    echo $response['body'];
}

function handle_delete_message($input) {
    $payload = [
        'target' => $input['target'],
        'everyone' => $input['everyone'],
        'messageKey' => [
            'remoteJid' => $input['messageKey']['remoteJid'],
            'fromMe' => $input['messageKey']['fromMe'],
            'id' => $input['messageKey']['id']
        ]
    ];
    
    $endpoint = SEUGENIO_HOST . '/message';
    
    $response = make_api_request($endpoint, $payload, 'DELETE');
    log_request('delete_message', $payload, $response['body'], $response['status_code']);
    
    http_response_code($response['status_code']);
    echo $response['body'];
}

function handle_get_contact_status($input) {
    $target = $input['target'] ?? '';
    
    if (empty($target)) {
        json_error('Número é obrigatório', 400);
    }
    
    $target = preg_replace('/[^0-9]/', '', $target);
    
    if (strlen($target) < 10 || strlen($target) > 15) {
        json_error('Número de telefone inválido', 400);
    }
    
    $endpoint = SEUGENIO_HOST . "/contact/status?target={$target}";
    
    $response = make_api_request($endpoint, [], 'GET');
    
    log_request('get_contact_status', ['target' => $target], $response['body'], $response['status_code']);
    
    http_response_code($response['status_code']);
    echo $response['body'];
}

function handle_get_contact_avatar($input) {
    $target = $input['target'] ?? '';
    
    if (empty($target)) {
        json_error('Número é obrigatório', 400);
    }
    
    $target = preg_replace('/[^0-9]/', '', $target);
    
    if (strlen($target) < 10 || strlen($target) > 15) {
        json_error('Número de telefone inválido', 400);
    }
    
    $endpoint = SEUGENIO_HOST . "/contact/avatar?target={$target}";
    
    try {
        $response = make_api_request($endpoint, [], 'GET');
        log_request('get_contact_avatar', ['target' => $target], $response['body'], $response['status_code']);
        
        if ($response['status_code'] == 500) {
            $response_body = json_decode($response['body'], true);
            if (isset($response_body['error']) && ($response_body['error'] === 'item-not-found' || $response_body['error'] === 'not-authorized')) {
                $error_response = json_encode([
                    'success' => true,
                    'hasAvatar' => false,
                    'message' => 'Avatar não disponível para este contato',
                    'target' => $target
                ]);
                log_request('get_contact_avatar', ['target' => $target], $error_response, 200);
                http_response_code(200);
                echo $error_response;
                return;
            }
        }
        
        http_response_code($response['status_code']);
        echo $response['body'];
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'item-not-found') !== false || strpos($e->getMessage(), 'not-authorized') !== false || strpos($e->getMessage(), 'Endpoint não encontrado') !== false) {
            $error_response = json_encode([
                'success' => true,
                'hasAvatar' => false,
                'message' => 'Avatar não disponível para este contato',
                'target' => $target
            ]);
            log_request('get_contact_avatar', ['target' => $target], $error_response, 200);
            http_response_code(200);
            echo $error_response;
        } else {
            $error_response = json_encode([
                'error' => $e->getMessage()
            ]);
            log_request('get_contact_avatar', ['target' => $target], $error_response, 500);
            http_response_code(500);
            echo $error_response;
        }
    }
}

function handle_validate_number($input) {
    $target = $input['target'];
    $endpoint = SEUGENIO_HOST . "/contact/on-whatsapp?target={$target}";
    
    try {
        $response = make_api_request($endpoint, [], 'GET');
        log_request('validate_number', ['target' => $target], $response['body'], $response['status_code']);
        
        http_response_code($response['status_code']);
        echo $response['body'];
    } catch (Exception $e) {
        if (strpos($e->getMessage(), '404') !== false || strpos($e->getMessage(), 'Endpoint não encontrado') !== false) {
            $error_response = json_encode([
                'exists' => false,
                'message' => 'Contato não existe ou não está no WhatsApp'
            ]);
            log_request('validate_number', ['target' => $target], $error_response, 200);
            http_response_code(200);
            echo $error_response;
        } else {
            $error_response = json_encode([
                'error' => $e->getMessage()
            ]);
            log_request('validate_number', ['target' => $target], $error_response, 500);
            http_response_code(500);
            echo $error_response;
        }
    }
}

function handle_block_contact($input) {
    $target = $input['target'] ?? '';
    
    if (empty($target)) {
        json_error('Número é obrigatório', 400);
    }
    
    $target = preg_replace('/[^0-9]/', '', $target);
    
    if (strlen($target) < 10 || strlen($target) > 15) {
        json_error('Número de telefone inválido', 400);
    }
    
    $endpoint = SEUGENIO_HOST . "/contact/block-status?target={$target}&action=block";
    
    $response = make_api_request($endpoint, [], 'PATCH');
    
    log_request('block_contact', ['target' => $target], $response['body'], $response['status_code']);
    
    if (ob_get_level()) {
        ob_clean();
    }
    
    json_response([
        'success' => true,
        'message' => 'Solicitação de bloqueio enviada com sucesso',
        'target' => $target,
        'action' => 'block'
    ]);
}

function handle_unblock_contact($input) {
    
    $target = $input['target'] ?? '';
    
    if (empty($target)) {
        json_error('Número é obrigatório', 400);
    }
    
    $target = preg_replace('/[^0-9]/', '', $target);
    
    if (strlen($target) < 10 || strlen($target) > 15) {
        json_error('Número de telefone inválido', 400);
    }
    
    $endpoint = SEUGENIO_HOST . "/contact/block-status?target={$target}&action=unblock";
    
    $response = make_api_request($endpoint, [], 'PATCH');
    
    log_request('unblock_contact', ['target' => $target], $response['body'], $response['status_code']);
    
    json_response([
        'success' => true,
        'message' => 'Solicitação de desbloqueio enviada com sucesso',
        'target' => $target,
        'action' => 'unblock'
    ]);
}

function make_api_request($endpoint, $payload = [], $method = 'POST') {
    $ch = curl_init($endpoint);
    if ($method === 'POST' && (
        strpos($endpoint, '/instance/status') !== false || 
        strpos($endpoint, '/instance/qr-code') !== false ||
        (strpos($endpoint, '/contact/') !== false && strpos($endpoint, 'block-status') === false)
    )) {
        $method = 'GET';
    }
    
    $settings_file = __DIR__ . '/settings.json';
    $settings_data = json_decode(file_get_contents($settings_file), true);
    $timeout = $settings_data['timeout'];
    
    if (strpos($endpoint, '/message/media') !== false) {
        $timeout = max($timeout, 60);
    }
    
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_HTTPHEADER => seugenio_get_default_headers(),
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3
    ]);
    
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if (!empty($payload)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        }
    } elseif ($method === 'GET') {
        curl_setopt($ch, CURLOPT_HTTPGET, true);
    } elseif ($method === 'PATCH') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
        if (!empty($payload)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        }
    }
    
    $response_body = curl_exec($ch);
    $curl_error = curl_error($ch);
    $status_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_info = curl_getinfo($ch);
    
    
    curl_close($ch);
    
    if ($response_body === false) {
        throw new Exception('Falha ao conectar à API: ' . $curl_error);
    }
    if ($status_code === 404) {
        throw new Exception("Endpoint não encontrado: " . $endpoint);
    }
    if ($status_code === 204) {
        return [
            'body' => '',
            'status_code' => $status_code,
            'curl_info' => $curl_info
        ];
    }
    
    if ($status_code == 504 || $status_code == 408) {
        throw new Exception('Timeout na API: A requisição demorou muito para ser processada. Tente novamente.');
    }
    
    if (strpos($response_body, '<html>') !== false || strpos($response_body, '<!DOCTYPE') !== false) {
        throw new Exception('Erro do servidor: A API retornou uma página de erro HTML.');
    }
    
    $decoded_response = json_decode($response_body, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $error_msg = json_last_error_msg();
        if (strpos($error_msg, 'Syntax error') !== false) {
            throw new Exception('Erro de Autenticação: Verifique suas credenciais (Host, Instance ID e Token)');
        }
        throw new Exception('Resposta inválida da API: ' . $error_msg);
    }
    
    return [
        'body' => $response_body,
        'status_code' => $status_code,
        'curl_info' => $curl_info
    ];
}


function get_api_info() {
    return [
        'version' => '1.0.0',
        'endpoints' => [
            'send_message' => 'Enviar mensagem de texto',
            'send_media' => 'Enviar mídia (imagem, vídeo, documento, áudio)',
            'send_location' => 'Enviar localização',
            'send_contact' => 'Enviar contato',
            'send_reaction' => 'Enviar reação',
            'delete_message' => 'Apagar mensagem',
            'get_status' => 'Obter status da instância',
            'get_qr_code' => 'Obter QR Code para conectar',
            'start_instance' => 'Iniciar instância',
            'reconnect' => 'Reiniciar instância (reboot)',
            'disconnect' => 'Desconectar instância (logout)',
            'update_friendly_name' => 'Atualizar nome amigável da instância',
            'get_contact_status' => 'Obter status de um contato',
            'get_contact_avatar' => 'Obter avatar de um contato',
            'validate_number' => 'Validar se número está no WhatsApp',
            'block_contact' => 'Bloquear/desbloquear contato',
            'test_endpoints' => 'Testar todos os endpoints disponíveis',
            'save_config' => 'Salvar configurações da API',
            'get_config' => 'Obter configurações da API'
        ],
        'config' => get_frontend_config()
    ];
}

    if (isset($input['action']) && $input['action'] === 'get_info') {
        json_response(get_api_info());
    }
    process_action($action, $input);
}

function process_action($action, $input) {
    try {
        switch ($action) {
            case 'send_message':
                handle_send_message($input);
                break;
                
            case 'send_media':
                handle_send_media($input);
                break;
                
            case 'get_status':
                handle_get_status($input);
                break;
                
            case 'get_qr_code':
                handle_get_qr_code($input);
                break;
                
            case 'get_contacts':
                handle_get_contacts($input);
                break;
                
            case 'get_chats':
                handle_get_chats($input);
                break;
                
            case 'disconnect':
                handle_disconnect($input);
                break;
                
            case 'reconnect':
                handle_reconnect($input);
                break;
                
            case 'save_config':
                handle_save_config($input);
                break;
                
            case 'get_config':
                handle_get_config($input);
                break;
                
            case 'start_instance':
                handle_start_instance($input);
                break;
                
            case 'update_friendly_name':
                handle_update_friendly_name($input);
                break;
                
            case 'send_location':
                handle_send_location($input);
                break;
                
            case 'send_contact':
                handle_send_contact($input);
                break;
                
            case 'send_reaction':
                handle_send_reaction($input);
                break;
                
            case 'delete_message':
                handle_delete_message($input);
                break;
                
            case 'get_contact_status':
                handle_get_contact_status($input);
                break;
                
            case 'get_contact_avatar':
                handle_get_contact_avatar($input);
                break;
                
            case 'validate_number':
                handle_validate_number($input);
                break;
                
            case 'block_contact':
                handle_block_contact($input);
                break;
                
            case 'unblock_contact':
                handle_unblock_contact($input);
                break;
                
            default:
                json_error('Ação não reconhecida: ' . $action, 400);
        }
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Erro de Autenticação') !== false) {
            json_response(['error' => $e->getMessage(), 'auth_error' => true], 200);
        } else {
            log_request($action, $input, $e->getMessage(), 500);
            json_error('Erro interno do servidor: ' . $e->getMessage(), 500);
        }
    }
}
?>

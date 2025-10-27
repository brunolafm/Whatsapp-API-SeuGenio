<?php
require_once __DIR__ . '/config/config.php';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp API - SeuGênio</title>
    
    <!-- Meta Tags para Preview -->
    <meta name="description" content="Interface completa para gerenciar mensagens WhatsApp via SeuGênio API">
    <meta name="author" content="Bruno L. Furquim">
    
    <!-- OGP Tags -->
    <meta property="og:title" content="WhatsApp API - SeuGênio">
    <meta property="og:type" content="website">
    <meta property="og:url" content="<?php echo (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]"; ?>">
    <meta property="og:image" content="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/200px-WhatsApp.svg.png">
    <meta property="og:description" content="Interface completa para gerenciar mensagens WhatsApp via SeuGênio API">
    
    <!-- Chrome, Firefox OS e Opera -->
    <meta name="theme-color" content="#25D366">
    <!-- Windows Phone -->
    <meta name="msapplication-navbutton-color" content="#25D366">
    <!-- iOS Safari -->
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="#25D366">
    
    <!-- Favicon WhatsApp -->
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%2325D366' d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488'/%3E%3C/svg%3E">
    <link rel="alternate icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%2325D366' d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488'/%3E%3C/svg%3E">
    <link rel="apple-touch-icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%2325D366' d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488'/%3E%3C/svg%3E">
    
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="static/css/style.css" rel="stylesheet">
    <script>
        (function() {
            const themeMode = localStorage.getItem('themeMode') || 'auto';
            let theme = 'light';
            
            if (themeMode === 'auto') {
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    theme = 'dark';
                }
            } else if (themeMode === 'dark') {
                theme = 'dark';
            }
            
            document.documentElement.setAttribute('data-theme', theme);
        })();
    </script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>
<body>
    <div class="container <?php echo !seugenio_is_configured() ? 'not-configured' : ''; ?>">
        <div class="header">
            <h1><i class="fab fa-whatsapp"></i> WhatsApp API</h1>
            <p>Interface completa para gerenciar mensagens via SeuGênio API</p>
            <div id="connectionStatus" class="status-badge status-connecting">
                <i class="fas fa-circle"></i>
                <span>Verificando conexão...</span>
            </div>
        </div>

        <?php if (!seugenio_is_configured()): ?>
        <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Atenção:</strong> Configure suas credenciais da API antes de usar.
        </div>
        <?php endif; ?>

        <!-- Alerta de Erro de Autenticação (aparece quando credenciais são inválidas) -->
        <div class="alert alert-danger" id="authErrorAlert" style="display: none;">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Erro de Autenticação:</strong> A API não autorizou a instância. Verifique suas credenciais.
        </div>

        <!-- Card de Instruções (aparece quando não configurado) -->
        <div class="instructions-card" id="instructionsCard" style="display: none;">
            <h2><i class="fas fa-cog"></i> Configuração Necessária</h2>
            
            <div class="step">
                <h3><i class="fas fa-info-circle"></i> Para usar esta interface, você precisa:</h3>
                <ul>
                    <li>Ter uma conta na <a href="https://seugenioapi.com.br/" target="_blank" style="color: #3b82f6;"><strong>SeuGênio API</strong></a></li>
                    <li>Após confirmar e pagar o plano, vá para <a href="https://app.seugenioapi.com.br/" target="_blank" style="color: #3b82f6;"><strong>Instancias - SeuGênio API</strong></a> e insira as credenciais que você recebeu no seu email</li>
                    <li>Crie a Instância e clique em <strong>detalhes</strong></li>
                    <li>Obter suas credenciais (Host, Instance ID, Token)</li>
                    <li>Configurar essas informações abaixo</li>
                </ul>
            </div>
            
            <div class="step">
                <h3><i class="fas fa-link"></i> Links Úteis</h3>
                <ul>
                    <li><a href="https://seugenioapi.com.br/" target="_blank" style="color: #3b82f6;">Site Oficial SeuGênio API</a></li>
                    <li><a href="https://app.seugenioapi.com.br/" target="_blank" style="color: #3b82f6;">Instâncias - Seu Gênio API</a></li>
                </ul>
            </div>
            
            <button class="btn btn-primary" onclick="openConfigModal()">
                <i class="fas fa-cog"></i> Configurar Agora
            </button>
        </div>

        <!-- Card de Erro de Autenticação (aparece quando credenciais são inválidas) -->
        <div class="instructions-card" id="authErrorCard" style="display: none;">
            <h2><i class="fas fa-exclamation-triangle"></i> Erro de Autenticação</h2>
            
            <div class="step">
                <h3><i class="fas fa-info-circle"></i> A API não autorizou a instância</h3>
                <p>Suas credenciais estão configuradas, mas não são válidas para a API. Verifique:</p>
                <ul>
                    <li>Se o <strong>Host</strong> está correto</li>
                    <li>Se o <strong>Instance ID</strong> está correto</li>
                    <li>Se o <strong>Token</strong> está correto e ativo</li>
                    <li>Se a instância está ativa na SeuGênio API</li>
                </ul>
            </div>
            
            <div class="step">
                <h3><i class="fas fa-link"></i> Links Úteis</h3>
                <ul>
                    <li><a href="https://app.seugenioapi.com.br/" target="_blank" style="color: #3b82f6;">Verificar Instâncias - SeuGênio API</a></li>
                    <li><a href="https://seugenioapi.com.br/" target="_blank" style="color: #3b82f6;">Suporte - SeuGênio API</a></li>
                </ul>
            </div>
            
            <button class="btn btn-warning" onclick="openConfigModal()">
                <i class="fas fa-edit"></i> Verificar Configurações
            </button>
        </div>        <!-- Controle da Instância -->
        <div class="card instance-control-card" style="margin-bottom: 30px;">
            <div class="card-header">
                <i class="fas fa-cog"></i>
                <h2>Controle da Instância</h2>
            </div>

            <div class="btn-group" style="margin-bottom: 20px;">
                <button class="btn btn-info" onclick="getStatus()">
                    <i class="fas fa-chart-line"></i> Status
                </button>
                <button id="qrCodeBtn" class="btn btn-success" onclick="getQrCode()" style="display: none;">
                    <i class="fas fa-qrcode"></i> QR Code
                </button>
                <button class="btn btn-primary" onclick="startInstance()">
                    <i class="fas fa-power-off"></i> Iniciar
                </button>
                <button class="btn btn-warning" onclick="rebootInstance()">
                    <i class="fas fa-sync-alt"></i> Reiniciar
                </button>
                <button class="btn btn-danger" onclick="logoutInstance()">
                    <i class="fas fa-times-circle"></i> Desconectar
                </button>
                <button class="btn btn-secondary" onclick="openConfigModal()">
                    <i class="fas fa-sliders-h"></i> Configurações
                </button>
            </div>            <div id="qrCodeContainer" class="qr-code-container" style="display: none;">
                <h3>QR Code para Conectar</h3>
                <img id="qrCodeImage" class="qr-code" alt="QR Code">
                <p>Escaneie este QR Code com seu WhatsApp</p>
            </div>
        </div>

        <div class="main-content">
            <!-- Campo de Número Centralizado -->
            <div class="card contact-functions-card">
                <div class="card-header">
                    <i class="fas fa-phone"></i>
                    <h2>Funções de Contatos</h2>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label for="globalTarget">
                            <i class="fas fa-phone"></i> Número do WhatsApp
                        </label>
                        <input type="text" id="globalTarget" name="globalTarget" 
                               placeholder="+55 (55) 11999-9999" 
                               value="<?php 
                                   if (defined('DEFAULT_DDD') && defined('DEFAULT_NUMBER') && !empty(DEFAULT_DDD) && !empty(DEFAULT_NUMBER)) {
                                       $phone = '55' . DEFAULT_DDD . DEFAULT_NUMBER;
                                       if (strlen($phone) >= 2) {
                                           if (strlen($phone) <= 2) {
                                               echo '+' . $phone;
                                           } else if (strlen($phone) <= 4) {
                                               echo '+' . substr($phone, 0, 2) . ' (' . substr($phone, 2);
                                           } else if (strlen($phone) <= 9) {
                                               echo '+' . substr($phone, 0, 2) . ' (' . substr($phone, 2, 2) . ') ' . substr($phone, 4);
                                           } else if (strlen($phone) <= 13) {
                                               echo '+' . substr($phone, 0, 2) . ' (' . substr($phone, 2, 2) . ') ' . substr($phone, 4, 5) . '-' . substr($phone, 9, 4);
                                           }
                                       }
                                   }
                               ?>"
                               maxlength="20" 
                               style="font-size: 16px; padding: 15px; text-align: center;">
                        <small class="text-muted">Formato: DDI + DDD Número Ex: +55 (55) 11999-9999</small>
                    </div>
                    
                    <div class="btn-group" style="margin-top: 20px;">
                        <button id="validateNumberBtn" class="btn btn-success">
                            <i class="fas fa-check"></i> Validar
                        </button>
                        <button id="getContactStatusBtn" class="btn btn-info">
                            <i class="fas fa-user-check"></i> Status
                        </button>
                        <button id="getContactAvatarBtn" class="btn btn-warning">
                            <i class="fas fa-user-circle"></i> Foto
                        </button>
                        <button id="blockContactBtn" class="btn btn-danger">
                            <i class="fas fa-ban"></i> Bloquear
                        </button>
                        <button id="unblockContactBtn" class="btn btn-secondary">
                            <i class="fas fa-unlock"></i> Desbloquear
                        </button>
                    </div>
                </div>
            </div>

            <div class="card send-message-card">
                <div class="card-header">
                    <i class="fas fa-paper-plane"></i>
                    <h2>Enviar Mensagem</h2>
                </div>

                <div class="tabs">
                    <div class="tab active" onclick="switchTab('text')">
                        <i class="fas fa-comment"></i> Texto
                    </div>
                    <div class="tab" onclick="switchTab('media')">
                        <i class="fas fa-image"></i> Mídia
                    </div>
                    <div class="tab" onclick="switchTab('location')">
                        <i class="fas fa-map-marker-alt"></i> Localização
                    </div>
                    <div class="tab" onclick="switchTab('contact')">
                        <i class="fas fa-address-book"></i> Contato
                    </div>
                </div>

                <div id="textTab" class="tab-content active">
                    <form id="messageForm">
                        <div class="form-group">
                            <label for="messageTarget">
                                <i class="fas fa-phone"></i> Número do WhatsApp
                            </label>
                            <input type="text" id="messageTarget" name="target" 
                                   placeholder="+55 (55) 11999-9999" 
                                   value="<?php 
                                   if (defined('DEFAULT_DDD') && defined('DEFAULT_NUMBER') && !empty(DEFAULT_DDD) && !empty(DEFAULT_NUMBER)) {
                                       $phone = '55' . DEFAULT_DDD . DEFAULT_NUMBER;
                                       if (strlen($phone) >= 2) {
                                           if (strlen($phone) <= 2) {
                                               echo '+' . $phone;
                                           } else if (strlen($phone) <= 4) {
                                               echo '+' . substr($phone, 0, 2) . ' (' . substr($phone, 2);
                                           } else if (strlen($phone) <= 9) {
                                               echo '+' . substr($phone, 0, 2) . ' (' . substr($phone, 2, 2) . ') ' . substr($phone, 4);
                                           } else if (strlen($phone) <= 13) {
                                               echo '+' . substr($phone, 0, 2) . ' (' . substr($phone, 2, 2) . ') ' . substr($phone, 4, 5) . '-' . substr($phone, 9, 4);
                                           }
                                       }
                                   }
                               ?>"
                                   maxlength="20" 
                                   style="font-size: 16px; padding: 15px; text-align: center;" required>
                            <small class="text-muted">Formato: DDI + DDD Número Ex: +55 (55) 11999-9999</small>
                        </div>

                        <div class="form-group">
                            <label for="message">
                                <i class="fas fa-comment-dots"></i> Mensagem
                            </label>
                            <textarea id="message" name="message" rows="4" 
                                      placeholder="Digite sua mensagem aqui..." 
                                      maxlength="<?php echo defined('MAX_MESSAGE_LENGTH') ? MAX_MESSAGE_LENGTH : (file_exists('config/settings.json') ? json_decode(file_get_contents('config/settings.json'), true)['max_message_length'] ?? 2048 : 2048); ?>" required></textarea>
                            <div class="character-count" id="charCount">0/<?php echo defined('MAX_MESSAGE_LENGTH') ? MAX_MESSAGE_LENGTH : (file_exists('config/settings.json') ? json_decode(file_get_contents('config/settings.json'), true)['max_message_length'] ?? 2048 : 2048); ?></div>
                        </div>

                        <div class="btn-group">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-paper-plane"></i> Enviar
                            </button>
                            <button type="button" class="btn btn-warning" onclick="clearForm()">
                                <i class="fas fa-eraser"></i> Limpar
                            </button>
                        </div>
                        
                    </form>
                </div>

                <div id="mediaTab" class="tab-content">
                    <form id="mediaForm">
                        <div class="form-group">
                            <label for="mediaTarget">
                                <i class="fas fa-phone"></i> Número do WhatsApp
                            </label>
                            <input type="text" id="mediaTarget" name="target" 
                                   placeholder="+55 (55) 11999-9999" 
                                   value="<?php 
                                   if (defined('DEFAULT_DDD') && defined('DEFAULT_NUMBER') && !empty(DEFAULT_DDD) && !empty(DEFAULT_NUMBER)) {
                                       $phone = '55' . DEFAULT_DDD . DEFAULT_NUMBER;
                                       if (strlen($phone) >= 2) {
                                           if (strlen($phone) <= 2) {
                                               echo '+' . $phone;
                                           } else if (strlen($phone) <= 4) {
                                               echo '+' . substr($phone, 0, 2) . ' (' . substr($phone, 2);
                                           } else if (strlen($phone) <= 9) {
                                               echo '+' . substr($phone, 0, 2) . ' (' . substr($phone, 2, 2) . ') ' . substr($phone, 4);
                                           } else if (strlen($phone) <= 13) {
                                               echo '+' . substr($phone, 0, 2) . ' (' . substr($phone, 2, 2) . ') ' . substr($phone, 4, 5) . '-' . substr($phone, 9, 4);
                                           }
                                       }
                                   }
                               ?>"
                                   maxlength="20" 
                                   style="font-size: 16px; padding: 15px; text-align: center;" required>
                            <small class="text-muted">Formato: DDI + DDD Número Ex: +55 (55) 11999-9999</small>
                        </div>

                        <div class="form-group">
                            <label for="mediaType">
                                <i class="fas fa-file"></i> Tipo de Mídia
                            </label>
                            <select id="mediaType" name="media_type" required onchange="updateMediaUrl()">
                                <option value="">Selecione o tipo de mídia</option>
                                <option value="image">Imagem</option>
                                <option value="video">Vídeo</option>
                                <option value="document">Documento</option>
                                <option value="audio">Áudio</option>
                            </select>
                        </div>

                        <div class="form-group" id="audioLiveGroup" style="display: none;">
                            <label>
                                <i class="fas fa-microphone"></i> Áudio ao Vivo
                            </label>
                            <div class="toggle-container">
                                <label class="toggle-switch">
                                    <input type="checkbox" id="audioLive" name="audio_live" checked>
                                    <span class="toggle-slider"></span>
                                </label>
                                <span class="toggle-label" id="audioLiveLabel">Ativado</span>
                            </div>
                            <small class="text-muted">Simula que o áudio foi gravado na hora, como uma mensagem de voz</small>
                        </div>

                        <div class="form-group">
                            <label for="mediaUrl">
                                <i class="fas fa-link"></i> URL da Mídia
                            </label>
                            <input type="url" id="mediaUrl" name="media_url" 
                                   placeholder="https://exemplo.com/imagem.jpg" required>
                        </div>

                        <div class="form-group">
                            <label for="caption">
                                <i class="fas fa-comment"></i> Legenda (opcional)
                            </label>
                            <textarea id="caption" name="caption" rows="3" 
                                      placeholder="Legenda da mídia..." 
                                      maxlength="1024"></textarea>
                        </div>

                        <div class="btn-group">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-paper-plane"></i> Enviar
                            </button>
                            <button type="button" class="btn btn-warning" onclick="clearForm()">
                                <i class="fas fa-eraser"></i> Limpar
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Aba de Localização -->
                <div id="locationTab" class="tab-content">
                    <form id="locationForm">
                        <div class="form-group">
                            <label for="locationTarget">
                                <i class="fas fa-phone"></i> Número do WhatsApp
                            </label>
                            <input type="text" id="locationTarget" name="target" 
                                   placeholder="+55 (55) 11999-9999" 
                                   value="<?php 
                                   if (defined('DEFAULT_DDD') && defined('DEFAULT_NUMBER') && !empty(DEFAULT_DDD) && !empty(DEFAULT_NUMBER)) {
                                       $phone = '55' . DEFAULT_DDD . DEFAULT_NUMBER;
                                       if (strlen($phone) >= 2) {
                                           if (strlen($phone) <= 2) {
                                               echo '+' . $phone;
                                           } else if (strlen($phone) <= 4) {
                                               echo '+' . substr($phone, 0, 2) . ' (' . substr($phone, 2);
                                           } else if (strlen($phone) <= 9) {
                                               echo '+' . substr($phone, 0, 2) . ' (' . substr($phone, 2, 2) . ') ' . substr($phone, 4);
                                           } else if (strlen($phone) <= 13) {
                                               echo '+' . substr($phone, 0, 2) . ' (' . substr($phone, 2, 2) . ') ' . substr($phone, 4, 5) . '-' . substr($phone, 9, 4);
                                           }
                                       }
                                   }
                               ?>"
                                   maxlength="20" 
                                   style="font-size: 16px; padding: 15px; text-align: center;" required>
                            <small class="text-muted">Formato: DDI + DDD Número Ex: +55 (55) 11999-9999</small>
                        </div>

                        <div class="form-group">
                            <label for="latitude">
                                <i class="fas fa-map-marker-alt"></i> Latitude
                            </label>
                            <input type="number" id="latitude" name="lat" step="any"
                                   placeholder="-23.5505" required>
                        </div>

                        <div class="form-group">
                            <label for="longitude">
                                <i class="fas fa-map-marker-alt"></i> Longitude
                            </label>
                            <input type="number" id="longitude" name="long" step="any"
                                   placeholder="-46.6333" required>
                        </div>

                        <div class="btn-group">
                            <button type="button" class="btn btn-info location-button" onclick="getCurrentLocation()">
                                <i class="fas fa-crosshairs"></i> Localização Atual
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-paper-plane"></i> Enviar
                            </button>
                            <button type="button" class="btn btn-warning" onclick="clearForm()">
                                <i class="fas fa-eraser"></i> Limpar
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Aba de Contato -->
                <div id="contactTab" class="tab-content">
                    <form id="contactForm">
                        <div class="form-group">
                            <label for="contactTarget">
                                <i class="fas fa-phone"></i> Número do WhatsApp
                            </label>
                            <input type="text" id="contactTarget" name="target" 
                                   placeholder="+55 (55) 11999-9999" 
                                   value="<?php 
                                   if (defined('DEFAULT_DDD') && defined('DEFAULT_NUMBER') && !empty(DEFAULT_DDD) && !empty(DEFAULT_NUMBER)) {
                                       $phone = '55' . DEFAULT_DDD . DEFAULT_NUMBER;
                                       if (strlen($phone) >= 2) {
                                           if (strlen($phone) <= 2) {
                                               echo '+' . $phone;
                                           } else if (strlen($phone) <= 4) {
                                               echo '+' . substr($phone, 0, 2) . ' (' . substr($phone, 2);
                                           } else if (strlen($phone) <= 9) {
                                               echo '+' . substr($phone, 0, 2) . ' (' . substr($phone, 2, 2) . ') ' . substr($phone, 4);
                                           } else if (strlen($phone) <= 13) {
                                               echo '+' . substr($phone, 0, 2) . ' (' . substr($phone, 2, 2) . ') ' . substr($phone, 4, 5) . '-' . substr($phone, 9, 4);
                                           }
                                       }
                                   }
                               ?>"
                                   maxlength="20" 
                                   style="font-size: 16px; padding: 15px; text-align: center;" required>
                            <small class="text-muted">Formato: DDI + DDD Número Ex: +55 (55) 11999-9999</small>
                        </div>

                        <div class="form-group">
                            <label for="displayName">
                                <i class="fas fa-user"></i> Nome do Contato
                            </label>
                            <input type="text" id="displayName" name="displayName" 
                                   placeholder="João Silva" required value="João Silva">
                        </div>

                        <div class="form-group">
                            <label for="contactFileUrl">
                                <i class="fas fa-link"></i> URL do Arquivo VCF
                            </label>
                            <input type="url" id="contactFileUrl" name="fileUrl" 
                                   placeholder="https://exemplo.com/contato.vcf" 
                                   value="https://www.w3.org/2002/12/cal/vcard-examples/john-doe.vcf" required>
                        </div>

                        <div class="btn-group">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-paper-plane"></i> Enviar
                            </button>
                            <button type="button" class="btn btn-warning" onclick="clearForm()">
                                <i class="fas fa-eraser"></i> Limpar
                            </button>
                        </div>
                    </form>
                </div>

            </div>

        </div>        <div class="footer">
            <p>&copy; 2024 <a href="https://seugenioapi.com.br/" target="_blank" style="color: #25D366; text-decoration: none; font-weight: 600;">WhatsApp API - SeuGênio</a> | Versão <?php echo get_api_version(); ?></p>
            <p>Desenvolvido por <a href="https://github.com/brunolafm/Whatsapp-API-SeuGenio" target="_blank" style="color: #25D366; text-decoration: none; font-weight: 600;">Bruno L. Furquim</a> para utilizar a API</p>
        </div>
    </div>

    <!-- Modal de Configuração -->
    <div id="configModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-cog"></i> Configurações da API</h2>
                <div class="modal-header-actions">
                    <button class="btn btn-outline-secondary btn-sm" onclick="toggleTheme()" title="Tema: Automático" id="themeToggleBtn">
                        <i class="fas fa-adjust" id="modalThemeIcon"></i>
                    </button>
                    <button class="modal-close" onclick="closeConfigModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div class="modal-body">
                <form id="configForm">
                    <div class="form-group">
                        <label for="configHost">
                            <i class="fas fa-server"></i> Host da API
                        </label>
                        <input type="url" id="configHost" name="host" 
                               placeholder="https://api.seugenioapi.com.br/api/v1" 
                               value="<?php echo defined('SEUGENIO_HOST') ? SEUGENIO_HOST : ''; ?>" required>
                        <small class="text-muted">URL base da API SeuGênio</small>
                    </div>

                    <div class="form-group">
                        <label for="configId">
                            <i class="fas fa-id-card"></i> ID da Instância
                        </label>
                        <input type="text" id="configId" name="id" 
                               placeholder="xxxxxxxxxxxxxxxxxxxxxxxx" 
                               value="<?php echo defined('SEUGENIO_ID') ? SEUGENIO_ID : ''; ?>" required>
                        <small class="text-muted">ID único da sua instância WhatsApp</small>
                    </div>

                    <div class="form-group">
                        <label for="configApiKey">
                            <i class="fas fa-key"></i> Chave da API
                        </label>
                        <div class="input-with-icon">
                            <input type="password" id="configApiKey" name="api_key" 
                                   placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" 
                                   value="<?php echo defined('SEUGENIO_API_KEY') ? SEUGENIO_API_KEY : ''; ?>" required>
                            <button type="button" class="input-icon" onclick="toggleApiKeyVisibility()" id="toggleApiKeyBtn">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        <small class="text-muted">Token de autenticação da API</small>
                    </div>


                    <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 20px;">
                        <div class="form-group" style="flex: 1;">
                            <label for="configDefaultDdd">
                                <i class="fas fa-phone"></i> DDD Padrão
                            </label>
                            <input type="text" id="configDefaultDdd" name="default_ddd" 
                                   placeholder="11" maxlength="2" pattern="[0-9]{2}"
                                   value="<?php echo defined('DEFAULT_DDD') ? DEFAULT_DDD : ''; ?>">
                            <small class="text-muted">DDD padrão para números sem código de área (ex: 11)</small>
                        </div>

                        <div class="form-group" style="flex: 2;">
                            <label for="configDefaultNumber">
                                <i class="fas fa-mobile-alt"></i> Número Padrão
                            </label>
                            <input type="text" id="configDefaultNumber" name="default_number" 
                                   placeholder="99999-9999" maxlength="10" pattern="[0-9]{4,5}-[0-9]{4}"
                                   value="<?php echo defined('DEFAULT_NUMBER') ? DEFAULT_NUMBER : ''; ?>">
                            <small class="text-muted">Número padrão para testes (ex: 99999-9999 ou 9999-9999)</small>
                        </div>
                    </div>

                    <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 20px;">
                        <div class="form-group" style="flex: 1;">
                            <label for="configMaxMessage">
                                <i class="fas fa-comment"></i> Limite de caracteres
                            </label>
                            <input type="number" id="configMaxMessage" name="max_message" 
                                   placeholder="4096" min="100" max="10000" 
                                   value="<?php echo defined('MAX_MESSAGE_LENGTH') ? MAX_MESSAGE_LENGTH : (file_exists('config/settings.json') ? json_decode(file_get_contents('config/settings.json'), true)['max_message_length'] ?? 2048 : 2048); ?>">
                            <small class="text-muted">Máximo de caracteres por mensagem</small>
                        </div>

                        <div class="form-group" style="flex: 1;">
                            <label for="configTimeout">
                                <i class="fas fa-clock"></i> Timeout (segundos)
                            </label>
                            <input type="number" id="configTimeout" name="timeout" 
                                   placeholder="30" min="5" max="120" 
                                   value="<?php echo defined('CURL_TIMEOUT') ? CURL_TIMEOUT : '30'; ?>">
                            <small class="text-muted">Tempo limite para requisições (5-120 segundos)</small>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="configDebug" name="debug_mode" 
                                   <?php echo defined('DEBUG_MODE') && DEBUG_MODE ? 'checked' : ''; ?>
                                   onchange="toggleDebugMode()">
                            <i class="fas fa-bug"></i> Habilitar depuração
                        </label>
                        <small class="text-muted">Debug ON: permite qualquer origem + exibe respostas. Debug OFF: aplica CORS + oculta respostas</small>
                    </div>

                    <div class="form-group" id="corsSettings" <?php echo (defined('DEBUG_MODE') && DEBUG_MODE) ? '' : 'style="display: none;"'; ?>>
                        <label>
                            <input type="checkbox" id="configCors" name="cors_enabled" 
                                   <?php echo defined('CORS_ENABLED') && CORS_ENABLED ? 'checked' : ''; ?>
                                   onchange="toggleCorsMode()">
                            <i class="fas fa-shield-alt"></i> Habilitar CORS
                        </label>
                        <small class="text-muted">Restringe acesso apenas às origens permitidas (só funciona com debug desabilitado)</small>
                    </div>

                    <div class="form-group" id="corsOrigins" style="display: none;">
                        <label for="configCorsOrigins">
                            <i class="fas fa-globe"></i> Origens Permitidas
                        </label>
                        <input type="text" id="configCorsOrigins" name="cors_origins" 
                               placeholder="seudominio.com" 
                               value="<?php echo defined('CORS_ORIGINS') ? implode(', ', CORS_ORIGINS) : ''; ?>">
                        <small class="text-muted">Digite o domínio (ex: seudominio.com) - será gerado automaticamente com todas as variações (www, http, https)</small>
                    </div>
                </form>
            </div>

            <div class="modal-footer">
                <div class="btn-group" style="display: flex; justify-content: space-between; width: 100%;">
                    <button type="button" class="btn btn-primary" onclick="saveConfig()">
                        <i class="fas fa-save"></i> Salvar Configurações
                    </button>
                </div>
            </div>
        </div>
    </div>


    <script src="static/js/app.js"></script>
</body>
</html>
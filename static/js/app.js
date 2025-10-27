const CONFIG = {
	apiEndpoint: 'config/api_proxy.php',
	debugMode: false
};
let messagesSent = 0;
let isConnected = false;
let requestQueue = [];
let isProcessingRequest = false;

async function loadInitialConfig() {
	try {
		await loadSettingsFromFile();
		const response = await makeApiRequest('get_config', {});
		CONFIG.maxMessageLength = parseInt(response.max_message_length);
		CONFIG.maxPhoneLength = parseInt(response.max_phone_length);
		CONFIG.timeout = parseInt(response.timeout) * 1000;
		$('#message').attr('maxlength', CONFIG.maxMessageLength);
		$('#charCount').text(`0/${CONFIG.maxMessageLength}`);
	} catch (error) {
		CONFIG.maxMessageLength = null;
		CONFIG.maxPhoneLength = null;
	}
}

async function loadSettingsFromFile() {
	try {
		if (CONFIG.debugMode) {
			console.log('🔧 [DEBUG] Carregando configurações do settings.json');
		}
		
		const response = await fetch('config/settings.json');
		if (response.ok) {
			const settings = await response.json();
			CONFIG.timeout = parseInt(settings.timeout) * 1000;
			CONFIG.maxMessageLength = parseInt(settings.max_message_length) || null;
			CONFIG.maxPhoneLength = parseInt(settings.max_phone_length) || null;
			CONFIG.debugMode = settings.debug_mode || false;
			
			if (CONFIG.debugMode) {
				console.log('🔧 [DEBUG] Configurações carregadas:', {
					timeout: CONFIG.timeout,
					maxMessageLength: CONFIG.maxMessageLength,
					maxPhoneLength: CONFIG.maxPhoneLength,
					debugMode: CONFIG.debugMode
				});
			}
		}
	} catch (error) {
		if (CONFIG.debugMode) {
			console.error('🔧 [DEBUG] Erro ao carregar settings.json:', error);
		}
	}
}

function applyPhoneMask(element) {
	let value = $(element).val().replace(/[^0-9]/g, '').substring(0, 13);

	if (value.length < 2) return $(element).val(value);

		const ddi = value.substring(0, 2);
		const ddd = value.substring(2, 4);
		const numero = value.substring(4);

	let formatted = `+${ddi}`;
	if (value.length > 2) formatted += ` (${ddd}`;
	if (value.length > 4) formatted += `) ${numero}`;
	if (value.length >= 11) {
		const is9digits = numero.length >= 9;
		const pos = is9digits ? 5 : 4;
		formatted = `+${ddi} (${ddd}) ${numero.substring(0, pos)}-${numero.substring(pos)}`;
	}
	
	$(element).val(formatted);
}

const ALERT_CONFIG = {
	success: { color: '#48bb78', timer: 5000, progressBar: true },
	error: { color: '#f56565', timer: null, progressBar: false },
	info: { color: '#4299e1', timer: 4000, progressBar: true },
	warning: { color: '#ed8936', timer: null, progressBar: false }
};

function showAlert(title, text, type = 'info') {
	const config = ALERT_CONFIG[type] || ALERT_CONFIG.info;
	const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
	
	const alertConfig = {
		title, text, icon: type,
		confirmButtonText: 'OK',
		confirmButtonColor: config.color
	};
	
	if (currentTheme === 'dark') {
		alertConfig.background = 'var(--card-background)';
		alertConfig.color = 'var(--text-primary)';
	}
	
	if (config.timer) {
		alertConfig.timer = config.timer;
		alertConfig.timerProgressBar = config.progressBar;
	}
	Swal.fire(alertConfig);
}

function showLoadingAlert(title = 'Processando...', text = 'Aguarde um momento') {
	const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
	
	const config = {
		title, text,
		allowOutsideClick: false,
		allowEscapeKey: false,
		showConfirmButton: false,
		didOpen: () => Swal.showLoading()
	};
	
	if (currentTheme === 'dark') {
		config.background = 'var(--card-background)';
		config.color = 'var(--text-primary)';
	}
	
	Swal.fire(config);
}

function showResponse(message, type = 'info') {
	const titles = { success: 'Sucesso!', error: 'Erro!', warning: 'Atenção!', info: 'Informação' };
	showAlert(titles[type] || titles.info, message, type);
}

function handleSendResponse(response, successMessage, formSelector) {
	currentFormSelector = formSelector;
	
	if (response && (response.success || response.message)) {
		messagesSent++;
		const messageId = response.data?.id || response.id || response.messageId || 'temp_' + Date.now();
		showMessageStatusModal(messageId, successMessage, formSelector);
	} else {
		showAlert('Erro ao Enviar', `Erro: ${response.message || 'Erro desconhecido'}`, 'error');
	}
}

function clearForm() {
	const activeTab = $('.tab.active').attr('onclick');
	
	if (activeTab && activeTab.includes("switchTab('text')")) {
		$('#messageForm textarea[name="message"]').val('');
		$('#charCount').text(`0/${CONFIG.maxMessageLength}`);
	} else if (activeTab && activeTab.includes("switchTab('media')")) {
		$('#mediaForm textarea[name="caption"]').val('');
		$('#mediaForm input[name="media_url"]').val('');
	} else if (activeTab && activeTab.includes("switchTab('location')")) {
		$('#locationForm input[name="lat"]').val('');
		$('#locationForm input[name="long"]').val('');
	} else if (activeTab && activeTab.includes("switchTab('contact')")) {
		$('#contactForm input[name="displayName"]').val('');
		$('#contactForm input[name="fileUrl"]').val('');
	}
}

function clearFormFields(formSelector) {
	if (formSelector === '#messageForm') {
		$('#messageForm textarea[name="message"]').val('');
		$('#charCount').text(`0/${CONFIG.maxMessageLength}`);
	} else if (formSelector === '#mediaForm') {
		$('#mediaForm textarea[name="caption"]').val('');
		$('#mediaForm input[name="media_url"]').val('');
	} else if (formSelector === '#locationForm') {
		$('#locationForm input[name="lat"]').val('');
		$('#locationForm input[name="long"]').val('');
	} else if (formSelector === '#contactForm') {
		$('#contactForm input[name="displayName"]').val('');
		$('#contactForm input[name="fileUrl"]').val('');
	} else if (formSelector === '#reactionForm') {
		$('#reactionForm input[name="reaction"]').val('');
		$('#reactionForm input[name="remoteJid"]').val('');
		$('#reactionForm input[name="messageId"]').val('');
		$('#reactionForm input[name="fromMe"]').prop('checked', false);
	}
}

async function showMessageStatusModal(messageId, successMessage, formSelector) {
	let statusCheckCount = 0;
	const maxChecks = 10;
	
	const statusModal = Swal.fire({
		title: 'Verificando Envio',
		html: `
			<div class="modal-content-wrapper">
				<div id="statusContainer" class="modal-status-container info">
					<div class="modal-status-header">
						<i id="statusIcon" class="fas fa-paper-plane modal-status-icon info"></i>
						<h3 id="statusTitle" class="modal-status-title info">Status da Mensagem</h3>
						<p id="statusSubtitle" class="modal-status-subtitle info">Enviando mensagem...</p>
					</div>
					
					<div class="modal-status-info">
						<div class="modal-status-row">
							<span id="statusLabel" class="modal-status-label info">Status:</span>
							<span id="messageStatus" class="modal-status-value info">Enviando</span>
						</div>
					</div>
					
					<div class="modal-progress-container">
						<div id="messageProgressBar" class="modal-progress-bar info"></div>
					</div>
				</div>
			</div>
		`,
		width: '500px',
		padding: '20px 0',
		allowOutsideClick: false,
		allowEscapeKey: false,
		showConfirmButton: false,
		showCloseButton: false,
		backdrop: 'rgba(0, 0, 0, 0.4)',
		didOpen: () => {
			checkMessageStatus(messageId, statusCheckCount, maxChecks, statusModal);
		}
	});
}

async function showGenericStatusModal(title, subtitle, messageId, successMessage, formSelector) {
	let statusCheckCount = 0;
	const maxChecks = Math.floor(CONFIG.timeout / 1000) || 60;
	
	const statusModal = Swal.fire({
		title: 'Verificando Envio',
		html: `
			<div class="modal-content-wrapper">
				<div id="statusContainer" class="modal-status-container info">
					<div class="modal-status-header">
						<i id="statusIcon" class="fas fa-paper-plane modal-status-icon info"></i>
						<h3 id="statusTitle" class="modal-status-title">${title}</h3>
						<p id="statusSubtitle" class="modal-status-subtitle">${subtitle}</p>
					</div>
					
					<div class="modal-status-info">
						<div class="modal-status-row">
							<span id="statusLabel" class="modal-status-label info">Status:</span>
							<span id="messageStatus" class="modal-status-value info">Enviando</span>
						</div>
					</div>
					
					<div class="modal-progress-container">
						<div id="messageProgressBar" class="modal-progress-bar info"></div>
					</div>
				</div>
			</div>
		`,
		width: '500px',
		padding: '20px 0',
		allowOutsideClick: false,
		allowEscapeKey: false,
		showConfirmButton: false,
		showCloseButton: false,
		backdrop: 'rgba(0, 0, 0, 0.4)',
		didOpen: () => {
			checkGenericStatus(messageId, statusCheckCount, maxChecks, statusModal, successMessage, formSelector);
		}
	});
}

let isGenericStatusCompleted = false;

async function checkGenericStatus(messageId, checkCount, maxChecks, modal, successMessage, formSelector) {
	if (isGenericStatusCompleted) return;
	
	const progressBar = document.getElementById('messageProgressBar');
	if (progressBar && !isGenericStatusCompleted) {
		const progress = ((checkCount + 1) / maxChecks) * 100;
		progressBar.style.width = progress + '%';
	}
	
	if (checkCount >= maxChecks) {
		isGenericStatusCompleted = true;
		if (Swal.isVisible()) {
			Swal.update({
				title: successMessage,
				showConfirmButton: true,
		confirmButtonText: 'OK',
				confirmButtonColor: '#10b981',
				allowOutsideClick: true,
				allowEscapeKey: true,
				customClass: {
					confirmButton: 'swal-confirm-button'
				}
			});
		}
		
		setTimeout(() => {
			const statusElement = document.getElementById('messageStatus');
			const statusSubtitle = document.getElementById('statusSubtitle');
			const statusTitle = document.getElementById('statusTitle');
			const statusIcon = document.getElementById('statusIcon');
			const progressBar = document.getElementById('messageProgressBar');
			
			applySuccessState();
			
			if (progressBar) {
			}
		}, 100);
		
		setTimeout(() => {
			Swal.close();
			clearFormFields(formSelector);
		}, 3000);
		return;
	}
	
	if (!isGenericStatusCompleted) {
		setTimeout(() => {
			checkGenericStatus(messageId, checkCount + 1, maxChecks, modal, successMessage, formSelector);
		}, 1000);
	}
}

async function checkMessageStatus(messageId, checkCount, maxChecks, modal) {
	if (messageId.startsWith('temp_')) {
		const progressBar = document.getElementById('messageProgressBar');
		if (progressBar) {
			const progress = ((checkCount + 1) / maxChecks) * 100;
			progressBar.style.width = progress + '%';
		}
		
		if (checkCount < 2) {
			updateModalStatus('PENDING', 'Pendente', '#f59e0b', 'Verificando status da mensagem...');
		} else if (checkCount < 4) {
			updateModalStatus('SENDING', 'Enviando...', '#0ea5e9', 'Enviando mensagem...');
		} else {
			Swal.update({
				title: 'Mensagem Enviada!',
				showConfirmButton: true,
		confirmButtonText: 'OK',
				confirmButtonColor: '#10b981',
				allowOutsideClick: true,
				allowEscapeKey: true,
				customClass: {
					confirmButton: 'swal-confirm-button'
				}
			});
			
			setTimeout(() => {
				const statusElement = document.getElementById('messageStatus');
				const statusSubtitle = document.getElementById('statusSubtitle');
				const statusTitle = document.getElementById('statusTitle');
				const statusIcon = document.getElementById('statusIcon');
				const progressBar = document.getElementById('messageProgressBar');
				
				applySuccessState();
				
				
				const statusContainer = document.getElementById('statusContainer');
				if (statusContainer) {
				}
				
				if (statusSubtitle) {
					statusSubtitle.innerHTML = 'Mensagem enviada com sucesso!';
				}
				
				if (statusTitle) {
					statusTitle.innerHTML = 'Mensagem Enviada!';
				}
				
				if (statusIcon) {
					statusIcon.className = 'modal-status-icon fas fa-check-circle success';
				}
				
				if (progressBar) {
				}
			}, 100);
			
			setTimeout(() => {
				Swal.close();
				clearFormFields(getCurrentFormSelector());
			}, 3000);
			return;
		}
		
		setTimeout(() => {
			checkMessageStatus(messageId, checkCount + 1, maxChecks, modal);
		}, 1000);
		return;
	}
	
	if (checkCount >= maxChecks) {
		showAlert('Timeout', 'Não foi possível confirmar o status da mensagem', 'error');
		return;
	}
	
	try {
		const progressBar = document.getElementById('messageProgressBar');
		if (progressBar) {
			const progress = ((checkCount + 1) / maxChecks) * 100;
			progressBar.style.width = progress + '%';
		}
		
		const statusResponse = await makeApiRequest('get_message_status', { messageId: messageId });
		
		let status = 'PENDING';
		let statusText = 'Pendente';
		let statusColor = '#f59e0b';
		let subtitle = 'Verificando status da mensagem...';
		
		if (statusResponse && statusResponse.data) {
			status = statusResponse.data.status || 'PENDING';
			
			switch (status) {
				case 'SENT':
					statusText = 'Enviado';
					statusColor = '#10b981';
					subtitle = 'Mensagem enviada com sucesso!';
			break;
				case 'DELIVERED':
					statusText = 'Entregue';
					statusColor = '#0ea5e9';
					subtitle = 'Enviando mensagem...';
			break;
				case 'READ':
					statusText = 'Lida';
					statusColor = '#8b5cf6';
					subtitle = 'Enviando mensagem...';
			break;
				case 'FAILED':
					statusText = 'Falhou';
					statusColor = '#ef4444';
					subtitle = 'Enviando mensagem...';
			break;
				default:
					statusText = 'Pendente';
					statusColor = '#f59e0b';
					subtitle = 'Enviando mensagem...';
			}
		}
		
		updateModalStatus(status, statusText, statusColor, subtitle);
		
		if (status === 'SENT' || status === 'DELIVERED' || status === 'READ') {
			Swal.update({
				title: 'Mensagem Enviada!',
				showConfirmButton: true,
		confirmButtonText: 'OK',
				confirmButtonColor: '#10b981',
				allowOutsideClick: true,
				allowEscapeKey: true,
				customClass: {
					confirmButton: 'swal-confirm-button'
				}
			});
			
			setTimeout(() => {
				const statusElement = document.getElementById('messageStatus');
				const statusSubtitle = document.getElementById('statusSubtitle');
				const statusTitle = document.getElementById('statusTitle');
				const statusIcon = document.getElementById('statusIcon');
				const progressBar = document.getElementById('messageProgressBar');
				
				if (statusElement) {
					statusElement.innerHTML = 'Enviado';
				}
				
				if (statusSubtitle) {
					statusSubtitle.innerHTML = 'Mensagem enviada com sucesso!';
				}
				
				if (statusTitle) {
					statusTitle.innerHTML = 'Mensagem Enviada!';
				}
				
				if (statusIcon) {
					statusIcon.className = 'modal-status-icon fas fa-check-circle success';
				}
				
				if (progressBar) {
				}
			}, 100);
			
			setTimeout(() => {
				Swal.close();
				clearFormFields(getCurrentFormSelector());
			}, 3000);
			return;
		}
		
		if (status === 'FAILED') {
			showAlert('Falha no Envio', 'A mensagem falhou ao ser enviada', 'error');
			return;
		}
		
		setTimeout(() => {
			checkMessageStatus(messageId, checkCount + 1, maxChecks, modal);
		}, 1000);
		
	} catch (error) {
		setTimeout(() => {
			checkMessageStatus(messageId, checkCount + 1, maxChecks, modal);
		}, 1000);
	}
}

function updateModalStatus(status, statusText, statusColor, subtitle) {
	const statusElement = document.getElementById('messageStatus');
	const statusIcon = document.getElementById('statusIcon');
	const statusContainer = document.getElementById('statusContainer');
	const statusSubtitle = document.getElementById('statusSubtitle');
	const statusTitle = document.getElementById('statusTitle');
	const progressBar = document.getElementById('messageProgressBar');
	const statusLabel = document.getElementById('statusLabel');
	
	if (statusContainer) {
		statusContainer.className = 'modal-status-container';
	}
	if (statusIcon) {
		statusIcon.className = 'modal-status-icon fas';
	}
	if (statusTitle) {
		statusTitle.className = 'modal-status-title';
	}
	if (statusSubtitle) {
		statusSubtitle.className = 'modal-status-subtitle';
	}
	if (statusElement) {
		statusElement.className = 'modal-status-value';
	}
	if (progressBar) {
		progressBar.className = 'modal-progress-bar';
	}
	if (statusLabel) {
		statusLabel.className = 'modal-status-label';
	}
	
	let stateClass = 'info';
	if (status === 'SENT' || status === 'DELIVERED' || status === 'READ') {
		stateClass = 'success';
	} else if (status === 'FAILED') {
		stateClass = 'error';
	} else if (status === 'PENDING') {
		stateClass = 'warning';
	}
	
	if (statusContainer) {
		statusContainer.classList.add(stateClass);
	}
	if (statusIcon) {
		statusIcon.classList.add(stateClass);
	}
	if (statusTitle) {
		statusTitle.classList.add(stateClass);
	}
	if (statusSubtitle) {
		statusSubtitle.classList.add(stateClass);
	}
	if (statusElement) {
		statusElement.classList.add(stateClass);
	}
	if (progressBar) {
		progressBar.classList.add(stateClass);
	}
	if (statusLabel) {
		statusLabel.classList.add(stateClass);
	}
	
	if (statusElement) {
		statusElement.textContent = statusText;
	}
	
	if (statusSubtitle) {
		statusSubtitle.textContent = subtitle;
	}
	
	if (statusTitle) {
		if (status === 'SENT' || status === 'DELIVERED' || status === 'READ') {
			statusTitle.textContent = 'Mensagem Enviada!';
		}
	}
	
	if (statusIcon) {
		if (status === 'SENT' || status === 'DELIVERED' || status === 'READ') {
			statusIcon.className = 'modal-status-icon fas fa-check-circle ' + stateClass;
		} else if (status === 'FAILED') {
			statusIcon.className = 'modal-status-icon fas fa-times-circle ' + stateClass;
		} else {
			statusIcon.className = 'modal-status-icon fas fa-paper-plane ' + stateClass;
		}
	}
}

function applySuccessState() {
	const statusElement = document.getElementById('messageStatus');
	const statusIcon = document.getElementById('statusIcon');
	const statusContainer = document.getElementById('statusContainer');
	const statusSubtitle = document.getElementById('statusSubtitle');
	const statusTitle = document.getElementById('statusTitle');
	const progressBar = document.getElementById('messageProgressBar');
	const statusLabel = document.getElementById('statusLabel');
	
	if (statusContainer) {
		statusContainer.className = 'modal-status-container success';
	}
	if (statusIcon) {
		statusIcon.className = 'modal-status-icon success fa-check-circle';
	}
	if (statusTitle) {
		statusTitle.className = 'modal-status-title success';
	}
	if (statusSubtitle) {
		statusSubtitle.className = 'modal-status-subtitle success';
	}
	if (statusElement) {
		statusElement.className = 'modal-status-value success';
	}
	if (progressBar) {
		progressBar.className = 'modal-progress-bar success';
	}
	if (statusLabel) {
		statusLabel.className = 'modal-status-label success';
	}
	
	if (statusElement) {
		statusElement.textContent = 'Enviado';
	}
	if (statusSubtitle) {
		statusSubtitle.textContent = 'Mensagem enviada com sucesso!';
	}
	if (statusTitle) {
		statusTitle.textContent = 'Mensagem Enviada!';
	}
}

let currentFormSelector = '#messageForm';

function getCurrentFormSelector() {
	return currentFormSelector;
}


function showHtmlAlert(title, html, icon = 'success', confirmText = 'OK') {
	const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
	
	const config = {
		title: title,
		html: html,
		icon: icon,
		confirmButtonText: confirmText,
		confirmButtonColor: icon === 'success' ? '#48bb78' : icon === 'error' ? '#f56565' : icon === 'warning' ? '#ed8936' : '#4299e1',
		width: '500px'
	};
	
	if (currentTheme === 'dark') {
		config.background = 'var(--card-background)';
		config.color = 'var(--text-primary)';
	}
	
	Swal.fire(config);
}

function showValidationError() {
	showAlert('Validação Falhou', 'Não foi possível validar o número. Continuando com o envio...');
}

function getSwalThemeConfig() {
	const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
	
	if (currentTheme === 'dark') {
		return {
			background: 'var(--card-background)',
			color: 'var(--text-primary)'
		};
	}
	
	return {};
}
$(document).ready(async function () {
	loadTheme();
	await loadInitialConfig();
	initializeApp();
	setupEventListeners();
	loadDefaultNumbers();
	checkConnectionStatus();
	updateInterfaceVisibility();
	toggleDebugMode();
});

function initializeApp() {

	updateButtonVisibility();

	updateSendButtonsState();

	$('#message').on('input', function () {
		const length = $(this).val().length;
		const maxLength = CONFIG.maxMessageLength;
		$('#charCount').text(`${length}/${maxLength}`);
		$('#charCount').removeClass('warning error');
		if (maxLength && length > maxLength * 0.9) {
			$('#charCount').addClass('warning');
		}
		if (maxLength && length > maxLength) {
			$('#charCount').addClass('error');
		}
	});
	$('input[name="target"], #globalTarget').on('input', function () {
		applyPhoneMask(this);
	});

	$('#configDefaultNumber').on('input', function () {
		let value = $(this).val().replace(/[^0-9]/g, '');

		if (value.length > 9) {
			value = value.substring(0, 9);
		}

		if (value.length === 9) {

			value = value.substring(0, 5) + '-' + value.substring(5);
		} else if (value.length === 8) {

			value = value.substring(0, 4) + '-' + value.substring(4);
		} else if (value.length >= 5) {

			value = value.substring(0, 5) + '-' + value.substring(5);
		} else if (value.length >= 4) {

			value = value.substring(0, 4) + '-' + value.substring(4);
		}
		$(this).val(value);
	});

	$('#configDefaultNumber').on('keydown', function (e) {
		if (e.key === 'Backspace') {
			const currentValue = $(this).val();
			const cursorPos = this.selectionStart;

			if (currentValue[cursorPos - 1] === '-') {
				e.preventDefault();
				let value = currentValue.replace(/[^0-9]/g, '');
				value = value.substring(0, value.length - 1);
				if (value.length === 9) {
					value = value.substring(0, 5) + '-' + value.substring(5);
				} else if (value.length === 8) {
					value = value.substring(0, 4) + '-' + value.substring(4);
				} else if (value.length >= 5) {
					value = value.substring(0, 5) + '-' + value.substring(5);
				} else if (value.length >= 4) {
					value = value.substring(0, 4) + '-' + value.substring(4);
				}

				$(this).val(value);

				const newCursorPos = value.length;
				this.setSelectionRange(newCursorPos, newCursorPos);
			}
		}
	});

	$('#audioLive').on('change', function() {
		const label = document.getElementById('audioLiveLabel');
		if (label) {
			label.textContent = this.checked ? 'Ativado' : 'Desativado';
		}
	});
}

async function loadDefaultNumbers() {
	try {
		const response = await makeApiRequest('get_config', {});
		if (response) {

			if (response.default_ddd && response.default_number) {

				const cleanNumber = response.default_number.replace(/[^0-9]/g, '');
				const defaultPhone = '55' + response.default_ddd + cleanNumber;


				$('#messageTarget, #mediaTarget, #locationTarget, #contactTarget, #globalTarget').each(function () {
					if ($(this).val() === '' || $(this).val() === '5599999999999') {

						$(this).val(defaultPhone);

						applyPhoneMask(this);
					}
				});
			}

			if (response.max_message) {
				CONFIG.maxMessageLength = parseInt(response.max_message);
				$('#message').attr('maxlength', CONFIG.maxMessageLength);
				$('#charCount').text(`0/${CONFIG.maxMessageLength}`);
			}

			if (response.timeout) {
				CONFIG.timeout = parseInt(response.timeout) * 1000;
			}
		}
	} catch (error) {}


	updateButtonVisibility();


	$('input[name="target"], #globalTarget').each(function () {
		if ($(this).val() && $(this).val() !== '') {
			applyPhoneMask(this);
		}
	});

}

function setupEventListeners() {

	$('#messageForm').on('submit', async function (e) {
		e.preventDefault();
		if (!(await isConnectedForSending())) {
			showNotConnectedAlert();
			return;
		}
		sendTextMessage();
	});
	$('#mediaForm').on('submit', async function (e) {
		e.preventDefault();
		if ($(this).hasClass('sending')) return;
		$(this).addClass('sending');
		
		if (!(await isConnectedForSending())) {
			showNotConnectedAlert();
			$(this).removeClass('sending');
			return;
		}
		await sendMediaMessage();
		$(this).removeClass('sending');
	});
	$('#locationForm').on('submit', async function (e) {
		e.preventDefault();
		if ($(this).hasClass('sending')) return;
		$(this).addClass('sending');
		
		if (!(await isConnectedForSending())) {
			showNotConnectedAlert();
			$(this).removeClass('sending');
			return;
		}
		await sendLocationMessage();
		$(this).removeClass('sending');
	});
	$('#contactForm').on('submit', async function (e) {
		e.preventDefault();
		if ($(this).hasClass('sending')) return;
		$(this).addClass('sending');
		
		if (!(await isConnectedForSending())) {
			showNotConnectedAlert();
			$(this).removeClass('sending');
			return;
		}
		await sendContactMessage();
		$(this).removeClass('sending');
	});
	$('#reactionForm').on('submit', async function (e) {
		e.preventDefault();
		if (!(await isConnectedForSending())) {
			showNotConnectedAlert();
			return;
		}
		sendReactionMessage();
	});
	$('#getStatusBtn').on('click', getStatus);
	$('#getQrBtn').on('click', getQrCode);
	$('#startInstanceBtn').on('click', startInstance);
	$('#rebootInstanceBtn').on('click', rebootInstance);
	$('#logoutInstanceBtn').on('click', logoutInstance);
	$('#getContactStatusBtn').on('click', function() {
		const connectedForSending = isConnected && window.currentStatus &&
			window.currentStatus.state === 'active' &&
			window.currentStatus.status === 'connected' &&
			window.currentStatus.phase === 'authenticated';
		
		if (!connectedForSending) {
			showNotConnectedAlert();
			return;
		}
		validateNumber(getContactStatus);
	});
	$('#getContactAvatarBtn').on('click', function() {
		const connectedForSending = isConnected && window.currentStatus &&
			window.currentStatus.state === 'active' &&
			window.currentStatus.status === 'connected' &&
			window.currentStatus.phase === 'authenticated';
		
		if (!connectedForSending) {
		showNotConnectedAlert();
		return;
	}
		validateNumber(getContactAvatar);
	});
	$('#validateNumberBtn').on('click', function() {
		const connectedForSending = isConnected && window.currentStatus &&
			window.currentStatus.state === 'active' &&
			window.currentStatus.status === 'connected' &&
			window.currentStatus.phase === 'authenticated';
		
		if (!connectedForSending) {
			showNotConnectedAlert();
			return;
		}
		validateNumber();
	});
	$('#blockContactBtn').on('click', function() {
		const connectedForSending = isConnected && window.currentStatus &&
			window.currentStatus.state === 'active' &&
			window.currentStatus.status === 'connected' &&
			window.currentStatus.phase === 'authenticated';
		
		if (!connectedForSending) {
			showNotConnectedAlert();
			return;
		}
		validateNumber(blockContact);
	});
	$('#unblockContactBtn').on('click', function() {
		const connectedForSending = isConnected && window.currentStatus &&
			window.currentStatus.state === 'active' &&
			window.currentStatus.status === 'connected' &&
			window.currentStatus.phase === 'authenticated';
		
		if (!connectedForSending) {
			showNotConnectedAlert();
			return;
		}
		validateNumber(unblockContact);
	});
}
async function sendTextMessage() {
	if (CONFIG.debugMode) {
		console.log('🔧 [DEBUG] Iniciando envio de mensagem de texto');
	}

	const formData = {
		target: $('#messageForm input[name="target"]').val().replace(/[^0-9]/g, ''),
		message: $('#messageForm textarea[name="message"]').val()
	};

	if (CONFIG.debugMode) {
		console.log('🔧 [DEBUG] Dados da mensagem:', {
			target: formData.target,
			messageLength: formData.message.length,
			timestamp: new Date().toISOString()
		});
	}

	if (!formData.target || !formData.message) {
		showAlert('Campos Obrigatórios', 'Por favor, preencha o número e a mensagem.');
		return;
	}
	try {
		showLoadingAlert('Validando Número', 'Verificando se o número está no WhatsApp...');
		const validationResponse = await makeApiRequest('validate_number', {
			target: formData.target
		});

		let exists = false;
		if (validationResponse && validationResponse.exists !== undefined) {
			exists = validationResponse.exists;
		} else if (validationResponse && validationResponse.data && validationResponse.data.exists !== undefined) {
			exists = validationResponse.data.exists;
		}

		if (!exists) {
			showAlert('Número Inválido', 'Este número não está no WhatsApp. Verifique o número e tente novamente.');
			return;
		}
	} catch (error) {
		showValidationError();
	}

	try {
		const response = await makeApiRequest('send_message', formData);

		handleSendResponse(response, 'Mensagem Enviada!', '#messageForm');
	} catch (error) {
		showAlert('Erro ao Enviar', error.message, 'error');
	}
}

async function sendMediaMessage() {
	isGenericStatusCompleted = false;

	const formData = {
		target: $('#mediaForm input[name="target"]').val().replace(/[^0-9]/g, ''),
		fileUrl: $('#mediaForm input[name="media_url"]').val(),
		caption: $('#mediaForm textarea[name="caption"]').val(),
		type: $('#mediaForm select[name="media_type"]').val()
	};

	if (formData.type === 'audio') {
		const audioLiveCheckbox = document.getElementById('audioLive');
		formData.live = audioLiveCheckbox ? audioLiveCheckbox.checked : true;
	}

	if (!formData.target || !formData.fileUrl || !formData.type) {
		showAlert('Campos Obrigatórios', 'Por favor, preencha o número, URL da mídia e o tipo.');
		return;
	}

	try {
		showLoadingAlert('Validando Número', 'Verificando se o número está no WhatsApp...');
		const validationResponse = await makeApiRequest('validate_number', {
			target: formData.target
		});

		let exists = false;
		if (validationResponse && validationResponse.exists !== undefined) {
			exists = validationResponse.exists;
		} else if (validationResponse && validationResponse.data && validationResponse.data.exists !== undefined) {
			exists = validationResponse.data.exists;
		}

		if (!exists) {
			showAlert('Número Inválido', 'Este número não está no WhatsApp. Verifique o número e tente novamente.');
		return;
		}
	} catch (error) {
		showValidationError();
	}

	const messageId = 'temp_' + Date.now();
	showGenericStatusModal('Status da Mídia', 'Enviando mídia...', messageId, 'Mídia Enviada!', '#mediaForm');

	try {
		const response = await makeApiRequest('send_media', formData);

		if (response && (response.success || response.message)) {
			messagesSent++;
			isGenericStatusCompleted = true;
			if (Swal.isVisible()) {
				Swal.update({
					title: 'Mídia Enviada!',
					showConfirmButton: true,
					confirmButtonText: 'OK',
					confirmButtonColor: '#10b981',
					allowOutsideClick: true,
					allowEscapeKey: true,
					customClass: {
						confirmButton: 'swal-confirm-button'
					}
				});
			}
			
			setTimeout(() => {
				const statusElement = document.getElementById('messageStatus');
				const statusSubtitle = document.getElementById('statusSubtitle');
				const statusTitle = document.getElementById('statusTitle');
				const statusIcon = document.getElementById('statusIcon');
				const progressBar = document.getElementById('messageProgressBar');
				
				applySuccessState();
				
				
				const statusContainer = document.getElementById('statusContainer');
				if (statusContainer) {
				}
				
				if (statusSubtitle) {
					statusSubtitle.innerHTML = 'Mídia enviada com sucesso!';
				}
				
				if (statusTitle) {
					statusTitle.innerHTML = 'Mídia Enviada!';
				}
				
				if (statusIcon) {
					statusIcon.className = 'modal-status-icon fas fa-check-circle success';
				}
				
				if (progressBar) {
				}
			}, 100);
			
			setTimeout(() => {
				Swal.close();
			}, 3000);
		} else {
			Swal.close();
			let errorMessage = 'Erro desconhecido';
			if (response && response.message) {
				if (typeof response.message === 'string') {
					errorMessage = response.message;
				} else if (typeof response.message === 'object') {
					errorMessage = 'Erro na resposta da API';
				}
			}
			showAlert('Erro ao Enviar', `Erro: ${errorMessage}`);
		}
	} catch (error) {
		Swal.close();
		if (error.message.includes('Operation timed out') || error.message.includes('timeout')) {
			showAlert(
				'Timeout na Conexão',
				'A conexão com a API demorou muito para responder. Isso pode acontecer devido à instabilidade da API.\n\nTente novamente em alguns segundos.'
			);
		} else {
			showAlert('Erro ao Enviar', error.message, 'error');
		}
	}
}

async function sendLocationMessage() {
	isGenericStatusCompleted = false;

	const formData = {
		target: $('#locationForm input[name="target"]').val().replace(/[^0-9]/g, ''),
		lat: parseFloat($('#locationForm input[name="lat"]').val()),
		long: parseFloat($('#locationForm input[name="long"]').val())
	};

	if (!formData.target || isNaN(formData.lat) || isNaN(formData.long)) {
		showAlert('Campos Obrigatórios', 'Por favor, preencha o número, latitude e longitude com valores válidos.');
		return;
	}

	try {
		showLoadingAlert('Validando Número', 'Verificando se o número está no WhatsApp...');
		const validationResponse = await makeApiRequest('validate_number', {
			target: formData.target
		});

		let exists = false;
		if (validationResponse && validationResponse.exists !== undefined) {
			exists = validationResponse.exists;
		} else if (validationResponse && validationResponse.data && validationResponse.data.exists !== undefined) {
			exists = validationResponse.data.exists;
		}

		if (!exists) {
			showAlert('Número Inválido', 'Este número não está no WhatsApp. Verifique o número e tente novamente.');
			return;
		}
	} catch (error) {
		showValidationError();
	}

	const messageId = 'temp_' + Date.now();
	showGenericStatusModal('Status da Localização', 'Enviando localização...', messageId, 'Localização Enviada!', '#locationForm');
	
	try {
		const response = await makeApiRequest('send_location', formData);

		if (response && (response.success || response.message)) {
			messagesSent++;
			isGenericStatusCompleted = true;
			if (Swal.isVisible()) {
				Swal.update({
					title: 'Localização Enviada!',
					showConfirmButton: true,
					confirmButtonText: 'OK',
					confirmButtonColor: '#10b981',
					allowOutsideClick: true,
					allowEscapeKey: true,
					customClass: {
						confirmButton: 'swal-confirm-button'
					}
				});
			}
			
			setTimeout(() => {
				const statusElement = document.getElementById('messageStatus');
				const statusSubtitle = document.getElementById('statusSubtitle');
				const statusTitle = document.getElementById('statusTitle');
				const statusIcon = document.getElementById('statusIcon');
				const progressBar = document.getElementById('messageProgressBar');
				
				applySuccessState();
				
				
				const statusContainer = document.getElementById('statusContainer');
				if (statusContainer) {
				}
				
				if (statusSubtitle) {
					statusSubtitle.innerHTML = 'Localização enviada com sucesso!';
				}
				
				if (statusTitle) {
					statusTitle.innerHTML = 'Localização Enviada!';
				}
				
				if (statusIcon) {
					statusIcon.className = 'modal-status-icon fas fa-check-circle success';
				}
				
				if (progressBar) {
				}
			}, 100);
			
			setTimeout(() => {
				Swal.close();
			}, 3000);
		} else {
			Swal.close();
			let errorMessage = 'Erro desconhecido';
			if (response && response.message) {
				if (typeof response.message === 'string') {
					errorMessage = response.message;
				} else if (typeof response.message === 'object') {
					errorMessage = 'Erro na resposta da API';
				}
			}
			showAlert('Erro ao Enviar', `Erro: ${errorMessage}`);
		}
	} catch (error) {
		Swal.close();
		showAlert('Erro ao Enviar', error.message, 'error');
	}
}

async function sendContactMessage() {
	isGenericStatusCompleted = false;

	const formData = {
		target: $('#contactForm input[name="target"]').val().replace(/[^0-9]/g, ''),
		displayName: $('#contactForm input[name="displayName"]').val(),
		fileUrl: $('#contactForm input[name="fileUrl"]').val()
	};

	if (!formData.target || !formData.displayName || !formData.fileUrl) {
		showAlert('Campos Obrigatórios', 'Por favor, preencha o número, nome do contato e a URL do arquivo VCF.');
		return;
	}

	try {
		showLoadingAlert('Validando Número', 'Verificando se o número está no WhatsApp...');
		const validationResponse = await makeApiRequest('validate_number', {
			target: formData.target
		});

		let exists = false;
		if (validationResponse && validationResponse.exists !== undefined) {
			exists = validationResponse.exists;
		} else if (validationResponse && validationResponse.data && validationResponse.data.exists !== undefined) {
			exists = validationResponse.data.exists;
		}

		if (!exists) {
			showAlert('Número Inválido', 'Este número não está no WhatsApp. Verifique o número e tente novamente.');
			return;
		}
	} catch (error) {
		showValidationError();
	}

	const messageId = 'temp_' + Date.now();
	showGenericStatusModal('Status do Contato', 'Enviando contato...', messageId, 'Contato Enviado!', '#contactForm');
	
	try {
		const response = await makeApiRequest('send_contact', formData);

		if (response && (response.success || response.message)) {
			messagesSent++;
			isGenericStatusCompleted = true;
			if (Swal.isVisible()) {
				Swal.update({
					title: 'Contato Enviado!',
					showConfirmButton: true,
					confirmButtonText: 'OK',
					confirmButtonColor: '#10b981',
					allowOutsideClick: true,
					allowEscapeKey: true,
					customClass: {
						confirmButton: 'swal-confirm-button'
					}
				});
			}
			
			setTimeout(() => {
				const statusElement = document.getElementById('messageStatus');
				const statusSubtitle = document.getElementById('statusSubtitle');
				const statusTitle = document.getElementById('statusTitle');
				const statusIcon = document.getElementById('statusIcon');
				const progressBar = document.getElementById('messageProgressBar');
				
				applySuccessState();
				
				
				const statusContainer = document.getElementById('statusContainer');
				if (statusContainer) {
				}
				
				if (statusSubtitle) {
					statusSubtitle.innerHTML = 'Contato enviado com sucesso!';
				}
				
				if (statusTitle) {
					statusTitle.innerHTML = 'Contato Enviado!';
				}
				
				if (statusIcon) {
					statusIcon.className = 'modal-status-icon fas fa-check-circle success';
				}
				
				if (progressBar) {
				}
			}, 100);
			
			setTimeout(() => {
				Swal.close();
			}, 3000);
		} else {
			Swal.close();
			let errorMessage = 'Erro desconhecido';
			if (response && response.message) {
				if (typeof response.message === 'string') {
					errorMessage = response.message;
				} else if (typeof response.message === 'object') {
					errorMessage = 'Erro na resposta da API';
				}
			}
			showAlert('Erro ao Enviar', `Erro: ${errorMessage}`);
		}
	} catch (error) {
		Swal.close();
		showAlert('Erro ao Enviar', error.message, 'error');
	}
}

async function sendReactionMessage() {

	const formData = {
		target: $('#reactionForm input[name="target"]').val().replace(/[^0-9]/g, ''),
		reaction: $('#reactionForm input[name="reaction"]').val(),
		messageKey: {
			remoteJid: $('#reactionForm input[name="remoteJid"]').val(),
			fromMe: $('#reactionForm input[name="fromMe"]').is(':checked'),
			id: $('#reactionForm input[name="messageId"]').val()
		}
	};

	if (!formData.target || !formData.reaction || !formData.messageKey.remoteJid || !formData.messageKey.id) {
		showAlert('Campos Obrigatórios', 'Por favor, preencha todos os campos obrigatórios.');
		return;
	}

	try {
			showLoadingAlert('Enviando Reação', 'Processando envio da reação...');
		const response = await makeApiRequest('send_reaction', formData);

		if (response && (response.success || response.message)) {
			messagesSent++;
			showAlert('Reação Enviada!', 'Reação enviada com sucesso!');
			$('#reactionForm')[0].reset();
			$('#reactionForm input[name="target"]').trigger('input');
		} else {
			showAlert('Erro ao Enviar', `Erro: ${response.message || 'Erro desconhecido'}`, 'error');
		}
	} catch (error) {
		showAlert('Erro ao Enviar', error.message, 'error');
	}
}
async function getStatus() {
	try {
			showLoadingAlert('Verificando Status', 'Obtendo status da instância...');
		const data = await makeApiRequest('get_status', {});


		if (data && data.data) {
			const status = translateStatus(data.data.state);
			const friendlyName = data.data.friendlyName || 'N/A';
			const serverRef = data.data.serverRef || 'N/A';
			const connectionStatus = translateStatus(data.data.status);
			const phase = translateStatus(data.data.phase);
			const isActive = data.data.state === 'active';
			const isConnectedStatus = data.data.status === 'connected';
			const isAuthenticated = data.data.phase === 'authenticated';
			const isWaitingQr = data.data.phase === 'waiting_qr' || data.data.phase === 'waiting_qrcode' || data.data.phase === 'read_qrcode';

			let alertType = 'info';
			let alertTitle = 'Status da Instância';
			let alertIcon = 'fas fa-info-circle';

			if (isActive && isConnectedStatus && isAuthenticated) {
				alertType = 'success';
				alertIcon = 'fas fa-check-circle';
			} else if (isWaitingQr) {
				alertType = 'warning';
				alertIcon = 'fas fa-qrcode';
			} else if (isActive && !isConnectedStatus) {
				alertType = 'warning';
				alertIcon = 'fas fa-exclamation-triangle';
			} else if (!isActive) {
				alertType = 'error';
				alertIcon = 'fas fa-times-circle';
			}

			let profileInfo = '';
			if (data.data.profile) {
				const profile = data.data.profile;


				let formattedPhone = profile.username || 'N/A';
				if (formattedPhone !== 'N/A' && formattedPhone.length >= 10) {
					const phone = formattedPhone.replace(/[^0-9]/g, '');
					if (phone.length >= 10) {
						const ddi = phone.substring(0, 2);
						const ddd = phone.substring(2, 4);
						const numero = phone.substring(4);

						if (numero.length === 8) {

							formattedPhone = `+${ddi} (${ddd}) ${numero.substring(0, 4)}-${numero.substring(4, 8)}`;
						} else if (numero.length === 9) {

							formattedPhone = `+${ddi} (${ddd}) ${numero.substring(0, 5)}-${numero.substring(5, 9)}`;
						} else if (numero.length >= 10) {

							formattedPhone = `+${ddi} (${ddd}) ${numero.substring(0, 5)}-${numero.substring(5, 9)}`;
						}
					}
				}

				profileInfo = `
                    <div class="profile-card">
                        <h5 class="profile-title">
                            <i class="fas fa-user"></i> Perfil do WhatsApp
                        </h5>
                        <div class="profile-content">
                            ${profile.avatar ? `<img src="${profile.avatar}" alt="Foto" class="profile-avatar">` : ''}
                            <div>
                                <div class="profile-info"><strong>👤 Nome:</strong> <span class="profile-text">${profile.pushname || 'N/A'}</span></div>
                                <div class="profile-info"><strong>📱 Telefone:</strong> <span class="profile-text">${formattedPhone}</span></div>
                            </div>
                        </div>
                    </div>
                `;
			}
			let statusIcon = '📊';
			if (status.toLowerCase().includes('ativa') || status.toLowerCase().includes('active')) {
				statusIcon = '✅';
			} else if (status.toLowerCase().includes('pendente') || status.toLowerCase().includes('pending')) {
				statusIcon = '⏳';
			} else if (status.toLowerCase().includes('erro') || status.toLowerCase().includes('error')) {
				statusIcon = '❌';
			} else if (status.toLowerCase().includes('parada') || status.toLowerCase().includes('stopped')) {
				statusIcon = '⏹️';
			}

			const statusHtml = `
                <div class="status-modal-wrapper">
                    <div class="status-card ${alertType}">
                        <div class="status-item"><strong>📊 Status:</strong> <span class="status-text">${statusIcon} ${status}</span></div>
                        <div class="status-item"><strong>🏷️ Nome:</strong> <span class="status-text">${friendlyName}</span></div>
                        <div class="status-item"><strong>🔗 Conexão:</strong> <span class="${isConnectedStatus ? 'status-connected' : 'status-disconnected'}">${connectionStatus}</span></div>
                        <div class="status-item"><strong>⚡ Fase:</strong> <span class="${isAuthenticated ? 'status-authenticated' : isWaitingQr ? 'status-waiting' : 'status-error'}">${phase}</span></div>
                    </div>
                    ${profileInfo}
                </div>
            `;

			showHtmlAlert(alertTitle, statusHtml, alertType);


			isConnected = isActive && isConnectedStatus && isAuthenticated;
			window.currentStatus = data.data;
			updateConnectionStatus(data);
			updateButtonVisibility();
		} else {
			showAlert('Erro na API', 'Resposta inválida da API');
		}
	} catch (error) {
		showResponse(`Erro: ${error.message}`, 'error');
	}
}

let qrCodeInterval = null;
let qrCodeTimeout = null;
let qrCodeModal = null;
let qrCodeRenewCount = 0;
const MAX_QR_RENEWALS = 3;

async function getQrCode() {
	try {
			showLoadingAlert('Iniciando Instância', 'Iniciando a instância...');

			const restartResponse = await makeApiRequest('reconnect', {});
			if (restartResponse && restartResponse.success) {
				await new Promise(resolve => setTimeout(resolve, 3000));
			}

			showLoadingAlert('Gerando QR Code', 'Obtendo código QR para conexão...');
		const data = await makeApiRequest('get_qr_code', {});


		if (data && data.data && data.data.connected === true) {
			showAlert(
				'Conectado com Sucesso!',
				'Sua instância WhatsApp já está conectada e autenticada. Não é necessário escanear o QR Code.'
			);

			isConnected = true;
			window.currentStatus = data.data;
			updateButtonVisibility();
			updateSendButtonsState();
			return;
		}

		let qrCode = null;

		if (data && data.data) {

			qrCode = data.data.qr;
		} else if (data.base64) {

			qrCode = data.base64.replace('data:image/png;base64,', '');
		} else if (data.raw) {

			qrCode = data.base64 ? data.base64.replace('data:image/png;base64,', '') : null;
		}

		if (qrCode) {

			qrCodeRenewCount = 0;

			const themeConfig = getSwalThemeConfig();
			qrCodeModal = Swal.fire({
				title: 'Conectar WhatsApp',
				html: `
                    <div class="qr-modal-wrapper">
                        <div class="qr-instructions">
                            <h4>📱 Como Conectar:</h4>
                            <ol>
                                <li>Abra o WhatsApp no seu celular</li>
                                <li>Toque em <strong>Menu</strong> (⋮) ou <strong>Configurações</strong></li>
                                <li>Toque em <strong>Dispositivos conectados</strong></li>
                                <li>Toque em <strong>Conectar um dispositivo</strong></li>
                                <li>Aponte a câmera para o QR Code abaixo</li>
                            </ol>
                        </div>
                        <div class="qr-image-container">
                            <img src="data:image/png;base64,${qrCode}" alt="QR Code" class="qr-image">
                        </div>
                        <div class="qr-info">
                            <p>
                                ⏰	 Este QR Code expira em <span id="countdownText" class="qr-countdown">60 segundos</span> e será renovado automaticamente
                            </p>
                            <div class="qr-progress-container">
                                <div id="progressBar" class="qr-progress-bar"></div>
                            </div>
                        </div>
                        <div id="connectionStatus" class="qr-connection-status">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>Verificando conexão...</span>
                        </div>
                    </div>
                `,
				icon: 'info',
				confirmButtonText: 'Fechar',
				confirmButtonColor: '#6b7280',
				allowOutsideClick: false,
				allowEscapeKey: true,
				showCancelButton: true,
				cancelButtonText: 'Cancelar',
				cancelButtonColor: '#ef4444',
				width: '500px',
				...themeConfig,
				didOpen: () => {
					startQrCodeMonitoring();
				},
				willClose: () => {
					stopQrCodeMonitoring();
				}
			});
		} else {
			showAlert('QR Code não disponível', 'Verifique se a instância está desconectada.');
		}
	} catch (error) {

		if (error.message.includes('Syntax error') || error.message.includes('Erro interno do servidor')) {
			try {
				const statusResponse = await makeApiRequest('get_status', {});
				if (statusResponse && statusResponse.data) {
					const isActive = statusResponse.data.state === 'active';
					const isConnectedStatus = statusResponse.data.status === 'connected';
					const isAuthenticated = statusResponse.data.phase === 'authenticated';
					
					if (isActive && isConnectedStatus && isAuthenticated) {
						showAlert(
				'Conectado com Sucesso!',
				'Sua instância WhatsApp já está conectada e autenticada. Não é necessário escanear o QR Code.'
			);
			isConnected = true;
					window.currentStatus = statusResponse.data;
			updateButtonVisibility();
			updateSendButtonsState();
						return;
					}
				}
			} catch (statusError) {
				showAlert('Erro ao obter QR Code', 'Não foi possível verificar o status da instância.');
				return;
			}
		}
		
		showAlert('Erro ao obter QR Code', `Erro: ${error.message || 'Erro desconhecido'}`);
	}
}

function startQrCodeMonitoring() {

	let timeLeft = 60;
	let isRenewing = false;

	qrCodeInterval = setInterval(async () => {

		if (isRenewing) {
			return;
		}

		timeLeft--;

		const countdownText = document.getElementById('countdownText');
		if (countdownText) {
			if (timeLeft > 1) {
				countdownText.textContent = `${timeLeft} segundos`;
				countdownText.style.color = timeLeft <= 10 ? '#ef4444' : '#0ea5e9';
			} else if (timeLeft === 1) {
				countdownText.textContent = `${timeLeft} segundo`;
				countdownText.style.color = '#ef4444';
			} else {

				countdownText.textContent = 'Renovando...';
				countdownText.style.color = '#f59e0b';
			}
		}

		const progressBar = document.getElementById('progressBar');
		if (progressBar) {
			const percentage = Math.max(0, (timeLeft / 60) * 100);
			progressBar.style.width = `${percentage}%`;


			if (timeLeft <= 10) {
				progressBar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
			} else if (timeLeft <= 20) {
				progressBar.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
			} else {
				progressBar.style.background = 'linear-gradient(90deg, #0ea5e9, #3b82f6)';
			}
		}

		if (timeLeft <= 0 && !isRenewing) {
			isRenewing = true;
			await renewQrCode();
			timeLeft = 60;
			isRenewing = false;
		}
	}, 1000);

	let isCheckingConnection = false;
	const connectionCheckInterval = setInterval(async () => {

		if (isCheckingConnection) {
			return;
		}

		isCheckingConnection = true;

		try {
			const statusResponse = await makeApiRequest('get_status', {});
			
			if (statusResponse && statusResponse.data) {
				const isActive = statusResponse.data.state === 'active';
				const isConnectedStatus = statusResponse.data.status === 'connected';
				const isAuthenticated = statusResponse.data.phase === 'authenticated';
				

				if (isActive && isConnectedStatus && isAuthenticated) {

					clearInterval(connectionCheckInterval);
					stopQrCodeMonitoring();

					if (qrCodeModal) {
						Swal.close();
					}

					isConnected = true;
					window.currentStatus = statusResponse.data;
					updateConnectionStatus(statusResponse);

					
					const themeConfig = getSwalThemeConfig();
					Swal.fire({
						title: 'Conectado com Sucesso! 🎉',
						html: `
							<div class="sync-modal-wrapper">
								<div>
									<i class="fas fa-sync-alt fa-spin sync-icon"></i>
								</div>
								<p class="sync-text">Você já está conectado! Sincronizando instância...</p>
								<p class="sync-subtext">Aguarde enquanto preparamos tudo para você</p>
								<div class="sync-progress-container">
									<div id="syncProgressBar" class="sync-progress-bar"></div>
								</div>
								<p id="syncStatus" class="sync-status">Iniciando sincronização...</p>
							</div>
						`,
						allowOutsideClick: false,
						allowEscapeKey: false,
						showConfirmButton: false,
						...themeConfig,
						didOpen: () => {
							let progress = 0;
							const progressBar = document.getElementById('syncProgressBar');
							const statusText = document.getElementById('syncStatus');
							
							const statusMessages = [
								'Iniciando sincronização...',
								'Conectando com servidores...',
								'Sincronizando mensagens...',
								'Atualizando contatos...',
								'Finalizando configurações...',
								'Sincronização concluída!'
							];
							
							const interval = setInterval(() => {
								progress += 2;
								progressBar.style.width = progress + '%';
								
								const messageIndex = Math.floor((progress / 100) * statusMessages.length);
								if (messageIndex < statusMessages.length) {
									statusText.textContent = statusMessages[messageIndex];
								}
								
								if (progress >= 100) {
									clearInterval(interval);
									setTimeout(async () => {
										Swal.close();
										try {
											await makeApiRequest('reconnect', {});
											const themeConfig = getSwalThemeConfig();
											Swal.fire({
												title: 'Pronto para Usar! 🚀',
												text: 'Você já está conectado e pronto para usar todas as funcionalidades do WhatsApp!',
												icon: 'success',
												confirmButtonText: 'OK',
												confirmButtonColor: '#25D366',
												timer: 3000,
												timerProgressBar: true,
												allowOutsideClick: true,
												allowEscapeKey: true,
												...themeConfig
											});
										} catch (error) {
											const themeConfig = getSwalThemeConfig();
											Swal.fire({
												title: 'Pronto para Usar! 🚀',
												text: 'Você já está conectado e pronto para usar todas as funcionalidades do WhatsApp!',
												icon: 'success',
												confirmButtonText: 'OK',
												confirmButtonColor: '#25D366',
												timer: 3000,
												timerProgressBar: true,
												allowOutsideClick: true,
												allowEscapeKey: true,
												...themeConfig
											});
										}
									}, 1000);
								}
							}, 100);
						}
					});

						updateButtonVisibility();
						updateSendButtonsState();
				}
			}
		} catch (error) {

			if (error.message.includes('404')) {
				await new Promise(resolve => setTimeout(resolve, 10000));
			}
		} finally {
			isCheckingConnection = false;
		}
	}, 5000);


	qrCodeTimeout = setTimeout(() => {
		stopQrCodeMonitoring();

		if (qrCodeModal) {
			Swal.close();
		}

		showAlert(
			'Tempo Esgotado',
			'Você precisa escanear o qrcode com o WhatsApp do seu celular. Abra o aplicativo e tente novamente'
		);
	}, 180000);
}

function stopQrCodeMonitoring() {
	if (qrCodeInterval) {
		clearInterval(qrCodeInterval);
		qrCodeInterval = null;
	}

	if (qrCodeTimeout) {
		clearTimeout(qrCodeTimeout);
		qrCodeTimeout = null;
	}
}

async function renewQrCode() {
	try {

		const statusElement = document.getElementById('connectionStatus');
		if (statusElement) {
			statusElement.style.display = 'block';
		}

		let reconnectSuccess = false;
		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				await makeApiRequest('reconnect', {});
				reconnectSuccess = true;
				break;
			} catch (error) {
				if (attempt < 3) {
					await new Promise(resolve => setTimeout(resolve, 2000));
				}
			}
		}

		if (!reconnectSuccess) {}

		await new Promise(resolve => setTimeout(resolve, 3000));

		let data = null;
		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				data = await makeApiRequest('get_qr_code', {});
				break;
			} catch (error) {
				if (attempt < 3) {
					await new Promise(resolve => setTimeout(resolve, 2000));
				} else {
					throw error;
				}
			}
		}

		
		const isConnected = data && data.data && (
			data.data.connected === true || 
			data.data.status === 'connected' ||
			(data.data.state === 'active' && data.data.status === 'connected' && data.data.phase === 'authenticated')
		);
		
		
		if (isConnected) {
			stopQrCodeMonitoring();

			if (qrCodeModal) {
				Swal.close();
			}

			isConnected = true;
			window.currentStatus = data.data;
			updateConnectionStatus(data);

			Swal.fire({
				title: 'Conectado com Sucesso! 🎉',
				text: 'WhatsApp conectado com sucesso! Sua instância está pronta para uso.',
				icon: 'success',
				confirmButtonText: 'OK',
				confirmButtonColor: '#48bb78',
				timer: 5000,
				timerProgressBar: true,
				allowOutsideClick: false,
				allowEscapeKey: false
			});

			return;
		}


		let qrCode = null;

		if (data && data.data) {
			qrCode = data.data.qr;
		} else if (data.base64) {
			qrCode = data.base64.replace('data:image/png;base64,', '');
		} else if (data.raw) {
			qrCode = data.base64 ? data.base64.replace('data:image/png;base64,', '') : null;
		}

		if (qrCode) {
			const modalContent = document.querySelector('.swal2-html-container');
			if (modalContent) {
				const imgElement = modalContent.querySelector('img');
				if (imgElement) {
					imgElement.src = `data:image/png;base64,${qrCode}`;
				}
			}


			const countdownText = document.getElementById('countdownText');
			if (countdownText) {
				countdownText.textContent = '60 segundos';
				countdownText.style.color = '#0ea5e9';
			}


			const progressBar = document.getElementById('progressBar');
			if (progressBar) {
				progressBar.style.background = 'linear-gradient(90deg, #0ea5e9, #3b82f6)';
			}

			if (statusElement) {
				statusElement.style.display = 'none';
			}

			qrCodeRenewCount++;


			if (qrCodeRenewCount >= MAX_QR_RENEWALS) {
				stopQrCodeMonitoring();

				if (qrCodeModal) {
					Swal.close();
				}

				showAlert(
					'Tempo Esgotado',
					'Você precisa escanear o qrcode com o WhatsApp do seu celular. Abra o aplicativo e tente novamente'
				);
			}
		} else {

			stopQrCodeMonitoring();

			if (qrCodeModal) {
				Swal.close();
			}

			showAlert('Erro ao renovar QR Code', 'Não foi possível gerar um novo QR Code.');
		}
	} catch (error) {


		stopQrCodeMonitoring();

		if (qrCodeModal) {
			Swal.close();
		}

		showAlert('Erro ao renovar QR Code', error.message);
	}
}

async function startInstance() {
	try {
			showLoadingAlert('Iniciando Instância', 'Iniciando a instância WhatsApp...');
		const response = await makeApiRequest('start_instance', {});

		if (response && response.success) {

			if (response.data && response.data.already_started) {
				showHtmlAlert(
					'Instância Já Iniciada!',
					`
                    <div style="text-align: center; padding: 10px;">
                        <p style="margin-bottom: 15px; font-size: 16px;">${response.data.message}</p>
                        <p style="color: #718096; font-size: 14px;">
                            A instância está funcionando normalmente e pronta para uso.
                        </p>
                    </div>
                    `,
					'success'
				);
			} else {
				showAlert('Sucesso!', 'Instância iniciada com sucesso!');
			}
			setTimeout(getStatus, 2000);
		} else {
			showResponse(`Erro: ${response.message || 'Erro desconhecido'}`, 'error');
		}
	} catch (error) {


		if (error.message.includes('already started')) {
			showResponse(`
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-info-circle" style="font-size: 48px; color: #4299e1; margin-bottom: 15px;"></i>
                    <h3 style="color: #4299e1; margin-bottom: 10px;">Instância Já Iniciada</h3>
                    <p style="margin-bottom: 15px;">A instância já está em execução e funcionando normalmente.</p>
                    <p style="color: #718096; font-size: 14px;">
                        Não é necessário iniciar novamente. Use o botão "Status" para verificar o estado atual.
                    </p>
                </div>
            `, 'info');
		} else {
			showResponse(`Erro: ${error.message}`, 'error');
		}
	}
}

async function rebootInstance() {
	try {
			showLoadingAlert('Reiniciando Instância', 'Reiniciando a instância WhatsApp...');
		const response = await makeApiRequest('reconnect', {});

		if (response && response.success) {

			if (response.data && response.data.rebooted) {
				Swal.fire({
					title: 'Instância Reiniciada!',
					html: `
                        <div class="instance-status-wrapper">
                            <i class="fas fa-sync-alt" style="font-size: 48px; color: #4299e1; margin-bottom: 15px; animation: spin 2s linear infinite;"></i>
                            <h3 style="color: #4299e1; margin-bottom: 10px;">Instância Reiniciada!</h3>
                            <p class="instance-status-text">${response.data.message}</p>
                            <div class="instance-info-card">
                                <strong>Status:</strong> Reiniciando...<br>
                                <strong>Próximo passo:</strong> Aguarde a estabilização
                            </div>
                            <p class="instance-status-subtext">
                                A instância está se reiniciando. Use o botão "Status" em alguns segundos para verificar o estado.
                            </p>
                        </div>
                    `,
					icon: 'success',
					confirmButtonText: 'OK',
					confirmButtonColor: '#48bb78',
					timer: 5000,
					timerProgressBar: true
				});
			} else {
				showResponse('Instância reiniciada com sucesso!', 'success');
			}

			setTimeout(() => {
				updateButtonVisibility();
			}, 1000);
		} else {
			showResponse(`Erro: ${response.message || 'Erro desconhecido'}`, 'error');
		}
	} catch (error) {
		if (error.message.includes('Syntax error')) {
			try {
				const statusResponse = await makeApiRequest('get_status', {});
				if (statusResponse && statusResponse.data) {
			Swal.fire({
				title: 'Instância Reiniciada!',
				html: `
                    <div class="instance-status-wrapper">
                        <i class="fas fa-sync-alt" style="font-size: 48px; color: #4299e1; margin-bottom: 15px; animation: spin 2s linear infinite;"></i>
                        <h3 style="color: #4299e1; margin-bottom: 10px;">Instância Reiniciada!</h3>
                        <p class="instance-status-text">A instância foi reiniciada com sucesso.</p>
                        <div class="instance-info-card">
                            <strong>Status:</strong> Reiniciando...<br>
                            <strong>Próximo passo:</strong> Aguarde a estabilização
                        </div>
                        <p class="instance-status-subtext">
                            A instância está se reiniciando. Use o botão "Status" em alguns segundos para verificar o estado.
                        </p>
                    </div>
                `,
				icon: 'success',
				confirmButtonText: 'OK',
				confirmButtonColor: '#48bb78',
				timer: 5000,
				timerProgressBar: true
			});
					return;
				}
			} catch (statusError) {
				showAlert('Erro ao Reiniciar', 'Não foi possível verificar se a instância foi reiniciada.');
				return;
			}
		}
		
		showAlert('Erro ao Reiniciar', error.message);
	}
}

async function logoutInstance() {
	const themeConfig = getSwalThemeConfig();
	const result = await Swal.fire({
		title: 'Desconectar Instância',
		text: 'Tem certeza que deseja desconectar a instância?',
		icon: 'warning',
		showCancelButton: true,
		confirmButtonColor: '#d33',
		cancelButtonColor: '#3085d6',
		confirmButtonText: 'Sim, desconectar!',
		cancelButtonText: 'Cancelar',
		...themeConfig
	});

	if (!result.isConfirmed) {
		return;
	}

	try {
			showLoadingAlert('Desconectando Instância', 'Desconectando a instância WhatsApp...');
		const response = await makeApiRequest('disconnect', {});

		if (response && response.success) {

			if (response.data && response.data.disconnected) {
				showHtmlAlert('Instância Desconectada!', `
                    <div style="text-align: center; padding: 20px;">
                        <i class="fas fa-sign-out-alt" style="font-size: 48px; color: #f56565; margin-bottom: 15px;"></i>
                        <h3 style="color: #f56565; margin-bottom: 10px;">Instância Desconectada!</h3>
                        <p style="margin-bottom: 15px;">${response.data.message}</p>
                        <div class="instance-info-card warning">
                            <strong>Status:</strong> Desconectada<br>
                            <strong>Próximo passo:</strong> Use o botão "QR Code" para reconectar
                        </div>
                        <p style="color: #718096; font-size: 14px;">
                            A instância foi desconectada com sucesso. Para reconectar, use o botão "QR Code" e escaneie com seu WhatsApp.
                        </p>
                    </div>
                `, 'success');
			} else {
				showAlert('Até logo 😢', 'Instância desconectada com sucesso.');
			}
			isConnected = false;
			updateConnectionStatus();
			updateButtonVisibility();
			updateSendButtonsState();
		} else {
			showResponse(`Erro: ${response.message || 'Erro desconhecido'}`, 'error');
		}
	} catch (error) {
		if (error.message.includes('Syntax error')) {
			try {
				const statusResponse = await makeApiRequest('get_status', {});
				if (statusResponse && statusResponse.data) {
					const isActive = statusResponse.data.state === 'active';
					const isConnectedStatus = statusResponse.data.status === 'connected';
					const isAuthenticated = statusResponse.data.phase === 'authenticated';
					
					if (!isActive || !isConnectedStatus || !isAuthenticated) {
						showHtmlAlert('Instância Desconectada!', `
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-sign-out-alt" style="font-size: 48px; color: #f56565; margin-bottom: 15px;"></i>
                    <h3 style="color: #f56565; margin-bottom: 10px;">Instância Desconectada!</h3>
                    <p style="margin-bottom: 15px;">A instância foi desconectada com sucesso.</p>
                    <div class="instance-info-card warning">
                        <strong>Status:</strong> Desconectada<br>
                        <strong>Próximo passo:</strong> Use o botão "QR Code" para reconectar
                    </div>
                    <p style="color: #718096; font-size: 14px;">
                        A instância foi desconectada com sucesso. Para reconectar, use o botão "QR Code" e escaneie com seu WhatsApp.
                    </p>
                </div>
            `, 'success');
			isConnected = false;
						window.currentStatus = null;
			updateConnectionStatus();
						updateButtonVisibility();
						return;
					}
				}
			} catch (statusError) {
				showAlert('Erro ao Desconectar', 'Não foi possível verificar se a instância foi desconectada.');
				return;
			}
		}
		
		showAlert('Erro ao Desconectar', error.message);
	}
}
async function getContactStatus(jid) {
	const target = getGlobalTarget();
	
	if (!target) {
		showAlert('Número Obrigatório', 'Por favor, preencha o número do WhatsApp no campo superior.');
		return;
	}
	
	try {
		const realNumber = jid ? getRealNumber(jid) : target;
		
		const statusResponse = await makeApiRequest('get_contact_status', { target: realNumber });
		
		showContactStatusModal(target, realNumber, statusResponse);
		
	} catch (error) {
		Swal.fire({
			title: 'Erro na Verificação',
			text: 'Não foi possível verificar o status do contato. Tente novamente.',
			icon: 'error',
			confirmButtonText: 'OK'
		});
	}
}

async function getContactAvatar(jid) {
	const target = getGlobalTarget();
	
	if (!target) {
		showAlert('Número Obrigatório', 'Por favor, preencha o número do WhatsApp no campo superior.');
		return;
	}

	try {
		const realNumber = jid ? getRealNumber(jid) : target;
		
		const avatarResponse = await makeApiRequest('get_contact_avatar', { target: realNumber });
		
		showContactAvatarModal(target, realNumber, avatarResponse);
		
	} catch (error) {
		Swal.fire({
			title: 'Erro na Verificação',
			text: 'Não foi possível buscar o avatar do contato. Tente novamente.',
			icon: 'error',
			confirmButtonText: 'OK'
		});
	}
}

async function validateNumber(callback = null) {
	const target = getGlobalTarget();
	if (!target) {
		showAlert('Número Obrigatório', 'Por favor, preencha o número do WhatsApp no campo superior.');
		return;
	}

	try {
		showLoadingAlert('Validando Número', 'Verificando se o número está no WhatsApp...');
		const response = await makeApiRequest('validate_number', {
			target: target
		});

		let exists = false;
		if (response && response.exists !== undefined) {
			exists = response.exists;
		} else if (response && response.data && response.data.exists !== undefined) {
			exists = response.data.exists;
		}

		if (exists) {
			if (callback) {
				const jid = response.jid || response.data?.jid;
				callback(jid);
			} else {
			Swal.fire({
				title: 'Número Validado!',
				html: `
					<div class="validation-wrapper">
						<div class="validation-card">
							<div class="validation-item"><strong>📱 Número:</strong> <span class="validation-text">${formatPhoneNumber(target)}</span></div>
							<div class="validation-item"><strong>✅ Status:</strong> <span class="validation-status">Disponível no WhatsApp</span></div>
						</div>
					</div>  
				`,
				icon: 'success',
				confirmButtonText: 'OK',
				confirmButtonColor: '#48bb78',
				timer: 3000,
				timerProgressBar: true
			});
			}
		} else {
			Swal.fire({
				title: 'Número Não Encontrado',
				html: `
					<div class="validation-wrapper">
						<div class="validation-card error">
							<div class="validation-item"><strong>📱 Número:</strong> <span class="validation-text">${formatPhoneNumber(target)}</span></div>
							<div class="validation-item"><strong>❌ Status:</strong> <span class="validation-status error">Não disponível no WhatsApp</span></div>
						</div>
					</div>
				`,
				icon: 'warning',
				confirmButtonText: 'OK',
				confirmButtonColor: '#f6ad55',
				timer: 3000,
				timerProgressBar: true
			});
		}
	} catch (error) {
		showResponse(error.message, 'error');
	}
}
function getRealNumber(jid) {
	if (!jid || typeof jid !== 'string') return '';
	
	const numberPart = jid.split('@')[0];
	if (!numberPart) return '';
	
	return numberPart;
}

function formatPhoneNumber(phone) {
	if (!phone || typeof phone !== 'string') return phone;
	
	const cleanPhone = phone.replace(/[^0-9]/g, '');
	
	if (cleanPhone.length === 11) {
		return `+55 (${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}`;
	}
	else if (cleanPhone.length === 10) {
		return `+55 (${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 6)}-${cleanPhone.slice(6)}`;
	}
	else if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
		return `+55 (${cleanPhone.slice(2, 4)}) ${cleanPhone.slice(4, 9)}-${cleanPhone.slice(9)}`;
	}
	else if (cleanPhone.length === 12 && cleanPhone.startsWith('55')) {
		return `+55 (${cleanPhone.slice(2, 4)}) ${cleanPhone.slice(4, 8)}-${cleanPhone.slice(8)}`;
	}
	
	return cleanPhone;
}

function updateMediaUrl() {
	const mediaType = document.getElementById('mediaType');
	const mediaUrl = document.getElementById('mediaUrl');
	const caption = document.getElementById('caption');
	const audioLiveGroup = document.getElementById('audioLiveGroup');
	
	if (!mediaType || !mediaUrl) return;
	
	if (!mediaType.value) {
		mediaUrl.value = '';
		if (caption) {
			caption.value = '';
		}
		if (audioLiveGroup) {
			audioLiveGroup.style.display = 'none';
		}
		return;
	}
	
	if (audioLiveGroup) {
		audioLiveGroup.style.display = mediaType.value === 'audio' ? 'block' : 'none';
	}
	
	const defaultData = {
		'image': {
			url: 'https://filesamples.com/samples/image/jpg/sample_1280%C3%97853.jpg',
			caption: 'Teste JPG'
		},
		'video': {
			url: 'https://filesamples.com/samples/video/mp4/sample_960x400_ocean_with_audio.mp4',
			caption: 'Teste MP4'
		},
		'document': {
			url: 'https://filesamples.com/samples/document/pdf/sample1.pdf',
			caption: 'Teste PDF'
		},
		'audio': {
			url: 'https://filesamples.com/samples/audio/mp3/sample1.mp3',
			caption: 'Teste MP3'
		}
	};
	
	const selectedData = defaultData[mediaType.value];
	if (selectedData) {
		mediaUrl.value = selectedData.url;
		if (caption) {
			caption.value = selectedData.caption;
		}
	}
}


function generateCorsOrigins(corsOriginsInput) {
	if (!corsOriginsInput || typeof corsOriginsInput !== 'string') {
		return [];
	}
	
	if (corsOriginsInput.includes(',')) {
		return corsOriginsInput.split(',').map(origin => origin.trim()).filter(origin => origin.length > 0);
	}
	
	const domain = corsOriginsInput.trim();
	if (!domain) return [];
	
	const variations = [];
	
	const domains = [domain];
	if (!domain.startsWith('www.')) {
		domains.push('www.' + domain);
	} else {
		domains.push(domain.replace('www.', ''));
	}
	
	domains.forEach(d => {
		variations.push('http://' + d);
		variations.push('https://' + d);
	});
	
	return [...new Set(variations)];
}

function showContactStatusModal(target, realNumber, statusResponse) {
	let contactData = statusResponse;
	if (Array.isArray(statusResponse) && statusResponse.length > 0) {
		contactData = statusResponse[0];
	}
	
	const status = contactData.status || contactData.data?.status;
	const setAt = status?.setAt || contactData.setAt || contactData.data?.setAt;
	
	let formattedDate = '';
	if (setAt && setAt !== '0' && setAt !== 0 && setAt !== null && setAt !== undefined) {
		try {
			const date = new Date(setAt);
			if (!isNaN(date.getTime()) && date.getFullYear() > 1970) {
				formattedDate = date.toLocaleString('pt-BR', {
					day: '2-digit',
					month: '2-digit',
					year: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit'
				});
			}
		} catch (e) {
			formattedDate = '';
		}
	}
	
	const isStatusUnavailable = status && typeof status === 'object' && (!status.status && !status.message);
	const isWarning = isStatusUnavailable;
	
	Swal.fire({
		title: 'Status do Contato',
		html: `
			<div class="contact-status-wrapper">
				<div class="contact-status-card ${isWarning ? 'warning' : 'success'}">
					<div class="contact-status-item"><strong>📱 Número:</strong> <span class="contact-status-text">${formatPhoneNumber(target)}</span></div>
					${status ? `<div class="contact-status-item"><strong>📊 Status:</strong> <span class="contact-status-value ${isWarning ? 'warning' : ''}">${typeof status === 'object' ? (status.status || status.message || 'Status indisponível') : status}</span></div>` : ''}
					${formattedDate ? `<div class="contact-status-item"><strong>📅 Definido em:</strong> ${formattedDate}</div>` : ''}
				</div>
			</div>  
		`,
		icon: isWarning ? 'warning' : 'success',
		confirmButtonText: 'OK',
		confirmButtonColor: isWarning ? '#f6ad55' : '#48bb78'
	});
}

function showContactAvatarModal(target, realNumber, avatarResponse) {
	if (avatarResponse && avatarResponse.hasAvatar === false) {
		Swal.fire({
			title: 'Foto do Perfil',
			html: `
				<div class="validation-wrapper">
					<div class="validation-card error">
						<div class="validation-item"><strong>📱 Número:</strong> <span class="validation-text">${formatPhoneNumber(target)}</span></div>
						<div class="validation-item" class="avatar-unavailable">⚠️ Foto não disponível</div>
					</div>
				</div>  
			`,
			icon: 'warning',
			confirmButtonText: 'OK',
			confirmButtonColor: '#f59e0b',
			allowOutsideClick: false
		});
		return;
	}
	
	let contactData = avatarResponse;
	if (Array.isArray(avatarResponse) && avatarResponse.length > 0) {
		contactData = avatarResponse[0];
	}
	
	const avatarUrl = contactData.pic || contactData.avatar || contactData.data?.pic || contactData.data?.avatar || contactData.url || contactData.data?.url;
	
	Swal.fire({
		title: 'Foto do Perfil',
		html: `
			<div class="avatar-modal-wrapper">
				<div class="avatar-card">
					${avatarUrl ? `
						<div class="avatar-content">
							<img src="${avatarUrl}" alt="Foto" class="avatar-image">
							<div class="avatar-info">
								<div class="avatar-item"><strong>📱 Número:</strong> <span class="avatar-text">${formatPhoneNumber(target)}</span></div>
							</div>
						</div>
					` : `
						<div class="avatar-info">
							<div class="validation-item"><strong>📱 Número:</strong> <span class="avatar-text">${formatPhoneNumber(target)}</span></div>
							<div class="avatar-unavailable">âš ï¸ Foto não disponível</div>
						</div>
					`}
				</div>
			</div>  
		`,
		icon: avatarUrl ? 'success' : 'warning',
		confirmButtonText: 'OK',
		confirmButtonColor: avatarUrl ? '#25D366' : '#f59e0b',
		allowOutsideClick: false
	});
}

async function blockContact(jid) {
	const target = getGlobalTarget();
	
	if (!target) {
		showAlert('Número Obrigatório', 'Por favor, preencha o número do WhatsApp no campo superior.');
		return;
	}
	
	try {
		const realNumber = jid ? getRealNumber(jid) : target;
		
		const blockResponse = await makePatchRequest('block_contact', { target: realNumber });
		
		Swal.fire({
			title: 'Solicitação de Bloqueio Enviada',
			html: `
				<div class="block-modal-wrapper">
					<div class="block-card">
						<div class="block-item"><strong>📱 Número:</strong> <span class="block-text">${formatPhoneNumber(target)}</span></div>
						<div class="block-item"><strong>🔒 Status:</strong> <span class="block-status">✅ Solicitação de bloqueio enviada com sucesso</span></div>
					</div>
				</div>  
			`,
			icon: 'success',
			confirmButtonText: 'OK',
			confirmButtonColor: '#10b981'
		});
		
	} catch (error) {
		Swal.fire({
			title: 'Erro ao Bloquear',
			text: 'Não foi possível bloquear o contato. Tente novamente.',
			icon: 'error',
			confirmButtonText: 'OK'
		});
	}
}

async function unblockContact(jid) {
	const target = getGlobalTarget();
	
	if (!target) {
		showAlert('Número Obrigatório', 'Por favor, preencha o número do WhatsApp no campo superior.');
		return;
	}
	
	try {
		const realNumber = jid ? getRealNumber(jid) : target;
		
		const unblockResponse = await makePatchRequest('unblock_contact', { target: realNumber });
		
		
		Swal.fire({
			title: 'Solicitação de Desbloqueio Enviada',
			html: `
				<div class="block-modal-wrapper">
					<div class="block-card">
						<div class="block-item"><strong>📱 Número:</strong> <span class="block-text">${formatPhoneNumber(target)}</span></div>
						<div class="block-item"><strong>🔓 Status:</strong> <span class="block-status">✅ Solicitação de desbloqueio enviada com sucesso</span></div>
					</div>
				</div>  
			`,
			icon: 'success',
			confirmButtonText: 'OK',
			confirmButtonColor: '#10b981'
		});
		
	} catch (error) {
		Swal.fire({
			title: 'Erro ao Desbloquear',
			text: 'Não foi possível desbloquear o contato. Tente novamente.',
			icon: 'error',
			confirmButtonText: 'OK'
		});
	}
}
async function makePatchRequest(action, data = {}) {
	const payload = {
		action: action,
		...data
	};
	while (isProcessingRequest) {
		await new Promise(resolve => setTimeout(resolve, 100));
	}

	isProcessingRequest = true;

	try {
		if (CONFIG.debugMode) {
			console.log('🔧 [DEBUG] Enviando requisição:', {
				url: CONFIG.apiEndpoint,
				method: 'PATCH',
				payload: payload,
				timestamp: new Date().toISOString()
			});
		}

		const response = await $.ajax({
			url: CONFIG.apiEndpoint,
			method: 'PATCH',
			contentType: 'application/json',
			data: JSON.stringify(payload),
			timeout: CONFIG.timeout,
			dataType: 'text'
		});

		if (CONFIG.debugMode) {
			console.log('🔧 [DEBUG] Resposta bruta da API:', {
				response: response,
				timestamp: new Date().toISOString()
			});
		}

		if (!response || response.trim() === '') {
			throw new Error('Resposta vazia do servidor');
		}

		try {
			const parsedResponse = JSON.parse(response);
			
			if (CONFIG.debugMode) {
				console.log('🔧 [DEBUG] Resposta parseada da API:', {
					parsedResponse: parsedResponse,
					timestamp: new Date().toISOString()
				});
			}
			
			return parsedResponse;
		} catch (parseError) {
			throw new Error('Erro interno do servidor: Resposta inválida da API: ' + parseError.message);
		}

	} catch (error) {
		if (CONFIG.debugMode) {
			console.error('🔧 [DEBUG] Erro na requisição:', {
				error: error,
				status: error.status,
				responseText: error.responseText,
				message: error.message,
				timestamp: new Date().toISOString()
			});
		}

		if (error.status === 404) {
			throw new Error('Erro 404: ' + error.responseText);
		} else if (error.status === 500) {
			throw new Error('Erro interno do servidor: ' + error.responseText);
		} else if (error.status === 0) {
			throw new Error('Erro de conexão: Verifique sua internet');
		} else {
			throw new Error(error.responseText || error.message);
		}
	} finally {
		isProcessingRequest = false;
	}
}

async function makeApiRequest(action, data = {}) {
	const payload = {
		action: action,
		...data
	};
	while (isProcessingRequest) {
		await new Promise(resolve => setTimeout(resolve, 100));
	}

	isProcessingRequest = true;

	try {
		if (CONFIG.debugMode) {
			console.log('🔧 [DEBUG] Enviando requisição API:', {
				url: CONFIG.apiEndpoint,
				method: 'POST',
				action: action,
				payload: payload,
				timestamp: new Date().toISOString()
			});
		}

		if (action === 'validate_number' || action === 'get_contact_avatar') {
		const response = await $.ajax({
			url: CONFIG.apiEndpoint,
			method: 'POST',
			contentType: 'application/json',
			data: JSON.stringify(payload),
				timeout: CONFIG.timeout,
			dataType: 'text'
		});

		if (CONFIG.debugMode) {
			console.log('🔧 [DEBUG] Resposta bruta da API:', {
				response: response,
				timestamp: new Date().toISOString()
			});
		}

			if (!response || response === '' || (typeof response === 'string' && response.trim() === '')) {
				return { success: true, message: 'Operação realizada com sucesso' };
			}
			
			try {
				const parsedResponse = JSON.parse(response);
				return parsedResponse;
			} catch (parseError) {
				return response;
			}
		}

		const ajaxOptions = {
			url: CONFIG.apiEndpoint,
			method: 'POST',
			contentType: 'application/json',
			data: JSON.stringify(payload),
			timeout: CONFIG.timeout,
			dataType: 'text'
		};

		if (CONFIG.debugMode) {
			console.log('🔧 [DEBUG] Enviando requisição API (ajaxOptions):', {
				url: CONFIG.apiEndpoint,
				method: 'POST',
				action: action,
				payload: payload,
				timestamp: new Date().toISOString()
			});
		}

		const response = await $.ajax(ajaxOptions);

		if (CONFIG.debugMode) {
			console.log('🔧 [DEBUG] Resposta bruta da API (ajaxOptions):', {
				response: response,
				timestamp: new Date().toISOString()
			});
		}

		if (!response || response === '' || (typeof response === 'string' && response.trim() === '')) {
			return { success: true, message: 'Operação realizada com sucesso' };
		}

		try {
			const parsedResponse = JSON.parse(response);
			
			if (parsedResponse.auth_error) {
				return { auth_error: true };
			}
			
			return parsedResponse;
		} catch (parseError) {


			return response;
		}
	} catch (error) {
		if (action === 'validate_number' && error.status === 404) {
			try {
				const errorData = JSON.parse(error.responseText);
				return errorData;
			} catch {
				return { message: 'Contato não existe ou não está no WhatsApp' };
			}
		}


		if (error.status === 401) {
			const container = document.querySelector('.container');
			const instructionsCard = document.getElementById('instructionsCard');
			
			container.classList.add('not-configured');
			if (instructionsCard) {
				instructionsCard.style.display = 'block';
			}
			return;
		}

		if (error.status === 0) {
			throw new Error('Erro de conectividade. Verifique se o servidor está rodando e as configurações de CORS.');
		}

		if (error.statusText === 'timeout') {
			throw new Error('Timeout na requisição. Verifique sua conexão com a internet.');
		}

		let errorMessage = 'Erro desconhecido';
		if (error.responseText) {
			try {
				const errorData = JSON.parse(error.responseText);
				errorMessage = errorData.message || errorData.error || error.responseText;
			} catch {
				errorMessage = error.responseText;
			}
		} else if (error.statusText) {
			errorMessage = error.statusText;
		}

		throw new Error(errorMessage);
	} finally {
		isProcessingRequest = false;
	}
}


function updateConnectionStatus(statusData = null) {
	const statusElement = $('#connectionStatus');

	if (statusData && statusData.data) {
		const data = statusData.data;
		const state = translateStatus(data.state || 'unknown');
		const status = translateStatus(data.status || 'unknown');
		const phase = translateStatus(data.phase || 'unknown');
		const name = data.friendlyName || 'N/A';
		const server = data.serverRef || 'N/A';

		window.currentStatus = data;

		const isConnected = data.status === 'connected' && data.phase === 'authenticated';

		if (isConnected) {
			statusElement.html('<i class="fas fa-circle text-success"></i> Conectado');
			statusElement.removeClass('text-danger').addClass('text-success');
		} else {
			statusElement.html('<i class="fas fa-circle text-danger"></i> Desconectado');
			statusElement.removeClass('text-success').addClass('text-danger');
		}
	} else {
		window.currentStatus = null;

		if (isConnected) {
			statusElement.html('<i class="fas fa-circle text-success"></i> Conectado');
			statusElement.removeClass('text-danger').addClass('text-success');
		} else {
			statusElement.html('<i class="fas fa-circle text-danger"></i> Desconectado');
			statusElement.removeClass('text-success').addClass('text-danger');
		}
	}
}

async function checkConnectionStatus() {
	try {

		const configResponse = await makeApiRequest('get_config', {});
		if (!configResponse || configResponse.auth_error || !configResponse.id || !configResponse.api_key) {
			isConnected = false;
			updateConnectionStatus();
			updateButtonVisibility();
			updateInterfaceVisibility();
			return;
		}

		const response = await makeApiRequest('get_status', {});

		if (response && response.auth_error) {
			isConnected = false;
			const container = document.querySelector('.container');
			const instructionsCard = document.getElementById('instructionsCard');
			const authErrorCard = document.getElementById('authErrorCard');
			const authErrorAlert = document.getElementById('authErrorAlert');
			
			container.classList.add('not-configured');
			
			if (instructionsCard) {
				instructionsCard.style.display = 'none';
			}
			
			if (authErrorAlert) {
				authErrorAlert.style.display = 'block';
			}
			
			if (authErrorCard) {
				authErrorCard.style.display = 'block';
			}
			
			updateConnectionStatus();
			updateButtonVisibility();
			return;
		}

		if (response && response.data) {

			const isActive = response.data.state === 'active';
			const isConnectedStatus = response.data.status === 'connected';
			const isAuthenticated = response.data.phase === 'authenticated';


			isConnected = isActive && isConnectedStatus && isAuthenticated;
			updateConnectionStatus(response);
			updateButtonVisibility();
		}
	} catch (error) {
		isConnected = false;
		updateConnectionStatus();
		updateButtonVisibility();
		updateInterfaceVisibility();
	}
}

function updateButtonVisibility() {
	const qrButton = $('#qrCodeBtn');
	
		qrButton.hide();
	
	if (!isConnected && window.currentStatus && 
		window.currentStatus.state === 'active' && 
		(window.currentStatus.phase === 'waiting_qr' || 
		 window.currentStatus.phase === 'waiting_qrcode' || 
		 window.currentStatus.phase === 'read_qrcode')) {
		qrButton.show();
	}


	const disconnectButton = $('button[onclick="logoutInstance()"]');
	if (isConnected) {
		disconnectButton.show();
		disconnectButton.css('display', 'inline-block');
	} else {
		disconnectButton.hide();
		disconnectButton.css('display', 'none !important');
	}


	const startButton = $('button[onclick="startInstance()"]');
	if (window.currentStatus && window.currentStatus.state === 'stopped') {
		startButton.show();
		startButton.css('display', 'inline-block');
	} else {
		startButton.hide();
		startButton.css('display', 'none !important');
	}

	document.body.offsetHeight;

	updateSendButtonsState();
}

async function isConnectedForSending() {
	try {
		const response = await makeApiRequest('get_status', {});
		if (response && response.data) {
			window.currentStatus = response.data;
			const isAuthenticated = response.data.state === 'active' &&
				response.data.status === 'connected' &&
				response.data.phase === 'authenticated';
			
			if (isAuthenticated) {
				isConnected = true;
				updateConnectionStatus({ data: response.data });
				updateSendButtonsState();
				updateButtonVisibility();
				return true;
			}
		}
	} catch (error) {
	}
	
	isConnected = false;
	updateConnectionStatus();
	updateSendButtonsState();
	updateButtonVisibility();
	return false;
}

function showNotConnectedAlert() {
	showAlert(
		'WhatsApp Não Conectado',
		'O WhatsApp não está conectado e autenticado. Use o botão "QR Code" para conectar sua conta do WhatsApp.',
		'warning'
	);
}

function updateSendButtonsState() {
	const connectedForSending = isConnected && window.currentStatus &&
		window.currentStatus.state === 'active' &&
		window.currentStatus.status === 'connected' &&
		window.currentStatus.phase === 'authenticated';

	const sendMessageBtn = $('button[type="submit"]:contains("Enviar Mensagem")');
	const sendMediaBtn = $('button[type="submit"]:contains("Enviar Mídia")');
	const sendLocationBtn = $('button[type="submit"]:contains("Enviar Localização")');
	const sendContactBtn = $('button[type="submit"]:contains("Enviar Contato")');
	const validateNumberBtn = $('#validateNumberBtn');
	const getContactStatusBtn = $('#getContactStatusBtn');
	const getContactAvatarBtn = $('#getContactAvatarBtn');
	const blockContactBtn = $('#blockContactBtn');
	const unblockContactBtn = $('#unblockContactBtn');

	[sendMessageBtn, sendMediaBtn, sendLocationBtn, sendContactBtn, validateNumberBtn, getContactStatusBtn, getContactAvatarBtn, blockContactBtn, unblockContactBtn].forEach(btn => {
		if (connectedForSending) {
			btn.prop('disabled', false);
			btn.removeClass('btn-disabled');
			btn.addClass('btn-primary');
		} else {
			btn.prop('disabled', true);
			btn.removeClass('btn-primary');
			btn.addClass('btn-disabled');
		}
	});
}

function openConfigModal() {
	$('#configModal').addClass('show');


	const defaultNumberField = $('#configDefaultNumber');
	if (defaultNumberField.val() && defaultNumberField.val().length > 0) {

		defaultNumberField.trigger('input');
	}
}

function closeConfigModal() {
	$('#configModal').removeClass('show');
}

function toggleApiKeyVisibility() {
	const apiKeyInput = $('#configApiKey');
	const toggleBtn = $('#toggleApiKeyBtn');
	const icon = toggleBtn.find('i');

	if (apiKeyInput.attr('type') === 'password') {
		apiKeyInput.attr('type', 'text');
		icon.removeClass('fa-eye').addClass('fa-eye-slash');
		toggleBtn.attr('title', 'Ocultar chave da API');
	} else {
		apiKeyInput.attr('type', 'password');
		icon.removeClass('fa-eye-slash').addClass('fa-eye');
		toggleBtn.attr('title', 'Mostrar chave da API');
	}
}

function toggleDebugMode() {
	const debugCheckbox = $('#configDebug');
	const responseSection = $('#responseSection');
	const corsSettings = $('#corsSettings');
	const corsOrigins = $('#corsOrigins');
	const corsCheckbox = $('#configCors');

	CONFIG.debugMode = debugCheckbox.is(':checked');

	if (debugCheckbox.is(':checked')) {
		responseSection.show();
		corsSettings.hide();
		corsOrigins.hide();
	} else {
		responseSection.hide();
		corsSettings.show();
		if (corsCheckbox.is(':checked')) {
			corsOrigins.show();
		} else {
			corsOrigins.hide();
		}
	}
}

function toggleCorsMode() {
	toggleDebugMode();
}

async function saveConfig() {
	const form = $('#configForm');
	const corsOriginsInput = form.find('input[name="cors_origins"]').val();

	const corsOrigins = generateCorsOrigins(corsOriginsInput);

	const formData = {
		host: form.find('input[name="host"]').val(),
		id: form.find('input[name="id"]').val(),
		api_key: form.find('input[name="api_key"]').val(),
		timeout: form.find('input[name="timeout"]').val() || 30,
		max_message: form.find('input[name="max_message"]').val() || CONFIG.maxMessageLength,
		default_ddd: form.find('input[name="default_ddd"]').val() || '',
		default_number: form.find('input[name="default_number"]').val().replace(/[^0-9]/g, '') || '',
		debug_mode: form.find('input[name="debug_mode"]').is(':checked'),
		cors_enabled: form.find('input[name="cors_enabled"]').is(':checked'),
		cors_origins: corsOrigins
	};


	if (!formData.host || !formData.id || !formData.api_key) {
		showAlert('Campos Obrigatórios', 'Por favor, preencha todos os campos obrigatórios.');
		return;
	}

	try {
		if (CONFIG.debugMode) {
			console.log('🔧 [DEBUG] Salvando configurações:', {
				formData: formData,
				timestamp: new Date().toISOString()
			});
		}

		const response = await makeApiRequest('save_config', formData);

		if (CONFIG.debugMode) {
			console.log('🔧 [DEBUG] Resposta do salvamento:', {
				response: response,
				timestamp: new Date().toISOString()
			});
		}

		if (response && response.success) {

			const newMaxLength = parseInt(formData.max_message);
			if (newMaxLength) {
				CONFIG.maxMessageLength = newMaxLength;
				$('#message').attr('maxlength', newMaxLength);
				$('#charCount').text(`0/${newMaxLength}`);
			}

			const newTimeout = parseInt(formData.timeout);
			if (newTimeout) {
				CONFIG.timeout = newTimeout * 1000;
			}

			showAlert('Configurações Salvas!', 'Configurações salvas com sucesso!');
			closeConfigModal();


			updateInterfaceVisibility();

			location.reload();
		} else {
			showAlert('Erro ao Salvar', `Erro ao salvar configurações: ${response.message || 'Erro desconhecido'}`);
		}
	} catch (error) {
		showAlert('Erro ao Salvar', `Erro ao salvar configurações: ${error.message}`);
	}
}

function translateStatus(status) {
	const translations = {
		'active': 'Ativa',
		'inactive': 'Inativa',
		'starting': 'Iniciando',
		'stopping': 'Parando',
		'stopped': 'Parada',
		'connected': 'Conectado',
		'disconnected': 'Desconectado',
		'connecting': 'Conectando',
		'disconnecting': 'Desconectando',
		'authenticated': 'Autenticado',
		'read_qrcode': 'Aguardando QR Code',
		'pairing': 'Emparelhando',
		'pairing_confirmed': 'Emparelhamento Confirmado',
		'pairing_failed': 'Falha no Emparelhamento',
		'unpaired': 'Desemparelhado',
		'unavailable': 'Indisponível',
		'sent': 'Enviada',
		'delivered': 'Entregue',
		'read': 'Lida',
		'failed': 'Falhou',
		'pending': 'Pendente',
		'image': 'Imagem',
		'video': 'Vídeo',
		'audio': 'Áudio',
		'document': 'Documento',
		'sticker': 'Sticker',
		'location': 'Localização',
		'contact': 'Contato',
		'reaction': 'Reação'
	};
	return translations[status] || status;
}

function getGlobalTarget() {
	const globalTarget = document.getElementById('globalTarget');
	return globalTarget ? globalTarget.value.replace(/[^0-9]/g, '') : '';
}

function switchTab(tabName) {
	$('.tab').removeClass('active');
	
	$(`.tab[onclick="switchTab('${tabName}')"]`).addClass('active');
	
	$('.tab-content').removeClass('active');
	
	$(`#${tabName}Tab`).addClass('active');
}


$(document).on('click', '.modal', function (e) {
	if (e.target === this) {
		$(this).removeClass('show');
	}
});
$(document).on('keydown', function (e) {
	if (e.key === 'Escape') {
		$('.modal').removeClass('show');
	}
});

function updateInterfaceVisibility() {
	const container = document.querySelector('.container');
	const instructionsCard = document.getElementById('instructionsCard');
	const authErrorCard = document.getElementById('authErrorCard');
	const authErrorAlert = document.getElementById('authErrorAlert');

	const isConfigured = !container.classList.contains('not-configured');

	if (isConfigured) {
		container.classList.remove('not-configured');
		if (instructionsCard) {
			instructionsCard.style.display = 'none';
		}
		if (authErrorCard) {
			authErrorCard.style.display = 'none';
		}
		if (authErrorAlert) {
			authErrorAlert.style.display = 'none';
		}
	} else {
		container.classList.add('not-configured');
		if (instructionsCard && (!authErrorCard || authErrorCard.style.display === 'none')) {
			instructionsCard.style.display = 'block';
		}
	}
}

function getCurrentLocation() {
	if (!navigator.geolocation) {
		showAlert('Erro', 'Geolocalização não é suportada por este navegador.', 'error');
		return;
	}

	const button = event.target;
	const originalText = button.innerHTML;
	button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Obtendo localização...';
	button.disabled = true;

	navigator.geolocation.getCurrentPosition(
		function(position) {
			const lat = position.coords.latitude;
			const lng = position.coords.longitude;
			
			$('#latitude').val(lat.toFixed(6));
			$('#longitude').val(lng.toFixed(6));
			
			button.innerHTML = originalText;
			button.disabled = false;
			
			showAlert('Localização Obtida!', `Latitude: ${lat.toFixed(6)}\nLongitude: ${lng.toFixed(6)}`, 'success');
		},
		function(error) {
			button.innerHTML = originalText;
			button.disabled = false;
			
			let errorMessage = 'Erro ao obter localização: ';
			switch(error.code) {
				case error.PERMISSION_DENIED:
					errorMessage += 'Permissão negada pelo usuário.';
					break;
				case error.POSITION_UNAVAILABLE:
					errorMessage += 'Localização indisponível.';
					break;
				case error.TIMEOUT:
					errorMessage += 'Tempo limite excedido.';
					break;
				default:
					errorMessage += 'Erro desconhecido.';
					break;
			}
			
			showAlert('Erro de Localização', errorMessage, 'error');
		},
		{
			enableHighAccuracy: true,
			timeout: 10000,
			maximumAge: 300000
		}
	);
}

function toggleTheme() {
	const currentMode = localStorage.getItem('themeMode') || 'auto';
	let newMode;
	
	if (currentMode === 'auto') {
		newMode = 'light';
	} else if (currentMode === 'light') {
		newMode = 'dark';
	} else {
		newMode = 'auto';
	}
	
	localStorage.setItem('themeMode', newMode);
	applyThemeMode(newMode);
}

function applyThemeMode(mode) {
	const modalThemeIcon = document.getElementById('modalThemeIcon');
	const themeToggleBtn = document.getElementById('themeToggleBtn');
	
	if (mode === 'auto') {
		localStorage.removeItem('theme');
		if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
			document.documentElement.setAttribute('data-theme', 'dark');
		} else {
			document.documentElement.setAttribute('data-theme', 'light');
		}
		if (modalThemeIcon) modalThemeIcon.className = 'fas fa-adjust';
		if (themeToggleBtn) themeToggleBtn.title = 'Tema: Automático';
	} else if (mode === 'light') {
		document.documentElement.setAttribute('data-theme', 'light');
		localStorage.setItem('theme', 'light');
		if (modalThemeIcon) modalThemeIcon.className = 'fas fa-sun';
		if (themeToggleBtn) themeToggleBtn.title = 'Tema: Claro';
	} else if (mode === 'dark') {
		document.documentElement.setAttribute('data-theme', 'dark');
		localStorage.setItem('theme', 'dark');
		if (modalThemeIcon) modalThemeIcon.className = 'fas fa-moon';
		if (themeToggleBtn) themeToggleBtn.title = 'Tema: Escuro';
	}
}

function loadTheme() {
	const themeMode = localStorage.getItem('themeMode') || 'auto';
	applyThemeMode(themeMode);
	
	if (window.matchMedia) {
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
			const currentMode = localStorage.getItem('themeMode') || 'auto';
			if (currentMode === 'auto') {
				const newTheme = e.matches ? 'dark' : 'light';
				document.documentElement.setAttribute('data-theme', newTheme);
			}
		});
	}
}








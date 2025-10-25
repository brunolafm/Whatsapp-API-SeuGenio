# WhatsApp API - SeuGênio

Uma interface web completa para gerenciar mensagens do WhatsApp através da API SeuGênio. Este projeto oferece uma interface intuitiva e moderna para enviar mensagens, mídias, localizações e contatos via WhatsApp.

## ✨ Características

- 🚀 **Interface Moderna**: Interface web responsiva e intuitiva
- 📱 **Envio de Mensagens**: Suporte a texto, mídia, localização e contatos
- 🔧 **Controle de Instância**: Gerenciar status, QR code, iniciar/reiniciar instância
- 🛡️ **Segurança**: Controle de CORS, IPs permitidos e validações
- 📊 **Logs Detalhados**: Sistema completo de logging de requisições
- ⚙️ **Configuração Flexível**: Interface de configuração integrada
- 🔍 **Validação de Números**: Verificação automática de números WhatsApp
- 📱 **Máscara de Telefone**: Formatação automática de números

## 📋 Pré-requisitos

- PHP 7.4 ou superior
- Servidor web (Apache/Nginx)
- Conta na [SeuGênio API](https://seugenioapi.com.br/)
- cURL habilitado no PHP

## 🚀 Instalação

1. **Clone o repositório:**
```bash
git clone https://github.com/brunolafm/Whatsapp-API-SeuGenio.git
cd whatsapp-api-seugenio
```

2. **Configure o servidor web:**
   - Para XAMPP: Coloque o projeto em `htdocs/`
   - Para outros servidores: Configure o DocumentRoot para apontar para a pasta do projeto

3. **Defina permissões:**
```bash
chmod 755 config/
chmod 644 config/settings.json
chmod 755 config/logs/
```

4. **Acesse a aplicação:**
   - Abra seu navegador e acesse `http://localhost/Whatsapp-API-SeuGenio`
   - Ou o domínio configurado no seu servidor web

## ⚙️ Configuração

### 1. Configuração da API SeuGênio

1. Acesse [SeuGênio API](https://seugenioapi.com.br/) e crie sua conta
2. Após confirmar e pagar o plano, vá para [Instâncias](https://app.seugenioapi.com.br/)
3. Crie uma nova instância e anote:
   - **Host da API**
   - **ID da Instância**
   - **Token da API**

### 2. Configuração da Interface

1. Acesse a interface web
2. Clique no ícone de configurações (⚙️) no canto superior direito
3. Preencha os campos:
   - **Host da API**: URL base da API SeuGênio
   - **ID da Instância**: ID único da sua instância
   - **Chave da API**: Token de autenticação
   - **DDD Padrão**: DDD padrão para números (opcional)
   - **Número Padrão**: Número padrão para testes (opcional)

### 3. Configurações Avançadas

- **Limite de caracteres**: Máximo de caracteres por mensagem
- **Timeout**: Tempo limite para requisições (padrão: 60 segundos)
- **Modo Debug**: Habilita logs detalhados e CORS permissivo
- **CORS**: Controle de origens permitidas
- **IPs Permitidos**: Lista de IPs com acesso (opcional)
- **Comprimento Máximo da Mensagem**: Limite de caracteres (padrão: 2048)
- **Comprimento Máximo do Telefone**: Limite de dígitos (padrão: 20)

## 📱 Uso

### Conectar Instância

1. Clique em **"QR Code"** para obter o código QR
2. Escaneie o código com seu WhatsApp
3. Aguarde a confirmação de conexão

### Enviar Mensagens

#### Mensagem de Texto
1. Vá para a aba **"Texto"**
2. Digite o número do WhatsApp (formato: +55 (11) 99999-9999)
3. Digite sua mensagem
4. Clique em **"Enviar Mensagem"**

#### Mídia
1. Vá para a aba **"Mídia"**
2. Selecione o tipo (Imagem, Vídeo, Documento, Áudio)
3. Insira a URL da mídia
4. Adicione uma legenda (opcional)
5. Clique em **"Enviar Mídia"**

#### Localização
1. Vá para a aba **"Localização"**
2. Insira as coordenadas (latitude e longitude)
3. Clique em **"Enviar Localização"**

#### Contato
1. Vá para a aba **"Contato"**
2. Digite o nome do contato
3. Insira a URL do arquivo VCF
4. Clique em **"Enviar Contato"**

## 🔧 Funcionalidades

### Controle de Instância
- **Status**: Verificar status da instância
- **QR Code**: Obter código QR para conexão
- **Iniciar**: Iniciar a instância
- **Reiniciar**: Reiniciar a instância
- **Desconectar**: Desconectar a instância

### Funções de Contatos
- **Validar Número**: Verificar se o número é válido no WhatsApp
- **Status Contato**: Verificar status do contato
- **Avatar**: Obter avatar do contato
- **Bloquear/Desbloquear**: Gerenciar bloqueios

## 📁 Estrutura do Projeto

```
zap/
├── config/
│   ├── api_proxy.php          # Proxy da API SeuGênio
│   ├── config.php             # Configurações principais
│   ├── settings.json          # Arquivo de configurações
│   └── logs/                  # Logs do sistema
├── static/
│   ├── css/
│   │   └── style.css          # Estilos da interface
│   └── js/
│       └── app.js             # JavaScript da aplicação
├── index.php                  # Página principal
├── README.md                  # Este arquivo
├── .gitignore                 # Arquivos ignorados pelo Git
└── .gitattributes             # Configurações do Git
```

## 🔌 API Endpoints

### POST `/config/api_proxy.php`

**Ações disponíveis:**
- `send_message`: Enviar mensagem de texto
- `send_media`: Enviar mídia (imagem, vídeo, documento, áudio)
- `send_location`: Enviar localização
- `send_contact`: Enviar contato (arquivo VCF)
- `get_status`: Obter status da instância
- `get_qr_code`: Obter QR code para conexão
- `start_instance`: Iniciar instância
- `reboot_instance`: Reiniciar instância
- `logout_instance`: Desconectar instância
- `validate_number`: Validar número WhatsApp
- `get_config`: Obter configurações atuais
- `save_config`: Salvar configurações
- `test_connection`: Testar conexão com a API

## 🛡️ Segurança

### Controle de Acesso
- **CORS**: Controle de origens permitidas
- **IPs Permitidos**: Lista de IPs com acesso (vazio = todos os IPs)
- **Validação de Entrada**: Sanitização de dados
- **Validação de Telefone**: Formato e comprimento validados
- **Validação de Mensagem**: Comprimento limitado e sanitização

### Modo Debug
- **ON**: Permite qualquer origem, exibe respostas detalhadas
- **OFF**: Aplica CORS restritivo, oculta respostas sensíveis

## 📊 Logs

O sistema gera logs detalhados em `config/logs/`:
- `api_requests_YYYY-MM-DD.log`: Logs de requisições da API
- `config_changes_YYYY-MM-DD.log`: Logs de alterações de configuração

> **Nota**: Os logs só são gerados quando o modo debug está habilitado.

### Formato do Log
```json
{
  "timestamp": "2024-01-01 12:00:00",
  "ip": "192.168.1.1",
  "endpoint": "send_message",
  "data": {...},
  "response": {...},
  "status_code": 200
}
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **"Credenciais não configuradas"**
   - Verifique se o arquivo `config/settings.json` existe
   - Configure as credenciais através da interface (ícone ⚙️)
   - Certifique-se de que os campos ID e API Key não estão vazios

2. **"Acesso negado"**
   - Verifique as configurações de CORS
   - Confirme se seu IP está na lista de IPs permitidos

3. **"Timeout na requisição"**
   - Aumente o valor de timeout nas configurações
   - Verifique sua conexão com a internet

4. **"Número inválido"**
   - Use o formato correto: +55 (11) 99999-9999
   - Verifique se o número existe no WhatsApp
   - Certifique-se de incluir o código do país (+55 para Brasil)

5. **"Erro 403 - Acesso negado"**
   - Verifique se o modo debug está habilitado
   - Ou configure corretamente as origens CORS
   - Confirme se seu IP está na lista de IPs permitidos (se configurado)

6. **"A API não autorizou a instância"**
   - Verifique se suas credenciais estão corretas
   - Confirme se a instância está ativa na SeuGênio API
   - Verifique se o Host, Instance ID e Token estão corretos

## 🤝 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.


## 👨‍💻 Desenvolvedor

Desenvolvido por [Bruno L. Furquim](https://github.com/brunolafm)

## 🔗 Links Úteis

- [SeuGênio API - Site Oficial](https://seugenioapi.com.br/)
- [SeuGênio API - Instâncias](https://app.seugenioapi.com.br/)
- [Documentação da API SeuGênio](https://www.postman.com/seugenioapi/seugenio-api-whatsapp/folder/uig1g9u/instncia)

---

**⚠️ Aviso**: Este projeto é para fins educacionais e de desenvolvimento. Certifique-se de cumprir os termos de uso do WhatsApp e da SeuGênio API.


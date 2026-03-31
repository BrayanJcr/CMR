require('dotenv').config()

// Activar debug interno de whatsapp-web.js
process.env.DEBUG = 'whatsapp-web.js:*';
const { Client, LocalAuth, MessageMedia, Buttons, Location, Poll, List } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const https = require('https')

let path_windows = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
let path_linux = '/usr/bin/google-chrome-stable';
let path_navegador = process.platform == 'win32' ? path_windows : path_linux;

const instanceAxios = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
});
const header = {
    headers: {
        'content-type': 'text/json'
    }
};

class ClientWA {
    numero = '';
    cliente;
    estaActivo = false;
    estaInicializando = false;

    constructor(numero) {
        this.numero = numero;

        const whatsappClient = new Client({
            authStrategy: new LocalAuth({
                dataPath: 'sesiones',
                clientId: `client-local`
            }),
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
            },
            puppeteer: {
                headless: true,
                args: ['--no-sandbox'],
                executablePath: path_navegador
            }
        });

        this.cliente = whatsappClient;
    }

    async inicializar() {
        console.log(`inicializar Cliente: ${this.numero}`)

        //eventos
        this.cliente.on('change_state', (state) => {
            console.log(`[DEBUG] Estado cambiado:`, state);
        });

        this.cliente.on('auth_failure', (data) => {
            console.error(`[DEBUG] Fallo de autenticación:`, data);
        });

        this.cliente.on('disconnected', (reason) => {
            console.warn(`[DEBUG] Cliente desconectado. Razón:`, reason);
        });
        this.cliente.on('qr', async qr => {
            console.log(`Código QR desde desde: ${this.numero}, --------------`, qr);
            qrcode.generate(qr, {
                small: true
            });

            //envio del qr recibido
            let mensajeRecibidoQR = {
                qrCode: qr,
            };

            try {
                let respuestaEnvio = await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-qr',
                    mensajeRecibidoQR,
                    header
                );
                console.log('Respuesta recepción qr', JSON.stringify(respuestaEnvio.data));
            } catch (error) {
                console.error('Error general en Recepcion qr', error);
            }
        });

        this.cliente.on('ready', async () => {
            this.estaInicializando = false;

            this.numero = this.cliente.info.wid.user;
            console.log(`[DEBUG] Client is ready: ${this.numero}`);

            //recepcion del numero
            console.log(`INFO READY:----------`, JSON.stringify(this.cliente.info));
            let mensajeNumero = {
                numeroDesde: this.cliente.info.wid.user,
            };

            try {
                let respuestaEnvio = await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-numero',
                    mensajeNumero,
                    header
                );
                console.log('Respuesta recepción número', JSON.stringify(respuestaEnvio.data));
            } catch (error) {
                console.error('Error general en Recepcion número', error);
            }
            // this.estaActivo = true;
        });

        this.cliente.on('message', async message => {
            console.log(`Mensaje entrante desde: ${message.from}`);

            //mensajes especiales
            if (message.body === 'ping') {
                message.reply('pong');
            }
            if (message.from == 'status@broadcast') {
                console.log('Mensaje Broadcast');
            }

            console.log(' -------', JSON.stringify(message));
            
            let mensajeEntrante = {
                numeroDesde: message.from.replace('@c.us', ''),
                numeroPara: message.to.replace('@c.us', ''),
                mensaje: message.body,
                whatsAppTipo: message.type,
                fechaEnvio: new Date(message.timestamp * 1000),
                whatsAppId: message.id.id,
                // whatsAppIdPadre: message.hasQuotedMsg == true ? message.rawData.quotedMsg.id.id : null,
                tieneAdjunto: message.hasMedia,
                esGif: message.isGif || false,
                // adjuntoBase64: message.rawData.body,
                // nombreArchivo: message.rawData.filename,
                // mimeType: message.rawData.mimetype,
                // nroByte: message.rawData.size,
            };

            //gestion del contacto
            try {
                const contacto = await message.getContact();
                mensajeEntrante.nombreContacto = contacto.pushname;
                console.log('Mensaje entrante Contacto: ', contacto.pushname);
            }
            catch (errorContacto) {
                console.error('Error obtener el nombre del contacto', errorContacto);
            }

            //gestion id padre
            if (message.hasQuotedMsg == true && message.rawData.quotedMsg != null && message.rawData.quotedMsg.id != null)
                mensajeEntrante.whatsAppIdPadre = message.rawData.quotedMsg.id.id;

            if (message.hasMedia
                // && (message.type == 'audio' || message.type == 'ptt' || message.type == 'sticker' || message.type == 'video')
            ) {
                try {
                    const attachmentData = await message.downloadMedia();
                    if (attachmentData != null) {
                        mensajeEntrante.adjuntoBase64 = attachmentData.data;
                        mensajeEntrante.mimeType = attachmentData.mimetype;
                        mensajeEntrante.nroByte = attachmentData.filesize;
                        mensajeEntrante.nombreArchivo = attachmentData.filename;
                    }
                } catch (errorInterno) {
                    console.error('Error general en descarga de adjunto', errorInterno);
                    mensajeEntrante.esErrorDescargaMultimedia = true;
                }
            }

            try {
                let respuestaEnvio = await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar',
                    mensajeEntrante,
                    header
                );
                console.log('Respuesta recepción mensaje', JSON.stringify(respuestaEnvio.data));
            } catch (error) {
                console.error('Error general en Recepcion Mensaje', error);
            }
        });

        this.cliente.on('message_edit', async (message, newBody, prevBody) => {
            console.log(`Mensaje entrante desde: ${message.from}`);
            console.log(` - newBody ------- ${newBody}`);
            console.log(` - prevBody ------ ${prevBody}`);
            if (message.from != this.numero) {
                //envio de la edicion
                let mensajeEditado = {
                    numeroDesde: message.from.replace('@c.us', ''),
                    numeroPara: message.to.replace('@c.us', ''),
                    mensajeActual: newBody,
                    mensajeAnterior: prevBody,
                    whatsAppTipo: message.type,
                    fechaEnvio: new Date(message.timestamp * 1000),
                    whatsAppId: message.id.id,
                };

                try {
                    let respuestaEnvio = await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-edicion',
                        mensajeEditado,
                        header
                    );
                    console.log('Respuesta recepción edición', JSON.stringify(respuestaEnvio.data));
                } catch (error) {
                    console.error('Error general en Recepcion edición', error);
                }
            }
        });

        this.cliente.on('message_revoke_everyone', async (message, revoked_msg) => {
            console.log(`Mensaje eliminado desde desde: ${message.from}`);
            console.log(' ------- message: ', JSON.stringify(message));
            console.log(' ------- revoked_msg: ', JSON.stringify(revoked_msg));

            if (message.from != this.numero) {
                //envio de la eliminacion
                let mensajeEditado = {
                    numeroDesde: message.from.replace('@c.us', ''),
                    numeroPara: message.to.replace('@c.us', ''),
                    whatsAppId: message.rawData.protocolMessageKey.id,
                };

                try {
                    let respuestaEnvio = await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-eliminacion',
                        mensajeEditado,
                        header
                    );
                    console.log('Respuesta recepción eliminacion', JSON.stringify(respuestaEnvio.data));
                } catch (error) {
                    console.error('Error general en Recepcion eliminacion', error);
                }
            }
        });

        this.cliente.on('auth_failure', (data) => {
            console.log(`Client auth_failure: ${this.numero}`, data);
        });

        this.cliente.on('disconnected', (data) => {
            this.estaActivo = false;
            console.log(`Client disconnected: ${this.numero}`, data);
        });

        this.cliente.on('authenticated', (data) => {
            this.estaActivo = true;
            this.estaInicializando = false;

            console.log(`[DEBUG] Client authenticated: ${this.numero}`, data);
        });

        this.cliente.on('message_ack', async (msg, ack) => {
            try {
                await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-ack', {
                    whatsAppId: msg.id._serialized,
                    ackEstado: ack
                }, header);
            } catch (e) {
                console.error('[message_ack] error:', e.message);
            }
        });

        this.cliente.on('message_reaction', async (reaction) => {
            try {
                await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-reaccion', {
                    whatsAppId: reaction.msgId._serialized,
                    emoji: reaction.reaction,
                    senderId: reaction.senderId._serialized || reaction.senderId,
                    timestamp: reaction.timestamp
                }, header);
            } catch (e) {
                console.error('[message_reaction] error:', e.message);
            }
        });

        this.cliente.on('group_join', async (notification) => {
            try {
                await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-grupo-evento', {
                    chatId: notification.chatId._serialized || notification.chatId,
                    tipo: 'add',
                    author: notification.author,
                    recipientIds: notification.recipientIds,
                    timestamp: notification.timestamp
                }, header);
            } catch (e) {
                console.error('[group_join] error:', e.message);
            }
        });

        this.cliente.on('group_leave', async (notification) => {
            try {
                await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-grupo-evento', {
                    chatId: notification.chatId._serialized || notification.chatId,
                    tipo: 'remove',
                    author: notification.author,
                    recipientIds: notification.recipientIds,
                    timestamp: notification.timestamp
                }, header);
            } catch (e) {
                console.error('[group_leave] error:', e.message);
            }
        });

        this.cliente.on('group_update', async (notification) => {
            try {
                await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-grupo-evento', {
                    chatId: notification.chatId._serialized || notification.chatId,
                    tipo: notification.type || 'update',
                    author: notification.author,
                    recipientIds: [],
                    timestamp: notification.timestamp
                }, header);
            } catch (e) {
                console.error('[group_update] error:', e.message);
            }
        });

        this.cliente.on('call', async (call) => {
            try {
                await call.reject();
                await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-llamada', {
                    callId: call.id,
                    from: call.from,
                    isVideo: call.isVideo,
                    timestamp: Math.floor(Date.now() / 1000)
                }, header);
            } catch (e) {
                console.error('[call] error:', e.message);
            }
        });

        //inicializacion
        let respuesta = this.cliente.initialize();
        this.estaInicializando = true;

        return respuesta;
    }

    cerrarSesion() {
        let statuslogout = this.cliente.logout();
        return statuslogout;
    }

    obtenerEstado() {
        let statusState = this.cliente.getState();
        return statusState;
    }

    enviarMensaje(phoneDestination, message) {
        const numberWA = phoneDestination + "@c.us";
        let statusSending = this.cliente.sendMessage(numberWA, message);
        return statusSending;
    }

    async enviarMensajeMultimedia(phoneDestination, caption, dataBase64, mimeType, fileName) {
        const numberWA = phoneDestination + "@c.us";
        let options = {
            caption: caption,
            sendAudioAsVoice: true,
            sendVideoAsGif: mimeType === 'image/gif'
        };

        const media = await new MessageMedia(mimeType, dataBase64, fileName);
        let statusSending = this.cliente.sendMessage(numberWA, media, options);

        return statusSending;
    }

    async enviarMensajeMultimediaDesdeUrl(phoneDestination, caption, media_url) {
        const numberWA = phoneDestination + "@c.us";
        // var media = await new MessageMedia("image/jpg", _base64.data, "myimage.jpg")
        const media = await MessageMedia.fromUrl(media_url);
        let statusSending = this.cliente.sendMessage(numberWA, media, { caption: caption });

        return statusSending;
    }

    async enviarBoton(phoneDestination, message) {
        const numberWA = phoneDestination + "@c.us";
        // let button = new Buttons('Button body', [{ body: 'bt1' }, { body: 'bt2' }, { body: 'bt3' }], 'title', 'footer');
        let button = new Buttons('Button body', [{ body: 'Aceptar' }, { body: 'rechazar' }], 'title', 'footer');
        let statusSending = this.cliente.sendMessage(numberWA, button);
        return statusSending;
    }

    async sendLocation(to, lat, lng, name, address) {
        const numberWA = to.includes('@') ? to : to + '@c.us';
        const location = new Location(lat, lng, { name, address });
        return await this.cliente.sendMessage(numberWA, location);
    }

    async sendReaction(messageId, emoji) {
        // messageId ya viene serializado (ej: "51999...@c.us_true_XXXXX"), no es número
        const msg = await this.cliente.getMessageById(messageId);
        return await msg.react(emoji);
    }

    async sendPoll(to, question, options) {
        const numberWA = to.includes('@') ? to : to + '@c.us';
        const poll = new Poll(question, options);
        return await this.cliente.sendMessage(numberWA, poll);
    }

    async sendList(to, title, body, buttonText, sections) {
        const numberWA = to.includes('@') ? to : to + '@c.us';
        const list = new List(body, buttonText, sections, title);
        return await this.cliente.sendMessage(numberWA, list);
    }

    async sendVoice(to, base64Audio, mimeType = 'audio/ogg; codecs=opus') {
        const numberWA = to.includes('@') ? to : to + '@c.us';
        // Siempre declarar audio/ogg; codecs=opus como mimeType para que WhatsApp lo procese
        // como nota de voz (PTT). El codec Opus es compatible entre contenedores WebM y OGG.
        const media = new MessageMedia('audio/ogg; codecs=opus', base64Audio, 'audio.ogg');
        return await this.cliente.sendMessage(numberWA, media, { sendAudioAsVoice: true });
    }

    async sendContactCard(to, vcardString) {
        // whatsapp-web.js no tiene new Contact() — se envía el vcard como texto plano tipo contact_card
        const numberWA = to.includes('@') ? to : to + '@c.us';
        return await this.cliente.sendMessage(numberWA, vcardString, { parseVCards: true });
    }

    async markSeen(chatId) {
        const chat = await this.cliente.getChatById(chatId);
        return await chat.sendSeen();
    }

    async validateNumber(number) {
        return await this.cliente.isRegisteredUser(number);
    }

    async getContacts() {
        return await this.cliente.getContacts();
    }

    async getChats() {
        return await this.cliente.getChats();
    }

    async getProfilePic(contactId) {
        return await this.cliente.getProfilePicUrl(contactId);
    }

    async createGroup(name, participants) {
        return await this.cliente.createGroup(name, participants);
    }

    async addParticipants(groupId, participants) {
        const chat = await this.cliente.getChatById(groupId);
        return await chat.addParticipants(participants);
    }

    async removeParticipants(groupId, participants) {
        const chat = await this.cliente.getChatById(groupId);
        return await chat.removeParticipants(participants);
    }

}
module.exports = ClientWA
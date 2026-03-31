require('dotenv').config()
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage, makeCacheableSignalKeyStore, Browsers } = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const axios = require('axios')
const https = require('https')
const pino = require('pino')

const instanceAxios = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
})
const header = { headers: { 'content-type': 'text/json' } }

// Store en memoria (reemplaza makeInMemoryStore deprecado)
const store = { messages: {}, contacts: {}, chats: {} }

class ClientBaileys {
    numero = ''
    sock = null
    estaActivo = false
    estaInicializando = false
    // Mapa de messageKey por whatsAppId — para reacciones/respuestas
    messageKeys = new Map()

    constructor(numero) {
        this.numero = numero
    }

    // Convierte número de teléfono a JID de Baileys
    toJid(number) {
        // Si ya tiene @, devolverlo tal cual
        if (number.includes('@')) return number
        return number + '@s.whatsapp.net'
    }

    // Extrae número de un JID
    fromJid(jid) {
        if (!jid) return ''
        return jid.replace(/@.*/, '')
    }

    async inicializar() {
        console.log(`Inicializando cliente Baileys: ${this.numero}`)
        this.estaInicializando = true

        const { state, saveCreds } = await useMultiFileAuthState('sesiones-baileys')

        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
            },
            browser: Browsers.appropriate('Desktop'),
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            getMessage: async (key) => {
                const msgs = store.messages[key.remoteJid]
                if (!msgs) return undefined
                const msg = msgs.get(key.id)
                return msg?.message || undefined
            }
        })

        this.sock = sock

        // Bind manual del store (reemplaza store.bind(sock.ev))
        sock.ev.on('messaging-history.set', ({ messages: historyMsgs, isLatest }) => {
            for (const msg of historyMsgs) {
                const jid = msg.key.remoteJid
                if (!store.messages[jid]) store.messages[jid] = new Map()
                store.messages[jid].set(msg.key.id, msg)
            }
        })

        sock.ev.on('messages.upsert', ({ messages: upsertMsgs }) => {
            for (const msg of upsertMsgs) {
                const jid = msg.key.remoteJid
                if (!store.messages[jid]) store.messages[jid] = new Map()
                store.messages[jid].set(msg.key.id, msg)
            }
        })

        sock.ev.on('contacts.upsert', (contacts) => {
            for (const c of contacts) store.contacts[c.id] = c
        })

        sock.ev.on('chats.upsert', (chats) => {
            for (const c of chats) store.chats[c.id] = c
        })

        // === EVENTOS ===

        sock.ev.on('creds.update', saveCreds)

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update

            if (qr) {
                console.log('QR generado para Baileys')
                qrcode.generate(qr, { small: true })
                try {
                    await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-qr',
                        { qrCode: qr }, header)
                } catch (e) {
                    console.error('[qr] error notificando .NET:', e.message)
                }
            }

            if (connection === 'open') {
                this.estaActivo = true
                this.estaInicializando = false
                this.numero = sock.user?.id ? this.fromJid(sock.user.id) : this.numero
                console.log(`[Baileys] Conectado: ${this.numero}`)
                try {
                    await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-numero',
                        { numeroDesde: this.numero }, header)
                } catch (e) {
                    console.error('[ready] error notificando .NET:', e.message)
                }
            }

            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode
                const shouldReconnect = code !== DisconnectReason.loggedOut
                console.warn(`[Baileys] Desconectado. Código: ${code}. Reconectar: ${shouldReconnect}`)
                this.estaActivo = false
                if (shouldReconnect) {
                    setTimeout(() => this.inicializar(), 5000)
                } else {
                    this.estaInicializando = false
                }
            }
        })

        // Mensajes entrantes
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return

            for (const msg of messages) {
                if (msg.key.fromMe) continue // ignorar mensajes propios
                if (msg.key.remoteJid === 'status@broadcast') continue

                const from = this.fromJid(msg.key.remoteJid)
                const to = this.fromJid(sock.user?.id || '')
                const tipo = Object.keys(msg.message || {})[0] || 'chat'

                let mensajeEntrante = {
                    numeroDesde: from,
                    numeroPara: to,
                    mensaje: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '',
                    whatsAppTipo: tipo,
                    fechaEnvio: new Date((msg.messageTimestamp || Date.now() / 1000) * 1000),
                    whatsAppId: msg.key.id,
                    tieneAdjunto: false,
                    esGif: false,
                }

                // Nombre del contacto
                try {
                    const contact = store.contacts[msg.key.remoteJid]
                    mensajeEntrante.nombreContacto = contact?.notify || contact?.name || ''
                } catch (e) { /* ignorar */ }

                // ID del mensaje citado
                if (msg.message?.extendedTextMessage?.contextInfo?.stanzaId) {
                    mensajeEntrante.whatsAppIdPadre = msg.message.extendedTextMessage.contextInfo.stanzaId
                }

                // Guardar key para reacciones
                this.messageKeys.set(msg.key.id, msg.key)

                // Media
                const mediaTipos = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage', 'pttMessage']
                const mediaTipo = mediaTipos.find(t => msg.message?.[t])

                if (mediaTipo) {
                    mensajeEntrante.tieneAdjunto = true
                    mensajeEntrante.esGif = msg.message?.[mediaTipo]?.gifPlayback || false
                    try {
                        const buffer = await downloadMediaMessage(msg, 'buffer', {})
                        const mediaMsg = msg.message[mediaTipo]
                        mensajeEntrante.adjuntoBase64 = buffer.toString('base64')
                        mensajeEntrante.mimeType = mediaMsg.mimetype
                        mensajeEntrante.nroByte = buffer.length
                        mensajeEntrante.nombreArchivo = mediaMsg.fileName || `archivo.${mediaMsg.mimetype?.split('/')[1] || 'bin'}`
                        // Caption para imágenes/video/documentos
                        if (mediaMsg.caption) mensajeEntrante.mensaje = mediaMsg.caption
                    } catch (e) {
                        console.error('[media] error descargando:', e.message)
                        mensajeEntrante.esErrorDescargaMultimedia = true
                    }
                }

                try {
                    await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar',
                        mensajeEntrante, header)
                } catch (e) {
                    console.error('[message] error notificando .NET:', e.message)
                }
            }
        })

        // ACK (recibido/leído)
        sock.ev.on('message-receipt.update', async (updates) => {
            for (const update of updates) {
                try {
                    // receiptTimestamp = entregado (2), readTimestamp = leído (3)
                    const ackEstado = update.receipt.readTimestamp ? 3
                        : update.receipt.receiptTimestamp ? 2 : 1
                    await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-ack', {
                        whatsAppId: update.key.id,
                        ackEstado
                    }, header)
                } catch (e) {
                    console.error('[ack] error:', e.message)
                }
            }
        })

        // Reacciones
        sock.ev.on('messages.reaction', async (reactions) => {
            for (const reaction of reactions) {
                try {
                    await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-reaccion', {
                        whatsAppId: reaction.key.id,
                        emoji: reaction.reaction.text,
                        senderId: this.fromJid(reaction.reaction.senderTimestampMs?.toString() || reaction.key.remoteJid),
                        timestamp: reaction.reaction.senderTimestampMs || Date.now()
                    }, header)
                } catch (e) {
                    console.error('[reaction] error:', e.message)
                }
            }
        })

        // Mensajes eliminados/editados
        sock.ev.on('messages.update', async (updates) => {
            for (const update of updates) {
                try {
                    // Eliminado
                    if (update.update?.messageStubType === 1 || update.update?.message?.protocolMessage?.type === 0) {
                        await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-eliminacion', {
                            numeroDesde: this.fromJid(update.key.remoteJid),
                            numeroPara: this.fromJid(sock.user?.id || ''),
                            whatsAppId: update.key.id
                        }, header)
                    }
                    // Editado
                    if (update.update?.message?.editedMessage) {
                        const editado = update.update.message.editedMessage
                        await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-edicion', {
                            numeroDesde: this.fromJid(update.key.remoteJid),
                            numeroPara: this.fromJid(sock.user?.id || ''),
                            mensajeActual: editado.message?.conversation || '',
                            mensajeAnterior: '',
                            whatsAppTipo: 'chat',
                            fechaEnvio: new Date(),
                            whatsAppId: update.key.id
                        }, header)
                    }
                } catch (e) {
                    console.error('[messages.update] error:', e.message)
                }
            }
        })

        // Grupos
        sock.ev.on('group-participants.update', async (update) => {
            try {
                await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-grupo-evento', {
                    chatId: update.id,
                    tipo: update.action, // 'add', 'remove', 'promote', 'demote'
                    author: this.fromJid(update.author || ''),
                    recipientIds: (update.participants || []).map(p => this.fromJid(p)),
                    timestamp: Math.floor(Date.now() / 1000)
                }, header)
            } catch (e) {
                console.error('[group-participants] error:', e.message)
            }
        })

        // Llamadas
        sock.ev.on('call', async (calls) => {
            for (const call of calls) {
                try {
                    if (call.status === 'offer') {
                        await sock.rejectCall(call.id, call.from)
                    }
                    await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-llamada', {
                        callId: call.id,
                        from: this.fromJid(call.from),
                        isVideo: call.isVideo || false,
                        timestamp: Math.floor(Date.now() / 1000)
                    }, header)
                } catch (e) {
                    console.error('[call] error:', e.message)
                }
            }
        })

        return sock
    }

    // ========== MÉTODOS DE ENVÍO ==========

    cerrarSesion() {
        return this.sock?.logout()
    }

    obtenerEstado() {
        if (!this.sock) return 'DISCONNECTED'
        return this.estaActivo ? 'CONNECTED' : 'CONNECTING'
    }

    async enviarMensaje(to, message) {
        const jid = this.toJid(to)
        return await this.sock.sendMessage(jid, { text: message })
    }

    async enviarMensajeMultimedia(to, caption, dataBase64, mimeType, fileName) {
        const jid = this.toJid(to)
        const buffer = Buffer.from(dataBase64, 'base64')
        const mime = (mimeType || '').toLowerCase()

        let content
        if (mime.startsWith('image/')) {
            content = { image: buffer, caption: caption || '', mimetype: mimeType, fileName }
        } else if (mime.startsWith('video/')) {
            content = { video: buffer, caption: caption || '', mimetype: mimeType, fileName, gifPlayback: mimeType === 'image/gif' }
        } else if (mime.startsWith('audio/')) {
            content = { audio: buffer, ptt: true, mimetype: 'audio/ogg; codecs=opus' }
        } else {
            content = { document: buffer, caption: caption || '', mimetype: mimeType, fileName: fileName || 'archivo' }
        }

        return await this.sock.sendMessage(jid, content)
    }

    async enviarMensajeMultimediaDesdeUrl(to, caption, mediaUrl) {
        const jid = this.toJid(to)
        // Intentar detectar tipo por URL
        const url = mediaUrl.toLowerCase()
        let content
        if (url.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/)) {
            content = { image: { url: mediaUrl }, caption: caption || '' }
        } else if (url.match(/\.(mp4|mov|avi)(\?|$)/)) {
            content = { video: { url: mediaUrl }, caption: caption || '' }
        } else {
            content = { document: { url: mediaUrl }, caption: caption || '', fileName: 'archivo' }
        }
        return await this.sock.sendMessage(jid, content)
    }

    async sendVoice(to, base64Audio) {
        const jid = this.toJid(to)
        const buffer = Buffer.from(base64Audio, 'base64')
        return await this.sock.sendMessage(jid, {
            audio: buffer,
            ptt: true,
            mimetype: 'audio/ogg; codecs=opus'
        })
    }

    async sendLocation(to, lat, lng, name, address) {
        const jid = this.toJid(to)
        return await this.sock.sendMessage(jid, {
            location: {
                degreesLatitude: lat,
                degreesLongitude: lng,
                name: name || '',
                address: address || ''
            }
        })
    }

    async sendReaction(messageId, emoji) {
        // messageId puede ser serializado como "número@s.whatsapp.net_true_ID"
        const key = this.messageKeys.get(messageId) || { id: messageId, remoteJid: '', fromMe: false }
        return await this.sock.sendMessage(key.remoteJid, {
            react: { text: emoji, key }
        })
    }

    async sendPoll(to, question, options) {
        const jid = this.toJid(to)
        return await this.sock.sendMessage(jid, {
            poll: { name: question, values: options, selectableCount: 1 }
        })
    }

    async sendList(to, title, body, buttonText, sections) {
        const jid = this.toJid(to)
        return await this.sock.sendMessage(jid, {
            listMessage: {
                title,
                text: body,
                buttonText,
                sections,
                listType: 1
            }
        })
    }

    async sendContactCard(to, vcardString) {
        const jid = this.toJid(to)
        return await this.sock.sendMessage(jid, {
            contacts: {
                displayName: 'Contacto',
                contacts: [{ vcard: vcardString }]
            }
        })
    }

    async markSeen(chatId) {
        const jid = this.toJid(chatId)
        const msgs = store.messages[jid]
        if (!msgs) return
        const lastMsg = [...msgs.values()].pop()
        if (lastMsg) {
            await this.sock.readMessages([lastMsg.key])
        }
    }

    async validateNumber(number) {
        const result = await this.sock.onWhatsApp(this.toJid(number))
        return result?.length > 0 && result[0]?.exists
    }

    async getContacts() {
        return Object.entries(store.contacts || {}).map(([jid, c]) => ({
            id: jid,
            name: c.name || c.notify || '',
            number: this.fromJid(jid),
            isMyContact: true
        }))
    }

    async getChats() {
        return Object.entries(store.chats || {}).map(([jid, chat]) => ({
            id: jid,
            name: chat.name || '',
            isGroup: jid.endsWith('@g.us'),
            unreadCount: chat.unreadCount || 0,
            timestamp: chat.conversationTimestamp || 0
        }))
    }

    async getProfilePic(contactId) {
        try {
            const jid = contactId.includes('@') ? contactId : this.toJid(contactId)
            return await this.sock.profilePictureUrl(jid, 'image')
        } catch {
            return null
        }
    }

    async createGroup(name, participants) {
        const jids = participants.map(p => this.toJid(p))
        const result = await this.sock.groupCreate(name, jids)
        return { id: { _serialized: result.id } }
    }

    async addParticipants(groupId, participants) {
        const jid = groupId.includes('@') ? groupId : groupId + '@g.us'
        const jids = participants.map(p => this.toJid(p))
        return await this.sock.groupParticipantsUpdate(jid, jids, 'add')
    }

    async removeParticipants(groupId, participants) {
        const jid = groupId.includes('@') ? groupId : groupId + '@g.us'
        const jids = participants.map(p => this.toJid(p))
        return await this.sock.groupParticipantsUpdate(jid, jids, 'remove')
    }

    // ===== FEATURES EXCLUSIVAS DE BAILEYS =====

    async requestPairingCode(phoneNumber) {
        // Requiere que el socket NO esté ya autenticado
        if (!this.sock) throw new Error('Socket no inicializado. Llamar a inicializar() primero.')
        const code = await this.sock.requestPairingCode(phoneNumber)
        return code
    }

    async sendEphemeral(to, text, expirationSeconds = 86400) {
        const jid = this.toJid(to)
        return await this.sock.sendMessage(jid, { text }, { ephemeralExpiration: expirationSeconds })
    }

    async updatePresence(to, presence = 'composing') {
        // presence: 'unavailable' | 'available' | 'composing' | 'recording' | 'paused'
        const jid = this.toJid(to)
        return await this.sock.sendPresenceUpdate(presence, jid)
    }

    async promoteParticipants(groupId, participants) {
        const jid = groupId.includes('@') ? groupId : groupId + '@g.us'
        const jids = participants.map(p => this.toJid(p))
        return await this.sock.groupParticipantsUpdate(jid, jids, 'promote')
    }

    async demoteParticipants(groupId, participants) {
        const jid = groupId.includes('@') ? groupId : groupId + '@g.us'
        const jids = participants.map(p => this.toJid(p))
        return await this.sock.groupParticipantsUpdate(jid, jids, 'demote')
    }

    async getGroupInviteLink(groupId) {
        const jid = groupId.includes('@') ? groupId : groupId + '@g.us'
        return await this.sock.groupInviteCode(jid)
    }
}

module.exports = ClientBaileys

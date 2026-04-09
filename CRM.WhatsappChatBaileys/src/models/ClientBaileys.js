require('dotenv').config()
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage, makeCacheableSignalKeyStore, Browsers, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const axios = require('axios')
const https = require('https')
const pino = require('pino')
const { execFile } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const instanceAxios = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
})
const MEDIA_TIMEOUT_MS = 15_000
const header = { headers: { 'content-type': 'text/json' } }

async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn()
        } catch (e) {
            if (attempt === maxRetries) throw e
            const delay = baseDelay * Math.pow(2, attempt)
            console.warn(`[retry] intento ${attempt + 1} fallido. Reintentando en ${delay}ms...`)
            await new Promise(r => setTimeout(r, delay))
        }
    }
}

// Store en memoria (reemplaza makeInMemoryStore deprecado)
const store = { messages: {}, contacts: {}, chats: {} }

class ClientBaileys {
    numero = ''
    sock = null
    estaActivo = false
    estaInicializando = false
    _conectando = false          // mutex — previene inicializar() concurrente
    _reconnectTimer = null       // referencia al timer de reconexión
    _tuvoConexion = false        // true si alguna vez llegó a connection === 'open'
    // Mapa de messageKey por whatsAppId — para reacciones/respuestas
    messageKeys = new Map()

    constructor(numero) {
        this.numero = numero
        // Mapa LID → número de teléfono real (para resolver @lid en multi-device)
        this._lidMap = new Map()
        // Cola de mensajes recibidos con @lid aún no resuelto
        // lid → [mensajeEntrante, ...]  (se despachan al llegar chats.phoneNumberShare)
        this._lidPending = new Map()
        // Set de IDs ya procesados — Baileys a veces dispara messages.upsert dos veces
        // para el mismo mensaje (reconexión, history sync). Limpiar cada 10 min.
        this._processedIds = new Set()
        setInterval(() => this._processedIds.clear(), 10 * 60 * 1000)
        // Persistencia del mapa LID→PN
        this._lidMapPath = path.join('sesiones-baileys', 'lid-map.json')
        this._loadLidMap()
    }

    // Resuelve un LID al número de teléfono real
    // 1. Busca en el mapa propio (poblado por fuentes confiables: contacts.upsert/update, chats.phoneNumberShare, altJid)
    // 2. Hace reverse lookup en store.contacts (campo .lid — fuente confiable)
    // 3. Si no encuentra nada, devuelve el LID tal cual → va a _lidPending
    resolveLid(lid) {
        if (this._lidMap.has(lid)) return this._lidMap.get(lid)

        // Reverse lookup en store.contacts (contacts @s.whatsapp.net con campo lid)
        for (const [jid, contact] of Object.entries(store.contacts || {})) {
            if (!jid.endsWith('@s.whatsapp.net')) continue
            const contactLid = (contact?.lid || '').split('@')[0]
            if (contactLid === lid) {
                const phone = jid.split('@')[0]
                this._registrarLid(lid, phone)
                return phone
            }
        }

        return lid // desconocido — va a _lidPending
    }

    _loadLidMap() {
        try {
            if (fs.existsSync(this._lidMapPath)) {
                const data = JSON.parse(fs.readFileSync(this._lidMapPath, 'utf8'))
                for (const [k, v] of Object.entries(data)) {
                    this._lidMap.set(k, v)
                }
                console.log(`[lid-map] cargado desde disco: ${this._lidMap.size} entradas`)
            }
        } catch (e) {
            console.warn('[lid-map] error cargando desde disco:', e.message)
        }
    }

    _saveLidMap() {
        const data = Object.fromEntries(this._lidMap)
        fs.writeFile(this._lidMapPath, JSON.stringify(data), 'utf8', (err) => {
            if (err) console.warn('[lid-map] error guardando:', err.message)
        })
    }

    // Actualiza _lidMap y despacha mensajes que estaban esperando resolución
    _registrarLid(lid, phone) {
        if (!lid || !phone) return
        const esNuevo = !this._lidMap.has(lid)
        this._lidMap.set(lid, phone)
        if (esNuevo) this._saveLidMap()
        const pending = this._lidPending.get(lid)
        if (pending?.length) {
            this._lidPending.delete(lid)
            console.log(`[lid] ${lid} → ${phone} — despachando ${pending.length} mensajes pendientes`)
            for (const mensajeEntrante of pending) {
                mensajeEntrante.numeroDesde = phone
                retryWithBackoff(() => instanceAxios.post(
                    process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar',
                    mensajeEntrante, header
                )).catch(e => console.error('[lid-pending] error al despachar:', e.message))
            }
        }
    }

    // Procesa un único mensaje entrante — llamado en paralelo desde messages.upsert
    async _procesarMensaje(msg, sock) {
        if (msg.key.fromMe) return
        if (msg.key.remoteJid === 'status@broadcast') return
        // Deduplicar: Baileys puede disparar este evento dos veces para el mismo mensaje
        if (this._processedIds.has(msg.key.id)) {
            console.log(`[dedup] ${msg.key.id} ya procesado — ignorando`)
            return
        }
        // Saltar mensajes sin contenido — NO marcar como procesados
        // para que los retries de WhatsApp puedan pasar cuando la sesión se reestablezca
        if (!msg.message) {
            console.log(`[skip] ${msg.key.id} sin msg.message (stubType=${msg.messageStubType}) — descartando`)
            return
        }

        this._processedIds.add(msg.key.id)

        const esGrupo = msg.key.remoteJid?.endsWith('@g.us')
        // Obtener JID crudo del remitente (participant en grupos, remoteJid en individuales)
        // Baileys 6.8+: remoteJidAlt/participantAlt contiene el PN real cuando el JID primario es @lid
        const primaryJid = esGrupo ? msg.key.participant : msg.key.remoteJid
        const altJid     = esGrupo ? msg.key.participantAlt : msg.key.remoteJidAlt
        // Si el primario es @lid y tenemos el Alt (PN), usarlo directamente — sin encolado
        const rawJid = (primaryJid?.endsWith('@lid') && altJid) ? altJid : primaryJid
        // Registrar el mapeo LID→PN en el mapa interno para futuros mensajes
        if (primaryJid?.endsWith('@lid') && altJid) {
            this._registrarLid(primaryJid.split('@')[0], altJid.split('@')[0].split(':')[0])
        }
        // Si es @lid (multi-device), resolver al número real via _lidMap
        let from
        let fromIsLid = false
        if (rawJid?.endsWith('@lid')) {
            const lid = rawJid.split('@')[0]

            from = this.resolveLid(lid)
            fromIsLid = (from === lid) // true si NO se pudo resolver todavía
            console.log(`[lid] ${lid} → ${from}${fromIsLid ? ' (pendiente)' : ' ✓'}`)
        } else {
            from = this.fromJid(rawJid)
        }
        const to = this.numero

        // Desenvolver mensajes wrapeados (ephemeral, viewOnce, etc.)
        let innerMessage = msg.message || {}
        if (innerMessage.ephemeralMessage) innerMessage = innerMessage.ephemeralMessage.message || {}
        if (innerMessage.viewOnceMessage) innerMessage = innerMessage.viewOnceMessage.message || {}
        if (innerMessage.viewOnceMessageV2) innerMessage = innerMessage.viewOnceMessageV2.message || {}
        if (innerMessage.documentWithCaptionMessage) innerMessage = innerMessage.documentWithCaptionMessage.message || {}

        const rawTipo = Object.keys(innerMessage)[0] || 'chat'
        // Normalizar tipos de texto a 'chat' para compatibilidad con la UI
        const tiposTexto = new Set(['conversation', 'extendedTextMessage'])
        const tipo = tiposTexto.has(rawTipo) ? 'chat' : rawTipo

        // Extraer texto del mensaje
        let textoMensaje = innerMessage.conversation
            || innerMessage.extendedTextMessage?.text
            || ''

        let mensajeEntrante = {
            numeroDesde: from,
            numeroPara: to,
            mensaje: textoMensaje,
            whatsAppTipo: tipo,
            fechaEnvio: new Date((msg.messageTimestamp || Date.now() / 1000) * 1000),
            whatsAppId: msg.key.id,
            tieneAdjunto: false,
            esGif: false,
        }

        // Nombre del contacto — msg.pushName es la fuente más confiable
        const senderJid = esGrupo ? msg.key.participant : msg.key.remoteJid
        const contact = store.contacts[senderJid]
        mensajeEntrante.nombreContacto = msg.pushName
            || contact?.notify || contact?.name || ''

        // ID del mensaje citado — buscar contextInfo en cualquier tipo de mensaje
        const contextInfo = innerMessage.extendedTextMessage?.contextInfo
            || innerMessage.imageMessage?.contextInfo
            || innerMessage.videoMessage?.contextInfo
            || innerMessage.audioMessage?.contextInfo
            || innerMessage.documentMessage?.contextInfo
            || innerMessage.stickerMessage?.contextInfo
            || innerMessage.pttMessage?.contextInfo
        if (contextInfo?.stanzaId) {
            mensajeEntrante.whatsAppIdPadre = contextInfo.stanzaId
        }

        // Guardar key para reacciones
        this.messageKeys.set(msg.key.id, msg.key)

        // Media
        const mediaTipos = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage', 'pttMessage']
        const mediaTipo = mediaTipos.find(t => innerMessage[t])

        if (mediaTipo) {
            mensajeEntrante.tieneAdjunto = true
            mensajeEntrante.esGif = innerMessage[mediaTipo]?.gifPlayback || false
            try {
                const buffer = await Promise.race([
                    downloadMediaMessage(msg, 'buffer', {}),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('media download timeout')), MEDIA_TIMEOUT_MS)
                    )
                ])
                const mediaMsg = innerMessage[mediaTipo]
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

        // Si el LID no está resuelto todavía, encolar el mensaje
        // Se despachará en cuanto llegue chats.phoneNumberShare / contacts.upsert
        if (fromIsLid) {
            const lid = from
            const isNew = !this._lidPending.has(lid)
            if (isNew) {
                this._lidPending.set(lid, [])
                // Suscribirse a presencia del JID @lid — a veces fuerza a WA a enviar el mapeo
                try { await sock.subscribePresence(lid + '@lid') } catch {}
            }
            this._lidPending.get(lid).push(mensajeEntrante)
            console.log(`[lid] ${lid} encolado (total=${this._lidPending.get(lid).length}) — esperando resolución`)
            return
        }

        try {
            await retryWithBackoff(() => instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar',
                mensajeEntrante, header))
            console.log(`[message] enviado al .NET ✓ from=${from}${esGrupo ? ' (grupo)' : ''}`)
        } catch (e) {
            console.error('[message] error notificando .NET:', e.message)
        }
    }

    // Convierte número de teléfono a JID de Baileys
    toJid(number) {
        // Si ya tiene @, devolverlo tal cual
        if (number.includes('@')) return number
        // Grupos de WhatsApp: prefijo 120363 con 16+ dígitos totales
        // Los números de teléfono normales nunca tienen ese prefijo
        if (/^120363\d{10,}$/.test(number)) return number + '@g.us'
        // LID: si ya recibimos mensajes de este número vía @lid, usar ese dominio
        // (el store.messages se puebla desde messages.upsert con el remoteJid original)
        if (store.messages[number + '@lid']) return number + '@lid'
        return number + '@s.whatsapp.net'
    }

    // Extrae número de un JID (strip @domain y :device)
    fromJid(jid) {
        if (!jid) return ''
        return jid.split('@')[0].split(':')[0]
    }

    async inicializar() {
        // Mutex: evitar múltiples sockets simultáneos
        if (this._conectando) {
            console.log('[Baileys] inicializar() ignorado — ya hay una conexión en curso')
            return
        }
        this._conectando = true
        this.estaInicializando = true

        // Cerrar socket anterior si existe
        if (this.sock) {
            try { this.sock.ev.removeAllListeners() } catch {}
            try { this.sock.end(undefined) } catch {}
            this.sock = null
        }

        console.log(`Inicializando cliente Baileys: ${this.numero}`)

        const { state, saveCreds } = await useMultiFileAuthState('sesiones-baileys')

        const { version, isLatest } = await fetchLatestBaileysVersion()
        console.log(`[Baileys] Versión WA: ${version.join('.')}, ¿última? ${isLatest}`)

        const sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
            },
            browser: Browsers.ubuntu('Chrome'),
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
        this._conectando = false  // socket creado, liberar mutex para futuras reconexiones

        // Bind manual del store (reemplaza store.bind(sock.ev))
        sock.ev.on('messaging-history.set', ({ messages: historyMsgs, contacts: historyContacts, chats: historyChats, isLatest }) => {
            for (const msg of (historyMsgs || [])) {
                const jid = msg.key.remoteJid
                if (!store.messages[jid]) store.messages[jid] = new Map()
                store.messages[jid].set(msg.key.id, msg)
            }
            // Contactos del historial — pueden traer campo lid
            for (const c of (historyContacts || [])) {
                store.contacts[c.id] = c
                if (c.lid) {
                    const lid   = c.lid.split('@')[0]
                    const phone = c.id.split('@')[0]
                    this._registrarLid(lid, phone)
                }
            }
            // Chats del historial — se guardan en store pero NO se usa pnJid (fuente no confiable)
            for (const c of (historyChats || [])) {
                store.chats[c.id] = c
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
            let withLid = 0
            for (const c of contacts) {
                store.contacts[c.id] = c
                if (c.lid) {
                    const lid   = c.lid.split('@')[0]
                    const phone = c.id.split('@')[0]
                    this._registrarLid(lid, phone)
                    withLid++
                }
            }
            console.log(`[contacts.upsert] total=${contacts.length} con-lid=${withLid} lidMap-size=${this._lidMap.size} pendingLids=${this._lidPending.size}`)
            if (contacts.length > 0) console.log('[contacts.upsert] sample:', JSON.stringify(contacts[0]))
        })

        sock.ev.on('contacts.update', (updates) => {
            for (const upd of updates) {
                if (upd.id && upd.lid) {
                    const lid   = upd.lid.split('@')[0]
                    const phone = upd.id.split('@')[0]
                    this._registrarLid(lid, phone)
                }
            }
        })

        // Baileys 6.17+: mapeo directo LID → número real cuando WhatsApp lo comparte
        sock.ev.on('chats.phoneNumberShare', ({ lid, jid }) => {
            const lidNum   = (lid || '').split('@')[0]
            const phoneNum = (jid || '').split('@')[0]
            if (lidNum && phoneNum) {
                this._registrarLid(lidNum, phoneNum)
            }
        })

        sock.ev.on('chats.upsert', (chats) => {
            for (const c of chats) {
                store.chats[c.id] = c
                // pnJid NO se usa — fuente no confiable (history sync puede tener datos stale)
            }
        })

        sock.ev.on('chats.update', (updates) => {
            for (const upd of updates) {
                if (upd.id) store.chats[upd.id] = { ...(store.chats[upd.id] || {}), ...upd }
                // pnJid NO se usa — fuente no confiable (history sync puede tener datos stale)
            }
        })

        // === EVENTOS ===

        sock.ev.on('creds.update', saveCreds)

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update

            if (qr) {
                console.log('QR generado para Baileys')
                qrcode.generate(qr, { small: true })
                try {
                    await retryWithBackoff(() => instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-qr',
                        { qrCode: qr }, header))
                } catch (e) {
                    console.error('[qr] error notificando .NET:', e.message)
                }
            }

            if (connection === 'open') {
                this.estaActivo = true
                this.estaInicializando = false
                this._tuvoConexion = true
                this.numero = this.numero || (sock.user?.id ? this.fromJid(sock.user.id) : '')
                console.log(`[Baileys] Conectado: ${this.numero}`)
                try {
                    await retryWithBackoff(() => instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-numero',
                        { numeroDesde: this.numero }, header))
                } catch (e) {
                    console.error('[ready] error notificando .NET:', e.message)
                }

                // Pre-poblar _lidMap desde store.contacts (fuente confiable — campo .lid)
                // store.chats/pnJid NO se usa — puede tener datos stale del history sync
                {
                    let count = 0
                    for (const [jid, contact] of Object.entries(store.contacts || {})) {
                        if (!jid.endsWith('@s.whatsapp.net')) continue
                        const lid = (contact?.lid || '').split('@')[0]
                        if (lid) { this._registrarLid(lid, jid.split('@')[0]); count++ }
                    }
                    console.log(`[lid-init] pre-poblados ${count} mapeos LID desde contacts`)
                }
            }

            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode
                // 405 = connectionReplaced: nuestra nueva conexión ya reemplazó a esta.
                // NO reconectar — ya hay una sesión más nueva activa.
                const isReplaced = code === 405 || code === DisconnectReason.connectionReplaced
                const isLoggedOut = code === DisconnectReason.loggedOut
                const shouldReconnect = !isLoggedOut && !isReplaced
                console.warn(`[Baileys] Desconectado. Código: ${code}. Reconectar: ${shouldReconnect}`)
                this.estaActivo = false

                // Limpiar LIDs pendientes al cerrar — no pueden resolverse sin socket activo
                if (this._lidPending.size > 0) {
                    let totalDescartados = 0
                    for (const msgs of this._lidPending.values()) totalDescartados += msgs.length
                    console.warn(`[lid] socket cerrado — descartando ${this._lidPending.size} LIDs no resueltos (${totalDescartados} mensajes)`)
                    this._lidPending.clear()
                }

                if (shouldReconnect) {
                    // Cancelar timer previo antes de programar uno nuevo
                    if (this._reconnectTimer) {
                        clearTimeout(this._reconnectTimer)
                        this._reconnectTimer = null
                    }
                    this._reconnectTimer = setTimeout(() => {
                        this._reconnectTimer = null
                        this.inicializar()
                    }, 5000)
                } else {
                    this.estaInicializando = false
                    this._conectando = false
                    if (isReplaced) {
                        if (!this._tuvoConexion) {
                            // Credenciales obsoletas del disco — limpiar para que el próximo intento pida QR fresco
                            console.log('[Baileys] Credenciales obsoletas (405 sin conexión previa). Limpiando sesión...')
                            try { fs.rmSync('sesiones-baileys', { recursive: true, force: true }) } catch {}
                        } else {
                            console.log('[Baileys] Sesión reemplazada por conexión más nueva. Sin reconexión.')
                        }
                    }
                }
            }
        })

        // Mensajes entrantes
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            console.log(`[messages.upsert] type=${type}, count=${messages.length}`)
            if (type !== 'notify') return

            await Promise.allSettled(messages.map(msg => this._procesarMensaje(msg, sock)))
        })

        // ACK (recibido/leído)
        sock.ev.on('message-receipt.update', async (updates) => {
            for (const update of updates) {
                try {
                    // receiptTimestamp = entregado (2), readTimestamp = leído (3)
                    const ackEstado = update.receipt.readTimestamp ? 3
                        : update.receipt.receiptTimestamp ? 2 : 1
                    await retryWithBackoff(() => instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-ack', {
                        whatsAppId: update.key.id,
                        ackEstado
                    }, header))
                } catch (e) {
                    console.error('[ack] error:', e.message)
                }
            }
        })

        // Reacciones
        sock.ev.on('messages.reaction', async (reactions) => {
            for (const reaction of reactions) {
                try {
                    // sender: en grupos usar participant, en chats individuales usar remoteJid
                    const senderId = this.fromJid(reaction.key.participant || reaction.key.remoteJid)
                    await retryWithBackoff(() => instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-reaccion', {
                        whatsAppId: reaction.key.id,
                        emoji: reaction.reaction.text,
                        senderId,
                        timestamp: reaction.reaction.senderTimestampMs || Date.now()
                    }, header))
                } catch (e) {
                    console.error('[reaction] error:', e.message)
                }
            }
        })

        // Mensajes eliminados/editados/ack
        sock.ev.on('messages.update', async (updates) => {
            for (const update of updates) {
                try {
                    // ACK de mensajes propios (1=server, 2=entregado, 3=leído, 4=reproducido)
                    if (update.key?.fromMe && update.update?.status !== undefined) {
                        const ackEstado = update.update.status
                        console.log(`[ack] messages.update whatsAppId=${update.key.id} status=${ackEstado}`)
                        await retryWithBackoff(() => instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-ack', {
                            whatsAppId: update.key.id,
                            ackEstado
                        }, header))
                    }
                    // Eliminado
                    if (update.update?.messageStubType === 1 || update.update?.message?.protocolMessage?.type === 0) {
                        await retryWithBackoff(() => instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-eliminacion', {
                            numeroDesde: this.fromJid(update.key.participant || update.key.remoteJid),
                            numeroPara: this.fromJid(sock.user?.id || ''),
                            whatsAppId: update.key.id
                        }, header))
                    }
                    // Editado
                    if (update.update?.message?.editedMessage) {
                        const editado = update.update.message.editedMessage
                        const textoEditado = editado.message?.conversation
                            || editado.message?.extendedTextMessage?.text
                            || ''
                        await retryWithBackoff(() => instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-edicion', {
                            numeroDesde: this.fromJid(update.key.participant || update.key.remoteJid),
                            numeroPara: this.fromJid(sock.user?.id || ''),
                            mensajeActual: textoEditado,
                            mensajeAnterior: '',
                            whatsAppTipo: 'chat',
                            fechaEnvio: new Date(),
                            whatsAppId: update.key.id
                        }, header))
                    }
                } catch (e) {
                    console.error('[messages.update] error:', e.message)
                }
            }
        })

        // Grupos
        sock.ev.on('group-participants.update', async (update) => {
            try {
                await retryWithBackoff(() => instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-grupo-evento', {
                    chatId: update.id,
                    tipo: update.action, // 'add', 'remove', 'promote', 'demote'
                    author: this.fromJid(update.author || ''),
                    recipientIds: (update.participants || []).map(p => this.fromJid(p)),
                    timestamp: Math.floor(Date.now() / 1000)
                }, header))
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
                    await retryWithBackoff(() => instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-llamada', {
                        callId: call.id,
                        from: this.fromJid(call.from),
                        isVideo: call.isVideo || false,
                        timestamp: Math.floor(Date.now() / 1000)
                    }, header))
                } catch (e) {
                    console.error('[call] error:', e.message)
                }
            }
        })

        // Presencia entrante → notificar a Cola
        sock.ev.on('presence.update', async ({ id, presences }) => {
            for (const [jid, presence] of Object.entries(presences)) {
                try {
                    const presenciaStr = presence.lastKnownPresence || 'available'
                    const numero = this.fromJid(jid)
                    await retryWithBackoff(() =>
                        instanceAxios.post(
                            `${process.env.URL_APP_Cola}/api/RecepcionWa/recepcionar-presencia`,
                            { Numero: numero, Presencia: presenciaStr },
                            { headers: { 'Content-Type': 'application/json' } }
                        )
                    )
                } catch (e) {
                    console.error('[presence] error:', e.message)
                }
            }
        })

        return sock
    }

    // ========== MÉTODOS DE ENVÍO ==========

    async cerrarSesion() {
        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer)
            this._reconnectTimer = null
        }
        this._conectando = false
        this.estaInicializando = false
        this.estaActivo = false
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
            // Enviar con el mimetype real; ptt=false para que sea adjunto, no nota de voz
            content = { audio: buffer, ptt: false, mimetype: mimeType }
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

        // Escribir webm temp
        const tmpDir = os.tmpdir()
        const inputPath = path.join(tmpDir, `voice_${Date.now()}.webm`)
        const outputPath = path.join(tmpDir, `voice_${Date.now()}_out.ogg`)
        fs.writeFileSync(inputPath, buffer)

        try {
            // Convertir webm → ogg con ffmpeg
            await new Promise((resolve, reject) => {
                execFile('ffmpeg', ['-y', '-i', inputPath, '-c:a', 'libopus', outputPath],
                    (err) => err ? reject(err) : resolve())
            })
            const oggBuffer = fs.readFileSync(outputPath)
            return await this.sock.sendMessage(jid, {
                audio: oggBuffer,
                ptt: true,
                mimetype: 'audio/ogg; codecs=opus'
            })
        } finally {
            // Limpiar archivos temp
            try { fs.unlinkSync(inputPath) } catch {}
            try { fs.unlinkSync(outputPath) } catch {}
        }
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

    async sendReaction(to, messageId, emoji) {
        const jid = this.toJid(to)
        const key = this.messageKeys.get(messageId) || { id: messageId, remoteJid: jid, fromMe: false }
        // Garantizar que remoteJid nunca esté vacío
        if (!key.remoteJid) key.remoteJid = jid
        return await this.sock.sendMessage(jid, {
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
        // Baileys 6.x: campos al nivel raíz, no dentro de listMessage
        return await this.sock.sendMessage(jid, {
            text: body,
            title,
            buttonText,
            sections,
            footer: ''
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
        if (!msgs || msgs.size === 0) return false
        // Ordenar por timestamp para asegurar el más reciente
        const sorted = [...msgs.values()].sort((a, b) =>
            (b.messageTimestamp || 0) - (a.messageTimestamp || 0))
        const lastMsg = sorted[0]
        if (lastMsg) {
            await this.sock.readMessages([lastMsg.key])
            return true
        }
        return false
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
        return { id: result.id }
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

    // ===== GRUPO — METADATA & GESTIÓN AVANZADA =====

    async getGroupMetadata(groupId) {
        const jid = groupId.includes('@') ? groupId : groupId + '@g.us'
        return await this.sock.groupMetadata(jid)
    }

    async getAllGroups() {
        return await this.sock.groupFetchAllParticipating()
    }

    async updateGroupSubject(groupId, subject) {
        const jid = groupId.includes('@') ? groupId : groupId + '@g.us'
        return await this.sock.groupUpdateSubject(jid, subject)
    }

    async updateGroupDescription(groupId, description) {
        const jid = groupId.includes('@') ? groupId : groupId + '@g.us'
        return await this.sock.groupUpdateDescription(jid, description || undefined)
    }

    async revokeGroupInvite(groupId) {
        const jid = groupId.includes('@') ? groupId : groupId + '@g.us'
        return await this.sock.groupRevokeInvite(jid)
    }

    async joinGroupByCode(inviteCode) {
        return await this.sock.groupAcceptInvite(inviteCode)
    }

    async leaveGroup(groupId) {
        const jid = groupId.includes('@') ? groupId : groupId + '@g.us'
        return await this.sock.groupLeave(jid)
    }

    async updateGroupSettings(groupId, setting) {
        // setting: 'announcement' (solo admins hablan) | 'not_announcement' | 'locked' | 'unlocked'
        const jid = groupId.includes('@') ? groupId : groupId + '@g.us'
        return await this.sock.groupSettingUpdate(jid, setting)
    }

    // ===== CHAT — ARCHIVO, PIN, SILENCIAR =====

    async archiveChat(chatId, archive = true) {
        const jid = this.toJid(chatId)
        const lastMessages = store.messages[jid]
        const lastMsg = lastMessages ? [...lastMessages.values()].pop() : undefined
        return await this.sock.chatModify({ archive, lastMessages: lastMsg ? [{ key: lastMsg.key, messageTimestamp: lastMsg.messageTimestamp }] : [] }, jid)
    }

    async pinChat(chatId, pin = true) {
        const jid = this.toJid(chatId)
        return await this.sock.chatModify({ pin }, jid)
    }

    async muteChat(chatId, muteMs = null) {
        // muteMs: duración en ms (ej: 8*60*60*1000 para 8h), null para desmutear
        const jid = this.toJid(chatId)
        return await this.sock.chatModify({ mute: muteMs }, jid)
    }

    async starMessage(chatId, messageId, star = true) {
        const jid = this.toJid(chatId)
        return await this.sock.star(jid, [{ id: messageId }], star)
    }

    // ===== CONTACTOS — BLOQUEO & GESTIÓN =====

    async blockContact(contactId) {
        const jid = this.toJid(contactId)
        return await this.sock.updateBlockStatus(jid, 'block')
    }

    async unblockContact(contactId) {
        const jid = this.toJid(contactId)
        return await this.sock.updateBlockStatus(jid, 'unblock')
    }

    async getBlocklist() {
        return await this.sock.fetchBlocklist()
    }

    // ===== PERFIL — NOMBRE, FOTO, ESTADO =====

    async updateMyName(name) {
        return await this.sock.updateProfileName(name)
    }

    async updateMyStatus(status) {
        return await this.sock.updateProfileStatus(status)
    }

    async updateMyProfilePic(base64Image) {
        const buffer = Buffer.from(base64Image, 'base64')
        const meJid = this.sock.user?.id
        return await this.sock.updateProfilePicture(meJid, buffer)
    }

    async updateGroupPic(groupId, base64Image) {
        const jid = groupId.includes('@') ? groupId : groupId + '@g.us'
        const buffer = Buffer.from(base64Image, 'base64')
        return await this.sock.updateProfilePicture(jid, buffer)
    }

    // ===== PRIVACIDAD =====

    async updatePrivacy(setting, value) {
        // setting: 'lastSeen' | 'online' | 'profilePicture' | 'status' | 'readReceipts' | 'groupsAdd'
        // value depende del setting
        const methods = {
            lastSeen: () => this.sock.updateLastSeenPrivacy(value),
            online: () => this.sock.updateOnlinePrivacy(value),
            profilePicture: () => this.sock.updateProfilePicturePrivacy(value),
            status: () => this.sock.updateStatusPrivacy(value),
            readReceipts: () => this.sock.updateReadReceiptsPrivacy(value),
            groupsAdd: () => this.sock.updateGroupsAddPrivacy(value),
        }
        if (!methods[setting]) throw new Error(`Setting de privacidad desconocido: ${setting}`)
        return await methods[setting]()
    }

    // ===== LABELS (WhatsApp Business) =====

    async addChatLabel(chatId, labelId) {
        const jid = this.toJid(chatId)
        return await this.sock.addChatLabel(jid, labelId)
    }

    async removeChatLabel(chatId, labelId) {
        const jid = this.toJid(chatId)
        return await this.sock.removeChatLabel(jid, labelId)
    }

    // ===== MENSAJES — FORWARDING & RECEIPTS =====

    async forwardMessage(to, messageToForward) {
        const jid = this.toJid(to)
        return await this.sock.sendMessage(jid, { forward: messageToForward })
    }

    async sendReadReceipt(chatId, messageIds) {
        const jid = this.toJid(chatId)
        return await this.sock.readMessages(messageIds.map(id => ({ remoteJid: jid, id })))
    }

    // ===== BUSINESS PROFILE =====

    async getBusinessProfile(contactId) {
        const jid = this.toJid(contactId)
        return await this.sock.getBusinessProfile(jid)
    }
}

module.exports = ClientBaileys

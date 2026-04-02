require('dotenv').config()
const express = require('express')
const cors = require('cors')
const axios = require('axios')
const https = require('https')
const bodyParser = require('body-parser')
const swaggerJsdoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const ClientBaileys = require('./models/ClientBaileys.js')

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'CRM WhatsApp Baileys API',
            version: '1.0.0',
            description: 'API Node.js para WhatsApp via @whiskeysockets/baileys'
        },
        servers: [{ url: `http://localhost:${process.env.APP_PORT || 3002}` }]
    },
    apis: ['./src/server.js']
}
const swaggerSpec = swaggerJsdoc(swaggerOptions)

const instanceAxios = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
})

const app = express()
const port = process.env.APP_PORT || 3002

let clienteInicializado = null

app.use(bodyParser.json({ limit: '100mb' }))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// ==================== INICIALIZACIÓN Y CONEXIÓN ====================

/**
 * @openapi
 * /client-initialize:
 *   get:
 *     summary: Inicializar cliente Baileys
 *     parameters:
 *       - in: query
 *         name: phoneNumber
 *         schema:
 *           type: string
 *         description: Número de teléfono (opcional)
 *     responses:
 *       200:
 *         description: Cliente inicializando o ya conectado
 */
app.get('/client-initialize', async (req, res) => {
    separadorPeticiones('/client-initialize')
    const phoneNumber = req.query.phoneNumber || ''

    if (clienteInicializado === null) {
        clienteInicializado = new ClientBaileys(phoneNumber)
    } else {
        if (clienteInicializado.estaActivo) {
            return res.status(200).json({ responseStatus: true, messageResponse: `Cliente conectado: ${clienteInicializado.numero}` })
        }
        if (clienteInicializado.estaInicializando) {
            return res.status(200).json({ responseStatus: true, messageResponse: 'El cliente ya está inicializándose. Esperá el QR.' })
        }
    }

    try {
        await clienteInicializado.inicializar()
        res.status(200).json({ responseStatus: true, messageResponse: 'Cliente Baileys inicializando — esperá el QR' })
    } catch (e) {
        res.status(400).json({ responseStatus: false, messageResponse: e.message })
    }
})

/**
 * @openapi
 * /logout:
 *   get:
 *     summary: Cerrar sesión de WhatsApp
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
 *       400:
 *         description: No hay cliente activo
 */
app.get('/logout', async (req, res) => {
    separadorPeticiones('/logout')
    if (!clienteInicializado) return res.status(400).json({ responseStatus: false, messageResponse: 'No hay cliente activo' })
    try {
        await clienteInicializado.cerrarSesion()
        clienteInicializado = null
        res.json({ responseStatus: true, messageResponse: 'Sesión cerrada' })
    } catch (e) {
        res.status(400).json({ responseStatus: false, messageResponse: e.message })
    }
})

/**
 * @openapi
 * /get-active-number:
 *   get:
 *     summary: Obtener número de WhatsApp activo
 *     responses:
 *       200:
 *         description: Número activo o mensaje de no disponible
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseStatus: { type: boolean }
 *                 number: { type: string, example: "51987654321" }
 */
app.get('/get-active-number', (req, res) => {
    separadorPeticiones('/get-active-number')
    if (!clienteInicializado || !clienteInicializado.estaActivo) {
        return res.status(200).json({ responseStatus: false, messageResponse: 'No hay número activo' })
    }
    res.json({ responseStatus: true, number: clienteInicializado.numero })
})

// ==================== ENVÍO DE MENSAJES ====================

/**
 * @openapi
 * /send-text-message:
 *   post:
 *     summary: Enviar mensaje de texto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneDestination: { type: string, example: "51987654321" }
 *               message: { type: string, example: "Hola!" }
 *     responses:
 *       200:
 *         description: Mensaje enviado
 *       400:
 *         description: Cliente no activo o error
 */
app.post('/send-text-message', async (req, res) => {
    separadorPeticiones('/send-text-message')
    const { phoneDestination, message } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        const result = await clienteInicializado.enviarMensaje(phoneDestination, message)
        res.json({ responseStatus: true, messageResponse: 'Mensaje enviado', whatsAppId: result?.key?.id })
    } catch (e) {
        res.status(400).json({ responseStatus: false, messageResponse: e.message })
    }
})

/**
 * @openapi
 * /send-multimedia-message:
 *   post:
 *     summary: Enviar mensaje multimedia (imagen, video, audio, documento)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneDestination: { type: string, example: "51987654321" }
 *               caption: { type: string, example: "Mirá esto" }
 *               dataBase64: { type: string, description: "Archivo en base64" }
 *               mimeType: { type: string, example: "image/jpeg" }
 *               fileName: { type: string, example: "foto.jpg" }
 *     responses:
 *       200:
 *         description: Multimedia enviado
 *       400:
 *         description: Cliente no activo o error
 */
app.post('/send-multimedia-message', async (req, res) => {
    separadorPeticiones('/send-multimedia-message')
    const { phoneDestination, caption, dataBase64, mimeType, fileName } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        const result = await clienteInicializado.enviarMensajeMultimedia(phoneDestination, caption, dataBase64, mimeType, fileName)
        res.json({ responseStatus: true, messageResponse: 'Multimedia enviado', whatsAppId: result?.key?.id })
    } catch (e) {
        res.status(400).json({ responseStatus: false, messageResponse: e.message })
    }
})

app.post('/send-multimedia-url-message', async (req, res) => {
    separadorPeticiones('/send-multimedia-url-message')
    const { phoneDestination, caption, mediaUrl } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        const result = await clienteInicializado.enviarMensajeMultimediaDesdeUrl(phoneDestination, caption, mediaUrl)
        res.json({ responseStatus: true, messageResponse: 'Multimedia URL enviado', whatsAppId: result?.key?.id })
    } catch (e) {
        res.status(400).json({ responseStatus: false, messageResponse: e.message })
    }
})

/**
 * @openapi
 * /send-voice:
 *   post:
 *     summary: Enviar nota de voz (webm convertido a ogg/opus)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to: { type: string, example: "51987654321" }
 *               base64Audio: { type: string, description: "Audio webm en base64" }
 *     responses:
 *       200:
 *         description: Nota de voz enviada
 *       500:
 *         description: Error al enviar
 */
app.post('/send-voice', async (req, res) => {
    separadorPeticiones('/send-voice')
    const { to, base64Audio } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        const result = await clienteInicializado.sendVoice(to, base64Audio)
        res.json({ responseStatus: true, messageResponse: 'Nota de voz enviada', whatsAppId: result?.key?.id })
    } catch (e) {
        res.status(500).json({ responseStatus: false, messageResponse: e.message })
    }
})

app.post('/send-location', async (req, res) => {
    separadorPeticiones('/send-location')
    const { to, lat, lng, name, address } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        const result = await clienteInicializado.sendLocation(to, lat, lng, name, address)
        res.json({ responseStatus: true, messageResponse: 'Ubicación enviada', whatsAppId: result?.key?.id })
    } catch (e) {
        res.status(500).json({ responseStatus: false, messageResponse: e.message })
    }
})

/**
 * @openapi
 * /send-reaction:
 *   post:
 *     summary: Enviar reacción a un mensaje
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageId: { type: string, example: "ABC123XYZ" }
 *               emoji: { type: string, example: "👍" }
 *     responses:
 *       200:
 *         description: Reacción enviada
 *       500:
 *         description: Error al enviar
 */
app.post('/send-reaction', async (req, res) => {
    separadorPeticiones('/send-reaction')
    const { to, messageId, emoji } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    if (!to) return res.status(400).json({ responseStatus: false, messageResponse: 'Se requiere "to" (número destino)' })
    try {
        await clienteInicializado.sendReaction(to, messageId, emoji)
        res.json({ responseStatus: true, messageResponse: 'Reacción enviada' })
    } catch (e) {
        res.status(500).json({ responseStatus: false, messageResponse: e.message })
    }
})

app.post('/send-poll', async (req, res) => {
    separadorPeticiones('/send-poll')
    const { to, question, options } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        const result = await clienteInicializado.sendPoll(to, question, options)
        res.json({ responseStatus: true, messageResponse: 'Encuesta enviada', whatsAppId: result?.key?.id })
    } catch (e) {
        res.status(500).json({ responseStatus: false, messageResponse: e.message })
    }
})

app.post('/send-list', async (req, res) => {
    separadorPeticiones('/send-list')
    const { to, title, body, buttonText, sections } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        const result = await clienteInicializado.sendList(to, title, body, buttonText, sections)
        res.json({ responseStatus: true, messageResponse: 'Lista enviada', whatsAppId: result?.key?.id })
    } catch (e) {
        res.status(500).json({ responseStatus: false, messageResponse: e.message })
    }
})

app.post('/send-contact-card', async (req, res) => {
    separadorPeticiones('/send-contact-card')
    const { to, vcard } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        const result = await clienteInicializado.sendContactCard(to, vcard)
        res.json({ responseStatus: true, messageResponse: 'Tarjeta de contacto enviada', whatsAppId: result?.key?.id })
    } catch (e) {
        res.status(500).json({ responseStatus: false, messageResponse: e.message })
    }
})

app.post('/send-button-message', async (req, res) => {
    separadorPeticiones('/send-button-message')
    // Botones deprecados en API actual de WhatsApp — enviar como texto con opciones
    const { to, body, buttons, footer } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        const opciones = (buttons || []).map((b, i) => `${i + 1}. ${b}`).join('\n')
        const texto = `${body || ''}\n\n${opciones}${footer ? '\n\n' + footer : ''}`
        const result = await clienteInicializado.enviarMensaje(to, texto)
        res.json({ responseStatus: true, messageResponse: 'Mensaje enviado', whatsAppId: result?.key?.id })
    } catch (e) {
        res.status(500).json({ responseStatus: false, messageResponse: e.message })
    }
})

// ==================== GESTIÓN ====================

app.post('/mark-seen', async (req, res) => {
    separadorPeticiones('/mark-seen')
    const { chatId } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.markSeen(chatId)
        res.json({ responseStatus: true })
    } catch (e) {
        res.status(500).json({ responseStatus: false, messageResponse: e.message })
    }
})

app.post('/validate-number', async (req, res) => {
    separadorPeticiones('/validate-number')
    const { number } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        const isRegistered = await clienteInicializado.validateNumber(number)
        res.json({ isRegistered })
    } catch (e) {
        res.status(500).json({ responseStatus: false, messageResponse: e.message })
    }
})

app.get('/contacts', async (req, res) => {
    separadorPeticiones('/contacts')
    if (!clienteInicializado?.estaActivo) return res.json([])
    try {
        const contacts = await clienteInicializado.getContacts()
        res.json(contacts)
    } catch (e) {
        res.status(500).json({ responseStatus: false, messageResponse: e.message })
    }
})

app.get('/chats', async (req, res) => {
    separadorPeticiones('/chats')
    if (!clienteInicializado?.estaActivo) return res.json([])
    try {
        const chats = await clienteInicializado.getChats()
        res.json(chats)
    } catch (e) {
        res.status(500).json({ responseStatus: false, messageResponse: e.message })
    }
})

app.get('/profile-pic', async (req, res) => {
    separadorPeticiones('/profile-pic')
    const { contactId } = req.query
    if (!clienteInicializado?.estaActivo) return res.json({ url: null })
    try {
        const picUrl = await clienteInicializado.getProfilePic(contactId)
        if (!picUrl) return res.json({ url: null })
        const imgResponse = await instanceAxios.get(picUrl, { responseType: 'arraybuffer' })
        const base64 = Buffer.from(imgResponse.data).toString('base64')
        const contentType = imgResponse.headers['content-type'] || 'image/jpeg'
        res.json({ url: `data:${contentType};base64,${base64}` })
    } catch (e) {
        res.json({ url: null })
    }
})

app.get('/contact-name', async (req, res) => {
    separadorPeticiones('/contact-name')
    const { numero } = req.query
    if (!numero) return res.json({ name: null })
    if (!clienteInicializado?.estaActivo) return res.json({ name: null })
    try {
        const contacts = await clienteInicializado.getContacts()
        const jid = numero.includes('@') ? numero : `${numero}@s.whatsapp.net`
        const contact = contacts.find(c => c.id === jid || c.id === `${numero}@c.us`)
        res.json({ name: contact?.name || null })
    } catch (e) {
        res.json({ name: null })
    }
})

// ==================== GRUPOS ====================

app.post('/create-group', async (req, res) => {
    separadorPeticiones('/create-group')
    const { name, participants } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        const result = await clienteInicializado.createGroup(name, participants)
        res.json({ success: true, groupId: result.id })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/group/add-participants', async (req, res) => {
    separadorPeticiones('/group/add-participants')
    const { groupId, participants } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.addParticipants(groupId, participants)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/group/remove-participants', async (req, res) => {
    separadorPeticiones('/group/remove-participants')
    const { groupId, participants } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.removeParticipants(groupId, participants)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ==================== GRUPO — METADATA & GESTIÓN AVANZADA ====================

app.get('/group/metadata', async (req, res) => {
    separadorPeticiones('/group/metadata')
    const { groupId } = req.query
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        const metadata = await clienteInicializado.getGroupMetadata(groupId)
        res.json(metadata)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.get('/groups', async (req, res) => {
    separadorPeticiones('/groups')
    if (!clienteInicializado?.estaActivo) return res.json({})
    try {
        const groups = await clienteInicializado.getAllGroups()
        res.json(groups)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/group/update-subject', async (req, res) => {
    separadorPeticiones('/group/update-subject')
    const { groupId, subject } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.updateGroupSubject(groupId, subject)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/group/update-description', async (req, res) => {
    separadorPeticiones('/group/update-description')
    const { groupId, description } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.updateGroupDescription(groupId, description)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/group/revoke-invite', async (req, res) => {
    separadorPeticiones('/group/revoke-invite')
    const { groupId } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        const newCode = await clienteInicializado.revokeGroupInvite(groupId)
        res.json({ success: true, newCode })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/group/join', async (req, res) => {
    separadorPeticiones('/group/join')
    const { inviteCode } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        const groupId = await clienteInicializado.joinGroupByCode(inviteCode)
        res.json({ success: true, groupId })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/group/leave', async (req, res) => {
    separadorPeticiones('/group/leave')
    const { groupId } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.leaveGroup(groupId)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/group/settings', async (req, res) => {
    separadorPeticiones('/group/settings')
    const { groupId, setting } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.updateGroupSettings(groupId, setting)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/group/update-picture', async (req, res) => {
    separadorPeticiones('/group/update-picture')
    const { groupId, base64Image } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.updateGroupPic(groupId, base64Image)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ==================== CHAT MANAGEMENT ====================

app.post('/chat/archive', async (req, res) => {
    separadorPeticiones('/chat/archive')
    const { chatId, archive } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.archiveChat(chatId, archive !== false)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/chat/pin', async (req, res) => {
    separadorPeticiones('/chat/pin')
    const { chatId, pin } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.pinChat(chatId, pin !== false)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/chat/mute', async (req, res) => {
    separadorPeticiones('/chat/mute')
    const { chatId, muteMs } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.muteChat(chatId, muteMs || null)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/message/star', async (req, res) => {
    separadorPeticiones('/message/star')
    const { chatId, messageId, star } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.starMessage(chatId, messageId, star !== false)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/message/read', async (req, res) => {
    separadorPeticiones('/message/read')
    const { chatId, messageIds } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.sendReadReceipt(chatId, messageIds)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ==================== CONTACTS — BLOCK/UNBLOCK ====================

app.post('/contact/block', async (req, res) => {
    separadorPeticiones('/contact/block')
    const { contactId } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.blockContact(contactId)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/contact/unblock', async (req, res) => {
    separadorPeticiones('/contact/unblock')
    const { contactId } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.unblockContact(contactId)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.get('/contact/blocklist', async (req, res) => {
    separadorPeticiones('/contact/blocklist')
    if (!clienteInicializado?.estaActivo) return res.json([])
    try {
        const list = await clienteInicializado.getBlocklist()
        res.json(list)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.get('/contact/business-profile', async (req, res) => {
    separadorPeticiones('/contact/business-profile')
    const { contactId } = req.query
    if (!clienteInicializado?.estaActivo) return res.json(null)
    try {
        const profile = await clienteInicializado.getBusinessProfile(contactId)
        res.json(profile)
    } catch (e) {
        res.json(null)
    }
})

// ==================== PROFILE ====================

app.post('/profile/update-name', async (req, res) => {
    separadorPeticiones('/profile/update-name')
    const { name } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.updateMyName(name)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/profile/update-status', async (req, res) => {
    separadorPeticiones('/profile/update-status')
    const { status } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.updateMyStatus(status)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/profile/update-picture', async (req, res) => {
    separadorPeticiones('/profile/update-picture')
    const { base64Image } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.updateMyProfilePic(base64Image)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ==================== PRIVACY ====================

app.post('/privacy/update', async (req, res) => {
    separadorPeticiones('/privacy/update')
    const { setting, value } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.updatePrivacy(setting, value)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ==================== LABELS (WhatsApp Business) ====================

app.post('/label/add', async (req, res) => {
    separadorPeticiones('/label/add')
    const { chatId, labelId } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.addChatLabel(chatId, labelId)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/label/remove', async (req, res) => {
    separadorPeticiones('/label/remove')
    const { chatId, labelId } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.removeChatLabel(chatId, labelId)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ==================== FEATURES EXCLUSIVOS BAILEYS ====================

/**
 * @openapi
 * /request-pairing-code:
 *   get:
 *     summary: Solicitar código de vinculación (alternativa al QR)
 *     parameters:
 *       - in: query
 *         name: phoneNumber
 *         required: true
 *         schema:
 *           type: string
 *           example: "51987654321"
 *     responses:
 *       200:
 *         description: Código de vinculación generado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseStatus: { type: boolean }
 *                 pairingCode: { type: string, example: "ABC-1234" }
 *       400:
 *         description: Se requiere phoneNumber
 */
app.get('/request-pairing-code', async (req, res) => {
    separadorPeticiones('/request-pairing-code')
    const phoneNumber = req.query.phoneNumber
    if (!phoneNumber) return res.status(400).json({ responseStatus: false, messageResponse: 'Se requiere phoneNumber' })

    try {
        if (clienteInicializado?.estaActivo) {
            return res.status(400).json({ responseStatus: false, messageResponse: 'Ya existe una sesión activa. Use /logout primero.' })
        }

        if (!clienteInicializado) {
            clienteInicializado = new ClientBaileys(phoneNumber)
            await clienteInicializado.inicializar()
        }

        // Esperar hasta que el socket esté listo (máx 15s) en lugar de espera fija
        const deadline = Date.now() + 15000
        while (!clienteInicializado.sock && Date.now() < deadline) {
            await new Promise(r => setTimeout(r, 500))
        }
        if (!clienteInicializado.sock) {
            return res.status(500).json({ responseStatus: false, messageResponse: 'Timeout: socket no disponible' })
        }

        const code = await clienteInicializado.requestPairingCode(phoneNumber)
        res.json({ responseStatus: true, pairingCode: code, messageResponse: code })
    } catch (e) {
        res.status(500).json({ responseStatus: false, messageResponse: e.message })
    }
})

app.post('/send-ephemeral', async (req, res) => {
    separadorPeticiones('/send-ephemeral')
    const { to, text, expirationSeconds } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        const result = await clienteInicializado.sendEphemeral(to, text, expirationSeconds)
        res.json({ responseStatus: true, messageResponse: 'Mensaje efímero enviado', whatsAppId: result?.key?.id })
    } catch (e) {
        res.status(500).json({ responseStatus: false, messageResponse: e.message })
    }
})

app.post('/update-presence', async (req, res) => {
    separadorPeticiones('/update-presence')
    const { to, presence } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.updatePresence(to, presence)
        res.json({ responseStatus: true })
    } catch (e) {
        res.status(500).json({ responseStatus: false, messageResponse: e.message })
    }
})

app.post('/group/promote', async (req, res) => {
    separadorPeticiones('/group/promote')
    const { groupId, participants } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.promoteParticipants(groupId, participants)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/group/demote', async (req, res) => {
    separadorPeticiones('/group/demote')
    const { groupId, participants } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.demoteParticipants(groupId, participants)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.get('/group/invite-link', async (req, res) => {
    separadorPeticiones('/group/invite-link')
    const { groupId } = req.query
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        const link = await clienteInicializado.getGroupInviteLink(groupId)
        res.json({ link: `https://chat.whatsapp.com/${link}` })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ==================== ADMIN ====================

// DELETE /admin/limpiar-sesion — borra credenciales y resetea el cliente
// Útil cuando la sesión quedó corrupta (ej: loops 405, QR no funciona)
app.delete('/admin/limpiar-sesion', async (req, res) => {
    separadorPeticiones('/admin/limpiar-sesion')
    const fs = require('fs')
    const path = require('path')
    try {
        if (clienteInicializado) {
            try { await clienteInicializado.cerrarSesion() } catch {}
            clienteInicializado = null
        }
        const sesionesDir = path.join(process.cwd(), 'sesiones-baileys')
        if (fs.existsSync(sesionesDir)) {
            fs.rmSync(sesionesDir, { recursive: true, force: true })
            console.log('[admin] Carpeta sesiones-baileys eliminada')
        }
        res.json({ responseStatus: true, messageResponse: 'Sesión limpiada. Podés inicializar de nuevo.' })
    } catch (e) {
        res.status(500).json({ responseStatus: false, messageResponse: e.message })
    }
})

app.listen(port, () => {
    console.log(`[Baileys] Server escuchando en puerto ${port}`)
    console.log(`[Baileys] Proveedor: @whiskeysockets/baileys (WebSocket directo, sin Chrome)`)
})

function separadorPeticiones(url) {
    console.log(new Date().toISOString(), url, '--- Baileys ---')
}

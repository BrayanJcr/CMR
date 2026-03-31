require('dotenv').config()
const express = require('express')
const cors = require('cors')
const axios = require('axios')
const https = require('https')
const bodyParser = require('body-parser')

const ClientBaileys = require('./models/ClientBaileys.js')

const instanceAxios = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
})

const app = express()
const port = process.env.APP_PORT || 3002

let clienteInicializado = null

app.use(bodyParser.json({ limit: '100mb' }))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())

// ==================== INICIALIZACIÓN Y CONEXIÓN ====================

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

app.get('/get-active-number', (req, res) => {
    separadorPeticiones('/get-active-number')
    if (!clienteInicializado || !clienteInicializado.estaActivo) {
        return res.status(200).json({ responseStatus: false, messageResponse: 'No hay número activo' })
    }
    res.json({ responseStatus: true, number: clienteInicializado.numero })
})

// ==================== ENVÍO DE MENSAJES ====================

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

app.post('/send-reaction', async (req, res) => {
    separadorPeticiones('/send-reaction')
    const { messageId, emoji } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        await clienteInicializado.sendReaction(messageId, emoji)
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

// ==================== GRUPOS ====================

app.post('/create-group', async (req, res) => {
    separadorPeticiones('/create-group')
    const { name, participants } = req.body
    if (!clienteInicializado?.estaActivo) return res.status(400).json({ responseStatus: false, messageResponse: 'Cliente no activo' })
    try {
        const result = await clienteInicializado.createGroup(name, participants)
        res.json({ success: true, groupId: result.id._serialized || result.id })
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

// ==================== FEATURES EXCLUSIVOS BAILEYS ====================

app.get('/request-pairing-code', async (req, res) => {
    separadorPeticiones('/request-pairing-code')
    const phoneNumber = req.query.phoneNumber
    if (!phoneNumber) return res.status(400).json({ responseStatus: false, messageResponse: 'Se requiere phoneNumber' })

    try {
        if (!clienteInicializado) {
            clienteInicializado = new ClientBaileys(phoneNumber)
            await clienteInicializado.inicializar()
            // Esperar un momento para que el socket se establezca
            await new Promise(r => setTimeout(r, 2000))
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

app.listen(port, () => {
    console.log(`[Baileys] Server escuchando en puerto ${port}`)
    console.log(`[Baileys] Proveedor: @whiskeysockets/baileys (WebSocket directo, sin Chrome)`)
})

function separadorPeticiones(url) {
    console.log(new Date().toISOString(), url, '--- Baileys ---')
}

require('dotenv').config()
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https')
const bodyParser = require('body-parser');
const swagger = require('../swagger.js');

const ClientWA = require('./models/ClientWA.js');

//axios
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

const app = express();
const port = process.env.APP_PORT;

let clienteInicializado = null;

app.use(bodyParser.json({ limit: '100mb' })); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

//cors
// let corsOptions = {
//     origin: ['http://localhost:5500'],
// }
// app.use(cors(corsOptions))
app.use(cors());

//routes
app.get('/client-initialize', async (req, res) => {
    separadorPeticiones('/client-initialize');

    let phoneNumber = req.query.phoneNumber; //51904570597
    let respondido = false;

    //adicionando el cliente
    if (clienteInicializado == null) {
        const clienteNuevo = new ClientWA(phoneNumber);
        clienteInicializado = clienteNuevo;
    } else {
        if (clienteInicializado.estaActivo) {
            let estadoCliente = await clienteInicializado.obtenerEstado();
            if (estadoCliente == 'CONNECTED') {
                const messageResponse = `Client Conectado Correctamente: ${clienteInicializado?.numero}`;
                return res.status(200).json({ messageResponse, responseStatus: true });
            }
        }
    }

    let clientw = clienteInicializado;
    if (clienteInicializado.estaInicializando) {
        const messageResponse = `El Cliente ya está Inicializándose: Verifique la recepción del QR o espere si ya realizo el inicio de sesión`;
        return res.status(200).json({ messageResponse, responseStatus: true });
    }

    clientw.cliente.on('qr', async qr => {
        const messageResponse = `Client en proceso de Inicialización - Verifique la recepción del código QR`;
        console.log(messageResponse, qr);
        respondido = true;

        //envio del qr recibido
        let mensajeRecibidoQR = {
            qrCode: qr,
        };

        try {
            let respuestaEnvio = await instanceAxios.post(process.env.URL_APP_Cola + '/api/RecepcionWa/recepcionar-qr',
                mensajeRecibidoQR,
                header
            );
            console.log('Respuesta recepción qr 2', JSON.stringify(respuestaEnvio.data));
        } catch (error) {
            console.error('Error general en Recepcion qr', error);
        }

        if (!res != null && res.closed == false)
            res.status(200).json({ messageResponse, responseStatus: true });
        // return res.status(200).json({ messageResponse, responseStatus: true });
    });

    // clientw.cliente.on('ready', async () => {
    //     console.log(`Client is ready V2`);
    // });

    clientw.cliente.on('disconnected', () => {
        const messageResponse = `Client eliminado por cierre en teléfono: ${clientw?.numero}`;
        clienteInicializado = null;
        clientw = null;
        console.log(messageResponse);
    });

    let respuesta = clientw.inicializar();

    respuesta
        .then((result) => {
            console.log('Respuesta Inicializado', result);
            if (respondido == false)
                return res.status(200).json({ responseStatus: true, messageResponse: `Client Inicializado Correctamente: ${clientw?.numero}` });
            else {
                const messageResponse = `Client Inicializando - Verifique la recepción del código QR`;
                return res.status(200).json({ responseStatus: true, messageResponse: `${messageResponse}` });
            }
        })
        .catch(error => {
            console.log('error', error);
            return res.status(400).json({ responseStatus: false, messageResponse: `Client NO Inicializado: ${clientw?.numero}` });
        })
        .finally(() => {
        });
    console.log('Inicializando: -------------------------');
});

app.post('/send-text-message', async (req, res) => {
    separadorPeticiones('/send-text-message');

    //obtiene parametros
    const phoneDestination = req.body.phoneDestination;
    const phoneFrom = req.body.phoneFrom;
    const message = req.body.message;

    //obtiene el numero
    let clientew = clienteInicializado;
    if (clientew == null)
        return res.status(400).json({ responseStatus: false, messageResponse: `No se tienen registrado el número : ${phoneFrom}, para el envío de mensajes.` });
    if (clientew.estaActivo == false)
        return res.status(400).json({ responseStatus: false, messageResponse: `Debe de Inicializar el envío del número: ${clientew?.numero}` });

    //envio
    let estadoEnvio = clientew.enviarMensaje(phoneDestination, message);

    //gestion del evento
    estadoEnvio
        .then(async (result) => {
            const messageResponse = `Mensaje Enviado Correctamente a: ${phoneDestination}`;
            console.log(messageResponse);
            console.log(JSON.stringify(result));

            return res.status(200).json({
                messageResponse, responseStatus: true, whatsAppId: result.id.id,
            });
        })
        .catch(error => {
            const messageResponse = `Error al enviar el mensaje a: ${phoneDestination}`;
            console.log(messageResponse);
            console.log(error);

            return res.status(400).json({
                messageResponse, responseStatus: false
            });

            // res.status(200).json({
            //     'status': 'Berhasil',
            //     'chat_message': fetchMessageAll
            // })
        });
});

app.post('/send-multimedia-message', (req, res) => {
    separadorPeticiones('/send-multimedia-message');

    //obtiene parametros
    const phoneDestination = req.body.phoneDestination;
    const phoneFrom = req.body.phoneFrom;
    const caption = req.body.caption;
    const dataBase64 = req.body.dataBase64;
    const mimeType = req.body.mimeType;
    const fileName = req.body.fileName;

    //obtiene el numero
    let clientew = clienteInicializado;
    if (clientew == null)
        return res.status(400).json({ responseStatus: false, messageResponse: `No se tienen registrado el número : ${phoneFrom}, para el envío de mensajes.` });
    if (clientew.estaActivo == false)
        return res.status(400).json({ responseStatus: false, messageResponse: `Debe de Inicilializar el envío del número: ${clientew?.numero}` });

    //envio
    let estadoEnvio = clientew.enviarMensajeMultimedia(phoneDestination, caption, dataBase64, mimeType, fileName);

    //gestion del evento
    estadoEnvio
        .then(async (result) => {
            const messageResponse = `Mensaje Multimedia Enviado Correctamente a: ${phoneDestination}`;
            console.log(messageResponse);
            console.log(JSON.stringify(result));

            return res.status(200).json({
                messageResponse, responseStatus: true, whatsAppId: result.id.id,
            });
        })
        .catch(error => {
            const messageResponse = `Error al enviar el mensaje Multimedia a: ${phoneDestination}`;
            console.log(messageResponse);
            console.log(error);

            return res.status(400).json({ responseStatus: false, messageResponse: messageResponse });
        });
});

app.post('/send-multimedia-url-message', (req, res) => {
    separadorPeticiones('/send-multimedia-url-message');

    //obtiene parametros
    const phoneDestination = req.body.phoneDestination;
    const phoneFrom = req.body.phoneFrom;
    const caption = req.body.caption;
    const mediaUrl = req.body.mediaUrl;

    //obtiene el numero
    let clientew = clienteInicializado;
    if (clientew == null)
        return res.status(400).json({ responseStatus: false, messageResponse: `No se tienen registrado el número : ${phoneFrom}, para el envío de mensajes.` });
    if (clientew.estaActivo == false)
        return res.status(400).json({ responseStatus: false, messageResponse: `Debe de Inicilializar el envío del número: ${clientew?.numero}` });

    //envio
    let estadoEnvio = clientew.enviarMensajeMultimediaDesdeUrl(phoneDestination, caption, mediaUrl);

    //gestion del evento
    estadoEnvio
        .then(async (result) => {
            const messageResponse = `Mensaje Multimedia Enviado Correctamente a: ${phoneDestination}`;
            console.log(messageResponse);
            console.log(JSON.stringify(result));

            return res.status(200).json({
                messageResponse, responseStatus: true, whatsAppId: result.id.id,
            });
        })
        .catch(error => {
            const messageResponse = `Error al enviar el mensaje Multimedia a: ${phoneDestination}`;
            console.log(messageResponse);
            console.log(error);

            return res.status(400).json({ responseStatus: false, messageResponse: messageResponse });
        });
});

app.post('/send-button-message', async (req, res) => {
    separadorPeticiones('/send-button-message');

    try {
        const { to, body, buttons, footer } = req.body;
        const { Buttons } = require('whatsapp-web.js');
        const buttonObjects = buttons.map(b => ({ body: b }));
        const msg = new Buttons(body, buttonObjects, '', footer || '');
        await clienteInicializado.cliente.sendMessage(to, msg);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/get-active-number', async (req, res) => {
    separadorPeticiones('/get-active-number');

    //obtiene el numero
    let clientw = clienteInicializado;
    if (clientw == null)
        return res.status(200).json({ responseStatus: false, messageResponse: `No se tienen registrados números.` });

    if (clientw.estaInicializando == true)
        return res.status(200).json({ responseStatus: false, messageResponse: `El número está inicializando.` });

    if (clientw.estaActivo == false)
        return res.status(200).json({ responseStatus: false, messageResponse: `El número no está activo.` });

    return res.status(200).json({ responseStatus: true, number: clientw?.numero });
});


//events
app.get('/logout', async (req, res) => {
    separadorPeticiones('/logout');

    let phoneNumber = req.query.phoneNumber; //51904570597

    //obtiene el numero
    let clientw = clienteInicializado;
    if (clientw == null)
        return res.status(400).json({ responseStatus: false, messageResponse: `No se tienen registrado el número : ${phoneNumber}, para el cierre de sesión.` });

    let estadoEvento = clientw.cerrarSesion();

    //gestion del evento
    estadoEvento
        .then((result) => {
            clientw.estaActivo = false;
            console.log(`Client eliminado por cierre de sesion: ${clientw?.numero}`);
            clienteInicializado = null;
            clientw = null;
            const messageResponse = `Cerrar sesión Correctamente a: ${phoneNumber}`;
            console.log(messageResponse, result);

            return res.status(200).json({
                messageResponse, responseStatus: true
            });
        })
        .catch(error => {
            const messageResponse = `Error al Cerrar sesión de: ${phoneNumber}`;
            console.log(messageResponse);
            console.log('Error Cerrar sesión:', error);

            return res.status(400).json({ responseStatus: false, messageResponse: messageResponse });
        });
});

app.post('/send-location', async (req, res) => {
    separadorPeticiones('/send-location');
    try {
        const { to, lat, lng, name, address } = req.body;
        const result = await clienteInicializado.sendLocation(to, lat, lng, name, address);
        res.json({ success: true, result });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/send-reaction', async (req, res) => {
    separadorPeticiones('/send-reaction');
    try {
        const { messageId, emoji } = req.body;
        await clienteInicializado.sendReaction(messageId, emoji);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/send-poll', async (req, res) => {
    separadorPeticiones('/send-poll');
    try {
        const { to, question, options } = req.body;
        const result = await clienteInicializado.sendPoll(to, question, options);
        res.json({ success: true, result });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/send-list', async (req, res) => {
    separadorPeticiones('/send-list');
    try {
        const { to, title, body, buttonText, sections } = req.body;
        const result = await clienteInicializado.sendList(to, title, body, buttonText, sections);
        res.json({ success: true, result });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/send-voice', async (req, res) => {
    separadorPeticiones('/send-voice');
    try {
        const { to, base64Audio, mimeType } = req.body;
        const result = await clienteInicializado.sendVoice(to, base64Audio, mimeType);
        res.json({ responseStatus: true, messageResponse: 'Nota de voz enviada', whatsAppId: result?.id?.id });
    } catch (e) { res.status(500).json({ responseStatus: false, messageResponse: e.message }); }
});

app.post('/send-contact-card', async (req, res) => {
    separadorPeticiones('/send-contact-card');
    try {
        const { to, vcard } = req.body;
        const result = await clienteInicializado.sendContactCard(to, vcard);
        res.json({ success: true, result });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/mark-seen', async (req, res) => {
    separadorPeticiones('/mark-seen');
    try {
        const { chatId } = req.body;
        await clienteInicializado.markSeen(chatId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/validate-number', async (req, res) => {
    separadorPeticiones('/validate-number');
    try {
        const { number } = req.body;
        const isRegistered = await clienteInicializado.validateNumber(number);
        res.json({ isRegistered });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/contacts', async (req, res) => {
    separadorPeticiones('/contacts');
    try {
        const contacts = await clienteInicializado.getContacts();
        const mapped = contacts.map(c => ({
            id: c.id._serialized,
            name: c.name || c.pushname || '',
            number: c.number,
            isMyContact: c.isMyContact
        }));
        res.json(mapped);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/chats', async (req, res) => {
    separadorPeticiones('/chats');
    try {
        const chats = await clienteInicializado.getChats();
        const mapped = chats.map(c => ({
            id: c.id._serialized,
            name: c.name,
            isGroup: c.isGroup,
            unreadCount: c.unreadCount,
            timestamp: c.timestamp
        }));
        res.json(mapped);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/profile-pic', async (req, res) => {
    separadorPeticiones('/profile-pic');
    try {
        const { contactId } = req.query;
        if (!clienteInicializado || !clienteInicializado.estaActivo)
            return res.json({ url: null });

        const picUrl = await clienteInicializado.getProfilePic(contactId);
        if (!picUrl) return res.json({ url: null });

        const imgResponse = await instanceAxios.get(picUrl, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(imgResponse.data).toString('base64');
        const contentType = imgResponse.headers['content-type'] || 'image/jpeg';
        return res.json({ url: `data:${contentType};base64,${base64}` });
    } catch (e) {
        return res.json({ url: null });
    }
});

app.post('/create-group', async (req, res) => {
    separadorPeticiones('/create-group');
    try {
        const { name, participants } = req.body;
        const result = await clienteInicializado.createGroup(name, participants);
        res.json({ success: true, groupId: result.gid._serialized });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/group/add-participants', async (req, res) => {
    separadorPeticiones('/group/add-participants');
    try {
        const { groupId, participants } = req.body;
        await clienteInicializado.addParticipants(groupId, participants);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/group/remove-participants', async (req, res) => {
    separadorPeticiones('/group/remove-participants');
    try {
        const { groupId, participants } = req.body;
        await clienteInicializado.removeParticipants(groupId, participants);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

swagger(app);

app.listen(port, () => {
    console.log(`server listening on port ${port}`)
});

function separadorPeticiones(url) {
    console.log(new Date().toISOString(), url, "------------------------- ");
}
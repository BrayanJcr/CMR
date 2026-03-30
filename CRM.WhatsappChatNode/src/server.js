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

app.post('/send-button-message', (req, res) => {
    separadorPeticiones('/send-button-message');

    //obtiene parametros
    const phoneDestination = req.body.phoneDestination;
    const phoneFrom = req.body.phoneFrom;
    const message = req.body.message;

    //obtiene el numero
    let clientew = clienteInicializado;
    if (clientew == null)
        return res.status(400).json({ responseStatus: false, messageResponse: `No se tienen registrado el número : ${phoneFrom}, para el envío de mensajes.` });
    if (clientew.estaActivo == false)
        return res.status(400).json({ responseStatus: false, messageResponse: `Debe de Inicilializar el envío del número: ${clientew?.numero}` });

    //envio
    let estadoEnvio = clientew.enviarBoton(phoneDestination, message);

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

            return res.status(400).json({ responseStatus: false, messageResponse: messageResponse });
        });
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

swagger(app);

app.listen(port, () => {
    console.log(`server listening on port ${port}`)
});

function separadorPeticiones(url) {
    console.log(new Date().toISOString(), url, "------------------------- ");
}
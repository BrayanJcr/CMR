# CRM WhatsApp Integration — Referencia Técnica

> **Sistema:** CRM WhatsApp Integration — Clínica Cayetano Heredia
> **Versión:** 2.0 | **Fecha:** 2026-03-27
> **Fuente:** Análisis directo del código fuente (WA_ColaContext.cs, server.js, ClientWA.js, todos los servicios y DTOs)

---

## Índice

1. [Arquitectura del Sistema](#1-arquitectura-del-sistema)
2. [CRM.WhatsappChatNode — Node.js API](#2-cchwhatsappchatnode--nodejs-api)
3. [CRM.WhatsappCola — .NET 8 API](#3-cchwhatsappcola--net-8-api)
4. [whatsapp-web.js — Librería Core](#4-whatsapp-webjs--librería-core)
5. [Base de Datos — Schema Completo](#5-base-de-datos--schema-completo)
6. [DTOs — Contratos de API](#6-dtos--contratos-de-api)
7. [Enumeraciones](#7-enumeraciones)
8. [Flujo de Datos Completo](#8-flujo-de-datos-completo)
9. [Servicios Externos — Integración](#9-servicios-externos--integración)
10. [Variables de Entorno y Configuración](#10-variables-de-entorno-y-configuración)
11. [Docker y Despliegue](#11-docker-y-despliegue)
12. [Seguridad y Autenticación](#12-seguridad-y-autenticación)

---

## 1. Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────────────────┐
│                    Frontend (Angular)                             │
│    localhost:4200 | dev.ui.crm.* | uat.ui.crm.*                  │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTP REST + JWT Bearer
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│          CRM.WhatsappCola  (ASP.NET Core 8.0)                    │
│          api-notificacion.crm.ingenius.online                     │
│                                                                   │
│  Controllers:  WhatsApp | RecepcionWa | Autenticacion |          │
│                Conversacion | Usuario                             │
│                                                                   │
│  Services:     ColaService | WaQrRecepcionService |              │
│                WaQrService | UsuarioService |                     │
│                ConversacionService | TokenGeneradorService |      │
│                NotificacionCrmService | NotificacionQRService |   │
│                NotificacionChatService                            │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  SQL Server / PostgreSQL  (WA_Cola)                       │   │
│  │  7 tablas + 2 vistas                                      │   │
│  └───────────────────────────────────────────────────────────┘   │
└───┬──────────────────────┬───────────────────────────────────────┘
    │ HTTP via WaQrService  │ HTTP POST (webhooks desde Node.js)
    │ WebClientWA           │
    ▼                       ▼
┌──────────────────────────────────────────────────────────────────┐
│          CRM.WhatsappChatNode  (Node.js + Express)               │
│          dev.wsp.crm.clinicacayetanoheredia.com                   │
│          Puerto local: 3000 (prod) | 3001 (UAT) | 3002 (dev)    │
│                                                                   │
│  GET  /client-initialize                                          │
│  POST /send-text-message                                          │
│  POST /send-multimedia-message                                    │
│  POST /send-multimedia-url-message                                │
│  POST /send-button-message                                        │
│  GET  /get-active-number                                          │
│  GET  /logout                                                     │
│                                                                   │
│  Modelo: ClientWA (wrapper sobre whatsapp-web.js Client)         │
└───────────────────────────┬──────────────────────────────────────┘
                            │ Puppeteer (Chrome headless)
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│          whatsapp-web.js  (Open source, pedroslopez)             │
│          24+ eventos | 90+ métodos | 20 estructuras              │
└───────────────────────────┬──────────────────────────────────────┘
                            │ WhatsApp Web protocol (binary)
                            ▼
                    ┌──────────────────┐
                    │  WhatsApp Web    │
                    │  web.whatsapp.com│
                    └──────────────────┘

Notificaciones SignalR (uno a muchos):
CRM.WhatsappCola ──► dev.sr.crm.clinicacayetanoheredia.com/hub-qr   (eventos QR)
CRM.WhatsappCola ──► dev.sr.crm.clinicacayetanoheredia.com/hub-chat (nuevos mensajes)

Notificaciones al CRM externo:
CRM.WhatsappCola ──► api.crm.clinicacayetanoheredia.com/api/Whatsapp/* (mensaje, edición, eliminación)
```

### Responsabilidades

| Componente | Responsabilidad |
|---|---|
| **CRM.WhatsappChatNode** | Conectar a WhatsApp Web, capturar eventos (mensaje/edición/eliminación/QR), enviar mensajes de todo tipo |
| **CRM.WhatsappCola** | Gestionar cola de mensajes, persistir en BD, notificar CRM y frontend via SignalR |
| **whatsapp-web.js** | Automatizar Chrome para simular WhatsApp Web, abstraer protocolo binario |
| **SQL Server / PostgreSQL** | Persistencia: mensajes, conversaciones, usuarios, catálogos |
| **CRM Externo** | Sistema principal de la clínica — recibe notificaciones de nuevos mensajes |
| **SignalR Hub** | Push en tiempo real al frontend Angular cuando llegan mensajes o QR |

---

## 2. CRM.WhatsappChatNode — Node.js API

**Ruta:** `CRM.WhatsappChatNode/`
**Stack:** Node.js · Express 4.19 · whatsapp-web.js 1.25 · Puppeteer 22.6
**Puerto:** `APP_PORT` (default 3000)
**URL producción:** `https://dev.wsp.crm.clinicacayetanoheredia.com`

### 2.1 Endpoints REST

Todos los endpoints retornan JSON. HTTP 200 = éxito, HTTP 400 = error.

---

#### `GET /client-initialize`

Inicializa el cliente WhatsApp para un número. Si ya existe una sesión guardada en `sesiones/`, se reconecta sin QR.

**Query params:**
```
phoneNumber: string   — ej: 51904570597
```

**Flujo:**
1. Si `clienteInicializado == null` → crea nueva instancia `ClientWA(phoneNumber)`
2. Si ya existe y `estaActivo` → retorna estado CONNECTED
3. Si ya existe y `estaInicializando` → retorna estado informativo
4. Registra handler del evento `qr` en el server (POST al CRM.WhatsappCola cuando llega QR)
5. Registra handler `disconnected` (limpia `clienteInicializado`)
6. Llama `clientw.inicializar()` (asíncrono, no espera ready)

**Response exitoso:**
```json
{ "messageResponse": "Client Conectado Correctamente: 51900000000", "responseStatus": true }
```

**Response inicializando (con QR):**
```json
{ "messageResponse": "Client en proceso de Inicialización - Verifique la recepción del código QR", "responseStatus": true }
```

---

#### `POST /send-text-message`

**Body:**
```json
{
  "phoneDestination": "51987654321",
  "phoneFrom":        "51900000000",
  "message":          "Hola, ¿cómo está?"
}
```

**Response 200:**
```json
{
  "messageResponse": "Mensaje Enviado Correctamente a: 51987654321",
  "responseStatus":  true,
  "whatsAppId":      "3EB0C47C5BAA8F12..."
}
```

**Response 400 (sin cliente):**
```json
{ "responseStatus": false, "messageResponse": "No se tienen registrado el número: 51900000000, para el envío de mensajes." }
```

---

#### `POST /send-multimedia-message`

Envía archivo adjunto codificado en Base64.

**Body:**
```json
{
  "phoneDestination": "51987654321",
  "phoneFrom":        "51900000000",
  "caption":          "Adjunto su resultado",
  "dataBase64":       "iVBORw0KGgo...",
  "mimeType":         "image/jpeg",
  "fileName":         "resultado.jpg"
}
```

**Nota:** Internamente usa `sendAudioAsVoice: true` en las opciones, lo que convierte audios en notas de voz.

**Response 200:**
```json
{ "messageResponse": "Mensaje Multimedia Enviado Correctamente a: 51987654321", "responseStatus": true, "whatsAppId": "3EB0..." }
```

---

#### `POST /send-multimedia-url-message`

Descarga el archivo desde la URL y lo envía.

**Body:**
```json
{
  "phoneDestination": "51987654321",
  "phoneFrom":        "51900000000",
  "caption":          "Su resultado de laboratorio",
  "mediaUrl":         "https://storage.example.com/resultado.pdf"
}
```

---

#### `POST /send-button-message`

Envía mensaje con botones interactivos. Los botones están hardcodeados: **"Aceptar"** y **"rechazar"**.

**Body:**
```json
{
  "phoneDestination": "51987654321",
  "phoneFrom":        "51900000000",
  "message":          "¿Confirma su cita para mañana?"
}
```

---

#### `GET /get-active-number`

Retorna el número activo y su estado.

**Response (activo):**
```json
{ "responseStatus": true, "number": "51900000000" }
```

**Response (sin cliente o no activo):**
```json
{ "responseStatus": false, "messageResponse": "El número no está activo." }
```

---

#### `GET /logout`

Cierra sesión y borra `clienteInicializado`.

**Query params:**
```
phoneNumber: string
```

**Response 200:**
```json
{ "messageResponse": "Cerrar sesión Correctamente a: 51900000000", "responseStatus": true }
```

---

### 2.2 Clase ClientWA (`src/models/ClientWA.js`)

Encapsula el `Client` de whatsapp-web.js. Solo una instancia global en `server.js`.

**Propiedades:**
```javascript
numero          = ''      // Número telefónico (actualizado en evento 'ready')
cliente         = Client  // Instancia de whatsapp-web.js
estaActivo      = false   // true tras evento 'authenticated'
estaInicializando = false // true durante initialize(), false tras 'authenticated'
```

**Configuración de Chrome:**
```javascript
// Detección automática de plataforma
let path_windows = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
let path_linux   = '/usr/bin/google-chrome-stable';
let path_navegador = process.platform == 'win32' ? path_windows : path_linux;
```

**Configuración del Client:**
```javascript
new Client({
  authStrategy: new LocalAuth({
    dataPath: 'sesiones',       // Directorio persistente de sesión
    clientId: 'client-local'    // ID fijo: una sola cuenta por instancia
  }),
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
  },
  puppeteer: {
    headless: true,
    args: ['--no-sandbox'],
    executablePath: path_navegador
  }
})
```

**Eventos capturados y su acción:**

| Evento | Condición | Acción | Webhook CRM.WhatsappCola |
|---|---|---|---|
| `qr` | Siempre | Muestra QR en terminal (qrcode-terminal) | `POST /api/RecepcionWa/recepcionar-qr` con `{ qrCode: qr }` |
| `ready` | Siempre | Extrae número: `client.info.wid.user`; `estaInicializando=false` | `POST /api/RecepcionWa/recepcionar-numero` con `{ numeroDesde }` |
| `message` | Siempre (incl. `status@broadcast`) | Obtiene contacto, descarga adjunto si `hasMedia`, arma payload | `POST /api/RecepcionWa/recepcionar` |
| `message_edit` | Solo si `message.from != this.numero` | Captura texto anterior y nuevo | `POST /api/RecepcionWa/recepcionar-edicion` |
| `message_revoke_everyone` | Solo si `message.from != this.numero` | Extrae ID de `message.rawData.protocolMessageKey.id` | `POST /api/RecepcionWa/recepcionar-eliminacion` |
| `authenticated` | Siempre | `estaActivo=true`, `estaInicializando=false` | — |
| `disconnected` | Siempre | `estaActivo=false` | — |
| `auth_failure` | Siempre | Log de error | — |

**Payload completo del evento `message`** (enviado a `/api/RecepcionWa/recepcionar`):
```json
{
  "numeroDesde":              "51987654321",
  "numeroPara":               "51900000000",
  "mensaje":                  "Hola, necesito una cita",
  "whatsAppTipo":             "chat",
  "fechaEnvio":               "2026-03-27T19:30:00.000Z",
  "whatsAppId":               "3EB0C47C5BAA8F12ABCD",
  "tieneAdjunto":             false,
  "nombreContacto":           "Juan Pérez",
  "whatsAppIdPadre":          null,
  "adjuntoBase64":            null,
  "mimeType":                 null,
  "nroByte":                  null,
  "nombreArchivo":            null,
  "esErrorDescargaMultimedia": null
}
```

**Nota:** `message.from` y `message.to` vienen en formato `51987654321@c.us`. El `.replace('@c.us', '')` se aplica antes de enviar.

**Ajuste de zona horaria:** El timestamp de WhatsApp es Unix epoch. `new Date(message.timestamp * 1000)` lo convierte. En CRM.WhatsappCola se le resta 5 horas para zona horaria Peru.

**Métodos públicos:**

| Método | Descripción |
|---|---|
| `inicializar()` | Registra todos los event handlers internos, llama `client.initialize()`, setea `estaInicializando=true` |
| `cerrarSesion()` | Llama `client.logout()` |
| `obtenerEstado()` | Llama `client.getState()` → retorna `WAState` |
| `enviarMensaje(dest, msg)` | `client.sendMessage(dest + "@c.us", msg)` |
| `enviarMensajeMultimedia(dest, caption, b64, mime, file)` | `new MessageMedia(mime, b64, file)` → `sendMessage` con `{caption, sendAudioAsVoice: true}` |
| `enviarMensajeMultimediaDesdeUrl(dest, caption, url)` | `MessageMedia.fromUrl(url)` → `sendMessage` con `{caption}` |
| `enviarBoton(dest, msg)` | `new Buttons('Button body', [{body:'Aceptar'},{body:'rechazar'}], 'title', 'footer')` → `sendMessage` |

---

## 3. CRM.WhatsappCola — .NET 8 API

**Ruta:** `CRM.WhatsappCola/CRM.WhatsappCola/`
**Stack:** ASP.NET Core 8.0 · Entity Framework Core · SQL Server
**URL:** `api-notificacion.crm.ingenius.online`
**Swagger:** `/api-documentacion`
**Auth:** JWT Bearer (todas las rutas usan `[Authorize]`)

### 3.1 Controllers y Endpoints

#### `WhatsAppController` — `[Route("api/[controller]")]`

| Método | Ruta | Body / Params | Servicio | Descripción |
|---|---|---|---|---|
| POST | `/api/WhatsApp/agendar` | `WhatsAppRecepcionDTO` | `ColaService.AgendarMensaje()` | Encola y envía inmediatamente |
| POST | `/api/WhatsApp/enviar` | `int idMensaje` (body) | `ColaService.EnviarMensaje()` | Re-envía un mensaje ya en cola |
| POST | `/api/WhatsApp/obtenerEstado` | `int idMensaje` (body) | `ColaService.ObtenerEstado()` | Estado actual de un mensaje |
| POST | `/api/WhatsApp/iniciar-cliente` | — | `ColaService.IniciarCliente()` | Inicia cliente en CRM.WhatsappChatNode |
| GET  | `/api/WhatsApp/obtenerNumero` | — | `ColaService.ObtenerNumero()` | Número activo en el cliente Node.js |

---

#### `RecepcionWaController` — `[Route("api/[controller]")]`

Llamado **automáticamente** por CRM.WhatsappChatNode (webhooks). No requiere JWT.

| Método | Ruta | Body | Servicio | Descripción |
|---|---|---|---|---|
| POST | `/api/RecepcionWa/recepcionar` | `WaMensajeEntranteDTO` | `WaQrRecepcionService.RecepcionarMensaje()` | Nuevo mensaje entrante |
| POST | `/api/RecepcionWa/recepcionar-edicion` | `WaMensajeEditadoDTO` | `WaQrRecepcionService.RecepcionarEdicion()` | Mensaje editado |
| POST | `/api/RecepcionWa/recepcionar-eliminacion` | `WaMensajeEliminadoDTO` | `WaQrRecepcionService.RecepcionarEliminacion()` | Mensaje eliminado para todos |
| POST | `/api/RecepcionWa/recepcionar-qr` | `WaMensajeQrEntranteDTO` | `WaQrRecepcionService.RecepcionarQr()` | Nuevo código QR |
| POST | `/api/RecepcionWa/recepcionar-numero` | `WaMensajeNumeroEntranteDTO` | `WaQrRecepcionService.RecepcionarNumero()` | Número autenticado listo |

---

#### `AutenticacionController` — `[Route("api/[controller]")]`

| Método | Ruta | Body | Descripción |
|---|---|---|---|
| POST | `/api/Autenticacion/Login` | `LoginRequestDTO` | Valida usuario/contraseña, retorna JWT |

---

#### `ConversacionController` — `[Route("api/[controller]")]`

| Método | Ruta | Body | Descripción |
|---|---|---|---|
| POST | `/api/Conversacion/ObtenerDetalle` | `FiltroDetalleConversacionDTO` | Detalle de mensajes por conversación (usa `V_Obtener_DetalleMensajes`) |
| POST | `/api/Conversacion/ObtenerResumen` | `FiltroResumenConversacionDTO` | Resumen de conversaciones activas (usa `V_Obtener_ResumenConversacion`) |

---

#### `UsuarioController` — `[Route("api/[controller]")]`

| Método | Ruta | Body | Descripción |
|---|---|---|---|
| POST | `/api/Usuario/create` | `UsuarioCreateDTO` | Crea usuario con password hasheado con BCrypt |
| PUT  | `/api/Usuario/update` | `UsuarioUpdateDTO` | Actualiza datos de usuario |

---

### 3.2 Services — Lógica de Negocio

#### `ColaService`

**Responsabilidad:** Gestión completa del ciclo de vida de mensajes salientes.

**`AgendarMensaje(WhatsAppRecepcionDTO dto)`:**
1. **Validaciones:**
   - `NumeroOrigen.Length == 11` (exacto)
   - `NumeroDestino.Length == 11` (exacto)
   - `NumeroDestino[2] == '9'` (tercer dígito debe ser 9, indica celular Perú)
   - Si tiene `AdjuntoBase64`, requiere también `NombreArchivo`, `MimeType`, `NroByte`
2. Inserta `TMensajeCola` con estado `Pendiente (1)`, `UsuarioCreacion = "webapp"`
3. Inmediatamente llama `EnviarMensaje(id)` — no hay polling, el envío es síncrono
4. Actualiza `EstadoMensaje` en la respuesta según resultado del envío

**`EnviarMensaje(int idMensaje)`:**
1. Busca `TMensajeCola` por ID
2. Solo procede si estado es `Pendiente (1)` o `Error (3)`
3. Valida que el número del remitente coincida con el activo en CRM.WhatsappChatNode via `WaQrService.ObtenerNumero()`
4. **Prioridad de envío:**
   - Si `UrlArchivo` → `WaQrService.EnviarMensajeMultimediaUrl()`
   - Si `AdjuntoBase64` → `WaQrService.EnviarMensajeMultimediaPayload()`
   - Si solo texto → `WaQrService.EnviarMensajeTexto()`
5. **Si éxito:** estado → `Enviado (2)`, guarda `WhatsAppId` y `FechaEnvio`, notifica via `NotificacionChatService`
6. **Si error:** estado → `Error (3)`, guarda descripción en `Error`

---

#### `WaQrRecepcionService`

**Responsabilidad:** Procesar todos los eventos entrantes desde CRM.WhatsappChatNode.

**`RecepcionarMensaje(WaMensajeEntranteDTO dto)`:**
1. **Ajuste de zona horaria:** `dto.FechaEnvio.AddHours(-5)` (WhatsApp envía en UTC, se ajusta a UTC-5 Peru)
2. Inserta `TMensajeEntrante` con estado `Recibido (1)`, `UsuarioCreacion = "webapp-recepcion"`
   - `NumeroCuenta = dto.NumeroPara` (cuenta que recibió)
   - `NumeroCliente = dto.NumeroDesde` (cliente que envió)
3. Notifica frontend via `NotificacionChatService` → SignalR `hub-chat` evento `NotificarNuevoMensajeGeneral`
4. Notifica CRM externo via `NotificacionCrmService` → `POST api/Whatsapp/RecibirMensaje`
5. Si tiene `WhatsAppIdPadre` → llama `RegularizarIdMensajePadreLocal(id)` para resolver FKs locales

**`RegularizarIdMensajePadreLocal(int id)`:**
Busca el mensaje insertado, luego busca en `T_MensajeEntrante` y `T_MensajeCola` por `WhatsAppId == WhatsAppIdPadre`. Rellena `IdMensajeEntrantePadre` o `IdMensajeColaPadre` según corresponda.

**`RecepcionarEdicion(WaMensajeEditadoDTO dto)`:**
1. Ajuste de zona horaria: `FechaEnvio.AddHours(-5)`
2. Busca `TMensajeEntrante` por `WhatsAppId`; si no existe → retorna error
3. Actualiza `Mensaje = dto.MensajeActual` y `FechaEnvio`, `UsuarioModificacion = "webapp-edicion"`
4. Notifica frontend (SignalR) y CRM externo (`POST api/Whatsapp/RecibirEdicion`)

**`RecepcionarEliminacion(WaMensajeEliminadoDTO dto)`:**
1. Busca `TMensajeEntrante` por `WhatsAppId`; si no existe → retorna error
2. Setea `FueEliminado = true`, `FechaRecepcionEliminacion = DateTime.Now`, `UsuarioModificacion = "webapp-eliminacion"`
3. Notifica frontend (SignalR) y CRM externo (`POST api/Whatsapp/RecibirEliminacion`)

**`RecepcionarQr(WaMensajeQrEntranteDTO dto)`:**
1. Convierte el QR text a imagen PNG Base64 via `QRCoder` (librería)
2. Notifica via `NotificacionQRService` → SignalR `hub-qr` evento `NotificarQr` con `{ CodigoQr, Payload: base64_image }`

**`RecepcionarNumero(WaMensajeNumeroEntranteDTO dto)`:**
1. Notifica via `NotificacionQRService` → SignalR `hub-qr` evento `NotificarNumero` con `{ NumeroCuenta, Payload }`

---

#### `WaQrService`

**Responsabilidad:** HTTP client hacia CRM.WhatsappChatNode. Usa `WebClientWA` (timeout infinito).

**URL base:** `https://dev.wsp.crm.clinicacayetanoheredia.com`

| Método | Endpoint Node.js | Descripción |
|---|---|---|
| `EnviarMensajeTexto(WAMensajeTextoDTO)` | `POST /send-text-message` | Texto plano |
| `EnviarMensajeMultimediaPayload(WAMensajeMultimediaPayloadDTO)` | `POST /send-multimedia-message` | Archivo en Base64 |
| `EnviarMensajeMultimediaUrl(WAMensajeMultimediaUrlDTO)` | `POST /send-multimedia-url-message` | Archivo por URL |
| `IniciarCliente(WAInicializarDTO)` | `GET /client-initialize?phoneNumber=` | Iniciar cliente |
| `ObtenerNumero()` | `GET /get-active-number` | Número activo |

---

#### `NotificacionCrmService`

**URL base:** `https://api.crm.clinicacayetanoheredia.com/`
**Auth:** JWT hardcodeado en código (token largo con expiración año 3104)
**SSL:** Deshabilitado via `ServicePointManager.ServerCertificateValidationCallback`

| Método | Endpoint CRM | Descripción |
|---|---|---|
| `Envio_MensajeEntrante_WhatsApp(TMensajeEntrante)` | `POST api/Whatsapp/RecibirMensaje` | Mensaje nuevo |
| `Envio_MensajeEdicion_WhatsApp(WaMensajeEditadoDTO)` | `POST api/Whatsapp/RecibirEdicion` | Mensaje editado |
| `Envio_MensajeEdicion_WhatsApp(WaMensajeEliminadoDTO)` | `POST api/Whatsapp/RecibirEliminacion` | Mensaje eliminado |

---

#### `NotificacionQRService`

**Hub SignalR:** `https://dev.sr.crm.clinicacayetanoheredia.com/hub-qr`
**SSL:** Deshabilitado en `ServerCertificateCustomValidationCallback`

| Método | Evento SignalR | Payload |
|---|---|---|
| `EnviarNotificacion_RecepcionQR()` | `NotificarQr` | `{ CodigoQr, Payload: base64_png }` |
| `EnviarNotificacion_RecepcionNumero()` | `NotificarNumero` | `{ NumeroCuenta, Payload }` |

---

#### `NotificacionChatService`

**Hub SignalR:** `https://dev.sr.crm.clinicacayetanoheredia.com/hub-chat`
**SSL:** Deshabilitado en `ServerCertificateCustomValidationCallback`

| Método | Evento SignalR | Payload |
|---|---|---|
| `EnviarNotificacion_NuevoMensajeGeneral()` | `NotificarNuevoMensajeGeneral` | `{ NumeroCuenta, NumeroCliente, EsEntrante }` |

---

#### `UsuarioService`

Métodos: `GetByUserName()`, `GetById()`, `ValidateHashPassword()` (BCrypt.Verify), `Create()` (BCrypt.HashPassword), `Update()`

#### `ConversacionService`

Consulta `VObtenerDetalleMensajes` y `VObtenerResumenConversacion` con filtros de cuenta/cliente/fecha. Usa AutoMapper.

#### `TokenGeneradorService`

Genera JWT HS256 con claims: `idUsuario`, `nombreUsuario`, `nombres`, `apellidoPaterno`, `apellidoMaterno`. Expiración: 1440 minutos (24h).

#### `Helper/WebClientWA`

`WebClient` con `Timeout = Timeout.Infinite` para llamadas HTTP síncronas de larga duración hacia CRM.WhatsappChatNode.

---

## 4. whatsapp-web.js — Librería Core

**Repositorio:** `github.com/pedroslopez/whatsapp-web.js` (con mantenimiento activo)
**Versión local:** main branch
**Uso en proyecto:** CRM.WhatsappChatNode la referencia como dependencia local `whatsapp-web.js: ^1.25.0`

### 4.1 Eventos del Client

| Evento | Usado | Descripción |
|---|---|---|
| `qr` | ✅ | QR para escanear. Se refresca automáticamente si expira |
| `authenticated` | ✅ | Sesión autenticada. `estaActivo=true` |
| `auth_failure` | ✅ | Fallo al restaurar sesión. Log de error |
| `ready` | ✅ | Cliente listo. Extrae número de `client.info.wid.user` |
| `message` | ✅ | Mensaje entrante (excluye propios). Incluye media handling |
| `message_edit` | ✅ | Mensaje editado. Captura texto anterior y nuevo |
| `message_revoke_everyone` | ✅ | Mensaje eliminado para todos. ID extraído de `rawData.protocolMessageKey.id` |
| `disconnected` | ✅ | Desconexión. `estaActivo=false` |
| `code` | ❌ | Pairing code (no implementado) |
| `message_create` | ❌ | Todos los mensajes incl. propios (no implementado) |
| `message_ack` | ❌ | Cambio de estado de entrega (no implementado) |
| `message_revoke_me` | ❌ | Eliminado solo para mí (no implementado) |
| `group_join/leave/update` | ❌ | Eventos de grupo (no implementados) |
| `group_admin_changed` | ❌ | Cambio de admin (no implementado) |
| `incoming_call` / `call` | ❌ | Llamadas (no implementadas) |
| `message_reaction` | ❌ | Reacciones emoji (no implementadas) |
| `vote_update` | ❌ | Votos en encuesta (no implementados) |
| `contact_changed` | ❌ | Cambio de número de contacto (no implementado) |
| `chat_removed` / `chat_archived` | ❌ | Eventos de chat (no implementados) |

### 4.2 Métodos del Client usados

| Método | Usado | Descripción |
|---|---|---|
| `initialize()` | ✅ | Arranca Chrome/Puppeteer y conecta WhatsApp Web |
| `logout()` | ✅ | Cierra sesión, borra datos locales |
| `getState()` | ✅ | Retorna `WAState`: CONNECTED, OPENING, etc. |
| `sendMessage(chatId, content, options)` | ✅ | Envía texto, `MessageMedia`, `Buttons` |
| `getContacts()` | ❌ | — |
| `getChats()` | ❌ | — |
| `searchMessages()` | ❌ | — |
| `createGroup()` | ❌ | — |
| `requestPairingCode()` | ❌ | — |

### 4.3 Estructuras exportadas

```javascript
// index.js exports:
Client, Message, MessageMedia, Chat, PrivateChat, GroupChat, Channel,
Contact, PrivateContact, BusinessContact, ClientInfo, Location, Poll,
ScheduledEvent, ProductMetadata, List, Buttons, Broadcast,
NoAuth, LocalAuth, RemoteAuth, ...Constants
```

### 4.4 LocalAuth (estrategia usada)

```javascript
new LocalAuth({
  dataPath: 'sesiones',      // → CRM.WhatsappChatNode/sesiones/session-client-local/
  clientId: 'client-local'   // Permite múltiples instancias con diferentes IDs
})
```
- La sesión se guarda en `sesiones/session-client-local/` (directorio de Chrome)
- En Docker se monta como volumen: `./sesiones:/usr/src/app/sesiones`
- Si se elimina el directorio, la próxima inicialización pide QR nuevamente

---

## 5. Base de Datos — Schema Completo

**Nombre BD:** `WA_Cola`
**Motor original:** SQL Server (EF Core Power Tools auto-generated)
**Script PostgreSQL:** `CRM.WhatsappCola/database_postgres.sql`

### 5.1 Diagrama ERD

```
T_MensajeColaEstado           T_MensajeEntranteEstado
  Id (PK)                        Id (PK)
  Nombre: Pendiente|Enviado|Error  Nombre: Recibido
  Estado, auditoria              Estado, auditoria
      │ 1:N FK                        │ 1:N FK
      ▼                               ▼
T_MensajeCola                  T_MensajeEntrante
  Id (PK)                        Id (PK)
  IdMensajeColaEstado (FK) ──┐   IdMensajeEntranteEstado (FK)
  NumeroRemitente             │   NumeroCuenta
  NumeroDestino               │   NumeroCliente
  Mensaje (TEXT)              │   WhatsAppTipo
  AdjuntoBase64 (TEXT)        │   WhatsAppId
  NombreArchivo               │   FechaEnvio
  MimeType                    │   Mensaje (TEXT)
  NroByte                     │   TieneAdjunto
  UrlArchivo (TEXT)           │   AdjuntoBase64 (TEXT)
  Estado                      │   NombreArchivo
  FechaCreacion               │   MimeType
  FechaModificacion           │   NroByte
  Error (TEXT)                │   UrlArchivo (TEXT)
  FechaEnvio                  └──IdMensajeColaPadre (lógico)
  WhatsAppId                      IdMensajeEntrantePadre (lógico, self-ref)
                                  WhatsAppIdPadre
                                  FueEliminado
                                  FechaRecepcionEliminacion
                                  EsErrorDescargaMultimedia
                                  NombreContacto
                                  Estado, auditoria

T_Conversacion    T_Usuario           T_TipoMensaje
  Id (PK)           Id (PK)             Id (PK)
  NumeroCuenta      Nombres             Nombre
  NumeroCliente     ApellidoPaterno     Estado, auditoria
  Estado            ApellidoMaterno
  auditoria         NombreUsuario (UNIQUE)
                    ClaveHash (BCrypt)
                    Estado, auditoria

VISTAS (sin clave primaria):
  V_Obtener_DetalleMensajes        → UNION de T_MensajeCola + T_MensajeEntrante
  V_Obtener_ResumenConversacion    → MAX(FechaEnvio) + último NombreContacto por cuenta-cliente
```

### 5.2 Descripción de tablas

#### T_MensajeColaEstado
| Campo | Tipo PG | Nulo | Descripción |
|---|---|---|---|
| Id | SERIAL PK | NO | Auto-incremental |
| Nombre | VARCHAR(50) | NO | Pendiente / Enviado / Error |
| Estado | BOOLEAN | NO | Registro activo |
| UsuarioCreacion | VARCHAR(50) | NO | |
| UsuarioModificacion | VARCHAR(50) | NO | |
| FechaCreacion | TIMESTAMP | NO | |
| FechaModificacion | TIMESTAMP | NO | |

#### T_MensajeEntranteEstado
| Campo | Tipo PG | Nulo | Descripción |
|---|---|---|---|
| Id | SERIAL PK | NO | Auto-incremental |
| Nombre | VARCHAR(50) | NO | Solo: Recibido |
| Estado | BOOLEAN | NO | |
| UsuarioCreacion | VARCHAR(50) | NO | |
| UsuarioModificacion | VARCHAR(50) | NO | |
| FechaCreacion | TIMESTAMP | NO | |
| FechaModificacion | TIMESTAMP | NO | |

#### T_TipoMensaje
| Campo | Tipo PG | Nulo | Descripción |
|---|---|---|---|
| Id | SERIAL PK | NO | |
| Nombre | VARCHAR(50) | NO | chat / image / video / audio / ptt / document / sticker / location / vcard / etc. |
| Estado | BOOLEAN | NO | |
| UsuarioCreacion | VARCHAR(50) | NO | |
| UsuarioModificacion | VARCHAR(50) | NO | |
| FechaCreacion | TIMESTAMP | NO | |
| FechaModificacion | TIMESTAMP | NO | |

#### T_Usuario
| Campo | Tipo PG | Índice | Descripción |
|---|---|---|---|
| Id | SERIAL PK | PK | |
| Nombres | VARCHAR(128) | | |
| ApellidoPaterno | VARCHAR(128) | | |
| ApellidoMaterno | VARCHAR(128) | | |
| NombreUsuario | VARCHAR(50) | UNIQUE | Login username |
| ClaveHash | VARCHAR(512) | | BCrypt hash (cost=10) |
| Estado | BOOLEAN | | |
| UsuarioCreacion | VARCHAR(50) | | |
| UsuarioModificacion | VARCHAR(50) | | |
| FechaCreacion | TIMESTAMP | | |
| FechaModificacion | TIMESTAMP | | |

#### T_Conversacion
| Campo | Tipo PG | Índice | Descripción |
|---|---|---|---|
| Id | SERIAL PK | PK | |
| NumeroCuenta | VARCHAR(12) | IX | Cuenta WhatsApp corporativa (11 dígitos) |
| NumeroCliente | VARCHAR(12) | IX | Número del paciente/cliente (11 dígitos) |
| Estado | BOOLEAN | | |
| UsuarioCreacion | VARCHAR(50) | | |
| UsuarioModificacion | VARCHAR(50) | | |
| FechaCreacion | TIMESTAMP | | |
| FechaModificacion | TIMESTAMP | | |

#### T_MensajeCola
| Campo | Tipo PG | Nulo | Descripción |
|---|---|---|---|
| Id | SERIAL PK | NO | |
| IdMensajeColaEstado | INTEGER FK→ColaEstado | NO | 1=Pendiente, 2=Enviado, 3=Error |
| NumeroRemitente | VARCHAR(30) | NO | Cuenta corporativa (11 dígitos) |
| NumeroDestino | VARCHAR(30) | NO | Cliente destino (11 dígitos, digito[2]='9') |
| Mensaje | TEXT | SÍ | Cuerpo del mensaje |
| AdjuntoBase64 | TEXT | SÍ | Archivo en Base64 |
| NombreArchivo | VARCHAR(1024) | SÍ | |
| MimeType | VARCHAR(50) | SÍ | |
| NroByte | INTEGER | SÍ | |
| UrlArchivo | TEXT | SÍ | Alternativa a AdjuntoBase64 |
| Estado | BOOLEAN | NO | |
| UsuarioCreacion | VARCHAR(50) | NO | "webapp" |
| UsuarioModificacion | VARCHAR(50) | NO | "webappenvio" tras envío |
| FechaCreacion | TIMESTAMP | NO | |
| FechaModificacion | TIMESTAMP | NO | |
| Error | TEXT | SÍ | Mensaje de error (estado=3) |
| FechaEnvio | TIMESTAMP | SÍ | Timestamp de envío confirmado |
| WhatsAppId | VARCHAR(50) | SÍ | ID asignado por WhatsApp |

#### T_MensajeEntrante
| Campo | Tipo PG | Nulo | Descripción |
|---|---|---|---|
| Id | SERIAL PK | NO | |
| IdMensajeEntranteEstado | INTEGER FK→EntranteEstado | NO | Solo 1=Recibido |
| NumeroCuenta | VARCHAR(12) | NO | Cuenta que recibe |
| NumeroCliente | VARCHAR(12) | NO | Cliente que envía |
| WhatsAppTipo | VARCHAR(15) | SÍ | chat / image / video / ptt / document / sticker... |
| WhatsAppId | VARCHAR(50) | SÍ | ID único de WhatsApp |
| FechaEnvio | TIMESTAMP | NO | Timestamp ajustado (UTC-5) |
| Mensaje | TEXT | SÍ | Texto del mensaje |
| TieneAdjunto | BOOLEAN | SÍ | |
| AdjuntoBase64 | TEXT | SÍ | Descargado y codificado por ClientWA |
| NombreArchivo | VARCHAR(1024) | SÍ | |
| MimeType | VARCHAR(50) | SÍ | |
| NroByte | INTEGER | SÍ | |
| UrlArchivo | TEXT | SÍ | No usado en flujo actual |
| Estado | BOOLEAN | NO | |
| UsuarioCreacion | VARCHAR(50) | NO | "webapp-recepcion" |
| UsuarioModificacion | VARCHAR(50) | NO | "webapp-edicion" / "webapp-eliminacion" / "regularizacion-padre" |
| FechaCreacion | TIMESTAMP | NO | |
| FechaModificacion | TIMESTAMP | NO | |
| WhatsAppIdPadre | VARCHAR(50) | SÍ | ID WhatsApp del mensaje citado |
| IdMensajeEntrantePadre | INTEGER | SÍ | **Referencia lógica** a T_MensajeEntrante.Id (sin FK constraint en BD) |
| IdMensajeColaPadre | INTEGER | SÍ | **Referencia lógica** a T_MensajeCola.Id (sin FK constraint en BD) |
| FueEliminado | BOOLEAN | SÍ | true cuando llega `message_revoke_everyone` |
| FechaRecepcionEliminacion | TIMESTAMP | SÍ | Momento en que se recibió el evento de eliminación |
| EsErrorDescargaMultimedia | BOOLEAN | SÍ | true si `downloadMedia()` falla |
| NombreContacto | VARCHAR(256) | SÍ | `contact.pushname` al momento de recibir |

### 5.3 Vistas

**`V_Obtener_DetalleMensajes`** (sin clave primaria)
UNION de T_MensajeCola (salientes) y T_MensajeEntrante (entrantes) con campos alineados.
Campos: `IdMensajeSaliente`, `IdMensajeEntrante`, `NumeroCuenta`, `NumeroCliente`, `Fecha`, `FechaEnvio`, `WhatsAppId`, `Mensaje`, `WhatsAppIdPadre`, `IdMensajeSalientePadre`, `IdMensajeEntrantePadre`, `Error`, `MimeType`, `AdjuntoBase64`, `NombreArchivo(500)`, `EsErrorDescargaMultimedia`

**`V_Obtener_ResumenConversacion`** (sin clave primaria)
Campos: `NumeroCuenta VARCHAR(12)`, `NumeroCliente VARCHAR(12)`, `FechaUltimoMensaje TIMESTAMP`, `NombreContacto VARCHAR(256)`

---

## 6. DTOs — Contratos de API

### 6.1 WhatsAppRecepcionDTO (entrada: `/api/WhatsApp/agendar`)

```csharp
[Required] string NumeroDestino   // 11 dígitos exactos, dígito[2]=='9'
[Required] string NumeroOrigen    // 11 dígitos exactos
string?    Mensage                // Texto del mensaje
string?    AdjuntoBase64          // Si se envía, requiere NombreArchivo+MimeType+NroByte
string?    NombreArchivo
string?    MimeType
int?       NroByte
[Url] string? UrlArchivo          // Alternativa a AdjuntoBase64
```

### 6.2 DTOs de recepción desde CRM.WhatsappChatNode

**WaMensajeEntranteDTO** (`/api/RecepcionWa/recepcionar`):
```csharp
string    NumeroDesde          // Remitente (sin @c.us)
string    NumeroPara           // Destinatario
string    Mensaje
string    WhatsAppTipo         // chat, image, video, ptt, document...
DateTime  FechaEnvio           // Timestamp UTC (se ajusta -5h en servicio)
string    WhatsAppId
string?   WhatsAppIdPadre      // Si es respuesta a otro mensaje
bool?     TieneAdjunto
string?   AdjuntoBase64
string?   NombreArchivo
string?   MimeType
int?      NroByte
bool?     EsErrorDescargaMultimedia
string?   NombreContacto       // pushname del contacto
```

**WaMensajeEditadoDTO** (`/api/RecepcionWa/recepcionar-edicion`):
```csharp
string   NumeroDesde, NumeroPara
string   MensajeActual    // Texto nuevo
string   MensajeAnterior  // Texto original (solo en log, no se persiste)
string   WhatsAppTipo
DateTime FechaEnvio
string   WhatsAppId
```

**WaMensajeEliminadoDTO** (`/api/RecepcionWa/recepcionar-eliminacion`):
```csharp
string NumeroDesde, NumeroPara
string WhatsAppId   // rawData.protocolMessageKey.id
```

**WaMensajeQrEntranteDTO** (`/api/RecepcionWa/recepcionar-qr`):
```csharp
string QrCode   // String QR raw (se convierte a PNG Base64 con QRCoder)
```

**WaMensajeNumeroEntranteDTO** (`/api/RecepcionWa/recepcionar-numero`):
```csharp
string NumeroDesde   // Número autenticado en el cliente WhatsApp
```

### 6.3 DTOs de respuesta hacia CRM.WhatsappChatNode (via WaQrService)

**WAMensajeTextoDTO:**
```csharp
string NumeroOrigen, NumeroDestino, Mensage
```
→ se serializa como: `{ phoneFrom, phoneDestination, message }` al Node.js

**WAMensajeMultimediaPayloadDTO:**
```csharp
string NumeroOrigen, NumeroDestino, Mensage
string AdjuntoBase64, NombreArchivo, MimeType
int?   NroByte
```

**WAMensajeMultimediaUrlDTO:**
```csharp
string NumeroOrigen, NumeroDestino, Mensage, UrlArchivo
```

**WAInicializarDTO:**
```csharp
string NumeroCuenta   // Enviado como query param ?phoneNumber=
```

**WARespuestaDTO** (respuesta de CRM.WhatsappChatNode):
```csharp
bool   Estado      // responseStatus
string Mensage     // messageResponse
string WhatsAppId  // whatsAppId
```

**WARespuestaNumeroDTO:**
```csharp
bool   Estado
string Mensage
string Numero     // number
```

### 6.4 DTOs de resultado (respuestas de CRM.WhatsappCola al cliente)

**ResultadoAgendarDTO:**
```csharp
bool   Estado
string Respuesta
int    MensageId
string EstadoMensaje   // "Pendiente" | "Enviado" | "Error"
string WhatsAppId
```

**ResultadoEnviarDTO:**
```csharp
bool   Estado
string Respuesta
int    MensageId
string EstadoMensaje
string WhatsAppId
```

**ResultadoObtenerEstadoDTO:**
```csharp
bool   Estado
int    MensageId
string EstadoMensaje   // "Pendiente" | "Enviado" | "Error"
string MensajeError    // Descripción si estado=Error
```

**ResultadoInicializarDTO:**
```csharp
bool   Estado
string Respuesta
```

**ResultadoObtenerNumeroDTO:**
```csharp
bool   Estado
string Respuesta
string Numero
```

**ResultadoRecibirDTO:**
```csharp
bool   Estado
string Respuesta
int    MensageId
```

**ResultadoRecibirQrDTO / ResultadoRecibirNumeroDTO:**
```csharp
bool   Estado
string Respuesta
string Numero   // (solo en ResultadoRecibirNumeroDTO)
```

### 6.5 DTOs de Autenticación

**LoginRequestDTO:**
```csharp
string NombreUsuario
string Clave
```

**ConfiguracionAutenticacionDTO** (de appsettings `JWTAuthentication`):
```csharp
string Secret              // Clave HS256 (256 caracteres hex)
string ExpirationMinutes   // "1440" = 24h
string Issuer              // "https://*.api-notificacion.crm.ingenius.online"
string Audience            // "https://*.api-notificacion.crm.ingenius.online"
```

### 6.6 DTOs de Conversación

**FiltroDetalleConversacionDTO:**
```csharp
string NumeroCuenta, NumeroCliente
DateTime? FechaInicio, FechaFin
```

**DetalleConversacionDTO:** Mapeado desde `VObtenerDetalleMensajes`

**FiltroResumenConversacionDTO:**
```csharp
string NumeroCuenta
string NumeroCliente   // Opcional, para filtrar
```

**ResumenConversacionDTO:** Mapeado desde `VObtenerResumenConversacion`

### 6.7 DTOs de Notificación (SignalR payloads)

**NotificacionWaChatDTO:**
```csharp
string NumeroCuenta, NumeroCliente
bool   EsEntrante
```

**NotificacionWaQrDTO:**
```csharp
string CodigoQr    // QR raw string
string Payload     // JSON con QrCodeBase64 (PNG imagen)
```

**NotificacionWaNumeroDTO:**
```csharp
string NumeroCuenta
string Payload
```

---

## 7. Enumeraciones

### MensajeColaEstadoEnum
```csharp
// CRM.WhatsappCola/Enum/MensajeColaEstadoEnum.cs
public enum MensajeColaEstadoEnum
{
    Pendiente = 1,   // Mensaje insertado en T_MensajeCola, aún no procesado
    Enviado   = 2,   // CRM.WhatsappChatNode confirmó el envío exitoso
    Error     = 3    // El envío falló; Error contiene la descripción
}
```

### MensajeEntranteEstadoEnum
```csharp
// CRM.WhatsappCola/Enum/MensajeEntranteEstadoEnum.cs
public enum MensajeEntranteEstadoEnum
{
    Recibido = 1    // Único estado; todos los mensajes entrantes se insertan con este valor
}
```

---

## 8. Flujo de Datos Completo

### 8.1 Flujo de mensaje ENTRANTE

```
Cliente WhatsApp (teléfono del paciente)
    │ Escribe y envía mensaje
    ▼
WhatsApp Web (Chrome automatizado por Puppeteer)
    │ Evento 'message'
    ▼
whatsapp-web.js — Client.js
    │ Emite evento 'message' con objeto Message
    ▼
ClientWA.js — handler 'message'
    ├─ Si message.body == 'ping' → reply('pong')
    ├─ Si from == 'status@broadcast' → log y continúa
    ├─ Obtiene contacto: message.getContact() → pushname
    ├─ Si hasQuotedMsg → extrae whatsAppIdPadre de rawData.quotedMsg.id.id
    ├─ Si hasMedia → message.downloadMedia() → {data, mimetype, filesize, filename}
    │   └─ Si falla → esErrorDescargaMultimedia = true
    └─ POST URL_APP_Cola/api/RecepcionWa/recepcionar (JSON)
         │
         ▼
RecepcionWaController → WaQrRecepcionService.RecepcionarMensaje()
    ├─ FechaEnvio.AddHours(-5)   (ajuste zona horaria UTC→UTC-5)
    ├─ INSERT T_MensajeEntrante (estado: Recibido=1)
    ├─ NotificacionChatService → SignalR hub-chat → "NotificarNuevoMensajeGeneral"
    │    → Frontend Angular recibe push: { NumeroCuenta, NumeroCliente, EsEntrante:true }
    ├─ NotificacionCrmService → POST api.crm.*/api/Whatsapp/RecibirMensaje
    │    → CRM externo procesa el mensaje
    └─ Si tiene WhatsAppIdPadre → RegularizarIdMensajePadreLocal()
         └─ Busca en T_MensajeEntrante y T_MensajeCola por WhatsAppId
            → Rellena IdMensajeEntrantePadre o IdMensajeColaPadre
```

### 8.2 Flujo de mensaje SALIENTE

```
CRM / Frontend Angular
    │ POST /api/WhatsApp/agendar
    │ Body: { NumeroOrigen, NumeroDestino, Mensage, ... }
    ▼
WhatsAppController → ColaService.AgendarMensaje()
    ├─ Validar NumeroOrigen.Length == 11
    ├─ Validar NumeroDestino.Length == 11
    ├─ Validar NumeroDestino[2] == '9'
    ├─ Validar adjunto completo si AdjuntoBase64 presente
    ├─ INSERT T_MensajeCola (estado: Pendiente=1, UsuarioCreacion="webapp")
    └─ Llama EnviarMensaje(id) inmediatamente
         │
         ▼
ColaService.EnviarMensaje(id)
    ├─ Solo si estado == Pendiente(1) o Error(3)
    ├─ WaQrService.ObtenerNumero() → GET dev.wsp.crm.*/get-active-number
    │   └─ Valida que NumeroRemitente == número activo
    ├─ Selecciona método de envío:
    │   ├─ UrlArchivo → WaQrService.EnviarMensajeMultimediaUrl()
    │   │   └─ POST dev.wsp.crm.*/send-multimedia-url-message
    │   ├─ AdjuntoBase64 → WaQrService.EnviarMensajeMultimediaPayload()
    │   │   └─ POST dev.wsp.crm.*/send-multimedia-message
    │   └─ Solo texto → WaQrService.EnviarMensajeTexto()
    │       └─ POST dev.wsp.crm.*/send-text-message
    │
    ├─ Si éxito (WARespuestaDTO.Estado == true):
    │   ├─ UPDATE T_MensajeCola: IdMensajeColaEstado=Enviado(2), WhatsAppId, FechaEnvio=now
    │   └─ NotificacionChatService → SignalR hub-chat → "NotificarNuevoMensajeGeneral"
    │
    └─ Si error (WARespuestaDTO.Estado == false):
        └─ UPDATE T_MensajeCola: IdMensajeColaEstado=Error(3), Error=descripcion
```

### 8.3 Flujo de inicialización QR

```
Operador / Frontend Angular
    │ POST /api/WhatsApp/iniciar-cliente
    ▼
ColaService.IniciarCliente()
    └─ WaQrService.IniciarCliente()
        └─ GET dev.wsp.crm.*/client-initialize?phoneNumber=
             │
             ▼
CRM.WhatsappChatNode — GET /client-initialize
    └─ new ClientWA(phoneNumber) → new Client({ LocalAuth('sesiones') })
         │
         ▼
         ¿Hay sesión en disco?
         ├─ SÍ → reconecta automáticamente
         │   └─ evento 'authenticated' → 'ready' → POST recepcionar-numero
         └─ NO → genera QR
             │
             ▼
         evento 'qr'
             ├─ Muestra QR en terminal (qrcode-terminal)
             └─ POST URL_APP_Cola/api/RecepcionWa/recepcionar-qr { qrCode }
                  │
                  ▼
             WaQrRecepcionService.RecepcionarQr()
                  ├─ QRCoder: genera imagen PNG en Base64
                  └─ NotificacionQRService → SignalR hub-qr → "NotificarQr"
                       │ { CodigoQr, Payload: base64_png }
                       ▼
                  Frontend Angular muestra QR en pantalla
                       │
                       │ Operador escanea QR con teléfono de la clínica
                       ▼
                  evento 'authenticated' → estaActivo=true
                  evento 'ready' → extrae numero = client.info.wid.user
                       │
                       └─ POST URL_APP_Cola/api/RecepcionWa/recepcionar-numero { numeroDesde }
                            │
                            ▼
                       WaQrRecepcionService.RecepcionarNumero()
                            └─ NotificacionQRService → SignalR hub-qr → "NotificarNumero"
                                 │ { NumeroCuenta, Payload }
                                 ▼
                            Frontend muestra número autenticado ✅
```

---

## 9. Servicios Externos — Integración

| Servicio | URL | Auth | Uso |
|---|---|---|---|
| **CRM.WhatsappChatNode** | `https://dev.wsp.crm.clinicacayetanoheredia.com` | Sin auth | Envío de mensajes, estado del cliente |
| **CRM Externo** | `https://api.crm.clinicacayetanoheredia.com` | JWT hardcodeado (expira 3104) | Notificación de mensajes entrantes/edición/eliminación |
| **SignalR Hub QR** | `https://dev.sr.crm.clinicacayetanoheredia.com/hub-qr` | Sin auth | Push de QR y número al frontend |
| **SignalR Hub Chat** | `https://dev.sr.crm.clinicacayetanoheredia.com/hub-chat` | Sin auth | Push de nuevos mensajes al frontend |
| **wa-version CDN** | `raw.githubusercontent.com/wppconnect-team/wa-version` | Sin auth | Versión HTML de WhatsApp Web (2.2412.54) |

---

## 10. Variables de Entorno y Configuración

### CRM.WhatsappChatNode (`.env`)
```env
URL_APP_Cola = 'https://api-notificacion.crm.ingenius.online'
APP_PORT = 3000
```

### CRM.WhatsappCola (`appsettings.json`)
```json
{
  "ConnectionStrings": {
    "sqlConnection": "Server=(local);Initial Catalog=WA_Cola;User ID=usuario_cola;Password=...;TrustServerCertificate=True;"
  },
  "JWTAuthentication": {
    "Secret":             "<256-char hex key>",
    "ExpirationMinutes":  "1440",
    "Issuer":             "https://*.api-notificacion.crm.ingenius.online",
    "Audience":           "https://*.api-notificacion.crm.ingenius.online"
  }
}
```

### CORS permitidos (CRM.WhatsappCola `Program.cs`)
```
http://localhost:4200
http://localhost:3000
https://dev.ui.crm.clinicacayetanoheredia.com
https://uat.ui.crm.clinicacayetanoheredia.com
```

### Endpoints por ambiente

| Ambiente | CRM.WhatsappChatNode | CRM.WhatsappCola |
|---|---|---|
| **DEV** | Puerto 3002 | localhost dev |
| **UAT** | Puerto 3001 | uat endpoints |
| **Producción** | Puerto 3000 / `dev.wsp.crm.*` | `api-notificacion.crm.ingenius.online` |

---

## 11. Docker y Despliegue

### CRM.WhatsappChatNode `docker-compose.yml`
```yaml
version: '3.8'
services:
  api:
    build: .
    container_name: api_waqr
    restart: always        # Auto-reinicio en fallos
    networks:
      - backend_wa
    ports:
      - "3000:3000"
    volumes:
      - ./sesiones:/usr/src/app/sesiones  # Sesión WhatsApp persistente (CRÍTICO)
      - .env:/usr/src/app/.env
networks:
  backend_wa:
    driver: bridge
```

### Dockerfile (CRM.WhatsappChatNode)
1. `FROM node:latest`
2. Instala `google-chrome-stable` y todas sus dependencias del sistema
3. Crea directorio `/usr/src/app/sesiones`
4. `npm install`
5. `EXPOSE 3000`
6. `CMD ["npm", "start"]` → `node src/server.js`

**Importante sobre el volumen `sesiones/`:**
Contiene los datos de Chrome con la sesión autenticada de WhatsApp Web. Si se elimina, se requiere escanear el QR de nuevo. En producción debe persistir entre actualizaciones del contenedor.

---

## 12. Seguridad y Autenticación

### JWT en CRM.WhatsappCola
- Algoritmo: HS256 (`System.IdentityModel.Tokens.Jwt`)
- Expiración: 1440 min (24h), configurable en `appsettings.json`
- Claims: `idUsuario`, `nombreUsuario`, `nombres`, `apellidoPaterno`, `apellidoMaterno`, `fechaExpiracion`
- No hay `[Authorize]` explícito en el código visible, pero `app.UseAuthorization()` está activo en `Program.cs`

### Contraseñas
- Hash: **BCrypt.Net-Next** (factor de costo 10 por defecto)
- `BCrypt.HashPassword(password)` al crear, `BCrypt.Verify(input, hash)` al validar

### Vulnerabilidades conocidas y compromisos

| Punto | Situación | Riesgo |
|---|---|---|
| SSL CRM.WhatsappChatNode | `rejectUnauthorized: false` (axios) | Man-in-the-middle en red interna |
| SSL NotificacionCrmService | `ServerCertificateValidationCallback = true` | Igual |
| SSL NotificacionQRService / ChatService | `ServerCertificateCustomValidationCallback = true` | Igual |
| JWT hardcodeado en NotificacionCrmService | Token en código fuente | Si el repo es público, token comprometido. Expira año 3104 |
| CORS CRM.WhatsappChatNode | `app.use(cors())` — acepta cualquier origen | Aceptable si solo es accesible internamente |
| clientId fijo `'client-local'` | Una sola sesión de WhatsApp por instancia Node.js | Limitación de diseño: para múltiples números se necesitan múltiples contenedores |

### Dependencias con mantenimiento activo

| Librería | Mantenedor | Estado |
|---|---|---|
| `whatsapp-web.js` | pedroslopez (con comunidad) | Activo |
| `puppeteer` | Google | Activo |
| `ASP.NET Core 8` | Microsoft | Activo (LTS) |
| `Entity Framework Core` | Microsoft | Activo |
| `BCrypt.Net-Next` | BcryptNet | Activo |
| `QRCoder` | manuelbl | Activo |
| `SignalR Client` | Microsoft | Activo |

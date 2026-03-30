# Guía del Sistema WhatsApp CRM
## Para personas que no son programadores

> Esta guía explica de forma sencilla cómo funciona el sistema que permite a la clínica enviar y recibir mensajes de WhatsApp automáticamente.

---

## ¿Qué hace este sistema?

Imagina que eres recepcionista en la clínica. Normalmente tendrías que tomar tu teléfono, abrir WhatsApp, buscar al paciente y escribirle un mensaje a mano. Con este sistema, todo eso lo hace la computadora automáticamente.

El sistema puede:

- **Recibir mensajes** que los pacientes mandan por WhatsApp a la clínica
- **Enviar mensajes** (texto, imágenes, documentos, audios) a los pacientes
- **Guardar el historial** de todas las conversaciones
- **Notificar** al sistema principal del CRM cuando llega un mensaje nuevo

---

## Las tres partes del sistema

Piensa en el sistema como una empresa de correos con tres departamentos:

```
┌─────────────────────────────────────────────────────────┐
│  PARTE 1: El TELÉFONO VIRTUAL                           │
│  (CRM.WhatsappChatNode)                                 │
│                                                          │
│  Es como tener un teléfono en la computadora que está   │
│  siempre conectado a WhatsApp. Recibe y envía mensajes. │
└──────────────────────┬──────────────────────────────────┘
                       │ Comunica todo lo que pasa
                       ▼
┌─────────────────────────────────────────────────────────┐
│  PARTE 2: El CEREBRO / ARCHIVO CENTRAL                  │
│  (CRM.WhatsappCola)                                     │
│                                                          │
│  Es como una secretaria muy organizada. Recibe los      │
│  mensajes del teléfono virtual, los guarda, los         │
│  organiza y avisa al sistema del hospital.              │
└──────────────────────┬──────────────────────────────────┘
                       │ Guarda todo en...
                       ▼
┌─────────────────────────────────────────────────────────┐
│  PARTE 3: El ARCHIVO / BASE DE DATOS                    │
│  (Base de datos PostgreSQL/SQL Server)                  │
│                                                          │
│  Es como un archivero enorme donde se guardan todos     │
│  los mensajes, conversaciones y datos de los pacientes. │
└─────────────────────────────────────────────────────────┘
```

---

## ¿Cómo se conecta el teléfono virtual?

La primera vez que se usa el sistema, hay que "vincular" el teléfono de la clínica con la computadora. Funciona igual que cuando vinculas WhatsApp Web en tu navegador:

```
PASO 1: El sistema genera un código QR en la pantalla
        ┌─────────────┐
        │ ▓▓ ░░ ▓▓ ░░ │
        │ ░░ ▓▓ ░░ ▓▓ │  ← Código QR
        │ ▓▓ ░░ ▓▓ ░░ │
        └─────────────┘

PASO 2: Un operador toma el teléfono de la clínica,
        abre WhatsApp → Dispositivos vinculados → Vincular
        y escanea el código QR

PASO 3: ¡Listo! El sistema queda conectado.
        A partir de ahí funciona solo, sin necesidad
        de tocar el teléfono.
```

> **Dato importante:** Una vez vinculado, el sistema recuerda la conexión. Si se reinicia la computadora, se vuelve a conectar solo sin pedir QR nuevamente.

---

## ¿Cómo llega un mensaje de un paciente?

```
        PACIENTE                          CLÍNICA
           │                                 │
           │  Escribe en WhatsApp:           │
           │  "Hola, quiero una cita"        │
           │                                 │
           ▼                                 │
    📱 WhatsApp del paciente                 │
           │                                 │
           │ (viaja por internet)            │
           ▼                                 │
    💻 Teléfono Virtual (Computadora)        │
           │                                 │
           │ El sistema lo detecta           │
           │ automáticamente                 │
           │                                 │
           ▼                                 │
    📋 Cerebro/Archivo Central               │
           │                                 │
           │ Guarda el mensaje               │
           │ en la base de datos             │
           │                                 │
           ▼                                 │
    🏥 Sistema del Hospital (CRM)            │
           │                                 │
           └─────────────────────────────────►
                    Notifica que llegó
                    un mensaje nuevo
```

**En resumen:** El paciente manda un WhatsApp → la computadora lo recibe → lo guarda → avisa al sistema del hospital → el personal puede responder.

---

## ¿Cómo envía un mensaje la clínica?

```
    PERSONAL DE CLÍNICA             PACIENTE
           │                           │
           │ En el sistema del         │
           │ hospital hace clic        │
           │ en "Enviar mensaje"       │
           │                           │
           ▼                           │
    🏥 Sistema del Hospital (CRM)      │
           │                           │
           │ Le dice al Cerebro:       │
           │ "Envía esto al paciente"  │
           │                           │
           ▼                           │
    📋 Cerebro/Archivo Central         │
           │                           │
           │ Anota la tarea            │
           │ (la pone en "cola")       │
           │                           │
           ▼                           │
    💻 Teléfono Virtual (Computadora)  │
           │                           │
           │ Envía el mensaje          │
           │ por WhatsApp              │
           │                           │
           └──────────────────────────►│
                                  📱 Llega al
                                  paciente
```

---

## Tipos de mensajes que puede enviar el sistema

| Tipo | Ejemplo |
|------|---------|
| ✉️ **Texto** | "Su cita es mañana a las 10am" |
| 🖼️ **Imagen** | Foto de resultados de laboratorio |
| 📄 **Documento** | PDF de indicaciones médicas |
| 🎵 **Audio** | Mensaje de voz grabado |
| 🎬 **Video** | Video informativo |
| 📎 **Cualquier archivo** | Desde un enlace de internet |

---

## El "archivero" de datos (Base de Datos)

El sistema guarda todo en carpetas organizadas (tablas). Las principales son:

### Conversaciones
Registra qué número del hospital habló con qué número de paciente.
```
Ejemplo:
  Hospital (51900000000) ↔ Paciente Juan (51987654321)
  Hospital (51900000000) ↔ Paciente María (51912345678)
```

### Mensajes Enviados (Cola de mensajes)
Lista de todos los mensajes que el hospital envió, con su estado:
```
  ⏳ Pendiente   → Todavía no se ha enviado
  🔄 Procesando  → Se está enviando ahora mismo
  ✅ Enviado     → El paciente lo recibió
  ❌ Error       → Algo falló al enviar
```

### Mensajes Recibidos
Lista de todos los mensajes que los pacientes enviaron al hospital:
```
  - Quién lo envió
  - Cuándo lo envió
  - El texto del mensaje
  - Si tenía foto, audio u otro archivo adjunto
  - Si el paciente lo borró después
```

### Usuarios del sistema
Las personas que pueden ingresar al sistema con usuario y contraseña.

---

## ¿Qué pasa si el paciente edita o borra un mensaje?

El sistema también detecta eso:

- **Si el paciente edita su mensaje:** El sistema guarda tanto el mensaje original como el nuevo.
- **Si el paciente borra el mensaje "para todos":** El sistema lo marca como eliminado pero conserva el registro.

---

## Situaciones especiales

### ¿Y si se va la luz o se reinicia la computadora?
El sistema está configurado para **reiniciarse solo** (con Docker, que es como una cajita que mantiene el programa en funcionamiento). Cuando vuelve la energía, se reconecta automáticamente a WhatsApp sin necesidad de escanear el QR de nuevo.

### ¿Y si falla un envío?
Si un mensaje no se puede enviar, el sistema lo marca como "Error" y guarda la descripción del problema. Así el equipo técnico puede revisarlo.

### ¿Cuántos números de WhatsApp puede manejar el sistema?
En su configuración actual, **una instancia del Teléfono Virtual maneja un solo número de WhatsApp** de la clínica. Si se necesita manejar varios números, se pueden instalar varias instancias del Teléfono Virtual.

---

## Flujo completo de una consulta típica

Imagina este escenario: El hospital quiere recordarle a Juan su cita de mañana.

```
  DÍA A DÍA - EJEMPLO PRÁCTICO
  ════════════════════════════

  09:00 AM — La secretaria genera un recordatorio
              desde el sistema del hospital (CRM)
              "Estimado Juan, le recordamos su cita
               mañana 28/03 a las 10am"

  09:00:01 — El Cerebro (CRM.WhatsappCola) recibe
              la orden y la anota como "Pendiente"

  09:00:02 — El Teléfono Virtual recibe la orden
              y lo envía por WhatsApp a Juan

  09:00:03 — WhatsApp de Juan recibe el mensaje ✅
              El sistema lo marca como "Enviado"
              y guarda el código de confirmación de WhatsApp

  09:05 AM — Juan responde: "Confirmado, gracias"

  09:05:01 — El Teléfono Virtual detecta la respuesta

  09:05:02 — El Cerebro la guarda en la base de datos
              y notifica al sistema del hospital

  09:05:03 — La secretaria ve en su pantalla
              que Juan confirmó su cita ✅
```

---

## Glosario (palabras que quizás no conocías)

| Término | Qué significa en términos simples |
|---------|-----------------------------------|
| **API** | Una "ventanilla" por donde dos programas se comunican |
| **Base de datos** | Un archivero digital muy organizado |
| **QR Code** | El cuadrito con puntitos que se escanea con el teléfono |
| **Cola de mensajes** | Lista de mensajes esperando ser enviados, en orden |
| **Docker** | Una "caja" que mantiene el programa funcionando |
| **JWT (Token)** | Como una tarjeta de acceso temporal para entrar al sistema |
| **Webhook** | Un aviso automático que manda un programa a otro |
| **Base64** | Forma de convertir archivos (fotos, PDFs) en texto para transmitirlos |
| **MIME type** | La "etiqueta" que dice qué tipo de archivo es (imagen, PDF, audio...) |
| **BCrypt** | Forma segura de guardar contraseñas sin que nadie pueda leerlas |
| **CRM** | Sistema de gestión de la clínica (pacientes, citas, etc.) |
| **Puppeteer** | Programa que controla Chrome automáticamente, como un robot |
| **LocalAuth** | Estrategia para guardar la sesión de WhatsApp en el disco duro |

---

## Resumen en una sola imagen

```
  📱 PACIENTE                    🏥 CLÍNICA
     │                               │
     │ "Hola, necesito una cita"     │
     └──────►[TELÉFONO VIRTUAL]      │
             [Computadora]           │
                  │                  │
                  └──►[CEREBRO]──────►[Sistema Hospital]
                      [Guarda todo]   [Ve el mensaje]
                          │
                          └──►[ARCHIVERO]
                              [BD de datos]

  ════════════════════════════════════

  🏥 CLÍNICA                    📱 PACIENTE
     │                               │
     │ "Su cita es mañana..."        │
     [Sistema Hospital]              │
          │                          │
          └──►[CEREBRO]──►[TELÉFONO VIRTUAL]
              [Organiza]  [Computadora]
                               │
                               └──────► "Su cita es mañana..."
```

---

*Este documento fue generado automáticamente a partir del análisis del código fuente del proyecto CRM WhatsApp Integration.*
*Fecha: 27 de marzo de 2026*

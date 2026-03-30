# Guía de Instalación y Ejecución — CRM WhatsApp

## Prerequisitos

| Requisito | Versión mínima | Verificar con |
|-----------|---------------|---------------|
| SQL Server | 2019+ | `SELECT @@VERSION` en SSMS |
| .NET SDK | 8.0+ | `dotnet --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |

---

## Estructura del proyecto

```
CMR/
├── CRM.WhatsappChatNode/     ← Gateway WhatsApp (Node.js) — puerto 3000
├── CRM.WhatsappCola/         ← API backend (C# .NET 8)   — puerto 5216
│   └── SQL/
│       └── 00_Database_Completo.sql   ← SCRIPT ÚNICO de base de datos
└── CRM.Frontend/             ← UI (React + Vite)          — puerto 3001
```

---

## PASO 1 — Base de datos

El archivo `CRM.WhatsappCola\SQL\00_Database_Completo.sql` contiene **dos secciones**:
- **SECCIÓN 1** → SQL Server (T-SQL)
- **SECCIÓN 2** → PostgreSQL

Ejecuta **solo la sección de tu motor**.

---

### Opción A — SQL Server (recomendado por defecto)

1. Abrir **SQL Server Management Studio (SSMS)**
2. Conectarse al servidor `DESKTOP-A9M07LO` con usuario `sa` / contraseña `123`
3. Abrir `CRM.WhatsappCola\SQL\00_Database_Completo.sql`
4. Seleccionar y ejecutar **únicamente la SECCIÓN 1** (desde `USE master;` hasta `Script SQL Server completado`)
5. Al final debe mostrar un listado de tablas y datos seed

El `appsettings.json` ya está configurado para SQL Server:
```json
"DatabaseProvider": "SqlServer",
"ConnectionStrings": {
  "SqlServer": "Server=DESKTOP-A9M07LO;Initial Catalog=WA_Cola;User ID=sa;Password=123;..."
}
```

---

### Opción B — PostgreSQL

1. Crear la base de datos:
   ```sql
   -- Conectado a 'postgres':
   CREATE DATABASE wa_cola;
   ```
2. Conectarse a `wa_cola` y ejecutar **únicamente la SECCIÓN 2** del script
3. Cambiar `appsettings.json`:
   ```json
   "DatabaseProvider": "PostgreSQL",
   "ConnectionStrings": {
     "PostgreSQL": "Host=localhost;Port=5432;Database=wa_cola;Username=postgres;Password=postgres;"
   }
   ```

---

### Cambiar de motor en cualquier momento

Solo modifica la clave `DatabaseProvider` en `appsettings.json`:
```json
"DatabaseProvider": "SqlServer"    ← usa SQL Server
"DatabaseProvider": "PostgreSQL"   ← usa PostgreSQL
```
El backend detecta el valor al arrancar y usa el proveedor correspondiente.

---

## PASO 2 — Backend API (CRM.WhatsappCola)

### 2.1 Compilar y ejecutar

```bash
cd CRM.WhatsappCola\CRM.WhatsappCola
dotnet run
```

Debe mostrar:
```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5216
```

### 2.2 Verificar que funciona

- Swagger UI: http://localhost:5216/api-documentacion
- Login de prueba en Swagger: `POST /api/Autenticacion/Login`
  ```json
  { "usuario": "admin", "clave": "Admin123!" }
  ```
  Debe devolver un token JWT.

---

## PASO 3 — Gateway WhatsApp (CRM.WhatsappChatNode)

### 3.1 Instalar dependencias (primera vez)

```bash
cd CRM.WhatsappChatNode
npm install
```

### 3.2 Verificar el .env

El archivo `.env` ya está configurado para apuntar al backend local:
```
URL_APP_Cola = 'http://localhost:5216'
APP_PORT = 3000
```

### 3.3 Ejecutar

```bash
npm start
```

Debe mostrar:
```
Server running on port 3000
```

---

## PASO 4 — Frontend React (CRM.Frontend)

### 4.1 Instalar dependencias (primera vez)

```bash
cd CRM.Frontend
npm install
```

### 4.2 Ejecutar en modo desarrollo

```bash
npm run dev
```

Debe mostrar:
```
  VITE v5.x  ready in xxx ms
  ➜  Local:   http://localhost:3001/
```

---

## PASO 5 — Primer inicio de sesión

1. Abrir http://localhost:3001
2. Iniciar sesión con:
   - **Usuario:** `admin`
   - **Contraseña:** `Admin123!`

---

## PASO 6 — Conectar WhatsApp

1. Ir a **Configuración** (ícono engranaje en el menú)
2. Tab **WhatsApp**
3. Clic en **Conectar**
4. Esperar que aparezca el código QR (puede tardar 10-15 segundos)
5. Escanear con tu teléfono desde **WhatsApp → Dispositivos vinculados → Vincular dispositivo**
6. El estado cambiará a **Conectado** y mostrará el número activo

---

## Orden de inicio (siempre)

Cada vez que vayas a usar el sistema, iniciar en este orden:

```
1. SQL Server  →  debe estar corriendo (servicio de Windows)
2. CRM.WhatsappCola   →  dotnet run
3. CRM.WhatsappChatNode  →  npm start
4. CRM.Frontend  →  npm run dev
```

---

## Crear nuevos usuarios

Desde la UI: **Configuración → Usuarios → Nuevo usuario**

O directamente desde Swagger (`POST /api/Usuario/create`):
```json
{
  "nombres": "Juan",
  "apellidoPaterno": "Garcia",
  "apellidoMaterno": "Lopez",
  "nombreUsuario": "jgarcia",
  "clave": "MiClave123!",
  "usuarioResponsable": "admin"
}
```

Roles disponibles: `admin`, `supervisor`, `agente`

---

## Puertos en uso

| Servicio | Puerto | URL |
|----------|--------|-----|
| CRM.WhatsappChatNode | 3000 | http://localhost:3000 |
| CRM.WhatsappCola (API) | 5216 | http://localhost:5216 |
| CRM.WhatsappCola (Swagger) | 5216 | http://localhost:5216/api-documentacion |
| CRM.Frontend | 3001 | http://localhost:3001 |
| SQL Server | 1433 | (local) |

---

## Flujo de mensajes

```
Contacto escribe en WhatsApp
        ↓
CRM.WhatsappChatNode (puerto 3000)
  detecta el mensaje
        ↓  POST /api/RecepcionWa/recepcionar
CRM.WhatsappCola (puerto 5216)
  guarda en SQL Server
        ↓
CRM.Frontend (puerto 3001)
  muestra en Chat (polling cada 3s)
```

```
Agente escribe en CRM.Frontend
        ↓  POST /api/WhatsApp/agendar
CRM.WhatsappCola (puerto 5216)
  guarda en cola y llama al gateway
        ↓  POST /send-text-message
CRM.WhatsappChatNode (puerto 3000)
  envía el mensaje a WhatsApp
```

---

## Solución de problemas comunes

### "No se puede conectar a la base de datos"
- Verificar que SQL Server esté corriendo en Servicios de Windows
- Revisar la cadena de conexión en `appsettings.json`
- Probar: `sqlcmd -S (local) -Q "SELECT 1"`

### "ECONNREFUSED 127.0.0.1:5216" (frontend no conecta al API)
- Verificar que `dotnet run` esté activo en CRM.WhatsappCola
- Verificar que `vite.config.js` tenga `target: 'http://localhost:5216'`

### "El QR no aparece"
- Verificar que CRM.WhatsappChatNode esté corriendo (puerto 3000)
- Verificar que `URL_APP_Cola` en `.env` apunte a `http://localhost:5216`
- Revisar la consola de CRM.WhatsappChatNode por errores

### "Login falla con 401"
- El usuario `admin` se crea solo si la tabla T_Usuario estaba vacía
- Si ya había usuarios, usa las credenciales existentes
- Para resetear: en SSMS ejecutar:
  ```sql
  USE WA_Cola;
  UPDATE T_Usuario SET ClaveHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', Rol = 'admin'
  WHERE NombreUsuario = 'admin';
  ```
  Luego ingresar con `admin` / `Admin123!`

---

## Archivos SQL — cuál usar

| Archivo | Usar? | Descripción |
|---------|-------|-------------|
| `SQL/00_Database_Completo.sql` | ✅ **SÍ — ESTE ES EL ÚNICO** | Contiene SECCIÓN 1 (SQL Server) + SECCIÓN 2 (PostgreSQL) |
| `SQL/01_CRM_Tables.sql` | ❌ No | Versión parcial antigua, ya incluida en el anterior |
| `database_postgres.sql` | ❌ No | Referencia histórica de las tablas originales en PostgreSQL |

> **Resumen:** Abre `00_Database_Completo.sql` y ejecuta solo la sección de tu motor (SQL Server o PostgreSQL).

---

## ¿Puede el sistema usar PostgreSQL?

Sí. El backend soporta ambos motores. La selección se controla con `"DatabaseProvider"` en `appsettings.json`:

| Valor | Motor | Proveedor EF Core |
|-------|-------|------------------|
| `"SqlServer"` (defecto) | SQL Server 2019+ | `UseSqlServer` |
| `"PostgreSQL"` | PostgreSQL 13+ | `UseNpgsql` |

El paquete `Npgsql.EntityFrameworkCore.PostgreSQL` ya está incluido en el proyecto.

-- ============================================================
-- SCRIPT POSTGRESQL — WA_Cola
-- Sistema: CRM WhatsApp
-- Motor:   PostgreSQL 13+
-- Fecha:   2026-03-27
--
-- INSTRUCCIONES:
--   1. Conectado a 'postgres', crear la base de datos:
--        CREATE DATABASE wa_cola;
--   2. Conectarse a wa_cola:
--        \c wa_cola         (en psql)
--        o abrir wa_cola en pgAdmin
--   3. Ejecutar este script completo
--   4. Al final verás las tablas creadas y datos seed
--
-- Para activar PostgreSQL en el backend editar appsettings.json:
--   "DatabaseProvider": "PostgreSQL"
--   "ConnectionStrings": {
--     "PostgreSQL": "Host=localhost;Port=5432;Database=WA_Cola;Username=postgres;Password=123;Pooling=true;Connection Lifetime=0;"
--   }
-- ============================================================

-- ============================================================
-- PARTE 1: TABLAS ORIGINALES
-- ============================================================

CREATE TABLE IF NOT EXISTS "T_MensajeColaEstado" (
    "Id"                   SERIAL        PRIMARY KEY,
    "Nombre"               VARCHAR(50)   NOT NULL,
    "Estado"               BOOLEAN       NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"      VARCHAR(50)   NOT NULL,
    "UsuarioModificacion"  VARCHAR(50)   NOT NULL,
    "FechaCreacion"        TIMESTAMP     NOT NULL DEFAULT NOW(),
    "FechaModificacion"    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "T_MensajeEntranteEstado" (
    "Id"                   SERIAL        PRIMARY KEY,
    "Nombre"               VARCHAR(50)   NOT NULL,
    "Estado"               BOOLEAN       NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"      VARCHAR(50)   NOT NULL,
    "UsuarioModificacion"  VARCHAR(50)   NOT NULL,
    "FechaCreacion"        TIMESTAMP     NOT NULL DEFAULT NOW(),
    "FechaModificacion"    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "T_TipoMensaje" (
    "Id"                   SERIAL        PRIMARY KEY,
    "Nombre"               VARCHAR(50)   NOT NULL,
    "Estado"               BOOLEAN       NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"      VARCHAR(50)   NOT NULL,
    "UsuarioModificacion"  VARCHAR(50)   NOT NULL,
    "FechaCreacion"        TIMESTAMP     NOT NULL DEFAULT NOW(),
    "FechaModificacion"    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "T_Usuario" (
    "Id"                   SERIAL        PRIMARY KEY,
    "Nombres"              VARCHAR(128)  NOT NULL,
    "ApellidoPaterno"      VARCHAR(128)  NOT NULL,
    "ApellidoMaterno"      VARCHAR(128)  NOT NULL,
    "NombreUsuario"        VARCHAR(50)   NOT NULL,
    "ClaveHash"            VARCHAR(512)  NOT NULL,
    "Rol"                  VARCHAR(20)   NOT NULL DEFAULT 'agente',
    "Estado"               BOOLEAN       NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"      VARCHAR(50)   NOT NULL,
    "UsuarioModificacion"  VARCHAR(50)   NOT NULL,
    "FechaCreacion"        TIMESTAMP     NOT NULL DEFAULT NOW(),
    "FechaModificacion"    TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT "UC_T_Usuario_NombreUsuario" UNIQUE ("NombreUsuario")
);

CREATE TABLE IF NOT EXISTS "T_Conversacion" (
    "Id"                   SERIAL        PRIMARY KEY,
    "NumeroCuenta"         VARCHAR(50)   NOT NULL,
    "NumeroCliente"        VARCHAR(50)   NOT NULL,
    "Estado"               BOOLEAN       NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"      VARCHAR(50)   NOT NULL,
    "UsuarioModificacion"  VARCHAR(50)   NOT NULL,
    "FechaCreacion"        TIMESTAMP     NOT NULL DEFAULT NOW(),
    "FechaModificacion"    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "T_MensajeCola" (
    "Id"                   SERIAL        PRIMARY KEY,
    "IdMensajeColaEstado"  INTEGER       NOT NULL REFERENCES "T_MensajeColaEstado"("Id"),
    "NumeroRemitente"      VARCHAR(50)   NOT NULL,
    "NumeroDestino"        VARCHAR(50)   NOT NULL,
    "Mensaje"              TEXT          NULL,
    "AdjuntoBase64"        TEXT          NULL,
    "NombreArchivo"        VARCHAR(1024) NULL,
    "MimeType"             VARCHAR(255)  NULL,
    "NroByte"              INTEGER       NULL,
    "UrlArchivo"           TEXT          NULL,
    "Estado"               BOOLEAN       NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"      VARCHAR(50)   NOT NULL,
    "UsuarioModificacion"  VARCHAR(50)   NOT NULL,
    "FechaCreacion"        TIMESTAMP     NOT NULL DEFAULT NOW(),
    "FechaModificacion"    TIMESTAMP     NOT NULL DEFAULT NOW(),
    "Error"                TEXT          NULL,
    "FechaEnvio"           TIMESTAMP     NULL,
    "WhatsAppId"           VARCHAR(50)   NULL,
    "AckEstado"            INTEGER       NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "T_MensajeEntrante" (
    "Id"                          SERIAL        PRIMARY KEY,
    "IdMensajeEntranteEstado"     INTEGER       NOT NULL REFERENCES "T_MensajeEntranteEstado"("Id"),
    "NumeroCuenta"                VARCHAR(50)   NOT NULL,
    "NumeroCliente"               VARCHAR(50)   NOT NULL,
    "WhatsAppTipo"                VARCHAR(50)   NULL,
    "WhatsAppId"                  VARCHAR(50)   NULL,
    "FechaEnvio"                  TIMESTAMP     NOT NULL,
    "Mensaje"                     TEXT          NULL,
    "TieneAdjunto"                BOOLEAN       NULL,
    "AdjuntoBase64"               TEXT          NULL,
    "NombreArchivo"               VARCHAR(1024) NULL,
    "MimeType"                    VARCHAR(50)   NULL,
    "NroByte"                     INTEGER       NULL,
    "UrlArchivo"                  TEXT          NULL,
    "Estado"                      BOOLEAN       NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"             VARCHAR(50)   NOT NULL,
    "UsuarioModificacion"         VARCHAR(50)   NOT NULL,
    "FechaCreacion"               TIMESTAMP     NOT NULL DEFAULT NOW(),
    "FechaModificacion"           TIMESTAMP     NOT NULL DEFAULT NOW(),
    "WhatsAppIdPadre"             VARCHAR(50)   NULL,
    "IdMensajeEntrantePadre"      INTEGER       NULL,
    "IdMensajeColaPadre"          INTEGER       NULL,
    "FueEliminado"                BOOLEAN       NULL,
    "FechaRecepcionEliminacion"   TIMESTAMP     NULL,
    "EsErrorDescargaMultimedia"   BOOLEAN       NULL,
    "NombreContacto"              VARCHAR(256)  NULL
);

-- ============================================================
-- PARTE 2: TABLAS CRM
-- ============================================================

CREATE TABLE IF NOT EXISTS "T_Empresa" (
    "Id"                   SERIAL        PRIMARY KEY,
    "Nombre"               VARCHAR(256)  NOT NULL,
    "Ruc"                  VARCHAR(20)   NULL,
    "Sector"               VARCHAR(128)  NULL,
    "Tamano"               VARCHAR(50)   NULL,
    "Web"                  VARCHAR(256)  NULL,
    "Direccion"            VARCHAR(512)  NULL,
    "Logo"                 TEXT          NULL,
    "Notas"                TEXT          NULL,
    "Estado"               BOOLEAN       NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"      VARCHAR(50)   NOT NULL,
    "UsuarioModificacion"  VARCHAR(50)   NOT NULL,
    "FechaCreacion"        TIMESTAMP     NOT NULL DEFAULT NOW(),
    "FechaModificacion"    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "T_Contacto" (
    "Id"                   SERIAL        PRIMARY KEY,
    "Nombres"              VARCHAR(256)  NOT NULL,
    "Apellidos"            VARCHAR(256)  NULL,
    "NumeroWhatsApp"       VARCHAR(20)   NOT NULL,
    "Email"                VARCHAR(256)  NULL,
    "Cargo"                VARCHAR(128)  NULL,
    "IdEmpresa"            INTEGER       NULL REFERENCES "T_Empresa"("Id"),
    "Notas"                TEXT          NULL,
    "Estado"               BOOLEAN       NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"      VARCHAR(50)   NOT NULL,
    "UsuarioModificacion"  VARCHAR(50)   NOT NULL,
    "FechaCreacion"        TIMESTAMP     NOT NULL DEFAULT NOW(),
    "FechaModificacion"    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "T_Etiqueta" (
    "Id"                   SERIAL        PRIMARY KEY,
    "Nombre"               VARCHAR(100)  NOT NULL,
    "Color"                VARCHAR(20)   NOT NULL DEFAULT '#3B82F6',
    "Estado"               BOOLEAN       NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"      VARCHAR(50)   NOT NULL,
    "UsuarioModificacion"  VARCHAR(50)   NOT NULL,
    "FechaCreacion"        TIMESTAMP     NOT NULL DEFAULT NOW(),
    "FechaModificacion"    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "T_ContactoEtiqueta" (
    "Id"              SERIAL       PRIMARY KEY,
    "IdContacto"      INTEGER      NOT NULL REFERENCES "T_Contacto"("Id"),
    "IdEtiqueta"      INTEGER      NOT NULL REFERENCES "T_Etiqueta"("Id"),
    "Estado"          BOOLEAN      NOT NULL DEFAULT TRUE,
    "UsuarioCreacion" VARCHAR(50)  NOT NULL,
    "FechaCreacion"   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "T_ProductoCategoria" (
    "Id"                   SERIAL        PRIMARY KEY,
    "Nombre"               VARCHAR(128)  NOT NULL,
    "Color"                VARCHAR(20)   NOT NULL DEFAULT '#3B82F6',
    "Descripcion"          VARCHAR(512)  NULL,
    "Estado"               BOOLEAN       NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"      VARCHAR(50)   NOT NULL,
    "UsuarioModificacion"  VARCHAR(50)   NOT NULL,
    "FechaCreacion"        TIMESTAMP     NOT NULL DEFAULT NOW(),
    "FechaModificacion"    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "T_Producto" (
    "Id"                   SERIAL         PRIMARY KEY,
    "Nombre"               VARCHAR(256)   NOT NULL,
    "Codigo"               VARCHAR(50)    NULL,
    "Descripcion"          TEXT           NULL,
    "Precio"               DECIMAL(18,2)  NOT NULL DEFAULT 0,
    "Unidad"               VARCHAR(50)    NOT NULL DEFAULT 'unidad',
    "IdCategoria"          INTEGER        NULL REFERENCES "T_ProductoCategoria"("Id"),
    "Imagen"               TEXT           NULL,
    "Estado"               BOOLEAN        NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"      VARCHAR(50)    NOT NULL,
    "UsuarioModificacion"  VARCHAR(50)    NOT NULL,
    "FechaCreacion"        TIMESTAMP      NOT NULL DEFAULT NOW(),
    "FechaModificacion"    TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "T_PipelineEtapa" (
    "Id"                   SERIAL        PRIMARY KEY,
    "Nombre"               VARCHAR(128)  NOT NULL,
    "Orden"                INTEGER       NOT NULL,
    "Color"                VARCHAR(20)   NOT NULL DEFAULT '#3B82F6',
    "Descripcion"          VARCHAR(512)  NULL,
    "Estado"               BOOLEAN       NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"      VARCHAR(50)   NOT NULL,
    "UsuarioModificacion"  VARCHAR(50)   NOT NULL,
    "FechaCreacion"        TIMESTAMP     NOT NULL DEFAULT NOW(),
    "FechaModificacion"    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "T_Oportunidad" (
    "Id"                   SERIAL         PRIMARY KEY,
    "Titulo"               VARCHAR(256)   NOT NULL,
    "IdContacto"           INTEGER        NULL REFERENCES "T_Contacto"("Id"),
    "IdEmpresa"            INTEGER        NULL REFERENCES "T_Empresa"("Id"),
    "IdResponsable"        INTEGER        NULL REFERENCES "T_Usuario"("Id"),
    "IdEtapa"              INTEGER        NOT NULL REFERENCES "T_PipelineEtapa"("Id"),
    "MontoEstimado"        DECIMAL(18,2)  NOT NULL DEFAULT 0,
    "Moneda"               VARCHAR(10)    NOT NULL DEFAULT 'USD',
    "Probabilidad"         INTEGER        NOT NULL DEFAULT 50,
    "FechaCierre"          TIMESTAMP      NULL,
    "Origen"               VARCHAR(50)    NOT NULL DEFAULT 'whatsapp',
    "Prioridad"            VARCHAR(20)    NOT NULL DEFAULT 'media',
    "Notas"                TEXT           NULL,
    "Estado"               BOOLEAN        NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"      VARCHAR(50)    NOT NULL,
    "UsuarioModificacion"  VARCHAR(50)    NOT NULL,
    "FechaCreacion"        TIMESTAMP      NOT NULL DEFAULT NOW(),
    "FechaModificacion"    TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "T_OportunidadProducto" (
    "Id"              SERIAL         PRIMARY KEY,
    "IdOportunidad"   INTEGER        NOT NULL REFERENCES "T_Oportunidad"("Id"),
    "IdProducto"      INTEGER        NOT NULL REFERENCES "T_Producto"("Id"),
    "Cantidad"        DECIMAL(18,2)  NOT NULL DEFAULT 1,
    "PrecioUnitario"  DECIMAL(18,2)  NOT NULL DEFAULT 0,
    "Estado"          BOOLEAN        NOT NULL DEFAULT TRUE,
    "UsuarioCreacion" VARCHAR(50)    NOT NULL,
    "FechaCreacion"   TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "T_Actividad" (
    "Id"                   SERIAL        PRIMARY KEY,
    "Tipo"                 VARCHAR(50)   NOT NULL,
    "Titulo"               VARCHAR(256)  NOT NULL,
    "Descripcion"          TEXT          NULL,
    "FechaActividad"       TIMESTAMP     NULL,
    "EstadoActividad"      VARCHAR(20)   NOT NULL DEFAULT 'pendiente',
    "IdResponsable"        INTEGER       NULL REFERENCES "T_Usuario"("Id"),
    "IdContacto"           INTEGER       NULL REFERENCES "T_Contacto"("Id"),
    "IdEmpresa"            INTEGER       NULL REFERENCES "T_Empresa"("Id"),
    "IdOportunidad"        INTEGER       NULL REFERENCES "T_Oportunidad"("Id"),
    "Estado"               BOOLEAN       NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"      VARCHAR(50)   NOT NULL,
    "UsuarioModificacion"  VARCHAR(50)   NOT NULL,
    "FechaCreacion"        TIMESTAMP     NOT NULL DEFAULT NOW(),
    "FechaModificacion"    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "T_Plantilla" (
    "Id"                   SERIAL        PRIMARY KEY,
    "Nombre"               VARCHAR(256)  NOT NULL,
    "Categoria"            VARCHAR(100)  NOT NULL DEFAULT 'general',
    "Contenido"            TEXT          NOT NULL,
    "Variables"            TEXT          NULL,
    "Estado"               BOOLEAN       NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"      VARCHAR(50)   NOT NULL,
    "UsuarioModificacion"  VARCHAR(50)   NOT NULL,
    "FechaCreacion"        TIMESTAMP     NOT NULL DEFAULT NOW(),
    "FechaModificacion"    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "T_Campana" (
    "Id"                   SERIAL        PRIMARY KEY,
    "Nombre"               VARCHAR(256)  NOT NULL,
    "IdPlantilla"          INTEGER       NULL REFERENCES "T_Plantilla"("Id"),
    "Mensaje"              TEXT          NULL,
    "Tags"                 TEXT          NULL,
    "EstadoCampana"        VARCHAR(20)   NOT NULL DEFAULT 'borrador',
    "ProgramadaPara"       TIMESTAMP     NULL,
    "Total"                INTEGER       NOT NULL DEFAULT 0,
    "Enviados"             INTEGER       NOT NULL DEFAULT 0,
    "Fallidos"             INTEGER       NOT NULL DEFAULT 0,
    "Pendientes"           INTEGER       NOT NULL DEFAULT 0,
    "Estado"               BOOLEAN       NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"      VARCHAR(50)   NOT NULL,
    "UsuarioModificacion"  VARCHAR(50)   NOT NULL,
    "FechaCreacion"        TIMESTAMP     NOT NULL DEFAULT NOW(),
    "FechaModificacion"    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "T_CampanaContacto" (
    "Id"              SERIAL      PRIMARY KEY,
    "IdCampana"       INTEGER     NOT NULL REFERENCES "T_Campana"("Id"),
    "IdContacto"      INTEGER     NOT NULL REFERENCES "T_Contacto"("Id"),
    "Enviado"         BOOLEAN     NOT NULL DEFAULT FALSE,
    "ErrorEnvio"      TEXT        NULL,
    "FechaEnvio"      TIMESTAMP   NULL,
    "Estado"          BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS "T_Encuesta" (
    "Id"                   SERIAL        PRIMARY KEY,
    "Nombre"               VARCHAR(256)  NOT NULL,
    "Descripcion"          TEXT          NULL,
    "Categoria"            VARCHAR(100)  NOT NULL DEFAULT 'general',
    "Estado"               BOOLEAN       NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"      VARCHAR(50)   NOT NULL,
    "UsuarioModificacion"  VARCHAR(50)   NOT NULL,
    "FechaCreacion"        TIMESTAMP     NOT NULL DEFAULT NOW(),
    "FechaModificacion"    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "T_EncuestaPregunta" (
    "Id"                   SERIAL      PRIMARY KEY,
    "IdEncuesta"           INTEGER     NOT NULL REFERENCES "T_Encuesta"("Id"),
    "Orden"                INTEGER     NOT NULL DEFAULT 0,
    "Texto"                TEXT        NOT NULL,
    "Tipo"                 VARCHAR(50) NOT NULL,
    "Opciones"             TEXT        NULL,
    "Obligatorio"          BOOLEAN     NOT NULL DEFAULT TRUE,
    "CondicionPreguntaId"  INTEGER     NULL REFERENCES "T_EncuestaPregunta"("Id"),
    "CondicionRespuesta"   TEXT        NULL,
    "Estado"               BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS "T_EncuestaEnvio" (
    "Id"              SERIAL       PRIMARY KEY,
    "IdEncuesta"      INTEGER      NOT NULL REFERENCES "T_Encuesta"("Id"),
    "IdContacto"      INTEGER      NULL REFERENCES "T_Contacto"("Id"),
    "Token"           VARCHAR(100) NOT NULL,
    "EstadoEnvio"     VARCHAR(20)  NOT NULL DEFAULT 'pendiente',
    "FechaEnvio"      TIMESTAMP    NOT NULL DEFAULT NOW(),
    "FechaCompletado" TIMESTAMP    NULL,
    "Estado"          BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT "UQ_EncuestaEnvio_Token" UNIQUE ("Token")
);

CREATE TABLE IF NOT EXISTS "T_EncuestaRespuesta" (
    "Id"               SERIAL    PRIMARY KEY,
    "IdEncuestaEnvio"  INTEGER   NOT NULL REFERENCES "T_EncuestaEnvio"("Id"),
    "IdPregunta"       INTEGER   NOT NULL REFERENCES "T_EncuestaPregunta"("Id"),
    "Valor"            TEXT      NULL,
    "Estado"           BOOLEAN   NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS "T_ConfiguracionSistema" (
    "Id"                   SERIAL        PRIMARY KEY,
    "Clave"                VARCHAR(100)  NOT NULL,
    "Valor"                TEXT          NULL,
    "Tipo"                 VARCHAR(20)   NOT NULL DEFAULT 'string',
    "Descripcion"          VARCHAR(512)  NULL,
    "UsuarioModificacion"  VARCHAR(50)   NOT NULL,
    "FechaModificacion"    TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT "UQ_ConfiguracionSistema_Clave" UNIQUE ("Clave")
);

-- ============================================================
-- PARTE 3: SEED DATA
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "T_MensajeColaEstado") THEN
    INSERT INTO "T_MensajeColaEstado" ("Nombre","Estado","UsuarioCreacion","UsuarioModificacion","FechaCreacion","FechaModificacion") VALUES
      ('Pendiente', TRUE, 'sistema', 'sistema', NOW(), NOW()),
      ('Enviado',   TRUE, 'sistema', 'sistema', NOW(), NOW()),
      ('Error',     TRUE, 'sistema', 'sistema', NOW(), NOW());
    RAISE NOTICE 'Seed T_MensajeColaEstado insertado.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "T_MensajeEntranteEstado") THEN
    INSERT INTO "T_MensajeEntranteEstado" ("Nombre","Estado","UsuarioCreacion","UsuarioModificacion","FechaCreacion","FechaModificacion") VALUES
      ('Recibido', TRUE, 'sistema', 'sistema', NOW(), NOW());
    RAISE NOTICE 'Seed T_MensajeEntranteEstado insertado.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "T_TipoMensaje") THEN
    INSERT INTO "T_TipoMensaje" ("Nombre","Estado","UsuarioCreacion","UsuarioModificacion","FechaCreacion","FechaModificacion") VALUES
      ('chat',     TRUE, 'sistema', 'sistema', NOW(), NOW()),
      ('image',    TRUE, 'sistema', 'sistema', NOW(), NOW()),
      ('video',    TRUE, 'sistema', 'sistema', NOW(), NOW()),
      ('audio',    TRUE, 'sistema', 'sistema', NOW(), NOW()),
      ('ptt',      TRUE, 'sistema', 'sistema', NOW(), NOW()),
      ('document', TRUE, 'sistema', 'sistema', NOW(), NOW()),
      ('sticker',  TRUE, 'sistema', 'sistema', NOW(), NOW()),
      ('location', TRUE, 'sistema', 'sistema', NOW(), NOW()),
      ('revoked',  TRUE, 'sistema', 'sistema', NOW(), NOW());
    RAISE NOTICE 'Seed T_TipoMensaje insertado.';
  END IF;
END $$;

/* -- Contraseña: Admin123!
INSERT INTO "T_Usuario" ("Nombres","ApellidoPaterno","ApellidoMaterno","NombreUsuario","ClaveHash","Rol","Estado","UsuarioCreacion","UsuarioModificacion","FechaCreacion","FechaModificacion")
VALUES ('Administrador','Sistema','CRM','admin',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'admin', TRUE, 'sistema', 'sistema', NOW(), NOW())
ON CONFLICT ("NombreUsuario") DO NOTHING;
 */
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "T_PipelineEtapa") THEN
    INSERT INTO "T_PipelineEtapa" ("Nombre","Orden","Color","Estado","UsuarioCreacion","UsuarioModificacion","FechaCreacion","FechaModificacion") VALUES
      ('Prospecto',   1, '#8B5CF6', TRUE, 'sistema', 'sistema', NOW(), NOW()),
      ('Calificado',  2, '#3B82F6', TRUE, 'sistema', 'sistema', NOW(), NOW()),
      ('Propuesta',   3, '#F59E0B', TRUE, 'sistema', 'sistema', NOW(), NOW()),
      ('Negociacion', 4, '#EF4444', TRUE, 'sistema', 'sistema', NOW(), NOW()),
      ('Ganado',      5, '#10B981', TRUE, 'sistema', 'sistema', NOW(), NOW()),
      ('Perdido',     6, '#6B7280', TRUE, 'sistema', 'sistema', NOW(), NOW());
    RAISE NOTICE 'Seed T_PipelineEtapa insertado.';
  END IF;
END $$;

INSERT INTO "T_ConfiguracionSistema" ("Clave","Valor","Tipo","Descripcion","UsuarioModificacion","FechaModificacion") VALUES
  ('whatsapp_estado',       'desconectado',                                              'string', 'Estado conexion WhatsApp',    'sistema', NOW()),
  ('whatsapp_qr',           '',                                                          'string', 'QR WhatsApp en base64',       'sistema', NOW()),
  ('whatsapp_numero',       '',                                                          'string', 'Numero activo de WhatsApp',   'sistema', NOW()),
  ('empresa_nombre',        'Mi Empresa',                                                'string', 'Nombre de la empresa',        'sistema', NOW()),
  ('moneda_default',        'USD',                                                       'string', 'Moneda por defecto',          'sistema', NOW()),
  ('mensaje_bienvenida',    'Hola! Gracias por contactarnos. En que podemos ayudarte?',  'string', 'Mensaje de bienvenida',       'sistema', NOW()),
  ('mensaje_fuera_horario', 'Estamos fuera de horario. Te responderemos pronto.',        'string', 'Mensaje fuera de horario',    'sistema', NOW())
ON CONFLICT ("Clave") DO NOTHING;

-- ============================================================
-- PARTE 4: ACK, REACCIONES Y EVENTOS DE GRUPO
-- ============================================================

-- AckEstado en bases existentes (0=pendiente,1=enviado_servidor,2=entregado,3=leído,4=reproducido)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'T_MensajeCola' AND column_name = 'AckEstado'
    ) THEN
        ALTER TABLE "T_MensajeCola" ADD COLUMN "AckEstado" INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Columna AckEstado agregada a T_MensajeCola.';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "T_MensajeReaccion" (
    "Id"            SERIAL        NOT NULL CONSTRAINT "PK_T_MensajeReaccion" PRIMARY KEY,
    "WhatsAppId"    VARCHAR(50)   NOT NULL,
    "Emoji"         VARCHAR(10)   NOT NULL,
    "SenderId"      VARCHAR(50)   NOT NULL,
    "FechaReaccion" TIMESTAMP     NOT NULL,
    "Estado"        BOOLEAN       NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS "T_GrupoEvento" (
    "Id"          SERIAL        NOT NULL CONSTRAINT "PK_T_GrupoEvento" PRIMARY KEY,
    "ChatId"      VARCHAR(50)   NOT NULL,
    "Tipo"        VARCHAR(30)   NOT NULL,
    "Author"      VARCHAR(50)   NOT NULL,
    "Recipients"  TEXT          NULL,
    "FechaEvento" TIMESTAMP     NOT NULL,
    "Estado"      BOOLEAN       NOT NULL DEFAULT TRUE
);

-- MimeType VARCHAR(255) en bases existentes (era VARCHAR(50), insuficiente para MIME types de Office como .docx/.xlsx)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'T_MensajeCola' AND column_name = 'MimeType'
          AND character_maximum_length < 255
    ) THEN
        ALTER TABLE "T_MensajeCola" ALTER COLUMN "MimeType" TYPE VARCHAR(255);
        RAISE NOTICE 'Columna MimeType en T_MensajeCola ampliada a VARCHAR(255).';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'T_MensajeEntrante' AND column_name = 'MimeType'
          AND character_maximum_length < 255
    ) THEN
        ALTER TABLE "T_MensajeEntrante" ALTER COLUMN "MimeType" TYPE VARCHAR(255);
        RAISE NOTICE 'Columna MimeType en T_MensajeEntrante ampliada a VARCHAR(255).';
    END IF;
END $$;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT table_name AS "Tabla", COUNT(column_name) AS "Columnas"
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name LIKE 'T_%'
GROUP BY table_name
ORDER BY table_name;

SELECT 'T_MensajeColaEstado'    AS "Tabla", COUNT(*) AS "Registros" FROM "T_MensajeColaEstado"    UNION ALL
SELECT 'T_MensajeEntranteEstado',            COUNT(*) FROM "T_MensajeEntranteEstado"              UNION ALL
SELECT 'T_TipoMensaje',                      COUNT(*) FROM "T_TipoMensaje"                        UNION ALL
SELECT 'T_Usuario',                          COUNT(*) FROM "T_Usuario"                            UNION ALL
SELECT 'T_PipelineEtapa',                    COUNT(*) FROM "T_PipelineEtapa"                      UNION ALL
SELECT 'T_ConfiguracionSistema',             COUNT(*) FROM "T_ConfiguracionSistema";

-- Script completado. Base de datos wa_cola (PostgreSQL) lista.

-- =============================================
-- Configuración de Proveedor WhatsApp
-- =============================================
INSERT INTO "T_ConfiguracionSistema" ("Clave","Valor","Tipo","Descripcion","UsuarioModificacion","FechaModificacion")
SELECT 'whatsapp_proveedor','wwebjs','string','Proveedor activo de WhatsApp: wwebjs | baileys','sistema',NOW()
WHERE NOT EXISTS (SELECT 1 FROM "T_ConfiguracionSistema" WHERE "Clave" = 'whatsapp_proveedor');

INSERT INTO "T_ConfiguracionSistema" ("Clave","Valor","Tipo","Descripcion","UsuarioModificacion","FechaModificacion")
SELECT 'whatsapp_wwebjs_url','http://localhost:3000','string','URL del servicio whatsapp-web.js','sistema',NOW()
WHERE NOT EXISTS (SELECT 1 FROM "T_ConfiguracionSistema" WHERE "Clave" = 'whatsapp_wwebjs_url');

INSERT INTO "T_ConfiguracionSistema" ("Clave","Valor","Tipo","Descripcion","UsuarioModificacion","FechaModificacion")
SELECT 'whatsapp_baileys_url','http://localhost:3002','string','URL del servicio Baileys (WebSocket directo)','sistema',NOW()
WHERE NOT EXISTS (SELECT 1 FROM "T_ConfiguracionSistema" WHERE "Clave" = 'whatsapp_baileys_url');

INSERT INTO "T_ConfiguracionSistema" ("Clave","Valor","Tipo","Descripcion","UsuarioModificacion","FechaModificacion")
SELECT 'whatsapp_pairing_code','','string','Codigo de emparejamiento Baileys (temporal, se renueva al solicitarlo)','sistema',NOW()
WHERE NOT EXISTS (SELECT 1 FROM "T_ConfiguracionSistema" WHERE "Clave" = 'whatsapp_pairing_code');

INSERT INTO "T_ConfiguracionSistema" ("Clave","Valor","Tipo","Descripcion","UsuarioModificacion","FechaModificacion")
SELECT 'bot_modo_defecto','agente','string','Modo por defecto para nuevas conversaciones: agente | bot','sistema',NOW()
WHERE NOT EXISTS (SELECT 1 FROM "T_ConfiguracionSistema" WHERE "Clave" = 'bot_modo_defecto');


-- ============================================================
-- VISTAS ORIGINALES
-- ============================================================

CREATE OR REPLACE VIEW "V_Obtener_DetalleMensajes" AS
SELECT
    mc."Id"              AS "IdMensajeSaliente",
    NULL::INTEGER        AS "IdMensajeEntrante",
    mc."NumeroRemitente" AS "NumeroCuenta",
    mc."NumeroDestino"   AS "NumeroCliente",
    CAST(mc."FechaCreacion" AS DATE) AS "Fecha",
    mc."FechaEnvio",
    mc."WhatsAppId",
    mc."Mensaje",
    NULL::VARCHAR        AS "WhatsAppIdPadre",
    NULL::INTEGER        AS "IdMensajeSalientePadre",
    NULL::INTEGER        AS "IdMensajeEntrantePadre",
    mc."Error",
    mc."MimeType",
    mc."AdjuntoBase64",
    CAST(mc."NombreArchivo" AS VARCHAR(500)) AS "NombreArchivo",
    NULL::BOOLEAN        AS "EsErrorDescargaMultimedia",
    mc."AckEstado"
FROM "T_MensajeCola" mc
WHERE mc."Estado" = TRUE
UNION ALL
SELECT
    NULL::INTEGER        AS "IdMensajeSaliente",
    me."Id"              AS "IdMensajeEntrante",
    me."NumeroCuenta",
    me."NumeroCliente",
    CAST(me."FechaEnvio" AS DATE) AS "Fecha",
    me."FechaEnvio",
    me."WhatsAppId",
    me."Mensaje",
    me."WhatsAppIdPadre",
    me."IdMensajeColaPadre"       AS "IdMensajeSalientePadre",
    me."IdMensajeEntrantePadre",
    NULL::TEXT           AS "Error",
    me."MimeType",
    me."AdjuntoBase64",
    CAST(me."NombreArchivo" AS VARCHAR(500)) AS "NombreArchivo",
    me."EsErrorDescargaMultimedia",
    NULL::INTEGER        AS "AckEstado"
FROM "T_MensajeEntrante" me
WHERE me."Estado" = TRUE;

DROP VIEW IF EXISTS "V_Obtener_ResumenConversacion";
CREATE VIEW "V_Obtener_ResumenConversacion" AS
WITH todos AS (
    SELECT "NumeroCuenta", "NumeroCliente", "FechaEnvio", "Mensaje", "MimeType",
           1 AS "EsEntrante", NULL::INTEGER AS "AckEstado"
    FROM "T_MensajeEntrante" WHERE "Estado" = TRUE
    UNION ALL
    SELECT "NumeroRemitente", "NumeroDestino", "FechaEnvio", "Mensaje", "MimeType",
           0, "AckEstado"
    FROM "T_MensajeCola" WHERE "Estado" = TRUE
),
ultimo AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY "NumeroCuenta", "NumeroCliente" ORDER BY "FechaEnvio" DESC) AS rn
    FROM todos
)
SELECT
    u."NumeroCuenta",
    u."NumeroCliente",
    u."FechaEnvio"    AS "FechaUltimoMensaje",
    u."Mensaje"       AS "UltimoMensaje",
    u."MimeType"      AS "UltimoMimeType",
    u."EsEntrante"    AS "UltimoEsEntrante",
    u."AckEstado"     AS "UltimoAckEstado",
    (
        SELECT COUNT(*)::INTEGER
        FROM "T_MensajeEntrante" me3
        WHERE me3."NumeroCuenta" = u."NumeroCuenta"
          AND me3."NumeroCliente" = u."NumeroCliente"
          AND me3."Estado" = TRUE
          AND me3."FechaEnvio" > COALESCE(
            (SELECT MAX(mc."FechaEnvio")
             FROM "T_MensajeCola" mc
             WHERE mc."NumeroRemitente" = u."NumeroCuenta"
               AND mc."NumeroDestino"   = u."NumeroCliente"
               AND mc."Estado" = TRUE),
            '1970-01-01'::TIMESTAMP
          )
    ) AS "MensajesNoLeidos",
    COALESCE(
        (SELECT me2."NombreContacto"
         FROM "T_MensajeEntrante" me2
         WHERE me2."NumeroCuenta"    = u."NumeroCuenta"
           AND me2."NumeroCliente"   = u."NumeroCliente"
           AND me2."NombreContacto"  IS NOT NULL
           AND me2."Estado"          = TRUE
         ORDER BY me2."FechaEnvio" DESC LIMIT 1),
        u."NumeroCliente"
    ) AS "NombreContacto"
FROM ultimo u
WHERE u.rn = 1;

-- ============================================================
-- PARTE 5: BAILEYS CHAT COMPLETO
-- ============================================================

-- T_BotRegla: reglas del chatbot autoresponder
CREATE TABLE IF NOT EXISTS "T_BotRegla" (
    "Id"                   SERIAL        PRIMARY KEY,
    "Nombre"               VARCHAR(256)  NOT NULL,
    "Patron"               VARCHAR(512)  NOT NULL,
    "Respuesta"            TEXT          NOT NULL,
    "TipoAccion"           VARCHAR(30)   NOT NULL DEFAULT 'respuesta_texto',
    "Prioridad"            INT           NOT NULL DEFAULT 100,
    "EsActivo"             BOOLEAN       NOT NULL DEFAULT TRUE,
    "Estado"               BOOLEAN       NOT NULL DEFAULT TRUE,
    "UsuarioCreacion"      VARCHAR(50)   NOT NULL,
    "UsuarioModificacion"  VARCHAR(50)   NOT NULL,
    "FechaCreacion"        TIMESTAMP     NOT NULL DEFAULT NOW(),
    "FechaModificacion"    TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- T_LlamadaEntrante: log de llamadas (rechazadas automáticamente por Baileys)
CREATE TABLE IF NOT EXISTS "T_LlamadaEntrante" (
    "Id"           SERIAL       PRIMARY KEY,
    "CallId"       VARCHAR(100) NOT NULL,
    "NumeroDesde"  VARCHAR(50)  NOT NULL,
    "EsVideo"      BOOLEAN      NOT NULL DEFAULT FALSE,
    "FechaLlamada" TIMESTAMP    NOT NULL DEFAULT NOW(),
    "Estado"       BOOLEAN      NOT NULL DEFAULT TRUE
);

-- T_MensajeEntrante: columnas para edición y mensajes efímeros
ALTER TABLE "T_MensajeEntrante" ADD COLUMN IF NOT EXISTS "EsEditado"           BOOLEAN   DEFAULT FALSE;
ALTER TABLE "T_MensajeEntrante" ADD COLUMN IF NOT EXISTS "MensajeOriginal"     TEXT;
ALTER TABLE "T_MensajeEntrante" ADD COLUMN IF NOT EXISTS "EsEfimero"           BOOLEAN   DEFAULT FALSE;
ALTER TABLE "T_MensajeEntrante" ADD COLUMN IF NOT EXISTS "EfimeroExpiracion"   TIMESTAMP;

-- T_Conversacion: modo bot/agente por conversación
ALTER TABLE "T_Conversacion" ADD COLUMN IF NOT EXISTS "ModoConversacion"  VARCHAR(10)  NOT NULL DEFAULT 'agente';

-- T_Conversacion: nombre del contacto
ALTER TABLE "T_Conversacion" ADD COLUMN IF NOT EXISTS "NombreContacto"   VARCHAR(256) NULL;

-- Ampliar NumeroCuenta/NumeroCliente a VARCHAR(50) (Baileys multi-device usa números largos)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'T_Conversacion' AND column_name = 'NumeroCuenta'
               AND character_maximum_length < 50) THEN
    ALTER TABLE "T_Conversacion"
      ALTER COLUMN "NumeroCuenta"  TYPE VARCHAR(50),
      ALTER COLUMN "NumeroCliente" TYPE VARCHAR(50);
    RAISE NOTICE 'T_Conversacion: NumeroCuenta/NumeroCliente ampliadas a VARCHAR(50).';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'T_MensajeEntrante' AND column_name = 'NumeroCuenta'
               AND character_maximum_length < 50) THEN
    ALTER TABLE "T_MensajeEntrante"
      ALTER COLUMN "NumeroCuenta"  TYPE VARCHAR(50),
      ALTER COLUMN "NumeroCliente" TYPE VARCHAR(50);
    RAISE NOTICE 'T_MensajeEntrante: NumeroCuenta/NumeroCliente ampliadas a VARCHAR(50).';
  END IF;

  -- T_MensajeCola: NumeroRemitente/NumeroDestino
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
             WHERE table_name = 'T_MensajeCola' AND column_name = 'NumeroRemitente'
               AND character_maximum_length < 50
  ) THEN
    ALTER TABLE "T_MensajeCola"
      ALTER COLUMN "NumeroRemitente" TYPE VARCHAR(50),
      ALTER COLUMN "NumeroDestino"   TYPE VARCHAR(50);
    RAISE NOTICE 'T_MensajeCola: NumeroRemitente/NumeroDestino ampliadas a VARCHAR(50).';
  END IF;

  -- T_MensajeEntrante: WhatsAppTipo
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
             WHERE table_name = 'T_MensajeEntrante' AND column_name = 'WhatsAppTipo'
               AND character_maximum_length < 50
  ) THEN
    ALTER TABLE "T_MensajeEntrante"
      ALTER COLUMN "WhatsAppTipo" TYPE VARCHAR(50);
    RAISE NOTICE 'T_MensajeEntrante: WhatsAppTipo ampliada a VARCHAR(50).';
  END IF;
END $$;
-- =============================================
-- Parte 1: Panel de contacto + Estados
-- =============================================
ALTER TABLE "T_Conversacion" ADD COLUMN IF NOT EXISTS "EstadoConversacion" VARCHAR(20) NOT NULL DEFAULT 'abierta';
ALTER TABLE "T_Conversacion" ADD COLUMN IF NOT EXISTS "Nota"               TEXT        NULL;

-- =============================================
-- Parte 2: Notas internas de conversación
-- =============================================
CREATE TABLE IF NOT EXISTS "T_NotaConversacion" (
    "Id"              SERIAL PRIMARY KEY,
    "IdConversacion"  INT NOT NULL,
    "Texto"           TEXT NOT NULL,
    "Usuario"         VARCHAR(100) NOT NULL DEFAULT 'sistema',
    "FechaCreacion"   TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_NotaConversacion_Conversacion" FOREIGN KEY ("IdConversacion") REFERENCES "T_Conversacion"("Id")
);

-- =============================================
-- Parte 4: Recordatorios + Agente asignado
-- =============================================
ALTER TABLE "T_Conversacion" ADD COLUMN IF NOT EXISTS "AgenteAsignado" VARCHAR(100) NULL;

CREATE TABLE IF NOT EXISTS "T_Recordatorio" (
    "Id"                  SERIAL PRIMARY KEY,
    "IdConversacion"      INT NOT NULL,
    "Texto"               TEXT NOT NULL,
    "FechaRecordatorio"   TIMESTAMP NOT NULL,
    "Completado"          BOOLEAN NOT NULL DEFAULT FALSE,
    "UsuarioCreacion"     VARCHAR(100) NOT NULL DEFAULT 'sistema',
    "FechaCreacion"       TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_Recordatorio_Conversacion" FOREIGN KEY ("IdConversacion") REFERENCES "T_Conversacion"("Id")
);

-- =============================================
-- Parte 3: Etiquetas rápidas por conversación
-- =============================================
CREATE TABLE IF NOT EXISTS "T_ConversacionEtiqueta" (
    "IdConversacion"  INT NOT NULL,
    "IdEtiqueta"      INT NOT NULL,
    CONSTRAINT "PK_T_ConversacionEtiqueta" PRIMARY KEY ("IdConversacion", "IdEtiqueta"),
    CONSTRAINT "FK_ConvEtiqueta_Conversacion" FOREIGN KEY ("IdConversacion") REFERENCES "T_Conversacion"("Id"),
    CONSTRAINT "FK_ConvEtiqueta_Etiqueta"     FOREIGN KEY ("IdEtiqueta")     REFERENCES "T_Etiqueta"("Id")
);

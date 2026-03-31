-- ============================================================
-- SCRIPT SQL SERVER (T-SQL) — WA_Cola
-- Sistema: CRM WhatsApp
-- Motor:   SQL Server 2019+
-- Fecha:   2026-03-27
--
-- INSTRUCCIONES:
--   1. Abrir en SSMS conectado a tu instancia SQL Server
--   2. Ejecutar completo (F5)
--   3. Al final verás las tablas creadas y datos seed
--
-- Para activar SQL Server en el backend editar appsettings.json:
--   "DatabaseProvider": "SqlServer"
-- ============================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'WA_Cola')
BEGIN
    CREATE DATABASE WA_Cola COLLATE Modern_Spanish_CI_AS;
    PRINT 'Base de datos WA_Cola creada.';
END
ELSE
    PRINT 'Base de datos WA_Cola ya existe.';
GO

USE WA_Cola;
GO

-- ============================================================
-- PARTE 1: TABLAS ORIGINALES
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_MensajeColaEstado')
BEGIN
    CREATE TABLE T_MensajeColaEstado (
        Id                   INT          IDENTITY(1,1) PRIMARY KEY,
        Nombre               VARCHAR(50)  NOT NULL,
        Estado               BIT          NOT NULL DEFAULT 1,
        UsuarioCreacion      VARCHAR(50)  NOT NULL,
        UsuarioModificacion  VARCHAR(50)  NOT NULL,
        FechaCreacion        DATETIME     NOT NULL DEFAULT GETDATE(),
        FechaModificacion    DATETIME     NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla T_MensajeColaEstado creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_MensajeEntranteEstado')
BEGIN
    CREATE TABLE T_MensajeEntranteEstado (
        Id                   INT          IDENTITY(1,1) PRIMARY KEY,
        Nombre               VARCHAR(50)  NOT NULL,
        Estado               BIT          NOT NULL DEFAULT 1,
        UsuarioCreacion      VARCHAR(50)  NOT NULL,
        UsuarioModificacion  VARCHAR(50)  NOT NULL,
        FechaCreacion        DATETIME     NOT NULL DEFAULT GETDATE(),
        FechaModificacion    DATETIME     NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla T_MensajeEntranteEstado creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_TipoMensaje')
BEGIN
    CREATE TABLE T_TipoMensaje (
        Id                   INT          IDENTITY(1,1) PRIMARY KEY,
        Nombre               VARCHAR(50)  NOT NULL,
        Estado               BIT          NOT NULL DEFAULT 1,
        UsuarioCreacion      VARCHAR(50)  NOT NULL,
        UsuarioModificacion  VARCHAR(50)  NOT NULL,
        FechaCreacion        DATETIME     NOT NULL DEFAULT GETDATE(),
        FechaModificacion    DATETIME     NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla T_TipoMensaje creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_Usuario')
BEGIN
    CREATE TABLE T_Usuario (
        Id                   INT           IDENTITY(1,1) PRIMARY KEY,
        Nombres              VARCHAR(128)  NOT NULL,
        ApellidoPaterno      VARCHAR(128)  NOT NULL,
        ApellidoMaterno      VARCHAR(128)  NOT NULL,
        NombreUsuario        VARCHAR(50)   NOT NULL,
        ClaveHash            VARCHAR(512)  NOT NULL,
        Rol                  VARCHAR(20)   NOT NULL DEFAULT 'agente',
        Estado               BIT           NOT NULL DEFAULT 1,
        UsuarioCreacion      VARCHAR(50)   NOT NULL,
        UsuarioModificacion  VARCHAR(50)   NOT NULL,
        FechaCreacion        DATETIME      NOT NULL DEFAULT GETDATE(),
        FechaModificacion    DATETIME      NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UC_T_Usuario_NombreUsuario UNIQUE (NombreUsuario)
    );
    PRINT 'Tabla T_Usuario creada.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('T_Usuario') AND name = 'Rol')
    BEGIN
        ALTER TABLE T_Usuario ADD Rol VARCHAR(20) NOT NULL DEFAULT 'agente';
        PRINT 'Columna Rol agregada a T_Usuario.';
    END
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_Conversacion')
BEGIN
    CREATE TABLE T_Conversacion (
        Id                   INT          IDENTITY(1,1) PRIMARY KEY,
        NumeroCuenta         VARCHAR(12)  NOT NULL,
        NumeroCliente        VARCHAR(12)  NOT NULL,
        Estado               BIT          NOT NULL DEFAULT 1,
        UsuarioCreacion      VARCHAR(50)  NOT NULL,
        UsuarioModificacion  VARCHAR(50)  NOT NULL,
        FechaCreacion        DATETIME     NOT NULL DEFAULT GETDATE(),
        FechaModificacion    DATETIME     NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla T_Conversacion creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_MensajeCola')
BEGIN
    CREATE TABLE T_MensajeCola (
        Id                   INT           IDENTITY(1,1) PRIMARY KEY,
        IdMensajeColaEstado  INT           NOT NULL,
        NumeroRemitente      VARCHAR(30)   NOT NULL,
        NumeroDestino        VARCHAR(30)   NOT NULL,
        Mensaje              NVARCHAR(MAX) NULL,
        AdjuntoBase64        NVARCHAR(MAX) NULL,
        NombreArchivo        NVARCHAR(1024) NULL,
        MimeType             VARCHAR(255)  NULL,
        NroByte              INT           NULL,
        UrlArchivo           NVARCHAR(MAX) NULL,
        Estado               BIT           NOT NULL DEFAULT 1,
        UsuarioCreacion      VARCHAR(50)   NOT NULL,
        UsuarioModificacion  VARCHAR(50)   NOT NULL,
        FechaCreacion        DATETIME      NOT NULL DEFAULT GETDATE(),
        FechaModificacion    DATETIME      NOT NULL DEFAULT GETDATE(),
        Error                NVARCHAR(MAX) NULL,
        FechaEnvio           DATETIME      NULL,
        WhatsAppId           VARCHAR(50)   NULL,
        AckEstado            INT           NOT NULL DEFAULT 0,
        CONSTRAINT FK_T_MensajeCola_T_MensajeColaEstado
            FOREIGN KEY (IdMensajeColaEstado) REFERENCES T_MensajeColaEstado(Id)
    );
    PRINT 'Tabla T_MensajeCola creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_MensajeEntrante')
BEGIN
    CREATE TABLE T_MensajeEntrante (
        Id                          INT           IDENTITY(1,1) PRIMARY KEY,
        IdMensajeEntranteEstado     INT           NOT NULL,
        NumeroCuenta                VARCHAR(12)   NOT NULL,
        NumeroCliente               VARCHAR(12)   NOT NULL,
        WhatsAppTipo                VARCHAR(15)   NULL,
        WhatsAppId                  VARCHAR(50)   NULL,
        FechaEnvio                  DATETIME      NOT NULL,
        Mensaje                     NVARCHAR(MAX) NULL,
        TieneAdjunto                BIT           NULL,
        AdjuntoBase64               NVARCHAR(MAX) NULL,
        NombreArchivo               NVARCHAR(1024) NULL,
        MimeType                    VARCHAR(50)   NULL,
        NroByte                     INT           NULL,
        UrlArchivo                  NVARCHAR(MAX) NULL,
        Estado                      BIT           NOT NULL DEFAULT 1,
        UsuarioCreacion             VARCHAR(50)   NOT NULL,
        UsuarioModificacion         VARCHAR(50)   NOT NULL,
        FechaCreacion               DATETIME      NOT NULL DEFAULT GETDATE(),
        FechaModificacion           DATETIME      NOT NULL DEFAULT GETDATE(),
        WhatsAppIdPadre             VARCHAR(50)   NULL,
        IdMensajeEntrantePadre      INT           NULL,
        IdMensajeColaPadre          INT           NULL,
        FueEliminado                BIT           NULL,
        FechaRecepcionEliminacion   DATETIME      NULL,
        EsErrorDescargaMultimedia   BIT           NULL,
        NombreContacto              VARCHAR(256)  NULL,
        CONSTRAINT FK_T_MensajeEntrante_T_MensajeEntranteEstado
            FOREIGN KEY (IdMensajeEntranteEstado) REFERENCES T_MensajeEntranteEstado(Id)
    );
    PRINT 'Tabla T_MensajeEntrante creada.';
END
GO

-- ============================================================
-- VISTAS ORIGINALES
-- ============================================================

IF EXISTS (SELECT * FROM sys.views WHERE name = 'V_Obtener_DetalleMensajes')
    DROP VIEW V_Obtener_DetalleMensajes;
GO
CREATE VIEW V_Obtener_DetalleMensajes AS
SELECT
    mc.Id              AS IdMensajeSaliente,
    NULL               AS IdMensajeEntrante,
    mc.NumeroRemitente AS NumeroCuenta,
    mc.NumeroDestino   AS NumeroCliente,
    CAST(mc.FechaCreacion AS DATE) AS Fecha,
    mc.FechaEnvio,
    mc.WhatsAppId,
    mc.Mensaje,
    NULL               AS WhatsAppIdPadre,
    NULL               AS IdMensajeSalientePadre,
    NULL               AS IdMensajeEntrantePadre,
    mc.Error,
    mc.MimeType,
    mc.AdjuntoBase64,
    CAST(mc.NombreArchivo AS NVARCHAR(500)) AS NombreArchivo,
    NULL               AS EsErrorDescargaMultimedia,
    mc.AckEstado
FROM T_MensajeCola mc
WHERE mc.Estado = 1
UNION ALL
SELECT
    NULL               AS IdMensajeSaliente,
    me.Id              AS IdMensajeEntrante,
    me.NumeroCuenta,
    me.NumeroCliente,
    CAST(me.FechaEnvio AS DATE) AS Fecha,
    me.FechaEnvio,
    me.WhatsAppId,
    me.Mensaje,
    me.WhatsAppIdPadre,
    me.IdMensajeColaPadre      AS IdMensajeSalientePadre,
    me.IdMensajeEntrantePadre,
    NULL               AS Error,
    me.MimeType,
    me.AdjuntoBase64,
    CAST(me.NombreArchivo AS NVARCHAR(500)) AS NombreArchivo,
    me.EsErrorDescargaMultimedia,
    NULL               AS AckEstado
FROM T_MensajeEntrante me
WHERE me.Estado = 1;
GO

IF EXISTS (SELECT * FROM sys.views WHERE name = 'V_Obtener_ResumenConversacion')
    DROP VIEW V_Obtener_ResumenConversacion;
GO
CREATE VIEW V_Obtener_ResumenConversacion AS
SELECT
    me.NumeroCuenta,
    me.NumeroCliente,
    MAX(me.FechaEnvio) AS FechaUltimoMensaje,
    COALESCE(
        (SELECT TOP 1 me2.NombreContacto
         FROM T_MensajeEntrante me2
         WHERE me2.NumeroCuenta  = me.NumeroCuenta
           AND me2.NumeroCliente = me.NumeroCliente
           AND me2.NombreContacto IS NOT NULL
           AND me2.Estado = 1
         ORDER BY me2.FechaEnvio DESC),
        me.NumeroCliente
    ) AS NombreContacto
FROM T_MensajeEntrante me
WHERE me.Estado = 1
GROUP BY me.NumeroCuenta, me.NumeroCliente;
GO

-- ============================================================
-- PARTE 2: TABLAS CRM
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_Empresa')
BEGIN
    CREATE TABLE T_Empresa (
        Id                   INT            IDENTITY(1,1) PRIMARY KEY,
        Nombre               NVARCHAR(256)  NOT NULL,
        Ruc                  VARCHAR(20)    NULL,
        Sector               NVARCHAR(128)  NULL,
        Tamano               VARCHAR(50)    NULL,
        Web                  VARCHAR(256)   NULL,
        Direccion            NVARCHAR(512)  NULL,
        Logo                 NVARCHAR(MAX)  NULL,
        Notas                NVARCHAR(MAX)  NULL,
        Estado               BIT            NOT NULL DEFAULT 1,
        UsuarioCreacion      VARCHAR(50)    NOT NULL,
        UsuarioModificacion  VARCHAR(50)    NOT NULL,
        FechaCreacion        DATETIME       NOT NULL DEFAULT GETDATE(),
        FechaModificacion    DATETIME       NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla T_Empresa creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_Contacto')
BEGIN
    CREATE TABLE T_Contacto (
        Id                   INT            IDENTITY(1,1) PRIMARY KEY,
        Nombres              NVARCHAR(256)  NOT NULL,
        Apellidos            NVARCHAR(256)  NULL,
        NumeroWhatsApp       VARCHAR(20)    NOT NULL,
        Email                VARCHAR(256)   NULL,
        Cargo                NVARCHAR(128)  NULL,
        IdEmpresa            INT            NULL REFERENCES T_Empresa(Id),
        Notas                NVARCHAR(MAX)  NULL,
        Estado               BIT            NOT NULL DEFAULT 1,
        UsuarioCreacion      VARCHAR(50)    NOT NULL,
        UsuarioModificacion  VARCHAR(50)    NOT NULL,
        FechaCreacion        DATETIME       NOT NULL DEFAULT GETDATE(),
        FechaModificacion    DATETIME       NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla T_Contacto creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_Etiqueta')
BEGIN
    CREATE TABLE T_Etiqueta (
        Id                   INT          IDENTITY(1,1) PRIMARY KEY,
        Nombre               VARCHAR(100) NOT NULL,
        Color                VARCHAR(20)  NOT NULL DEFAULT '#3B82F6',
        Estado               BIT          NOT NULL DEFAULT 1,
        UsuarioCreacion      VARCHAR(50)  NOT NULL,
        UsuarioModificacion  VARCHAR(50)  NOT NULL,
        FechaCreacion        DATETIME     NOT NULL DEFAULT GETDATE(),
        FechaModificacion    DATETIME     NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla T_Etiqueta creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_ContactoEtiqueta')
BEGIN
    CREATE TABLE T_ContactoEtiqueta (
        Id              INT          IDENTITY(1,1) PRIMARY KEY,
        IdContacto      INT          NOT NULL REFERENCES T_Contacto(Id),
        IdEtiqueta      INT          NOT NULL REFERENCES T_Etiqueta(Id),
        Estado          BIT          NOT NULL DEFAULT 1,
        UsuarioCreacion VARCHAR(50)  NOT NULL,
        FechaCreacion   DATETIME     NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla T_ContactoEtiqueta creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_ProductoCategoria')
BEGIN
    CREATE TABLE T_ProductoCategoria (
        Id                   INT            IDENTITY(1,1) PRIMARY KEY,
        Nombre               NVARCHAR(128)  NOT NULL,
        Color                VARCHAR(20)    NOT NULL DEFAULT '#3B82F6',
        Descripcion          NVARCHAR(512)  NULL,
        Estado               BIT            NOT NULL DEFAULT 1,
        UsuarioCreacion      VARCHAR(50)    NOT NULL,
        UsuarioModificacion  VARCHAR(50)    NOT NULL,
        FechaCreacion        DATETIME       NOT NULL DEFAULT GETDATE(),
        FechaModificacion    DATETIME       NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla T_ProductoCategoria creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_Producto')
BEGIN
    CREATE TABLE T_Producto (
        Id                   INT            IDENTITY(1,1) PRIMARY KEY,
        Nombre               NVARCHAR(256)  NOT NULL,
        Codigo               VARCHAR(50)    NULL,
        Descripcion          NVARCHAR(MAX)  NULL,
        Precio               DECIMAL(18,2)  NOT NULL DEFAULT 0,
        Unidad               VARCHAR(50)    NOT NULL DEFAULT 'unidad',
        IdCategoria          INT            NULL REFERENCES T_ProductoCategoria(Id),
        Imagen               NVARCHAR(MAX)  NULL,
        Estado               BIT            NOT NULL DEFAULT 1,
        UsuarioCreacion      VARCHAR(50)    NOT NULL,
        UsuarioModificacion  VARCHAR(50)    NOT NULL,
        FechaCreacion        DATETIME       NOT NULL DEFAULT GETDATE(),
        FechaModificacion    DATETIME       NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla T_Producto creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_PipelineEtapa')
BEGIN
    CREATE TABLE T_PipelineEtapa (
        Id                   INT            IDENTITY(1,1) PRIMARY KEY,
        Nombre               NVARCHAR(128)  NOT NULL,
        Orden                INT            NOT NULL,
        Color                VARCHAR(20)    NOT NULL DEFAULT '#3B82F6',
        Descripcion          NVARCHAR(512)  NULL,
        Estado               BIT            NOT NULL DEFAULT 1,
        UsuarioCreacion      VARCHAR(50)    NOT NULL,
        UsuarioModificacion  VARCHAR(50)    NOT NULL,
        FechaCreacion        DATETIME       NOT NULL DEFAULT GETDATE(),
        FechaModificacion    DATETIME       NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla T_PipelineEtapa creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_Oportunidad')
BEGIN
    CREATE TABLE T_Oportunidad (
        Id                   INT            IDENTITY(1,1) PRIMARY KEY,
        Titulo               NVARCHAR(256)  NOT NULL,
        IdContacto           INT            NULL REFERENCES T_Contacto(Id),
        IdEmpresa            INT            NULL REFERENCES T_Empresa(Id),
        IdResponsable        INT            NULL REFERENCES T_Usuario(Id),
        IdEtapa              INT            NOT NULL REFERENCES T_PipelineEtapa(Id),
        MontoEstimado        DECIMAL(18,2)  NOT NULL DEFAULT 0,
        Moneda               VARCHAR(10)    NOT NULL DEFAULT 'USD',
        Probabilidad         INT            NOT NULL DEFAULT 50,
        FechaCierre          DATETIME       NULL,
        Origen               VARCHAR(50)    NOT NULL DEFAULT 'whatsapp',
        Prioridad            VARCHAR(20)    NOT NULL DEFAULT 'media',
        Notas                NVARCHAR(MAX)  NULL,
        Estado               BIT            NOT NULL DEFAULT 1,
        UsuarioCreacion      VARCHAR(50)    NOT NULL,
        UsuarioModificacion  VARCHAR(50)    NOT NULL,
        FechaCreacion        DATETIME       NOT NULL DEFAULT GETDATE(),
        FechaModificacion    DATETIME       NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla T_Oportunidad creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_OportunidadProducto')
BEGIN
    CREATE TABLE T_OportunidadProducto (
        Id              INT           IDENTITY(1,1) PRIMARY KEY,
        IdOportunidad   INT           NOT NULL REFERENCES T_Oportunidad(Id),
        IdProducto      INT           NOT NULL REFERENCES T_Producto(Id),
        Cantidad        DECIMAL(18,2) NOT NULL DEFAULT 1,
        PrecioUnitario  DECIMAL(18,2) NOT NULL DEFAULT 0,
        Estado          BIT           NOT NULL DEFAULT 1,
        UsuarioCreacion VARCHAR(50)   NOT NULL,
        FechaCreacion   DATETIME      NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla T_OportunidadProducto creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_Actividad')
BEGIN
    CREATE TABLE T_Actividad (
        Id                   INT            IDENTITY(1,1) PRIMARY KEY,
        Tipo                 VARCHAR(50)    NOT NULL,
        Titulo               NVARCHAR(256)  NOT NULL,
        Descripcion          NVARCHAR(MAX)  NULL,
        FechaActividad       DATETIME       NULL,
        EstadoActividad      VARCHAR(20)    NOT NULL DEFAULT 'pendiente',
        IdResponsable        INT            NULL REFERENCES T_Usuario(Id),
        IdContacto           INT            NULL REFERENCES T_Contacto(Id),
        IdEmpresa            INT            NULL REFERENCES T_Empresa(Id),
        IdOportunidad        INT            NULL REFERENCES T_Oportunidad(Id),
        Estado               BIT            NOT NULL DEFAULT 1,
        UsuarioCreacion      VARCHAR(50)    NOT NULL,
        UsuarioModificacion  VARCHAR(50)    NOT NULL,
        FechaCreacion        DATETIME       NOT NULL DEFAULT GETDATE(),
        FechaModificacion    DATETIME       NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla T_Actividad creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_Plantilla')
BEGIN
    CREATE TABLE T_Plantilla (
        Id                   INT            IDENTITY(1,1) PRIMARY KEY,
        Nombre               NVARCHAR(256)  NOT NULL,
        Categoria            VARCHAR(100)   NOT NULL DEFAULT 'general',
        Contenido            NVARCHAR(MAX)  NOT NULL,
        Variables            NVARCHAR(MAX)  NULL,
        Estado               BIT            NOT NULL DEFAULT 1,
        UsuarioCreacion      VARCHAR(50)    NOT NULL,
        UsuarioModificacion  VARCHAR(50)    NOT NULL,
        FechaCreacion        DATETIME       NOT NULL DEFAULT GETDATE(),
        FechaModificacion    DATETIME       NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla T_Plantilla creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_Campana')
BEGIN
    CREATE TABLE T_Campana (
        Id                   INT            IDENTITY(1,1) PRIMARY KEY,
        Nombre               NVARCHAR(256)  NOT NULL,
        IdPlantilla          INT            NULL REFERENCES T_Plantilla(Id),
        Mensaje              NVARCHAR(MAX)  NULL,
        Tags                 NVARCHAR(MAX)  NULL,
        EstadoCampana        VARCHAR(20)    NOT NULL DEFAULT 'borrador',
        ProgramadaPara       DATETIME       NULL,
        Total                INT            NOT NULL DEFAULT 0,
        Enviados             INT            NOT NULL DEFAULT 0,
        Fallidos             INT            NOT NULL DEFAULT 0,
        Pendientes           INT            NOT NULL DEFAULT 0,
        Estado               BIT            NOT NULL DEFAULT 1,
        UsuarioCreacion      VARCHAR(50)    NOT NULL,
        UsuarioModificacion  VARCHAR(50)    NOT NULL,
        FechaCreacion        DATETIME       NOT NULL DEFAULT GETDATE(),
        FechaModificacion    DATETIME       NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla T_Campana creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_CampanaContacto')
BEGIN
    CREATE TABLE T_CampanaContacto (
        Id              INT            IDENTITY(1,1) PRIMARY KEY,
        IdCampana       INT            NOT NULL REFERENCES T_Campana(Id),
        IdContacto      INT            NOT NULL REFERENCES T_Contacto(Id),
        Enviado         BIT            NOT NULL DEFAULT 0,
        ErrorEnvio      NVARCHAR(MAX)  NULL,
        FechaEnvio      DATETIME       NULL,
        Estado          BIT            NOT NULL DEFAULT 1
    );
    PRINT 'Tabla T_CampanaContacto creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_Encuesta')
BEGIN
    CREATE TABLE T_Encuesta (
        Id                   INT            IDENTITY(1,1) PRIMARY KEY,
        Nombre               NVARCHAR(256)  NOT NULL,
        Descripcion          NVARCHAR(MAX)  NULL,
        Categoria            VARCHAR(100)   NOT NULL DEFAULT 'general',
        Estado               BIT            NOT NULL DEFAULT 1,
        UsuarioCreacion      VARCHAR(50)    NOT NULL,
        UsuarioModificacion  VARCHAR(50)    NOT NULL,
        FechaCreacion        DATETIME       NOT NULL DEFAULT GETDATE(),
        FechaModificacion    DATETIME       NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla T_Encuesta creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_EncuestaPregunta')
BEGIN
    CREATE TABLE T_EncuestaPregunta (
        Id                   INT            IDENTITY(1,1) PRIMARY KEY,
        IdEncuesta           INT            NOT NULL REFERENCES T_Encuesta(Id),
        Orden                INT            NOT NULL DEFAULT 0,
        Texto                NVARCHAR(MAX)  NOT NULL,
        Tipo                 VARCHAR(50)    NOT NULL,
        Opciones             NVARCHAR(MAX)  NULL,
        Obligatorio          BIT            NOT NULL DEFAULT 1,
        CondicionPreguntaId  INT            NULL REFERENCES T_EncuestaPregunta(Id),
        CondicionRespuesta   NVARCHAR(MAX)  NULL,
        Estado               BIT            NOT NULL DEFAULT 1
    );
    PRINT 'Tabla T_EncuestaPregunta creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_EncuestaEnvio')
BEGIN
    CREATE TABLE T_EncuestaEnvio (
        Id              INT          IDENTITY(1,1) PRIMARY KEY,
        IdEncuesta      INT          NOT NULL REFERENCES T_Encuesta(Id),
        IdContacto      INT          NULL REFERENCES T_Contacto(Id),
        Token           VARCHAR(100) NOT NULL,
        EstadoEnvio     VARCHAR(20)  NOT NULL DEFAULT 'pendiente',
        FechaEnvio      DATETIME     NOT NULL DEFAULT GETDATE(),
        FechaCompletado DATETIME     NULL,
        Estado          BIT          NOT NULL DEFAULT 1,
        CONSTRAINT UQ_EncuestaEnvio_Token UNIQUE (Token)
    );
    PRINT 'Tabla T_EncuestaEnvio creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_EncuestaRespuesta')
BEGIN
    CREATE TABLE T_EncuestaRespuesta (
        Id               INT            IDENTITY(1,1) PRIMARY KEY,
        IdEncuestaEnvio  INT            NOT NULL REFERENCES T_EncuestaEnvio(Id),
        IdPregunta       INT            NOT NULL REFERENCES T_EncuestaPregunta(Id),
        Valor            NVARCHAR(MAX)  NULL,
        Estado           BIT            NOT NULL DEFAULT 1
    );
    PRINT 'Tabla T_EncuestaRespuesta creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_ConfiguracionSistema')
BEGIN
    CREATE TABLE T_ConfiguracionSistema (
        Id                   INT            IDENTITY(1,1) PRIMARY KEY,
        Clave                VARCHAR(100)   NOT NULL,
        Valor                NVARCHAR(MAX)  NULL,
        Tipo                 VARCHAR(20)    NOT NULL DEFAULT 'string',
        Descripcion          NVARCHAR(512)  NULL,
        UsuarioModificacion  VARCHAR(50)    NOT NULL,
        FechaModificacion    DATETIME       NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_ConfiguracionSistema_Clave UNIQUE (Clave)
    );
    PRINT 'Tabla T_ConfiguracionSistema creada.';
END
GO

-- ============================================================
-- PARTE 3: SEED DATA
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM T_MensajeColaEstado)
BEGIN
    INSERT INTO T_MensajeColaEstado (Nombre, Estado, UsuarioCreacion, UsuarioModificacion, FechaCreacion, FechaModificacion) VALUES
    ('Pendiente', 1, 'sistema', 'sistema', GETDATE(), GETDATE()),
    ('Enviado',   1, 'sistema', 'sistema', GETDATE(), GETDATE()),
    ('Error',     1, 'sistema', 'sistema', GETDATE(), GETDATE());
    PRINT 'Seed T_MensajeColaEstado insertado.';
END
GO

IF NOT EXISTS (SELECT 1 FROM T_MensajeEntranteEstado)
BEGIN
    INSERT INTO T_MensajeEntranteEstado (Nombre, Estado, UsuarioCreacion, UsuarioModificacion, FechaCreacion, FechaModificacion) VALUES
    ('Recibido', 1, 'sistema', 'sistema', GETDATE(), GETDATE());
    PRINT 'Seed T_MensajeEntranteEstado insertado.';
END
GO

IF NOT EXISTS (SELECT 1 FROM T_TipoMensaje)
BEGIN
    INSERT INTO T_TipoMensaje (Nombre, Estado, UsuarioCreacion, UsuarioModificacion, FechaCreacion, FechaModificacion) VALUES
    ('chat',     1, 'sistema', 'sistema', GETDATE(), GETDATE()),
    ('image',    1, 'sistema', 'sistema', GETDATE(), GETDATE()),
    ('video',    1, 'sistema', 'sistema', GETDATE(), GETDATE()),
    ('audio',    1, 'sistema', 'sistema', GETDATE(), GETDATE()),
    ('ptt',      1, 'sistema', 'sistema', GETDATE(), GETDATE()),
    ('document', 1, 'sistema', 'sistema', GETDATE(), GETDATE()),
    ('sticker',  1, 'sistema', 'sistema', GETDATE(), GETDATE()),
    ('location', 1, 'sistema', 'sistema', GETDATE(), GETDATE()),
    ('revoked',  1, 'sistema', 'sistema', GETDATE(), GETDATE());
    PRINT 'Seed T_TipoMensaje insertado.';
END
GO

-- Contraseña: Admin123!
IF NOT EXISTS (SELECT 1 FROM T_Usuario WHERE NombreUsuario = 'admin')
BEGIN
    INSERT INTO T_Usuario (Nombres, ApellidoPaterno, ApellidoMaterno, NombreUsuario, ClaveHash, Rol, Estado, UsuarioCreacion, UsuarioModificacion, FechaCreacion, FechaModificacion)
    VALUES ('Administrador', 'Sistema', 'CRM', 'admin',
            '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
            'admin', 1, 'sistema', 'sistema', GETDATE(), GETDATE());
    PRINT 'Usuario admin creado (contraseña: Admin123!).';
END
GO

IF NOT EXISTS (SELECT 1 FROM T_PipelineEtapa)
BEGIN
    INSERT INTO T_PipelineEtapa (Nombre, Orden, Color, Estado, UsuarioCreacion, UsuarioModificacion, FechaCreacion, FechaModificacion) VALUES
    ('Prospecto',   1, '#8B5CF6', 1, 'sistema', 'sistema', GETDATE(), GETDATE()),
    ('Calificado',  2, '#3B82F6', 1, 'sistema', 'sistema', GETDATE(), GETDATE()),
    ('Propuesta',   3, '#F59E0B', 1, 'sistema', 'sistema', GETDATE(), GETDATE()),
    ('Negociacion', 4, '#EF4444', 1, 'sistema', 'sistema', GETDATE(), GETDATE()),
    ('Ganado',      5, '#10B981', 1, 'sistema', 'sistema', GETDATE(), GETDATE()),
    ('Perdido',     6, '#6B7280', 1, 'sistema', 'sistema', GETDATE(), GETDATE());
    PRINT 'Seed T_PipelineEtapa insertado.';
END
GO

IF NOT EXISTS (SELECT 1 FROM T_ConfiguracionSistema)
BEGIN
    INSERT INTO T_ConfiguracionSistema (Clave, Valor, Tipo, Descripcion, UsuarioModificacion, FechaModificacion) VALUES
    ('whatsapp_estado',       'desconectado',                                              'string', 'Estado conexion WhatsApp',    'sistema', GETDATE()),
    ('whatsapp_qr',           '',                                                          'string', 'QR WhatsApp en base64',       'sistema', GETDATE()),
    ('whatsapp_numero',       '',                                                          'string', 'Numero activo de WhatsApp',   'sistema', GETDATE()),
    ('empresa_nombre',        'Mi Empresa',                                                'string', 'Nombre de la empresa',        'sistema', GETDATE()),
    ('moneda_default',        'USD',                                                       'string', 'Moneda por defecto',          'sistema', GETDATE()),
    ('mensaje_bienvenida',    'Hola! Gracias por contactarnos. En que podemos ayudarte?',  'string', 'Mensaje de bienvenida',       'sistema', GETDATE()),
    ('mensaje_fuera_horario', 'Estamos fuera de horario. Te responderemos pronto.',        'string', 'Mensaje fuera de horario',    'sistema', GETDATE());
    PRINT 'Seed T_ConfiguracionSistema insertado.';
END
GO

-- ============================================================
-- PARTE 4: ACK, REACCIONES Y EVENTOS DE GRUPO
-- ============================================================

-- AckEstado en bases existentes (0=pendiente,1=enviado_servidor,2=entregado,3=leído,4=reproducido)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('T_MensajeCola') AND name = 'AckEstado')
BEGIN
    ALTER TABLE [T_MensajeCola] ADD [AckEstado] INT NOT NULL DEFAULT 0;
    PRINT 'Columna AckEstado agregada a T_MensajeCola.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_MensajeReaccion')
BEGIN
    CREATE TABLE [T_MensajeReaccion] (
        [Id]            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_T_MensajeReaccion PRIMARY KEY,
        [WhatsAppId]    VARCHAR(50)   NOT NULL,
        [Emoji]         NVARCHAR(10)  NOT NULL,
        [SenderId]      VARCHAR(30)   NOT NULL,
        [FechaReaccion] DATETIME      NOT NULL,
        [Estado]        BIT           NOT NULL DEFAULT 1
    );
    PRINT 'Tabla T_MensajeReaccion creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'T_GrupoEvento')
BEGIN
    CREATE TABLE [T_GrupoEvento] (
        [Id]          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_T_GrupoEvento PRIMARY KEY,
        [ChatId]      VARCHAR(50)   NOT NULL,
        [Tipo]        VARCHAR(30)   NOT NULL,
        [Author]      VARCHAR(30)   NOT NULL,
        [Recipients]  NVARCHAR(MAX) NULL,
        [FechaEvento] DATETIME      NOT NULL,
        [Estado]      BIT           NOT NULL DEFAULT 1
    );
    PRINT 'Tabla T_GrupoEvento creada.';
END
GO

-- MimeType VARCHAR(255) en bases existentes (era VARCHAR(50), insuficiente para MIME types de Office como .docx/.xlsx)
IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('T_MensajeCola') AND name = 'MimeType'
      AND max_length < 255
)
BEGIN
    ALTER TABLE [T_MensajeCola] ALTER COLUMN [MimeType] VARCHAR(255) NULL;
    PRINT 'Columna MimeType en T_MensajeCola ampliada a VARCHAR(255).';
END
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('T_MensajeEntrante') AND name = 'MimeType'
      AND max_length < 255
)
BEGIN
    ALTER TABLE [T_MensajeEntrante] ALTER COLUMN [MimeType] VARCHAR(255) NULL;
    PRINT 'Columna MimeType en T_MensajeEntrante ampliada a VARCHAR(255).';
END
GO

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
PRINT '';
PRINT '=== TABLAS CREADAS ===';
SELECT t.name AS Tabla, COUNT(c.name) AS Columnas, t.create_date AS CreadoEn
FROM sys.tables t
JOIN sys.columns c ON c.object_id = t.object_id
WHERE t.name LIKE 'T_%'
GROUP BY t.name, t.create_date
ORDER BY t.name;

PRINT '';
PRINT '=== DATOS SEED ===';
SELECT 'T_MensajeColaEstado'    AS Tabla, COUNT(*) AS Registros FROM T_MensajeColaEstado    UNION ALL
SELECT 'T_MensajeEntranteEstado',          COUNT(*) FROM T_MensajeEntranteEstado             UNION ALL
SELECT 'T_TipoMensaje',                    COUNT(*) FROM T_TipoMensaje                       UNION ALL
SELECT 'T_Usuario',                        COUNT(*) FROM T_Usuario                           UNION ALL
SELECT 'T_PipelineEtapa',                  COUNT(*) FROM T_PipelineEtapa                     UNION ALL
SELECT 'T_ConfiguracionSistema',           COUNT(*) FROM T_ConfiguracionSistema;
GO

PRINT '>>> Script completado. Base de datos WA_Cola (SQL Server) lista.';
GO

-- =============================================
-- Configuración de Proveedor WhatsApp
-- =============================================
IF NOT EXISTS (SELECT 1 FROM TConfiguracionSistema WHERE Clave = 'whatsapp_proveedor')
    INSERT INTO TConfiguracionSistema (Clave, Valor, Tipo, Descripcion, UsuarioModificacion, FechaModificacion)
    VALUES ('whatsapp_proveedor', 'wwebjs', 'string', 'Proveedor activo de WhatsApp: wwebjs | baileys', 'sistema', GETDATE());
GO

IF NOT EXISTS (SELECT 1 FROM TConfiguracionSistema WHERE Clave = 'whatsapp_wwebjs_url')
    INSERT INTO TConfiguracionSistema (Clave, Valor, Tipo, Descripcion, UsuarioModificacion, FechaModificacion)
    VALUES ('whatsapp_wwebjs_url', 'http://localhost:3000', 'string', 'URL del servicio whatsapp-web.js', 'sistema', GETDATE());
GO

IF NOT EXISTS (SELECT 1 FROM TConfiguracionSistema WHERE Clave = 'whatsapp_baileys_url')
    INSERT INTO TConfiguracionSistema (Clave, Valor, Tipo, Descripcion, UsuarioModificacion, FechaModificacion)
    VALUES ('whatsapp_baileys_url', 'http://localhost:3002', 'string', 'URL del servicio Baileys (WebSocket directo)', 'sistema', GETDATE());
GO

IF NOT EXISTS (SELECT 1 FROM TConfiguracionSistema WHERE Clave = 'whatsapp_pairing_code')
    INSERT INTO TConfiguracionSistema (Clave, Valor, Tipo, Descripcion, UsuarioModificacion, FechaModificacion)
    VALUES ('whatsapp_pairing_code', '', 'string', 'Codigo de emparejamiento Baileys (temporal, se renueva al solicitarlo)', 'sistema', GETDATE());
GO

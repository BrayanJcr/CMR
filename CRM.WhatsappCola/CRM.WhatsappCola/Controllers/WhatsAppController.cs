using CRM.WhatsappCola.DTOs;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.WhatsappCola.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WhatsAppController : ControllerBase
    {
        private readonly  WA_ColaContext _db;

        public WhatsAppController(WA_ColaContext db)
        {
            _db = db;
        }

        [HttpPost("agendar"), DisableRequestSizeLimit]
        public async Task<IActionResult> Agendar([FromBody] WhatsAppRecepcionDTO agendarDto)
        {
            try
            {
                var cola = new ColaService(_db);
                ResultadoAgendarDTO resultado = cola.AgendarMensaje(agendarDto);
                return Ok(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }            
        }

        [HttpPost("enviar"), DisableRequestSizeLimit]
        public async Task<IActionResult> Enviar([FromBody] int idMensaje)
        {
            try
            {
                var cola = new ColaService(_db);
                ResultadoEnviarDTO resultado = cola.EnviarMensaje(idMensaje);
                return Ok(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>
        /// Obtiene el estado del mensaje
        /// </summary>
        /// <param name="idMensaje"></param>
        /// <returns></returns>
        [HttpPost("obtenerEstado")]
        public async Task<IActionResult> ObtenerEstado([FromBody] int idMensaje)
        {
            try
            {
                var cola = new ColaService(_db);
                ResultadoObtenerEstadoDTO resultado = cola.ObtenerEstado(idMensaje);
                return Ok(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>
        /// Inicializa el servicio de whatsapp
        /// </summary>
        /// <returns></returns>
        [HttpPost("iniciar-cliente")]
        public async Task<IActionResult> IniciarCliente()
        {
            try
            {
                var cola = new ColaService(_db);
                ResultadoInicializarDTO resultado = cola.IniciarCliente();
                return Ok(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        [HttpGet("obtenerNumero")]
        public async Task<IActionResult> ObtenerNumero()
        {
            try
            {
                var cola = new ColaService(_db);
                var resultado = cola.ObtenerNumero();
                return Ok(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        [HttpGet("foto-perfil")]
        public IActionResult ObtenerFotoPerfil([FromQuery] string numero)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(numero)) return Ok(new { url = (string?)null });
                using var wc = new System.Net.WebClient();
                var resp = wc.DownloadString($"{GetBaileysUrl()}/profile-pic?contactId={Uri.EscapeDataString(numero)}");
                return Content(resp, "application/json");
            }
            catch { return Ok(new { url = (string?)null }); }
        }

        [HttpPost("cerrar-sesion")]
        public async Task<IActionResult> CerrarSesion([FromBody] WhatsAppCerrarSesionDTO dto)
        {
            try
            {
                var cola = new ColaService(_db);
                var resultado = cola.CerrarSesion(dto?.Numero);
                return Ok(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        // POST /api/WhatsApp/cambiar-proveedor
        [HttpPost("cambiar-proveedor")]
        public IActionResult CambiarProveedor([FromBody] WhatsAppCambiarProveedorDTO dto)
        {
            try
            {
                if (dto.Proveedor != "wwebjs" && dto.Proveedor != "baileys")
                    return BadRequest(new { Estado = false, Respuesta = "Proveedor inválido. Use 'wwebjs' o 'baileys'" });

                using var scope = HttpContext.RequestServices.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<WA_ColaContext>();

                void ActualizarConfig(string clave, string valor)
                {
                    var cfg = db.TConfiguracionSistema.FirstOrDefault(c => c.Clave == clave);
                    if (cfg == null) return;
                    cfg.Valor = valor;
                    cfg.UsuarioModificacion = "webapp";
                    cfg.FechaModificacion = DateTime.Now;
                }

                ActualizarConfig("whatsapp_proveedor", dto.Proveedor);
                // Limpiar estado de conexión al cambiar proveedor
                ActualizarConfig("whatsapp_estado", "desconectado");
                ActualizarConfig("whatsapp_qr", "");
                ActualizarConfig("whatsapp_numero", "");
                db.SaveChanges();

                return Ok(new { Estado = true, Respuesta = $"Proveedor cambiado a {dto.Proveedor}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Estado = false, Respuesta = ex.Message });
            }
        }

        // POST /api/WhatsApp/send-message
        [HttpPost("send-message")]
        public IActionResult SendMessage([FromBody] SendMessageDTO dto)
        {
            try
            {
                var numeroCuenta = _db.TConfiguracionSistema
                    .FirstOrDefault(c => c.Clave == "whatsapp_numero")?.Valor ?? string.Empty;

                var baileys  = new BaileysProxyService(_db);
                var resultado = baileys.SendMessage(dto);

                // ── Guardar mensaje en TMensajeCola (siempre, enviado o error) ──
                var mensajeCola = new Models.TMensajeCola
                {
                    IdMensajeColaEstado = resultado.Estado ? 2 : 3,   // 2=Enviado, 3=Error
                    NumeroRemitente     = numeroCuenta,
                    NumeroDestino       = dto.Numero,
                    Mensaje             = dto.Mensaje,
                    WhatsAppId          = resultado.WhatsAppId,
                    FechaEnvio          = resultado.Estado ? DateTime.Now : (DateTime?)null,
                    AckEstado           = resultado.Estado ? 1 : 0,
                    Error               = resultado.Estado ? null : resultado.Mensage,
                    Estado              = true,
                    UsuarioCreacion     = "webapp-send",
                    UsuarioModificacion = "webapp-send",
                    FechaCreacion       = DateTime.Now,
                    FechaModificacion   = DateTime.Now
                };
                _db.TMensajeCola.Add(mensajeCola);

                // ── Upsert conversación ──
                if (!string.IsNullOrEmpty(numeroCuenta))
                {
                    var conv = _db.TConversacion.FirstOrDefault(c =>
                        c.NumeroCuenta == numeroCuenta && c.NumeroCliente == dto.Numero && c.Estado);
                    if (conv == null)
                    {
                        var modoDefecto = _db.TConfiguracionSistema
                            .FirstOrDefault(c => c.Clave == "bot_modo_defecto")?.Valor ?? "agente";

                        // Intentar obtener nombre del contacto desde Baileys (fire-and-catch)
                        string? nombreContacto = null;
                        try
                        {
                            using var wcName = new System.Net.WebClient();
                            var nameResp = wcName.DownloadString($"{GetBaileysUrl()}/contact-name?numero={Uri.EscapeDataString(dto.Numero)}");
                            var nameObj  = Newtonsoft.Json.JsonConvert.DeserializeObject<dynamic>(nameResp);
                            string? n    = nameObj?.name?.ToString();
                            if (!string.IsNullOrWhiteSpace(n)) nombreContacto = n;
                        }
                        catch { /* no bloquear el envío si Baileys no responde */ }

                        _db.TConversacion.Add(new Models.TConversacion
                        {
                            NumeroCuenta        = numeroCuenta,
                            NumeroCliente       = dto.Numero,
                            NombreContacto      = nombreContacto,
                            ModoConversacion    = modoDefecto,
                            Estado              = true,
                            UsuarioCreacion     = "webapp-send",
                            UsuarioModificacion = "webapp-send",
                            FechaCreacion       = DateTime.Now,
                            FechaModificacion   = DateTime.Now
                        });
                    }
                }

                _db.SaveChanges();

                // ── Notificar via SignalR para que el chat se actualice ──
                if (!string.IsNullOrEmpty(numeroCuenta))
                {
                    new NotificacionChatService().EnviarNotificacion_NuevoMensajeGeneral(
                        new DTOs.Notificacion.NotificacionWaChatDTO
                        {
                            NumeroCuenta  = numeroCuenta,
                            NumeroCliente = dto.Numero,
                            EsEntrante    = false
                        }, string.Empty);
                }

                // Retornar error HTTP si Baileys rechazó el envío
                return resultado.Estado ? Ok(resultado) : BadRequest(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        // POST /api/WhatsApp/send-voice
        [HttpPost("send-voice"), DisableRequestSizeLimit]
        public IActionResult SendVoice([FromBody] SendVoiceDTO dto)
        {
            try
            {
                var baileys = new BaileysProxyService(_db);
                var resultado = baileys.SendVoice(dto);
                GuardarMensajeSaliente(dto.Numero, "[Nota de voz]", resultado, mimeType: "audio/ogg");
                return resultado.Estado ? Ok(resultado) : BadRequest(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        // POST /api/WhatsApp/send-location
        [HttpPost("send-location")]
        public IActionResult SendLocation([FromBody] SendLocationDTO dto)
        {
            try
            {
                var baileys = new BaileysProxyService(_db);
                var resultado = baileys.SendLocation(dto);
                GuardarMensajeSaliente(dto.Numero, $"📍 Ubicación: {dto.Latitud}, {dto.Longitud}", resultado);
                return resultado.Estado ? Ok(resultado) : BadRequest(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        // POST /api/WhatsApp/send-poll
        [HttpPost("send-poll")]
        public IActionResult SendPoll([FromBody] SendPollDTO dto)
        {
            try
            {
                var baileys = new BaileysProxyService(_db);
                var resultado = baileys.SendPoll(dto);
                GuardarMensajeSaliente(dto.Numero, $"📊 {dto.Pregunta}", resultado);
                return resultado.Estado ? Ok(resultado) : BadRequest(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        // POST /api/WhatsApp/send-list
        [HttpPost("send-list")]
        public IActionResult SendList([FromBody] SendListDTO dto)
        {
            try
            {
                var baileys = new BaileysProxyService(_db);
                var resultado = baileys.SendList(dto);
                GuardarMensajeSaliente(dto.NumeroDestino, $"📋 {dto.Titulo}", resultado);
                return resultado.Estado ? Ok(resultado) : BadRequest(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        // POST /api/WhatsApp/send-contact-card
        [HttpPost("send-contact-card")]
        public IActionResult SendContactCard([FromBody] SendContactCardDTO dto)
        {
            try
            {
                var baileys = new BaileysProxyService(_db);
                var resultado = baileys.SendContactCard(dto);
                GuardarMensajeSaliente(dto.NumeroDestino, "📇 Tarjeta de contacto", resultado);
                return resultado.Estado ? Ok(resultado) : BadRequest(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        // POST /api/WhatsApp/send-reaction
        [HttpPost("send-reaction")]
        public IActionResult SendReaction([FromBody] SendReactionDTO dto)
        {
            try
            {
                var baileys = new BaileysProxyService(_db);
                var resultado = baileys.SendReaction(dto);
                return Ok(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        // POST /api/WhatsApp/send-ephemeral
        [HttpPost("send-ephemeral")]
        public IActionResult SendEphemeral([FromBody] SendEphemeralDTO dto)
        {
            try
            {
                var baileys = new BaileysProxyService(_db);
                var resultado = baileys.SendEphemeral(dto);
                GuardarMensajeSaliente(dto.Numero, dto.Mensaje, resultado);
                return resultado.Estado ? Ok(resultado) : BadRequest(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        // GET /api/WhatsApp/solicitar-pairing-code?numero={numero}
        [HttpGet("solicitar-pairing-code")]
        public IActionResult SolicitarPairingCode([FromQuery] string numero)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(numero))
                    return BadRequest(new ResultadoPairingCodeDTO { Estado = false, Respuesta = "El número es obligatorio" });

                using var scope = HttpContext.RequestServices.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<WA_ColaContext>();

                // Verificar que el proveedor activo sea Baileys
                var proveedor = db.TConfiguracionSistema.FirstOrDefault(c => c.Clave == "whatsapp_proveedor")?.Valor ?? "wwebjs";
                if (proveedor != "baileys")
                    return BadRequest(new ResultadoPairingCodeDTO { Estado = false, Respuesta = "El pairing code solo está disponible con el proveedor Baileys" });

                var baileysUrl = db.TConfiguracionSistema.FirstOrDefault(c => c.Clave == "whatsapp_baileys_url")?.Valor ?? "http://localhost:3002";

                using var webclient = new System.Net.WebClient();
                webclient.Headers.Add("Content-Type", "application/json");
                var encoded = Uri.EscapeDataString(numero);
                var response = webclient.DownloadString($"{baileysUrl}/request-pairing-code?phoneNumber={encoded}");
                var dto = Newtonsoft.Json.JsonConvert.DeserializeObject<dynamic>(response);

                string code = dto?.pairingCode?.ToString() ?? dto?.messageResponse?.ToString() ?? "";

                // Guardar en BD para que la UI lo pueda leer
                var config = db.TConfiguracionSistema.FirstOrDefault(c => c.Clave == "whatsapp_pairing_code");
                if (config != null)
                {
                    config.Valor = code;
                    config.UsuarioModificacion = "webapp";
                    config.FechaModificacion = DateTime.Now;
                    db.SaveChanges();
                }

                return Ok(new ResultadoPairingCodeDTO { Estado = true, Codigo = code, Respuesta = code });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ResultadoPairingCodeDTO { Estado = false, Respuesta = ex.Message });
            }
        }

        // ==================== HELPER — Guardar mensaje saliente + SignalR ====================

        private void GuardarMensajeSaliente(string numeroDestino, string mensaje, WARespuestaDTO resultado,
            string? adjuntoBase64 = null, string? nombreArchivo = null, string? mimeType = null)
        {
            var numeroCuenta = _db.TConfiguracionSistema
                .FirstOrDefault(c => c.Clave == "whatsapp_numero")?.Valor ?? string.Empty;

            _db.TMensajeCola.Add(new Models.TMensajeCola
            {
                IdMensajeColaEstado = resultado.Estado ? 2 : 3,
                NumeroRemitente     = numeroCuenta,
                NumeroDestino       = numeroDestino,
                Mensaje             = mensaje,
                AdjuntoBase64       = adjuntoBase64,
                NombreArchivo       = nombreArchivo,
                MimeType            = mimeType,
                WhatsAppId          = resultado.WhatsAppId,
                FechaEnvio          = resultado.Estado ? DateTime.Now : (DateTime?)null,
                AckEstado           = resultado.Estado ? 1 : 0,
                Error               = resultado.Estado ? null : resultado.Mensage,
                Estado              = true,
                UsuarioCreacion     = "webapp-send",
                UsuarioModificacion = "webapp-send",
                FechaCreacion       = DateTime.Now,
                FechaModificacion   = DateTime.Now
            });

            // Upsert conversación
            if (!string.IsNullOrEmpty(numeroCuenta))
            {
                var conv = _db.TConversacion.FirstOrDefault(c =>
                    c.NumeroCuenta == numeroCuenta && c.NumeroCliente == numeroDestino && c.Estado);
                if (conv == null)
                {
                    var modoDefecto = _db.TConfiguracionSistema
                        .FirstOrDefault(c => c.Clave == "bot_modo_defecto")?.Valor ?? "agente";
                    _db.TConversacion.Add(new Models.TConversacion
                    {
                        NumeroCuenta        = numeroCuenta,
                        NumeroCliente       = numeroDestino,
                        ModoConversacion    = modoDefecto,
                        Estado              = true,
                        UsuarioCreacion     = "webapp-send",
                        UsuarioModificacion = "webapp-send",
                        FechaCreacion       = DateTime.Now,
                        FechaModificacion   = DateTime.Now
                    });
                }
            }
            _db.SaveChanges();

            // SignalR
            if (!string.IsNullOrEmpty(numeroCuenta))
            {
                new NotificacionChatService().EnviarNotificacion_NuevoMensajeGeneral(
                    new DTOs.Notificacion.NotificacionWaChatDTO
                    {
                        NumeroCuenta  = numeroCuenta,
                        NumeroCliente = numeroDestino,
                        EsEntrante    = false
                    }, string.Empty);
            }
        }

        // ==================== BAILEYS DIRECT ENDPOINTS ====================

        private string GetBaileysUrl() =>
            _db.TConfiguracionSistema.FirstOrDefault(c => c.Clave == "whatsapp_baileys_url")?.Valor
            ?? "http://localhost:3002";

        /// <summary>GET /api/WhatsApp/baileys/status — estado de conexión Baileys</summary>
        [HttpGet("baileys/status")]
        public IActionResult BaileysStatus()
        {
            try
            {
                using var wc = new System.Net.WebClient();
                var resp = wc.DownloadString($"{GetBaileysUrl()}/get-active-number");
                var obj = Newtonsoft.Json.JsonConvert.DeserializeObject<dynamic>(resp);
                bool active = (bool?)obj?.responseStatus == true;
                string number = obj?.number?.ToString() ?? "";
                return Ok(new { Estado = active ? "conectado" : "desconectado", Numero = number });
            }
            catch
            {
                return Ok(new { Estado = "desconectado", Numero = "" });
            }
        }

        /// <summary>POST /api/WhatsApp/baileys/iniciar — inicializa el cliente Baileys (QR o pairing)</summary>
        [HttpPost("baileys/iniciar")]
        public IActionResult BaileysIniciar([FromQuery] string? phoneNumber = null)
        {
            try
            {
                using var wc = new System.Net.WebClient();
                var url = string.IsNullOrWhiteSpace(phoneNumber)
                    ? $"{GetBaileysUrl()}/client-initialize"
                    : $"{GetBaileysUrl()}/client-initialize?phoneNumber={Uri.EscapeDataString(phoneNumber)}";
                var resp = wc.DownloadString(url);
                return Content(resp, "application/json");
            }
            catch (Exception ex)
            {
                return BadRequest(new { Estado = false, Respuesta = ex.Message });
            }
        }

        /// <summary>POST /api/WhatsApp/baileys/cerrar-sesion — cierra sesión Baileys</summary>
        [HttpPost("baileys/cerrar-sesion")]
        public IActionResult BaileysLogout()
        {
            try
            {
                using var wc = new System.Net.WebClient();
                var resp = wc.DownloadString($"{GetBaileysUrl()}/logout");
                return Content(resp, "application/json");
            }
            catch (Exception ex)
            {
                return BadRequest(new { Estado = false, Respuesta = ex.Message });
            }
        }

        /// <summary>DELETE /api/WhatsApp/baileys/limpiar-sesion — borra sesión corrupta y resetea el cliente Baileys</summary>
        [HttpDelete("baileys/limpiar-sesion")]
        public IActionResult BaileysLimpiarSesion()
        {
            try
            {
                using var wc = new System.Net.WebClient();
                // WebClient no soporta DELETE directamente, usamos HttpClient inline
                using var http = new System.Net.Http.HttpClient();
                var task = http.DeleteAsync($"{GetBaileysUrl()}/admin/limpiar-sesion");
                task.Wait();
                var body = task.Result.Content.ReadAsStringAsync().Result;
                return Content(body, "application/json");
            }
            catch (Exception ex)
            {
                return BadRequest(new { Estado = false, Respuesta = ex.Message });
            }
        }

        /// <summary>GET /api/WhatsApp/baileys/pairing-code?numero=xxx — solicita pairing code a Baileys</summary>
        [HttpGet("baileys/pairing-code")]
        public IActionResult BaileysPairingCode([FromQuery] string numero)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(numero))
                    return BadRequest(new { Estado = false, Respuesta = "El número es obligatorio" });

                using var wc = new System.Net.WebClient();
                var resp = wc.DownloadString($"{GetBaileysUrl()}/request-pairing-code?phoneNumber={Uri.EscapeDataString(numero)}");
                var obj = Newtonsoft.Json.JsonConvert.DeserializeObject<dynamic>(resp);
                string code = obj?.pairingCode?.ToString() ?? obj?.messageResponse?.ToString() ?? "";
                return Ok(new { Estado = !string.IsNullOrEmpty(code), Codigo = code, Respuesta = code });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Estado = false, Respuesta = ex.Message });
            }
        }

        /// <summary>POST /api/WhatsApp/send-multimedia-message — envía archivo multimedia via Baileys</summary>
        [HttpPost("send-multimedia-message"), DisableRequestSizeLimit]
        public IActionResult SendMultimediaMessage([FromBody] SendMultimediaDTO dto)
        {
            try
            {
                var numeroCuenta = _db.TConfiguracionSistema
                    .FirstOrDefault(c => c.Clave == "whatsapp_numero")?.Valor ?? string.Empty;

                var baileys   = new BaileysProxyService(_db);
                var resultado = baileys.SendMultimedia(dto);

                // Guardar en TMensajeCola
                var mensajeCola = new Models.TMensajeCola
                {
                    IdMensajeColaEstado = resultado.Estado ? 2 : 3,
                    NumeroRemitente     = numeroCuenta,
                    NumeroDestino       = dto.Numero,
                    Mensaje             = dto.Caption ?? $"[{dto.MimeType}] {dto.NombreArchivo}",
                    AdjuntoBase64       = dto.Base64,
                    NombreArchivo       = dto.NombreArchivo,
                    MimeType            = dto.MimeType,
                    WhatsAppId          = resultado.WhatsAppId,
                    FechaEnvio          = resultado.Estado ? DateTime.Now : (DateTime?)null,
                    AckEstado           = resultado.Estado ? 1 : 0,
                    Error               = resultado.Estado ? null : resultado.Mensage,
                    Estado              = true,
                    UsuarioCreacion     = "webapp-send",
                    UsuarioModificacion = "webapp-send",
                    FechaCreacion       = DateTime.Now,
                    FechaModificacion   = DateTime.Now
                };
                _db.TMensajeCola.Add(mensajeCola);

                // Upsert conversación
                if (!string.IsNullOrEmpty(numeroCuenta))
                {
                    var conv = _db.TConversacion.FirstOrDefault(c =>
                        c.NumeroCuenta == numeroCuenta && c.NumeroCliente == dto.Numero && c.Estado);
                    if (conv == null)
                    {
                        var modoDefecto = _db.TConfiguracionSistema
                            .FirstOrDefault(c => c.Clave == "bot_modo_defecto")?.Valor ?? "agente";
                        _db.TConversacion.Add(new Models.TConversacion
                        {
                            NumeroCuenta        = numeroCuenta,
                            NumeroCliente       = dto.Numero,
                            ModoConversacion    = modoDefecto,
                            Estado              = true,
                            UsuarioCreacion     = "webapp-send",
                            UsuarioModificacion = "webapp-send",
                            FechaCreacion       = DateTime.Now,
                            FechaModificacion   = DateTime.Now
                        });
                    }
                }
                _db.SaveChanges();

                // Notificar via SignalR
                if (!string.IsNullOrEmpty(numeroCuenta))
                {
                    new NotificacionChatService().EnviarNotificacion_NuevoMensajeGeneral(
                        new DTOs.Notificacion.NotificacionWaChatDTO
                        {
                            NumeroCuenta  = numeroCuenta,
                            NumeroCliente = dto.Numero,
                            EsEntrante    = false
                        }, string.Empty);
                }

                return resultado.Estado ? Ok(resultado) : BadRequest(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>GET /api/WhatsApp/baileys/proxy/{*path} — proxy genérico GET a Baileys</summary>
        [HttpGet("baileys/proxy/{**path}")]
        public IActionResult BaileysProxyGet(string path)
        {
            try
            {
                var queryString = HttpContext.Request.QueryString.Value ?? "";
                using var http = new System.Net.Http.HttpClient();
                http.Timeout = TimeSpan.FromSeconds(30);
                var response = http.GetAsync($"{GetBaileysUrl()}/{path}{queryString}").Result;
                var body = response.Content.ReadAsStringAsync().Result;
                return Content(body, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>POST /api/WhatsApp/baileys/proxy/{*path} — proxy genérico POST a Baileys</summary>
        [HttpPost("baileys/proxy/{**path}")]
        public async Task<IActionResult> BaileysProxyPost(string path)
        {
            try
            {
                using var reader = new System.IO.StreamReader(Request.Body);
                var requestBody = await reader.ReadToEndAsync();
                using var http = new System.Net.Http.HttpClient();
                http.Timeout = TimeSpan.FromSeconds(30);
                var content = new System.Net.Http.StringContent(requestBody, System.Text.Encoding.UTF8, "application/json");
                var response = await http.PostAsync($"{GetBaileysUrl()}/{path}", content);
                var body = await response.Content.ReadAsStringAsync();
                return Content(body, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>DELETE /api/WhatsApp/baileys/proxy/{*path} — proxy genérico DELETE a Baileys</summary>
        [HttpDelete("baileys/proxy/{**path}")]
        public async Task<IActionResult> BaileysProxyDelete(string path)
        {
            try
            {
                using var http = new System.Net.Http.HttpClient();
                http.Timeout = TimeSpan.FromSeconds(30);
                var response = await http.DeleteAsync($"{GetBaileysUrl()}/{path}");
                var body = await response.Content.ReadAsStringAsync();
                return Content(body, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}

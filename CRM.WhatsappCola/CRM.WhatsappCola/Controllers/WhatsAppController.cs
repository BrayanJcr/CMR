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
        public async Task<IActionResult> ObtenerFotoPerfil([FromQuery] string numero)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(numero))
                    return BadRequest("El número es requerido");

                var waQr = new WaQrService();
                var url = waQr.ObtenerFotoPerfil(numero);
                return Ok(new { url });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
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
    }
}

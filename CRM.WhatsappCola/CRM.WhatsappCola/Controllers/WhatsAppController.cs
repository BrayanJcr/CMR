using CRM.WhatsappCola.DTOs;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

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
    }
}

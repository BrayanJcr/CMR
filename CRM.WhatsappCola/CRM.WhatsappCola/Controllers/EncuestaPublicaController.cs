using CRM.WhatsappCola.DTOs.CRM;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Controllers
{
    /// <summary>
    /// Controlador publico de encuestas (sin autenticacion requerida)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class EncuestaPublicaController : ControllerBase
    {
        private readonly WA_ColaContext _db;
        private readonly EncuestaService _service;

        public EncuestaPublicaController(WA_ColaContext db)
        {
            _db = db;
            _service = new EncuestaService(_db);
        }

        /// <summary>Obtiene el formulario publico de una encuesta por token</summary>
        [HttpGet("formulario/{token}")]
        public async Task<IActionResult> GetFormulario(string token)
        {
            try
            {
                var formulario = await _service.ObtenerFormularioPublico(token);
                if (formulario == null) return NotFound("Token invalido o encuesta no encontrada");
                return Ok(formulario);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Guarda las respuestas de un encuestado</summary>
        [HttpPost("responder/{token}")]
        public async Task<IActionResult> Responder(string token, [FromBody] EncuestaResponderDTO dto)
        {
            try
            {
                var ok = await _service.SubmitRespuestas(token, dto);
                if (!ok) return BadRequest("Token invalido o encuesta ya completada");
                return Ok(new { Mensaje = "Respuestas guardadas correctamente. Gracias por participar." });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }
    }
}

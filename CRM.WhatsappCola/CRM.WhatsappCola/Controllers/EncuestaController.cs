using CRM.WhatsappCola.DTOs.CRM;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Controllers
{
    /// <summary>
    /// Controlador de encuestas y formularios
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class EncuestaController : ControllerBase
    {
        private readonly WA_ColaContext _db;
        private readonly EncuestaService _service;

        public EncuestaController(WA_ColaContext db)
        {
            _db = db;
            _service = new EncuestaService(_db);
        }

        /// <summary>Obtiene todas las encuestas</summary>
        [HttpGet]
        public async Task<IActionResult> Get()
        {
            try
            {
                var lista = await _service.ObtenerTodas();
                return Ok(lista);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Obtiene una encuesta por Id</summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var encuesta = await _service.ObtenerPorId(id);
                if (encuesta == null) return NotFound("Encuesta no encontrada");
                return Ok(encuesta);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Obtiene los resultados agregados de una encuesta</summary>
        [HttpGet("{id}/resultados")]
        public async Task<IActionResult> GetResultados(int id)
        {
            try
            {
                var resultados = await _service.ObtenerResultados(id);
                if (resultados == null) return NotFound("Encuesta no encontrada");
                return Ok(resultados);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Crea una nueva encuesta</summary>
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] EncuestaCreateDTO dto)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var result = await _service.Crear(dto, usuario);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Actualiza una encuesta</summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Put(int id, [FromBody] EncuestaCreateDTO dto)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var result = await _service.Actualizar(id, dto, usuario);
                if (result == null) return NotFound("Encuesta no encontrada");
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Envia la encuesta a una lista de contactos</summary>
        [HttpPost("{id}/enviar")]
        public async Task<IActionResult> Enviar(int id, [FromBody] EncuestaEnviarDTO dto)
        {
            try
            {
                string usuario = ObtenerUsuario();
                int enviados = await _service.EnviarEncuesta(id, dto.IdsContactos, usuario);
                return Ok(new { Mensaje = $"Encuesta enviada a {enviados} contacto(s)", Enviados = enviados });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Elimina una encuesta (soft delete)</summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var ok = await _service.Eliminar(id, usuario);
                if (!ok) return NotFound("Encuesta no encontrada");
                return Ok(new { Mensaje = "Encuesta eliminada correctamente" });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        private string ObtenerUsuario()
        {
            return User?.Identity?.Name ?? "sistema";
        }
    }
}

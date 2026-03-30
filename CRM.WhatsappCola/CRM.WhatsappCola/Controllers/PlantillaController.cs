using CRM.WhatsappCola.DTOs.CRM;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Controllers
{
    /// <summary>
    /// Controlador de plantillas de mensajes
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class PlantillaController : ControllerBase
    {
        private readonly WA_ColaContext _db;
        private readonly PlantillaService _service;

        public PlantillaController(WA_ColaContext db)
        {
            _db = db;
            _service = new PlantillaService(_db);
        }

        /// <summary>Obtiene todas las plantillas</summary>
        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] string categoria = null)
        {
            try
            {
                var lista = await _service.ObtenerTodas(categoria);
                return Ok(lista);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Obtiene una plantilla por Id</summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var plantilla = await _service.ObtenerPorId(id);
                if (plantilla == null) return NotFound("Plantilla no encontrada");
                return Ok(plantilla);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Crea una nueva plantilla</summary>
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] PlantillaCreateDTO dto)
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

        /// <summary>Actualiza una plantilla</summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Put(int id, [FromBody] PlantillaCreateDTO dto)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var updateDto = new PlantillaUpdateDTO
                {
                    Id = id,
                    Nombre = dto.Nombre,
                    Categoria = dto.Categoria,
                    Contenido = dto.Contenido,
                    Variables = dto.Variables,
                    Estado = dto.Estado
                };
                var result = await _service.Actualizar(updateDto, usuario);
                if (result == null) return NotFound("Plantilla no encontrada");
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Elimina una plantilla (soft delete)</summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var ok = await _service.Eliminar(id, usuario);
                if (!ok) return NotFound("Plantilla no encontrada");
                return Ok(new { Mensaje = "Plantilla eliminada correctamente" });
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

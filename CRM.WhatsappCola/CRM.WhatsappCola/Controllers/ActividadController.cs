using CRM.WhatsappCola.DTOs.CRM;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Controllers
{
    /// <summary>
    /// Controlador de actividades CRM
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ActividadController : ControllerBase
    {
        private readonly WA_ColaContext _db;
        private readonly ActividadService _service;

        public ActividadController(WA_ColaContext db)
        {
            _db = db;
            _service = new ActividadService(_db);
        }

        /// <summary>Obtiene actividades con filtros opcionales</summary>
        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] int? idContacto,
            [FromQuery] int? idEmpresa,
            [FromQuery] int? idOportunidad,
            [FromQuery] string estadoActividad)
        {
            try
            {
                var lista = await _service.ObtenerTodas(idContacto, idEmpresa, idOportunidad, estadoActividad);
                return Ok(lista);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Obtiene una actividad por Id</summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var actividad = await _service.ObtenerPorId(id);
                if (actividad == null) return NotFound("Actividad no encontrada");
                return Ok(actividad);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Crea una nueva actividad</summary>
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] ActividadCreateDTO dto)
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

        /// <summary>Actualiza una actividad</summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Put(int id, [FromBody] ActividadCreateDTO dto)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var updateDto = new ActividadUpdateDTO
                {
                    Id = id,
                    Tipo = dto.Tipo,
                    Titulo = dto.Titulo,
                    Descripcion = dto.Descripcion,
                    FechaActividad = dto.FechaActividad,
                    EstadoActividad = dto.EstadoActividad,
                    IdResponsable = dto.IdResponsable,
                    IdContacto = dto.IdContacto,
                    IdEmpresa = dto.IdEmpresa,
                    IdOportunidad = dto.IdOportunidad
                };
                var result = await _service.Actualizar(updateDto, usuario);
                if (result == null) return NotFound("Actividad no encontrada");
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Elimina una actividad (soft delete)</summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var ok = await _service.Eliminar(id, usuario);
                if (!ok) return NotFound("Actividad no encontrada");
                return Ok(new { Mensaje = "Actividad eliminada correctamente" });
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

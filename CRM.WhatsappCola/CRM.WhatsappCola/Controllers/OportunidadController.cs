using CRM.WhatsappCola.DTOs.CRM;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Controllers
{
    /// <summary>
    /// Controlador de oportunidades de venta
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class OportunidadController : ControllerBase
    {
        private readonly WA_ColaContext _db;
        private readonly OportunidadService _service;

        public OportunidadController(WA_ColaContext db)
        {
            _db = db;
            _service = new OportunidadService(_db);
        }

        /// <summary>Obtiene lista de oportunidades</summary>
        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] int? idEtapa, [FromQuery] int? idContacto, [FromQuery] int? idEmpresa)
        {
            try
            {
                var lista = await _service.ObtenerTodas(idEtapa, idContacto, idEmpresa);
                return Ok(lista);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Obtiene una oportunidad por Id</summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var oportunidad = await _service.ObtenerPorId(id);
                if (oportunidad == null) return NotFound("Oportunidad no encontrada");
                return Ok(oportunidad);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Crea una nueva oportunidad</summary>
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] OportunidadCreateDTO dto)
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

        /// <summary>Actualiza una oportunidad</summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Put(int id, [FromBody] OportunidadCreateDTO dto)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var updateDto = new OportunidadUpdateDTO
                {
                    Id = id,
                    Titulo = dto.Titulo,
                    IdContacto = dto.IdContacto,
                    IdEmpresa = dto.IdEmpresa,
                    IdResponsable = dto.IdResponsable,
                    IdEtapa = dto.IdEtapa,
                    MontoEstimado = dto.MontoEstimado,
                    Moneda = dto.Moneda,
                    Probabilidad = dto.Probabilidad,
                    FechaCierre = dto.FechaCierre,
                    Origen = dto.Origen,
                    Prioridad = dto.Prioridad,
                    Notas = dto.Notas,
                    Productos = dto.Productos
                };
                var result = await _service.Actualizar(updateDto, usuario);
                if (result == null) return NotFound("Oportunidad no encontrada");
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Mueve la oportunidad a una nueva etapa</summary>
        [HttpPut("{id}/etapa")]
        public async Task<IActionResult> MoverEtapa(int id, [FromBody] MoverEtapaDTO dto)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var result = await _service.MoverEtapa(id, dto.IdEtapa, usuario);
                if (result == null) return NotFound("Oportunidad no encontrada");
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Elimina una oportunidad (soft delete)</summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var ok = await _service.Eliminar(id, usuario);
                if (!ok) return NotFound("Oportunidad no encontrada");
                return Ok(new { Mensaje = "Oportunidad eliminada correctamente" });
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

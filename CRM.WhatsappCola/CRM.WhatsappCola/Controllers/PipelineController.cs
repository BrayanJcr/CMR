using CRM.WhatsappCola.DTOs.CRM;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Controllers
{
    /// <summary>
    /// Controlador del pipeline de ventas
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class PipelineController : ControllerBase
    {
        private readonly WA_ColaContext _db;
        private readonly PipelineService _service;

        public PipelineController(WA_ColaContext db)
        {
            _db = db;
            _service = new PipelineService(_db);
        }

        /// <summary>Obtiene todas las etapas del pipeline</summary>
        [HttpGet]
        [HttpGet("etapas")]
        public async Task<IActionResult> Get()
        {
            try
            {
                var etapas = await _service.ObtenerEtapas();
                return Ok(etapas);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Obtiene el kanban con etapas y oportunidades</summary>
        [HttpGet("kanban")]
        public async Task<IActionResult> GetKanban()
        {
            try
            {
                var kanban = await _service.ObtenerKanban();
                return Ok(kanban);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Crea una nueva etapa</summary>
        [HttpPost("etapas")]
        public async Task<IActionResult> PostEtapa([FromBody] PipelineEtapaCreateDTO dto)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var result = await _service.CrearEtapa(dto, usuario);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Actualiza una etapa del pipeline</summary>
        [HttpPut("etapas/{id}")]
        public async Task<IActionResult> PutEtapa(int id, [FromBody] PipelineEtapaCreateDTO dto)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var result = await _service.ActualizarEtapa(id, dto, usuario);
                if (result == null) return NotFound("Etapa no encontrada");
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Reordena etapas (recibe lista de ids en nuevo orden)</summary>
        [HttpPut("etapas/reordenar")]
        public async Task<IActionResult> ReordenarEtapas([FromBody] List<int> idsOrdenados)
        {
            try
            {
                string usuario = ObtenerUsuario();
                for (int i = 0; i < idsOrdenados.Count; i++)
                {
                    var etapa = await _db.TPipelineEtapa.FindAsync(idsOrdenados[i]);
                    if (etapa != null)
                    {
                        etapa.Orden = i + 1;
                        etapa.UsuarioModificacion = usuario;
                        etapa.FechaModificacion = DateTime.Now;
                    }
                }
                await _db.SaveChangesAsync();
                var etapas = await _service.ObtenerEtapas();
                return Ok(etapas);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Elimina una etapa (soft delete)</summary>
        [HttpDelete("etapas/{id}")]
        public async Task<IActionResult> DeleteEtapa(int id)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var ok = await _service.EliminarEtapa(id, usuario);
                if (!ok) return NotFound("Etapa no encontrada");
                return Ok(new { Mensaje = "Etapa eliminada correctamente" });
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

using CRM.WhatsappCola.DTOs.CRM;
using CRM.WhatsappCola.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Controllers
{
    /// <summary>
    /// Controlador de etiquetas CRM
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class EtiquetaController : ControllerBase
    {
        private readonly WA_ColaContext _db;

        public EtiquetaController(WA_ColaContext db)
        {
            _db = db;
        }

        /// <summary>Obtiene todas las etiquetas activas</summary>
        [HttpGet]
        public async Task<IActionResult> Get()
        {
            try
            {
                var lista = await _db.TEtiqueta
                    .Where(e => e.Estado)
                    .OrderBy(e => e.Nombre)
                    .Select(e => new EtiquetaDTO
                    {
                        Id = e.Id,
                        Nombre = e.Nombre,
                        Color = e.Color,
                        Estado = e.Estado
                    })
                    .ToListAsync();
                return Ok(lista);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Obtiene una etiqueta por Id</summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var etiqueta = await _db.TEtiqueta
                    .Where(e => e.Id == id && e.Estado)
                    .Select(e => new EtiquetaDTO
                    {
                        Id = e.Id,
                        Nombre = e.Nombre,
                        Color = e.Color,
                        Estado = e.Estado
                    })
                    .FirstOrDefaultAsync();

                if (etiqueta == null) return NotFound("Etiqueta no encontrada");
                return Ok(etiqueta);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Crea una nueva etiqueta</summary>
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] EtiquetaCreateDTO dto)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var etiqueta = new TEtiqueta
                {
                    Nombre = dto.Nombre,
                    Color = dto.Color ?? "#3B82F6",
                    Estado = true,
                    UsuarioCreacion = usuario,
                    UsuarioModificacion = usuario,
                    FechaCreacion = DateTime.Now,
                    FechaModificacion = DateTime.Now
                };
                _db.TEtiqueta.Add(etiqueta);
                await _db.SaveChangesAsync();
                return Ok(new EtiquetaDTO { Id = etiqueta.Id, Nombre = etiqueta.Nombre, Color = etiqueta.Color, Estado = etiqueta.Estado });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Actualiza una etiqueta</summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Put(int id, [FromBody] EtiquetaCreateDTO dto)
        {
            try
            {
                var etiqueta = await _db.TEtiqueta.FindAsync(id);
                if (etiqueta == null) return NotFound("Etiqueta no encontrada");

                etiqueta.Nombre = dto.Nombre;
                etiqueta.Color = dto.Color ?? "#3B82F6";
                etiqueta.UsuarioModificacion = ObtenerUsuario();
                etiqueta.FechaModificacion = DateTime.Now;

                await _db.SaveChangesAsync();
                return Ok(new EtiquetaDTO { Id = etiqueta.Id, Nombre = etiqueta.Nombre, Color = etiqueta.Color, Estado = etiqueta.Estado });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Elimina una etiqueta (soft delete)</summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var etiqueta = await _db.TEtiqueta.FindAsync(id);
                if (etiqueta == null) return NotFound("Etiqueta no encontrada");

                etiqueta.Estado = false;
                etiqueta.UsuarioModificacion = ObtenerUsuario();
                etiqueta.FechaModificacion = DateTime.Now;
                await _db.SaveChangesAsync();
                return Ok(new { Mensaje = "Etiqueta eliminada correctamente" });
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

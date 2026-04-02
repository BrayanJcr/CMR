using CRM.WhatsappCola.DTOs;
using CRM.WhatsappCola.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CRM.WhatsappCola.Controllers
{
    /// <summary>
    /// Controlador de reglas del chatbot
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class BotController : ControllerBase
    {
        private readonly WA_ColaContext _db;

        public BotController(WA_ColaContext db)
        {
            _db = db;
        }

        /// <summary>Obtiene todas las reglas activas ordenadas por prioridad</summary>
        [HttpGet("reglas")]
        public async Task<IActionResult> GetReglas()
        {
            try
            {
                var lista = await _db.TBotRegla
                    .Where(r => r.Estado)
                    .OrderBy(r => r.Prioridad)
                    .Select(r => new BotReglaDTO
                    {
                        Id = r.Id,
                        Nombre = r.Nombre,
                        Patron = r.Patron,
                        Respuesta = r.Respuesta,
                        TipoAccion = r.TipoAccion,
                        Prioridad = r.Prioridad,
                        EsActivo = r.EsActivo
                    })
                    .ToListAsync();
                return Ok(lista);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Crea una nueva regla de bot</summary>
        [HttpPost("reglas")]
        public async Task<IActionResult> PostRegla([FromBody] BotReglaDTO dto)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var regla = new TBotRegla
                {
                    Nombre = dto.Nombre,
                    Patron = dto.Patron,
                    Respuesta = dto.Respuesta,
                    TipoAccion = dto.TipoAccion,
                    Prioridad = dto.Prioridad,
                    EsActivo = dto.EsActivo,
                    Estado = true,
                    UsuarioCreacion = usuario,
                    UsuarioModificacion = usuario,
                    FechaCreacion = DateTime.Now,
                    FechaModificacion = DateTime.Now
                };
                _db.TBotRegla.Add(regla);
                await _db.SaveChangesAsync();
                return Ok(new BotReglaDTO
                {
                    Id = regla.Id,
                    Nombre = regla.Nombre,
                    Patron = regla.Patron,
                    Respuesta = regla.Respuesta,
                    TipoAccion = regla.TipoAccion,
                    Prioridad = regla.Prioridad,
                    EsActivo = regla.EsActivo
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Actualiza una regla existente</summary>
        [HttpPut("reglas/{id}")]
        public async Task<IActionResult> PutRegla(int id, [FromBody] BotReglaDTO dto)
        {
            try
            {
                var regla = await _db.TBotRegla.FindAsync(id);
                if (regla == null) return NotFound("Regla no encontrada");

                regla.Nombre = dto.Nombre;
                regla.Patron = dto.Patron;
                regla.Respuesta = dto.Respuesta;
                regla.TipoAccion = dto.TipoAccion;
                regla.Prioridad = dto.Prioridad;
                regla.EsActivo = dto.EsActivo;
                regla.UsuarioModificacion = ObtenerUsuario();
                regla.FechaModificacion = DateTime.Now;

                await _db.SaveChangesAsync();
                return Ok(new BotReglaDTO
                {
                    Id = regla.Id,
                    Nombre = regla.Nombre,
                    Patron = regla.Patron,
                    Respuesta = regla.Respuesta,
                    TipoAccion = regla.TipoAccion,
                    Prioridad = regla.Prioridad,
                    EsActivo = regla.EsActivo
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Soft delete de una regla (Estado = false)</summary>
        [HttpDelete("reglas/{id}")]
        public async Task<IActionResult> DeleteRegla(int id)
        {
            try
            {
                var regla = await _db.TBotRegla.FindAsync(id);
                if (regla == null) return NotFound("Regla no encontrada");

                regla.Estado = false;
                regla.UsuarioModificacion = ObtenerUsuario();
                regla.FechaModificacion = DateTime.Now;
                await _db.SaveChangesAsync();
                return Ok(new { Mensaje = "Regla eliminada correctamente" });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Toggle EsActivo de una regla (activar/desactivar sin borrar)</summary>
        [HttpPut("reglas/{id}/toggle-modo")]
        public async Task<IActionResult> ToggleModo(int id)
        {
            try
            {
                var regla = await _db.TBotRegla.FindAsync(id);
                if (regla == null) return NotFound("Regla no encontrada");

                regla.EsActivo = !regla.EsActivo;
                regla.UsuarioModificacion = ObtenerUsuario();
                regla.FechaModificacion = DateTime.Now;
                await _db.SaveChangesAsync();
                return Ok(new BotReglaDTO
                {
                    Id = regla.Id,
                    Nombre = regla.Nombre,
                    Patron = regla.Patron,
                    Respuesta = regla.Respuesta,
                    TipoAccion = regla.TipoAccion,
                    Prioridad = regla.Prioridad,
                    EsActivo = regla.EsActivo
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>GET /api/Bot/modo-global — estado actual del modo global</summary>
        [HttpGet("modo-global")]
        public IActionResult GetModoGlobal()
        {
            try
            {
                var config = _db.TConfiguracionSistema.FirstOrDefault(c => c.Clave == "bot_modo_defecto");
                var totalConvs = _db.TConversacion.Count(c => c.Estado);
                var convBot = _db.TConversacion.Count(c => c.Estado && c.ModoConversacion == "bot");
                return Ok(new
                {
                    modoDefecto = config?.Valor ?? "agente",
                    totalConversaciones = totalConvs,
                    conversacionesEnBot = convBot
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>POST /api/Bot/activar-global — activa bot en TODAS las conversaciones activas</summary>
        [HttpPost("activar-global")]
        public async Task<IActionResult> ActivarGlobal()
        {
            try
            {
                string usuario = ObtenerUsuario();
                var convs = _db.TConversacion.Where(c => c.Estado).ToList();
                foreach (var c in convs)
                {
                    c.ModoConversacion = "bot";
                    c.FechaModificacion = DateTime.Now;
                    c.UsuarioModificacion = usuario;
                }

                // Guardar configuración de modo por defecto
                var config = _db.TConfiguracionSistema.FirstOrDefault(c => c.Clave == "bot_modo_defecto");
                if (config != null) config.Valor = "bot";
                else _db.TConfiguracionSistema.Add(new Models.TConfiguracionSistema
                {
                    Clave = "bot_modo_defecto",
                    Valor = "bot",
                    UsuarioModificacion = usuario,
                    FechaModificacion = DateTime.Now
                });

                await _db.SaveChangesAsync();
                return Ok(new { mensaje = $"Bot activado en {convs.Count} conversaciones.", modoDefecto = "bot" });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>POST /api/Bot/desactivar-global — desactiva bot en TODAS las conversaciones activas</summary>
        [HttpPost("desactivar-global")]
        public async Task<IActionResult> DesactivarGlobal()
        {
            try
            {
                string usuario = ObtenerUsuario();
                var convs = _db.TConversacion.Where(c => c.Estado).ToList();
                foreach (var c in convs)
                {
                    c.ModoConversacion = "agente";
                    c.FechaModificacion = DateTime.Now;
                    c.UsuarioModificacion = usuario;
                }

                var config = _db.TConfiguracionSistema.FirstOrDefault(c => c.Clave == "bot_modo_defecto");
                if (config != null) config.Valor = "agente";

                await _db.SaveChangesAsync();
                return Ok(new { mensaje = $"Bot desactivado en {convs.Count} conversaciones.", modoDefecto = "agente" });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        private string ObtenerUsuario()
        {
            return User?.Identity?.Name ?? "sistema";
        }
    }
}

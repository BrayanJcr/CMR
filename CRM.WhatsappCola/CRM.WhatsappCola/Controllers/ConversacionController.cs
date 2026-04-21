using CRM.WhatsappCola.DTOs;
using CRM.WhatsappCola.DTOs.Conversaciones;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CRM.WhatsappCola.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ConversacionController : ControllerBase
    {
        private readonly WA_ColaContext _db;

        public ConversacionController(WA_ColaContext db)
        {
            _db = db;
        }

        /// <summary>GET /api/Conversacion — lista de conversaciones para el Chat Baileys</summary>
        [HttpGet]
        public IActionResult GetConversaciones()
        {
            try
            {
                var resumen = _db.VObtenerResumenConversacion.ToList();
                var convs   = _db.TConversacion.Where(c => c.Estado).ToList();

                // Cargar etiquetas de todas las conversaciones en un solo query
                var convIds = convs.Select(c => c.Id).ToList();
                var etiquetasMap = _db.TConversacionEtiqueta
                    .Where(ce => convIds.Contains(ce.IdConversacion))
                    .Select(ce => new { ce.IdConversacion, ce.IdEtiqueta, ce.IdEtiquetaNavigation.Nombre, ce.IdEtiquetaNavigation.Color })
                    .ToList()
                    .GroupBy(x => x.IdConversacion)
                    .ToDictionary(g => g.Key, g => g.Select(x => new { id = x.IdEtiqueta, nombre = x.Nombre, color = x.Color }).ToList());

                var resultado = convs.Select(c =>
                {
                    var r = resumen.FirstOrDefault(x => x.NumeroCuenta == c.NumeroCuenta && x.NumeroCliente == c.NumeroCliente);
                    etiquetasMap.TryGetValue(c.Id, out var etiquetas);
                    return new
                    {
                        id                    = c.Id,
                        numeroCuenta          = c.NumeroCuenta,
                        numeroCliente         = c.NumeroCliente,
                        nombreContacto        = !string.IsNullOrEmpty(c.NombreContacto) ? c.NombreContacto : (r?.NombreContacto ?? c.NumeroCliente),
                        fechaUltimoMensaje    = r?.FechaUltimoMensaje,
                        modoConversacion      = c.ModoConversacion,
                        estadoConversacion    = c.EstadoConversacion ?? "abierta",
                        nota                  = c.Nota,
                        agenteAsignado        = c.AgenteAsignado,
                        etiquetas             = etiquetas,
                        ultimoMensaje         = r?.UltimoMensaje,
                        ultimoMimeType        = r?.UltimoMimeType,
                        ultimoEsEntrante      = r?.UltimoEsEntrante != 0,
                        ultimoAckEstado       = r?.UltimoAckEstado,
                        mensajesNoLeidos      = r?.MensajesNoLeidos ?? 0
                    };
                })
                .OrderByDescending(x => x.fechaUltimoMensaje)
                .ToList();

                return Ok(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>GET /api/Conversacion/{id}/mensajes — mensajes de una conversación</summary>
        [HttpGet("{id}/mensajes")]
        public IActionResult GetMensajes(int id)
        {
            try
            {
                var conv = _db.TConversacion.FirstOrDefault(c => c.Id == id && c.Estado);
                if (conv == null) return NotFound(new { mensaje = "Conversación no encontrada" });

                var mensajes = _db.VObtenerDetalleMensajes
                    .Where(m => m.NumeroCuenta == conv.NumeroCuenta && m.NumeroCliente == conv.NumeroCliente)
                    .OrderBy(m => m.FechaEnvio)
                    .Select(m => new
                    {
                        id                        = (object)(m.IdMensajeEntrante ?? m.IdMensajeSaliente),
                        whatsAppId                = m.WhatsAppId,
                        esEntrante                = m.IdMensajeSaliente == null,
                        esNotaInterna             = false,
                        cuerpo                    = m.Mensaje,
                        tipo                      = string.IsNullOrEmpty(m.MimeType) ? "texto"
                                                    : m.MimeType.StartsWith("image/") ? "image"
                                                    : m.MimeType.StartsWith("audio/") ? "audio"
                                                    : m.MimeType.StartsWith("video/") ? "video"
                                                    : "document",
                        urlMedia                  = !string.IsNullOrEmpty(m.AdjuntoBase64) && !string.IsNullOrEmpty(m.MimeType)
                                                    ? $"data:{m.MimeType};base64,{m.AdjuntoBase64}"
                                                    : null,
                        fechaEnvio                = m.FechaEnvio,
                        whatsAppIdPadre           = m.WhatsAppIdPadre,
                        ack                       = m.AckEstado,
                        mimeType                  = m.MimeType,
                        nombreArchivo             = m.NombreArchivo,
                        esErrorDescargaMultimedia = m.EsErrorDescargaMultimedia,
                        usuario                   = (string)null
                    })
                    .ToList<object>();

                // Intercalar notas internas ordenadas por fecha
                var notas = _db.TNotaConversacion
                    .Where(n => n.IdConversacion == id)
                    .Select(n => new
                    {
                        id                        = (object)$"nota-{n.Id}",
                        whatsAppId                = (string)null,
                        esEntrante                = false,
                        esNotaInterna             = true,
                        cuerpo                    = n.Texto,
                        tipo                      = "nota",
                        urlMedia                  = (string)null,
                        fechaEnvio                = n.FechaCreacion,
                        whatsAppIdPadre           = (string)null,
                        ack                       = (int?)null,
                        mimeType                  = (string)null,
                        nombreArchivo             = (string)null,
                        esErrorDescargaMultimedia = (bool?)null,
                        usuario                   = n.Usuario
                    })
                    .ToList<object>();

                var resultado = mensajes.Concat(notas)
                    .OrderBy(m => ((dynamic)m).fechaEnvio)
                    .ToList();

                return Ok(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>POST /api/Conversacion/{id}/toggle-modo — alterna entre modo 'bot' y 'agente'</summary>
        [HttpPost("{id}/toggle-modo")]
        public IActionResult ToggleModo(int id)
        {
            try
            {
                var conv = _db.TConversacion.FirstOrDefault(c => c.Id == id && c.Estado);
                if (conv == null) return NotFound(new { mensaje = "Conversación no encontrada" });

                conv.ModoConversacion = conv.ModoConversacion == "bot" ? "agente" : "bot";
                conv.FechaModificacion = DateTime.Now;
                _db.SaveChanges();

                return Ok(new { modo = conv.ModoConversacion });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>PUT /api/Conversacion/{id}/estado — cambia estado de la conversación</summary>
        [HttpPut("{id}/estado")]
        public IActionResult UpdateEstado(int id, [FromBody] DTOs.Conversaciones.UpdateEstadoConversacionDTO dto)
        {
            try
            {
                var validos = new[] { "abierta", "en_progreso", "resuelta", "spam" };
                if (!validos.Contains(dto.Estado)) return BadRequest(new { mensaje = "Estado inválido" });
                var conv = _db.TConversacion.FirstOrDefault(c => c.Id == id && c.Estado);
                if (conv == null) return NotFound(new { mensaje = "Conversación no encontrada" });
                conv.EstadoConversacion = dto.Estado;
                conv.FechaModificacion  = DateTime.Now;
                _db.SaveChanges();
                return Ok(new { estadoConversacion = conv.EstadoConversacion });
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        /// <summary>PUT /api/Conversacion/{id}/nota — actualiza nota interna</summary>
        [HttpPut("{id}/nota")]
        public IActionResult UpdateNota(int id, [FromBody] DTOs.Conversaciones.UpdateNotaConversacionDTO dto)
        {
            try
            {
                var conv = _db.TConversacion.FirstOrDefault(c => c.Id == id && c.Estado);
                if (conv == null) return NotFound(new { mensaje = "Conversación no encontrada" });
                conv.Nota              = dto.Nota?.Trim();
                conv.FechaModificacion = DateTime.Now;
                _db.SaveChanges();
                return Ok(new { nota = conv.Nota });
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        /// <summary>PUT /api/Conversacion/{id}/nombre — actualiza nombre del contacto</summary>
        [HttpPut("{id}/nombre")]
        public IActionResult UpdateNombre(int id, [FromBody] DTOs.Conversaciones.UpdateNombreContactoDTO dto)
        {
            try
            {
                var conv = _db.TConversacion.FirstOrDefault(c => c.Id == id && c.Estado);
                if (conv == null) return NotFound(new { mensaje = "Conversación no encontrada" });
                conv.NombreContacto    = dto.NombreContacto?.Trim();
                conv.FechaModificacion = DateTime.Now;
                _db.SaveChanges();
                return Ok(new { nombreContacto = conv.NombreContacto });
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        /// <summary>POST /api/Conversacion/{id}/notas — crea una nota interna</summary>
        [HttpPost("{id}/notas")]
        public IActionResult CreateNota(int id, [FromBody] DTOs.Conversaciones.UpdateNotaConversacionDTO dto)
        {
            try
            {
                var conv = _db.TConversacion.FirstOrDefault(c => c.Id == id && c.Estado);
                if (conv == null) return NotFound(new { mensaje = "Conversación no encontrada" });
                var nota = new Models.TNotaConversacion
                {
                    IdConversacion = id,
                    Texto          = dto.Nota?.Trim() ?? "",
                    Usuario        = User?.Identity?.Name ?? "agente",
                    FechaCreacion  = DateTime.Now
                };
                _db.TNotaConversacion.Add(nota);
                _db.SaveChanges();
                return Ok(new { id = nota.Id, texto = nota.Texto, usuario = nota.Usuario, fechaCreacion = nota.FechaCreacion });
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpPost("ObtenerDetalle")]
        public async Task<IActionResult> ObtenerDetalle([FromBody] FiltroDetalleConversacionDTO filtroDto)
        {
            try
            {
                var service = new ConversacionService(_db);
                List<DetalleConversacionDTO> resultado = service.ObtenerDetalllePorFiltros(filtroDto);
                return Ok(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        [HttpPost("ObtenerResumen")]
        public async Task<IActionResult> ObtenerResumen([FromBody] FiltroResumenConversacionDTO filtroDto)
        {
            try
            {
                var service = new ConversacionService(_db);
                List<ResumenConversacionDTO> resultado = service.ObtenerResumenPorFiltros(filtroDto);
                return Ok(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>PUT /api/Conversacion/{id}/agente — asigna un agente a la conversación</summary>
        [HttpPut("{id}/agente")]
        public IActionResult UpdateAgente(int id, [FromBody] UpdateAgenteConversacionDTO dto)
        {
            try
            {
                var conv = _db.TConversacion.FirstOrDefault(c => c.Id == id && c.Estado);
                if (conv == null) return NotFound(new { mensaje = "Conversación no encontrada" });
                conv.AgenteAsignado    = string.IsNullOrWhiteSpace(dto.AgenteAsignado) ? null : dto.AgenteAsignado.Trim();
                conv.FechaModificacion = DateTime.Now;
                _db.SaveChanges();
                return Ok(new { agenteAsignado = conv.AgenteAsignado });
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        /// <summary>POST /api/Conversacion/{id}/etiquetas — agrega una etiqueta a la conversación</summary>
        [HttpPost("{id}/etiquetas")]
        public IActionResult AddEtiqueta(int id, [FromBody] AddEtiquetaConversacionDTO dto)
        {
            try
            {
                var conv = _db.TConversacion.FirstOrDefault(c => c.Id == id && c.Estado);
                if (conv == null) return NotFound(new { mensaje = "Conversación no encontrada" });

                var etiqueta = _db.TEtiqueta.FirstOrDefault(e => e.Id == dto.IdEtiqueta && e.Estado);
                if (etiqueta == null) return NotFound(new { mensaje = "Etiqueta no encontrada" });

                if (!_db.TConversacionEtiqueta.Any(ce => ce.IdConversacion == id && ce.IdEtiqueta == dto.IdEtiqueta))
                {
                    _db.TConversacionEtiqueta.Add(new Models.TConversacionEtiqueta
                    {
                        IdConversacion = id,
                        IdEtiqueta     = dto.IdEtiqueta
                    });
                    _db.SaveChanges();
                }

                return Ok(new { id = etiqueta.Id, nombre = etiqueta.Nombre, color = etiqueta.Color });
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        /// <summary>DELETE /api/Conversacion/{id}/etiquetas/{idEtiqueta} — quita una etiqueta de la conversación</summary>
        [HttpDelete("{id}/etiquetas/{idEtiqueta}")]
        public IActionResult RemoveEtiqueta(int id, int idEtiqueta)
        {
            try
            {
                var rel = _db.TConversacionEtiqueta.FirstOrDefault(ce => ce.IdConversacion == id && ce.IdEtiqueta == idEtiqueta);
                if (rel == null) return NotFound(new { mensaje = "Relación no encontrada" });
                _db.TConversacionEtiqueta.Remove(rel);
                _db.SaveChanges();
                return Ok(new { eliminado = true });
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }
    }
}

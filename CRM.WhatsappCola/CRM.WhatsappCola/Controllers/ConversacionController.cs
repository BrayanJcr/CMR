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

                var resultado = convs.Select(c =>
                {
                    var r = resumen.FirstOrDefault(x => x.NumeroCuenta == c.NumeroCuenta && x.NumeroCliente == c.NumeroCliente);
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
                        id                      = m.IdMensajeEntrante ?? m.IdMensajeSaliente,
                        esEntrante              = m.IdMensajeSaliente == null,
                        cuerpo                  = m.Mensaje,
                        tipo                    = string.IsNullOrEmpty(m.MimeType) ? "texto"
                                                  : m.MimeType.StartsWith("image/") ? "image"
                                                  : m.MimeType.StartsWith("audio/") ? "audio"
                                                  : m.MimeType.StartsWith("video/") ? "video"
                                                  : "document",
                        urlMedia                = !string.IsNullOrEmpty(m.AdjuntoBase64) && !string.IsNullOrEmpty(m.MimeType)
                                                  ? $"data:{m.MimeType};base64,{m.AdjuntoBase64}"
                                                  : null,
                        fechaEnvio              = m.FechaEnvio,
                        whatsAppId              = m.WhatsAppId,
                        whatsAppIdPadre         = m.WhatsAppIdPadre,
                        ack                     = m.AckEstado,
                        mimeType                = m.MimeType,
                        nombreArchivo           = m.NombreArchivo,
                        esErrorDescargaMultimedia = m.EsErrorDescargaMultimedia
                    })
                    .ToList();

                return Ok(mensajes);
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
    }
}

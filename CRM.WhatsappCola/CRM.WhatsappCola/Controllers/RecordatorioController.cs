using CRM.WhatsappCola.DTOs.Conversaciones;
using CRM.WhatsappCola.Models;
using Microsoft.AspNetCore.Mvc;

namespace CRM.WhatsappCola.Controllers;

[Route("api/[controller]")]
[ApiController]
public class RecordatorioController : ControllerBase
{
    private readonly WA_ColaContext _db;

    public RecordatorioController(WA_ColaContext db) { _db = db; }

    /// <summary>GET /api/Recordatorio — lista recordatorios (pendientes por defecto)</summary>
    [HttpGet]
    public IActionResult Get([FromQuery] bool? soloCompletos, [FromQuery] int? idConversacion)
    {
        try
        {
            var q = _db.TRecordatorio.AsQueryable();

            if (idConversacion.HasValue)
                q = q.Where(r => r.IdConversacion == idConversacion.Value);

            if (soloCompletos.HasValue)
                q = q.Where(r => r.Completado == soloCompletos.Value);
            else
                q = q.Where(r => !r.Completado);

            var resultado = q
                .OrderBy(r => r.FechaRecordatorio)
                .Select(r => new
                {
                    id                   = r.Id,
                    idConversacion        = r.IdConversacion,
                    texto                = r.Texto,
                    fechaRecordatorio    = r.FechaRecordatorio,
                    completado           = r.Completado,
                    usuarioCreacion      = r.UsuarioCreacion,
                    fechaCreacion        = r.FechaCreacion,
                    nombreContacto       = r.IdConversacionNavigation != null
                                          ? (r.IdConversacionNavigation.NombreContacto ?? r.IdConversacionNavigation.NumeroCliente)
                                          : null,
                    numeroCliente        = r.IdConversacionNavigation != null
                                          ? r.IdConversacionNavigation.NumeroCliente
                                          : null,
                    vencido              = !r.Completado && r.FechaRecordatorio < DateTime.Now
                })
                .ToList();

            return Ok(resultado);
        }
        catch (Exception ex) { return BadRequest(ex.Message); }
    }

    /// <summary>POST /api/Recordatorio — crea un recordatorio</summary>
    [HttpPost]
    public IActionResult Create([FromBody] CrearRecordatorioDTO dto)
    {
        try
        {
            var conv = _db.TConversacion.FirstOrDefault(c => c.Id == dto.IdConversacion && c.Estado);
            if (conv == null) return NotFound(new { mensaje = "Conversación no encontrada" });

            var rec = new TRecordatorio
            {
                IdConversacion    = dto.IdConversacion,
                Texto             = dto.Texto?.Trim() ?? "",
                FechaRecordatorio = dto.FechaRecordatorio,
                Completado        = false,
                UsuarioCreacion   = User?.Identity?.Name ?? "agente",
                FechaCreacion     = DateTime.Now
            };
            _db.TRecordatorio.Add(rec);
            _db.SaveChanges();

            return Ok(new
            {
                id                = rec.Id,
                idConversacion    = rec.IdConversacion,
                texto             = rec.Texto,
                fechaRecordatorio = rec.FechaRecordatorio,
                completado        = rec.Completado,
                usuarioCreacion   = rec.UsuarioCreacion,
                fechaCreacion     = rec.FechaCreacion,
                vencido           = rec.FechaRecordatorio < DateTime.Now
            });
        }
        catch (Exception ex) { return BadRequest(ex.Message); }
    }

    /// <summary>PUT /api/Recordatorio/{id}/completar — marca como completado</summary>
    [HttpPut("{id}/completar")]
    public IActionResult Completar(int id)
    {
        try
        {
            var rec = _db.TRecordatorio.FirstOrDefault(r => r.Id == id);
            if (rec == null) return NotFound(new { mensaje = "Recordatorio no encontrado" });
            rec.Completado = true;
            _db.SaveChanges();
            return Ok(new { completado = true });
        }
        catch (Exception ex) { return BadRequest(ex.Message); }
    }

    /// <summary>DELETE /api/Recordatorio/{id} — elimina un recordatorio</summary>
    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        try
        {
            var rec = _db.TRecordatorio.FirstOrDefault(r => r.Id == id);
            if (rec == null) return NotFound(new { mensaje = "Recordatorio no encontrado" });
            _db.TRecordatorio.Remove(rec);
            _db.SaveChanges();
            return Ok(new { eliminado = true });
        }
        catch (Exception ex) { return BadRequest(ex.Message); }
    }
}

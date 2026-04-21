using CRM.WhatsappCola.Models;
using Microsoft.AspNetCore.Mvc;

namespace CRM.WhatsappCola.Controllers;

[Route("api/[controller]")]
[ApiController]
public class MetricasController : ControllerBase
{
    private readonly WA_ColaContext _db;

    public MetricasController(WA_ColaContext db) { _db = db; }

    /// <summary>GET /api/Metricas/chat — métricas del módulo ChatBaileys</summary>
    [HttpGet("chat")]
    public IActionResult GetChatMetricas()
    {
        try
        {
            var hoy   = DateTime.Today;
            var ahora = DateTime.Now;

            // Conversaciones activas por estado
            var convs = _db.TConversacion.Where(c => c.Estado).ToList();
            var porEstado = new
            {
                abierta     = convs.Count(c => (c.EstadoConversacion ?? "abierta") == "abierta"),
                en_progreso = convs.Count(c => c.EstadoConversacion == "en_progreso"),
                resuelta    = convs.Count(c => c.EstadoConversacion == "resuelta"),
                spam        = convs.Count(c => c.EstadoConversacion == "spam"),
            };

            // Mensajes de hoy
            var mensajesEntrantesHoy  = _db.TMensajeEntrante
                .Where(m => m.Estado && m.FechaEnvio >= hoy)
                .Select(m => m.FechaEnvio)
                .ToList();

            var mensajesSalientesHoy  = _db.TMensajeCola
                .Where(m => m.Estado && m.FechaEnvio >= hoy)
                .Select(m => m.FechaEnvio)
                .ToList();

            // Actividad por hora hoy (0–23)
            var porHoraEntrante  = mensajesEntrantesHoy.GroupBy(d => d.Hour).ToDictionary(g => g.Key, g => g.Count());
            var porHoraSaliente  = mensajesSalientesHoy.Where(d => d.HasValue).GroupBy(d => d!.Value.Hour).ToDictionary(g => g.Key, g => g.Count());
            var porHora = Enumerable.Range(0, 24).Select(h => new
            {
                hora      = h,
                entrantes = porHoraEntrante.GetValueOrDefault(h, 0),
                salientes = porHoraSaliente.GetValueOrDefault(h, 0),
            }).ToList();

            // Actividad últimos 7 días
            var hace7dias = hoy.AddDays(-6);
            var entrantesPor7 = _db.TMensajeEntrante
                .Where(m => m.Estado && m.FechaEnvio >= hace7dias)
                .Select(m => m.FechaEnvio)
                .ToList();
            var salientesPor7 = _db.TMensajeCola
                .Where(m => m.Estado && m.FechaEnvio >= hace7dias)
                .Select(m => m.FechaEnvio)
                .ToList();
            var convsPor7 = _db.TConversacion
                .Where(c => c.Estado && c.FechaCreacion >= hace7dias)
                .Select(c => c.FechaCreacion)
                .ToList();

            var porDia = Enumerable.Range(0, 7).Select(i =>
            {
                var dia = hoy.AddDays(-6 + i);
                return new
                {
                    fecha         = dia.ToString("yyyy-MM-dd"),
                    label         = dia.ToString("dd/MM"),
                    entrantes     = entrantesPor7.Count(d => d.Date == dia),
                    salientes     = salientesPor7.Count(d => d.HasValue && d.Value.Date == dia),
                    conversaciones = convsPor7.Count(d => d.Date == dia),
                };
            }).ToList();

            // Top agentes con conversaciones asignadas
            var topAgentes = convs
                .Where(c => !string.IsNullOrEmpty(c.AgenteAsignado))
                .GroupBy(c => c.AgenteAsignado)
                .OrderByDescending(g => g.Count())
                .Take(8)
                .Select(g => new { agente = g.Key, cantidad = g.Count() })
                .ToList();

            // Recordatorios pendientes y vencidos
            var recordatorios = _db.TRecordatorio
                .Where(r => !r.Completado)
                .Select(r => new { r.FechaRecordatorio })
                .ToList();

            return Ok(new
            {
                totalConversaciones = convs.Count,
                porEstado,
                mensajesHoy = new
                {
                    entrantes = mensajesEntrantesHoy.Count,
                    salientes = mensajesSalientesHoy.Count,
                    total     = mensajesEntrantesHoy.Count + mensajesSalientesHoy.Count,
                },
                porHora,
                porDia,
                topAgentes,
                recordatorios = new
                {
                    pendientes = recordatorios.Count,
                    vencidos   = recordatorios.Count(r => r.FechaRecordatorio < ahora),
                }
            });
        }
        catch (Exception ex) { return BadRequest(ex.Message); }
    }
}

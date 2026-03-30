using CRM.WhatsappCola.DTOs.CRM;
using CRM.WhatsappCola.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Services
{
    /// <summary>
    /// Servicio de reportes y dashboard del CRM
    /// </summary>
    public class ReporteService
    {
        private readonly WA_ColaContext _db;

        public ReporteService(WA_ColaContext db)
        {
            _db = db;
        }

        /// <summary>Obtiene el resumen del dashboard principal</summary>
        public async Task<ResumenDashboardDTO> ObtenerResumenDashboard()
        {
            var hoy = DateTime.Today;
            var manana = hoy.AddDays(1);

            var conversacionesActivas = await _db.TConversacion.CountAsync(c => c.Estado);

            var mensajesHoy = await _db.TMensajeCola
                .CountAsync(m => m.Estado && m.FechaCreacion >= hoy && m.FechaCreacion < manana);

            var mensajesEntrantesHoy = await _db.TMensajeEntrante
                .CountAsync(m => m.Estado && m.FechaCreacion >= hoy && m.FechaCreacion < manana);

            var mensajesSalientesHoy = mensajesHoy;

            var contactosTotal = await _db.TContacto.CountAsync(c => c.Estado);

            var oportunidadesActivas = await _db.TOportunidad.CountAsync(o => o.Estado);

            var valorPipelineTotal = await _db.TOportunidad
                .Where(o => o.Estado)
                .SumAsync(o => (decimal?)o.MontoEstimado) ?? 0m;

            var whatsappEstado = await _db.TConfiguracionSistema
                .Where(c => c.Clave == "whatsapp_estado")
                .Select(c => c.Valor)
                .FirstOrDefaultAsync() ?? "desconectado";

            var whatsappNumero = await _db.TConfiguracionSistema
                .Where(c => c.Clave == "whatsapp_numero")
                .Select(c => c.Valor)
                .FirstOrDefaultAsync() ?? "";

            return new ResumenDashboardDTO
            {
                ConversacionesActivas = conversacionesActivas,
                MensajesHoy = mensajesHoy + mensajesEntrantesHoy,
                MensajesEntrantesHoy = mensajesEntrantesHoy,
                MensajesSalientesHoy = mensajesSalientesHoy,
                ContactosTotal = contactosTotal,
                OportunidadesActivas = oportunidadesActivas,
                ValorPipelineTotal = valorPipelineTotal,
                WhatsAppEstado = whatsappEstado,
                WhatsAppNumero = whatsappNumero
            };
        }

        /// <summary>Obtiene mensajes entrantes y salientes por dia para los ultimos N dias</summary>
        public async Task<List<MensajesPorDiaDTO>> ObtenerMensajesPorDia(int dias)
        {
            if (dias <= 0) dias = 7;
            var desde = DateTime.Today.AddDays(-dias + 1);

            var entrantes = await _db.TMensajeEntrante
                .Where(m => m.Estado && m.FechaCreacion >= desde)
                .GroupBy(m => m.FechaCreacion.Date)
                .Select(g => new { Fecha = g.Key, Cantidad = g.Count() })
                .ToListAsync();

            var salientes = await _db.TMensajeCola
                .Where(m => m.Estado && m.FechaCreacion >= desde)
                .GroupBy(m => m.FechaCreacion.Date)
                .Select(g => new { Fecha = g.Key, Cantidad = g.Count() })
                .ToListAsync();

            var resultado = new List<MensajesPorDiaDTO>();

            for (int i = 0; i < dias; i++)
            {
                var fecha = desde.AddDays(i).Date;
                resultado.Add(new MensajesPorDiaDTO
                {
                    Fecha = fecha,
                    Entrantes = entrantes.FirstOrDefault(e => e.Fecha == fecha)?.Cantidad ?? 0,
                    Salientes = salientes.FirstOrDefault(s => s.Fecha == fecha)?.Cantidad ?? 0
                });
            }

            return resultado;
        }

        /// <summary>Obtiene reporte del pipeline agrupado por etapa</summary>
        public async Task<List<PipelineReporteDTO>> ObtenerReportePipeline()
        {
            var etapas = await _db.TPipelineEtapa
                .Where(e => e.Estado)
                .OrderBy(e => e.Orden)
                .ToListAsync();

            var oportunidades = await _db.TOportunidad
                .Where(o => o.Estado)
                .ToListAsync();

            return etapas.Select(e => new PipelineReporteDTO
            {
                NombreEtapa = e.Nombre,
                Color = e.Color,
                Cantidad = oportunidades.Count(o => o.IdEtapa == e.Id),
                ValorTotal = oportunidades.Where(o => o.IdEtapa == e.Id).Sum(o => o.MontoEstimado)
            }).ToList();
        }
    }
}

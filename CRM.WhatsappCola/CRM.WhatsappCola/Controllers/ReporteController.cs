using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Controllers
{
    /// <summary>
    /// Controlador de reportes y dashboard CRM
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ReporteController : ControllerBase
    {
        private readonly WA_ColaContext _db;
        private readonly ReporteService _service;

        public ReporteController(WA_ColaContext db)
        {
            _db = db;
            _service = new ReporteService(_db);
        }

        /// <summary>Obtiene el resumen del dashboard principal</summary>
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            try
            {
                var resumen = await _service.ObtenerResumenDashboard();
                return Ok(resumen);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Obtiene mensajes por dia para los ultimos N dias</summary>
        [HttpGet("mensajes-por-dia")]
        public async Task<IActionResult> GetMensajesPorDia([FromQuery] int dias = 7)
        {
            try
            {
                var data = await _service.ObtenerMensajesPorDia(dias);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Obtiene el reporte del pipeline por etapa</summary>
        [HttpGet("pipeline")]
        public async Task<IActionResult> GetPipeline()
        {
            try
            {
                var data = await _service.ObtenerReportePipeline();
                return Ok(data);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}

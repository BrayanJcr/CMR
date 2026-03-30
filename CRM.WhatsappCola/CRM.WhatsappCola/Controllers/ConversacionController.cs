using CRM.WhatsappCola.DTOs;
using CRM.WhatsappCola.DTOs.Conversaciones;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

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

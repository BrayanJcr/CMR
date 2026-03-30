using CRM.WhatsappCola.DTOs;
using CRM.WhatsappCola.DTOs.WaEntrante;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CRM.WhatsappCola.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RecepcionWaController : ControllerBase
    {
        private readonly WA_ColaContext _db;

        public RecepcionWaController(WA_ColaContext db)
        {
            _db = db;
        }

        [HttpPost("recepcionar"), DisableRequestSizeLimit]
        public async Task<IActionResult> Recepcionar([FromBody] WaMensajeEntranteDTO entranteDto)
        {
            var recepcionService = new WaQrRecepcionService(_db);
            ResultadoRecibirDTO resultado = recepcionService.RecepcionarMensaje(entranteDto);
            return Ok(resultado);
        }

        [HttpPost("recepcionar-edicion"), DisableRequestSizeLimit]
        public async Task<IActionResult> RecepcionarEdicion([FromBody] WaMensajeEditadoDTO editadoDto)
        {
            var recepcionService = new WaQrRecepcionService(_db);
            ResultadoRecibirDTO resultado = recepcionService.RecepcionarEdicion(editadoDto);
            return Ok(resultado);
        }

        [HttpPost("recepcionar-eliminacion"), DisableRequestSizeLimit]
        public async Task<IActionResult> RecepcionarEliminacion([FromBody] WaMensajeEliminadoDTO eliminadoDto)
        {
            var recepcionService = new WaQrRecepcionService(_db);
            ResultadoRecibirDTO resultado = recepcionService.RecepcionarEliminacion(eliminadoDto);
            return Ok(resultado);
        }

        [HttpPost("recepcionar-qr")]
        public async Task<IActionResult> RecepcionarQr([FromBody] WaMensajeQrEntranteDTO qrDto)
        {
            var recepcionService = new WaQrRecepcionService(_db);
            ResultadoRecibirQrDTO resultado = recepcionService.RecepcionarQr(qrDto);
            return Ok(resultado);
        }

        [HttpPost("recepcionar-numero")]
        public async Task<IActionResult> RecepcionarNumero([FromBody] WaMensajeNumeroEntranteDTO numeroDto)
        {
            var recepcionService = new WaQrRecepcionService(_db);
            ResultadoRecibirNumeroDTO resultado = recepcionService.RecepcionarNumero(numeroDto);
            return Ok(resultado);
        }
    }
}

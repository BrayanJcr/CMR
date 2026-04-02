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

        private WaQrRecepcionService CrearRecepcionService()
        {
            var baileysProxy = new BaileysProxyService(_db);
            var botService = new BotService(_db, baileysProxy);
            return new WaQrRecepcionService(_db, botService);
        }

        [HttpPost("recepcionar"), DisableRequestSizeLimit]
        public async Task<IActionResult> Recepcionar([FromBody] WaMensajeEntranteDTO entranteDto)
        {
            ResultadoRecibirDTO resultado = CrearRecepcionService().RecepcionarMensaje(entranteDto);
            return Ok(resultado);
        }

        [HttpPost("recepcionar-edicion"), DisableRequestSizeLimit]
        public async Task<IActionResult> RecepcionarEdicion([FromBody] WaMensajeEditadoDTO editadoDto)
        {
            ResultadoRecibirDTO resultado = CrearRecepcionService().RecepcionarEdicion(editadoDto);
            return Ok(resultado);
        }

        [HttpPost("recepcionar-eliminacion"), DisableRequestSizeLimit]
        public async Task<IActionResult> RecepcionarEliminacion([FromBody] WaMensajeEliminadoDTO eliminadoDto)
        {
            ResultadoRecibirDTO resultado = CrearRecepcionService().RecepcionarEliminacion(eliminadoDto);
            return Ok(resultado);
        }

        [HttpPost("recepcionar-qr")]
        public async Task<IActionResult> RecepcionarQr([FromBody] WaMensajeQrEntranteDTO qrDto)
        {
            ResultadoRecibirQrDTO resultado = CrearRecepcionService().RecepcionarQr(qrDto);
            return Ok(resultado);
        }

        [HttpPost("recepcionar-numero")]
        public async Task<IActionResult> RecepcionarNumero([FromBody] WaMensajeNumeroEntranteDTO numeroDto)
        {
            ResultadoRecibirNumeroDTO resultado = CrearRecepcionService().RecepcionarNumero(numeroDto);
            return Ok(resultado);
        }

        [HttpPost("recepcionar-ack")]
        public async Task<IActionResult> RecepcionarAck([FromBody] WaAckDTO dto)
        {
            var resultado = await CrearRecepcionService().RecepcionarAck(dto);
            return Ok(resultado);
        }

        [HttpPost("recepcionar-reaccion")]
        public async Task<IActionResult> RecepcionarReaccion([FromBody] WaReaccionDTO dto)
        {
            var resultado = await CrearRecepcionService().RecepcionarReaccion(dto);
            return Ok(resultado);
        }

        [HttpPost("recepcionar-grupo-evento")]
        public async Task<IActionResult> RecepcionarGrupoEvento([FromBody] WaGrupoEventoDTO dto)
        {
            var resultado = await CrearRecepcionService().RecepcionarGrupoEvento(dto);
            return Ok(resultado);
        }

        [HttpPost("recepcionar-llamada")]
        public async Task<IActionResult> RecepcionarLlamada([FromBody] WaLlamadaDTO dto)
        {
            var resultado = await CrearRecepcionService().RecepcionarLlamada(dto);
            return Ok(resultado);
        }

        [HttpPost("recepcionar-presencia")]
        public IActionResult RecepcionarPresencia([FromBody] WaPresenciaDTO dto)
        {
            var resultado = CrearRecepcionService().RecepcionarPresencia(dto.Numero, dto.Presencia);
            return Ok(resultado);
        }
    }
}

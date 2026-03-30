using CRM.WhatsappCola.DTOs.CRM;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Controllers
{
    /// <summary>
    /// Controlador de campanas de mensajeria masiva
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class CampanaController : ControllerBase
    {
        private readonly WA_ColaContext _db;
        private readonly CampanaService _service;
        private readonly IConfiguration _configuration;

        public CampanaController(WA_ColaContext db, IConfiguration configuration)
        {
            _db = db;
            _service = new CampanaService(_db);
            _configuration = configuration;
        }

        /// <summary>Obtiene todas las campanas</summary>
        [HttpGet]
        public async Task<IActionResult> Get()
        {
            try
            {
                var lista = await _service.ObtenerTodas();
                return Ok(lista);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Obtiene una campana por Id</summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var campana = await _service.ObtenerPorId(id);
                if (campana == null) return NotFound("Campana no encontrada");
                return Ok(campana);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Crea una nueva campana</summary>
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] CampanaCreateDTO dto)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var result = await _service.Crear(dto, usuario);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Inicia el envio de una campana</summary>
        [HttpPost("{id}/iniciar")]
        public async Task<IActionResult> Iniciar(int id)
        {
            try
            {
                string waGatewayUrl = _configuration.GetValue<string>("WaGatewayUrl") ?? "http://localhost:3000";
                var result = await _service.IniciarCampana(id, waGatewayUrl);
                if (result == null) return NotFound("Campana no encontrada");
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Elimina una campana (soft delete)</summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var ok = await _service.Eliminar(id, usuario);
                if (!ok) return NotFound("Campana no encontrada");
                return Ok(new { Mensaje = "Campana eliminada correctamente" });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        private string ObtenerUsuario()
        {
            return User?.Identity?.Name ?? "sistema";
        }
    }
}

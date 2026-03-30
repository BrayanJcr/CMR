using CRM.WhatsappCola.DTOs.CRM;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Controllers
{
    /// <summary>
    /// Controlador de configuracion del sistema
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ConfiguracionController : ControllerBase
    {
        private readonly WA_ColaContext _db;
        private readonly ConfiguracionService _service;

        public ConfiguracionController(WA_ColaContext db)
        {
            _db = db;
            _service = new ConfiguracionService(_db);
        }

        /// <summary>Obtiene todos los parametros de configuracion</summary>
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

        /// <summary>Obtiene un parametro de configuracion por clave</summary>
        [HttpGet("{clave}")]
        public async Task<IActionResult> GetByClave(string clave)
        {
            try
            {
                var config = await _service.ObtenerPorClave(clave);
                if (config == null) return NotFound("Configuracion no encontrada");
                return Ok(config);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Actualiza un parametro de configuracion</summary>
        [HttpPut("{clave}")]
        public async Task<IActionResult> Put(string clave, [FromBody] ConfiguracionUpdateDTO dto)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var result = await _service.Actualizar(clave, dto.Valor, usuario);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Actualiza multiples parametros de configuracion</summary>
        [HttpPost("batch")]
        public async Task<IActionResult> BatchUpdate([FromBody] System.Collections.Generic.List<ConfiguracionUpdateDTO> updates)
        {
            try
            {
                string usuario = ObtenerUsuario();
                foreach (var update in updates)
                {
                    await _service.Actualizar(update.Clave, update.Valor, usuario);
                }
                var lista = await _service.ObtenerTodas();
                return Ok(lista);
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

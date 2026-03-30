using CRM.WhatsappCola.DTOs.CRM;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Controllers
{
    /// <summary>
    /// Controlador de productos CRM
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ProductoController : ControllerBase
    {
        private readonly WA_ColaContext _db;
        private readonly ProductoService _service;

        public ProductoController(WA_ColaContext db)
        {
            _db = db;
            _service = new ProductoService(_db);
        }

        /// <summary>Obtiene todos los productos</summary>
        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] string busqueda = null, [FromQuery] int? idCategoria = null)
        {
            try
            {
                var lista = await _service.ObtenerTodos(busqueda, idCategoria);
                return Ok(lista);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Obtiene un producto por Id</summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var producto = await _service.ObtenerPorId(id);
                if (producto == null) return NotFound("Producto no encontrado");
                return Ok(producto);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Crea un nuevo producto</summary>
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] ProductoCreateDTO dto)
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

        /// <summary>Actualiza un producto</summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Put(int id, [FromBody] ProductoCreateDTO dto)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var result = await _service.Actualizar(id, dto, usuario);
                if (result == null) return NotFound("Producto no encontrado");
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Elimina un producto (soft delete)</summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var ok = await _service.Eliminar(id, usuario);
                if (!ok) return NotFound("Producto no encontrado");
                return Ok(new { Mensaje = "Producto eliminado correctamente" });
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

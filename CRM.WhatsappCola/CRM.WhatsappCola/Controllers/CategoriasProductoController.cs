using CRM.WhatsappCola.DTOs.CRM;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Controllers
{
    /// <summary>
    /// Controlador de categorias de productos
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class CategoriasProductoController : ControllerBase
    {
        private readonly WA_ColaContext _db;
        private readonly ProductoService _service;

        public CategoriasProductoController(WA_ColaContext db)
        {
            _db = db;
            _service = new ProductoService(_db);
        }

        /// <summary>Obtiene todas las categorias activas</summary>
        [HttpGet]
        public async Task<IActionResult> Get()
        {
            try
            {
                var lista = await _service.ObtenerCategorias();
                return Ok(lista);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Obtiene una categoria por Id</summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var cat = await _service.ObtenerCategoriaPorId(id);
                if (cat == null) return NotFound("Categoria no encontrada");
                return Ok(cat);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Crea una nueva categoria</summary>
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] ProductoCategoriaCreateDTO dto)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var result = await _service.CrearCategoria(dto, usuario);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Actualiza una categoria</summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Put(int id, [FromBody] ProductoCategoriaCreateDTO dto)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var result = await _service.ActualizarCategoria(id, dto, usuario);
                if (result == null) return NotFound("Categoria no encontrada");
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Elimina una categoria (soft delete)</summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var ok = await _service.EliminarCategoria(id, usuario);
                if (!ok) return NotFound("Categoria no encontrada");
                return Ok(new { Mensaje = "Categoria eliminada correctamente" });
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

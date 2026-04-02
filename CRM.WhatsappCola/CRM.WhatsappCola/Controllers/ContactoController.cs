using CRM.WhatsappCola.DTOs.CRM;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Controllers
{
    /// <summary>
    /// Controlador de contactos CRM
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ContactoController : ControllerBase
    {
        private readonly WA_ColaContext _db;
        private readonly ContactoService _service;

        public ContactoController(WA_ColaContext db)
        {
            _db = db;
            _service = new ContactoService(_db);
        }

        /// <summary>Obtiene lista paginada de contactos</summary>
        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] FiltroContactoDTO filtro)
        {
            try
            {
                var lista = await _service.ObtenerTodos(filtro);
                var totalPaginas = await _service.ObtenerTotalPaginas(filtro);
                return Ok(new { Data = lista, TotalPaginas = totalPaginas, PaginaActual = filtro.Pagina });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Busca un contacto por número de WhatsApp</summary>
        [HttpGet("por-numero")]
        public IActionResult GetByNumero([FromQuery] string numero)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(numero)) return BadRequest("Número requerido");
                var contacto = _db.TContacto
                    .Include(c => c.TContactoEtiqueta)
                    .Include(c => c.IdEmpresaNavigation)
                    .FirstOrDefault(c => c.NumeroWhatsApp == numero && c.Estado);
                if (contacto == null) return NotFound(new { encontrado = false });
                return Ok(new
                {
                    id       = contacto.Id,
                    nombres  = contacto.Nombres,
                    apellidos= contacto.Apellidos,
                    email    = contacto.Email,
                    cargo    = contacto.Cargo,
                    empresa  = contacto.IdEmpresaNavigation?.Nombre,
                    notas    = contacto.Notas,
                    etiquetas= contacto.TContactoEtiqueta.Select(e => new { e.IdEtiquetaNavigation?.Nombre, e.IdEtiquetaNavigation?.Color })
                });
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        /// <summary>Obtiene un contacto por Id</summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var contacto = await _service.ObtenerPorId(id);
                if (contacto == null) return NotFound("Contacto no encontrado");
                return Ok(contacto);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Crea un nuevo contacto</summary>
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] ContactoCreateDTO dto)
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

        /// <summary>Actualiza un contacto</summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Put(int id, [FromBody] ContactoCreateDTO dto)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var updateDto = new ContactoUpdateDTO
                {
                    Id = id,
                    Nombres = dto.Nombres,
                    Apellidos = dto.Apellidos,
                    NumeroWhatsApp = dto.NumeroWhatsApp,
                    Email = dto.Email,
                    Cargo = dto.Cargo,
                    IdEmpresa = dto.IdEmpresa,
                    Notas = dto.Notas,
                    IdsEtiquetas = dto.IdsEtiquetas
                };
                var result = await _service.Actualizar(updateDto, usuario);
                if (result == null) return NotFound("Contacto no encontrado");
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Elimina un contacto (soft delete)</summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var ok = await _service.Eliminar(id, usuario);
                if (!ok) return NotFound("Contacto no encontrado");
                return Ok(new { Mensaje = "Contacto eliminado correctamente" });
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

using CRM.WhatsappCola.DTOs.CRM;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Controllers
{
    /// <summary>
    /// Controlador de empresas CRM
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class EmpresaController : ControllerBase
    {
        private readonly WA_ColaContext _db;
        private readonly EmpresaService _service;

        public EmpresaController(WA_ColaContext db)
        {
            _db = db;
            _service = new EmpresaService(_db);
        }

        /// <summary>Obtiene lista paginada de empresas</summary>
        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] FiltroEmpresaDTO filtro)
        {
            try
            {
                var lista = await _service.ObtenerTodas(filtro);
                var totalPaginas = await _service.ObtenerTotalPaginas(filtro);
                return Ok(new { Data = lista, TotalPaginas = totalPaginas, PaginaActual = filtro.Pagina });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Obtiene una empresa por Id</summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var empresa = await _service.ObtenerPorId(id);
                if (empresa == null) return NotFound("Empresa no encontrada");
                return Ok(empresa);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Crea una nueva empresa</summary>
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] EmpresaCreateDTO dto)
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

        /// <summary>Actualiza una empresa</summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Put(int id, [FromBody] EmpresaCreateDTO dto)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var updateDto = new EmpresaUpdateDTO
                {
                    Id = id,
                    Nombre = dto.Nombre,
                    Ruc = dto.Ruc,
                    Sector = dto.Sector,
                    Tamano = dto.Tamano,
                    Web = dto.Web,
                    Direccion = dto.Direccion,
                    Logo = dto.Logo,
                    Notas = dto.Notas
                };
                var result = await _service.Actualizar(updateDto, usuario);
                if (result == null) return NotFound("Empresa no encontrada");
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Elimina una empresa (soft delete)</summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                string usuario = ObtenerUsuario();
                var ok = await _service.Eliminar(id, usuario);
                if (!ok) return NotFound("Empresa no encontrada");
                return Ok(new { Mensaje = "Empresa eliminada correctamente" });
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

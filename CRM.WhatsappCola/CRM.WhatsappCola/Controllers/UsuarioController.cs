using CRM.WhatsappCola.DTOs.Usuario;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CRM.WhatsappCola.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsuarioController : ControllerBase
    {
        private readonly WA_ColaContext _db;
        private UsuarioService _usuarioService;

        public UsuarioController(WA_ColaContext db)
        {
            _db = db;
            _usuarioService = new UsuarioService(_db);
        }

        [HttpGet]
        public IActionResult GetAll()
        {
            try
            {
                var usuarios = _db.TUsuario
                    .Where(u => u.Estado == true)
                    .Select(u => new
                    {
                        id = u.Id,
                        nombres = u.Nombres,
                        apellidoPaterno = u.ApellidoPaterno,
                        apellidoMaterno = u.ApellidoMaterno,
                        nombreUsuario = u.NombreUsuario,
                        rol = u.Rol,
                        estado = u.Estado
                    })
                    .ToList();
                return Ok(usuarios);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        [HttpPost]
        [Route("create")]
        public IActionResult Create([FromBody] UsuarioCreateDTO createDTO)
        {
            try
            {
                int idUsuario = _usuarioService.Create(createDTO);
                return Ok(idUsuario);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        [HttpPut("{id}")]
        public IActionResult UpdateById(int id, [FromBody] UsuarioEditDTO dto)
        {
            try
            {
                var entity = _db.TUsuario.FirstOrDefault(u => u.Id == id && u.Estado == true);
                if (entity == null)
                    return NotFound("Usuario no encontrado");

                var sameUser = _db.TUsuario.FirstOrDefault(u => u.NombreUsuario == dto.NombreUsuario && u.Id != id);
                if (sameUser != null)
                    return BadRequest("El nombre de usuario ya está en uso");

                entity.Nombres = dto.Nombres;
                entity.ApellidoPaterno = dto.ApellidoPaterno;
                entity.ApellidoMaterno = dto.ApellidoMaterno ?? "";
                entity.NombreUsuario = dto.NombreUsuario;
                entity.Rol = dto.Rol ?? entity.Rol;
                if (!string.IsNullOrWhiteSpace(dto.Clave))
                    entity.ClaveHash = BCrypt.Net.BCrypt.HashPassword(dto.Clave);
                entity.UsuarioModificacion = User?.Identity?.Name ?? "sistema";
                entity.FechaModificacion = DateTime.Now;

                _db.SaveChanges();
                return Ok(entity.Id);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteById(int id)
        {
            try
            {
                var entity = _db.TUsuario.FirstOrDefault(u => u.Id == id && u.Estado == true);
                if (entity == null)
                    return NotFound("Usuario no encontrado");

                entity.Estado = false;
                entity.UsuarioModificacion = User?.Identity?.Name ?? "sistema";
                entity.FechaModificacion = DateTime.Now;
                _db.SaveChanges();
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        [HttpPut]
        [Route("update")]
        public IActionResult Update([FromBody] UsuarioUpdateDTO createDTO)
        {
            try
            {
                int idUsuario = _usuarioService.Update(createDTO);
                return Ok(idUsuario);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }
    }
}

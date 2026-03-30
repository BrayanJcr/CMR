using AutoMapper;
using CRM.WhatsappCola.DTOs;
using CRM.WhatsappCola.DTOs.Auth;
using CRM.WhatsappCola.DTOs.Usuario;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace CRM.WhatsappCola.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AutenticacionController : ControllerBase
    {
        private readonly WA_ColaContext _db;
        private UsuarioService _usuarioService;
        private readonly TokenGeneradorService _tokenGeneradorService;

        public AutenticacionController(WA_ColaContext db, TokenGeneradorService tokenGeneradorService)
        {
            _db = db;
            _usuarioService = new UsuarioService(_db);
            _tokenGeneradorService = tokenGeneradorService;
        }

        [AllowAnonymous]
        [HttpPost("Login")]
        public IActionResult Login([FromBody] LoginRequestDTO req)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequestModelState();

                var usuarioDto = _usuarioService.GetByUserName(req.Usuario);
                if (usuarioDto == null)
                    return BadRequest("Credenciales incorrectas");

                if (!_usuarioService.ValidateHashPassword(req.Usuario, req.Clave))
                    return BadRequest("Credenciales incorrectas");

                string accessToken = _tokenGeneradorService.GenerateToken(usuarioDto);
                return Ok(new
                {
                    token = accessToken,
                    nombreUsuario = usuarioDto.NombreUsuario,
                    nombres = usuarioDto.Nombres,
                    apellidos = (usuarioDto.ApellidoPaterno + " " + usuarioDto.ApellidoMaterno).Trim(),
                    idUsuario = usuarioDto.Id
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        /// <summary>Verifica si existe al menos un usuario en la base de datos.</summary>
        [AllowAnonymous]
        [HttpGet("hay-usuarios")]
        public IActionResult HayUsuarios()
        {
            try
            {
                bool hayUsuarios = _db.TUsuario.Any(u => u.Estado == true);
                return Ok(hayUsuarios);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Crea el primer administrador. Solo funciona si no existe ningún usuario.</summary>
        [AllowAnonymous]
        [HttpPost("crear-primer-admin")]
        public IActionResult CrearPrimerAdmin([FromBody] UsuarioCreateDTO req)
        {
            try
            {
                if (_db.TUsuario.Any(u => u.Estado == true))
                    return BadRequest("Ya existe al menos un usuario en el sistema. Use el login normal.");

                req.UsuarioResponsable = "sistema";
                var entity = new TUsuario
                {
                    Nombres = req.Nombres,
                    ApellidoPaterno = req.ApellidoPaterno,
                    ApellidoMaterno = req.ApellidoMaterno ?? "",
                    NombreUsuario = req.NombreUsuario,
                    ClaveHash = BCrypt.Net.BCrypt.HashPassword(req.Clave),
                    Rol = "admin",
                    Estado = true,
                    UsuarioCreacion = "sistema",
                    UsuarioModificacion = "sistema",
                    FechaCreacion = DateTime.Now,
                    FechaModificacion = DateTime.Now
                };
                _db.TUsuario.Add(entity);
                _db.SaveChanges();

                return Ok("Administrador creado correctamente. Ya puede iniciar sesión.");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""));
            }
        }

        private IActionResult BadRequestModelState()
        {
            IEnumerable<string> mensajes = ModelState.Values.SelectMany(s => s.Errors.Select(s2 => s2.ErrorMessage));
            return BadRequest(new ErrorResponseDTO(mensajes));
        }
    }
}

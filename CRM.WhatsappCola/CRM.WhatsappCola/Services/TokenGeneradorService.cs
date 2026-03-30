using CRM.WhatsappCola.DTOs.Base;
using CRM.WhatsappCola.DTOs.Usuario;
using CRM.WhatsappCola.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace CRM.WhatsappCola.Services
{
    public class TokenGeneradorService
    {
        private WA_ColaContext _db;
        private ConfiguracionAutenticacionDTO _configuracion;

        public TokenGeneradorService(WA_ColaContext db, ConfiguracionAutenticacionDTO configuracion)
        {
            _db = db;
            _configuracion = configuracion;
        }

        public string GenerateToken(UsuarioDTO usuario)
        {
            SecurityKey key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuracion.Secret));
            SigningCredentials credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            //var roles = _unitOfWork.PersonalRolRepository.GetBy(w => w.IdPersonal == usuario.IdPersonal);
            DateTime fechaInicio = DateTime.UtcNow;
            DateTime expiracion = DateTime.UtcNow.AddMinutes(_configuracion.ExpirationMinutes);

            List<Claim> claims = new List<Claim>()
            {
                new Claim("idUsuario", usuario.Id.ToString()),
                new Claim("usuario", usuario.NombreUsuario.ToString()),
                new Claim("fechaExpiracion", expiracion.ToLocalTime().ToString()),
                new Claim("nombres", usuario?.Nombres),
                new Claim("apellidos", usuario!= null ? usuario.ApellidoPaterno + " " + usuario.ApellidoMaterno : "")
            };

            //if (roles != null && roles.Count() > 0)
            //{
            //    foreach (var rol in roles)
            //    {
            //        claims.Add(new Claim("idRol", rol.IdRol.ToString()));
            //    }
            //}

            JwtSecurityToken token = new JwtSecurityToken(
                _configuracion.Issuer,
                _configuracion.Audience,
                claims,
                fechaInicio,
                expiracion,
                credentials
            );

            //generacion nuevo token
            string tokenUsuario = new JwtSecurityTokenHandler().WriteToken(token);

            return tokenUsuario;
        }
    }
}

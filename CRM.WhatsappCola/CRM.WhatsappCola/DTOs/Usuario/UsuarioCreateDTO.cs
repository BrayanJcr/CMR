using CRM.WhatsappCola.DTOs.Base;
using System.ComponentModel.DataAnnotations;

namespace CRM.WhatsappCola.DTOs.Usuario
{
    public class UsuarioCreateDTO
    {
        [Required]
        public string Nombres { get; set; }
        [Required]
        public string ApellidoPaterno { get; set; }
        public string? ApellidoMaterno { get; set; }
        [Required]
        public string NombreUsuario { get; set; }
        [Required]
        public string Clave { get; set; }

        [Required]
        public string UsuarioResponsable { get; set; }
    }
}

using System.ComponentModel.DataAnnotations;

namespace CRM.WhatsappCola.DTOs.Auth
{
    public class LoginRequestDTO
    {
        [Required]
        public string Usuario { get; set; }
        [Required]
        public string Clave { get; set; }
    }
}

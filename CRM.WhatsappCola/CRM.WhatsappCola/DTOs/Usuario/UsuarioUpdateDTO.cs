using CRM.WhatsappCola.DTOs.Base;
using System.ComponentModel.DataAnnotations;

namespace CRM.WhatsappCola.DTOs.Usuario
{
    public class UsuarioUpdateDTO : UsuarioCreateDTO
    {
        [Required]
        public int Id { get; set; }
    }
}

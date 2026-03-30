using CRM.WhatsappCola.DTOs.Base;

namespace CRM.WhatsappCola.DTOs.Usuario
{
    public class UsuarioDTO : BaseDTO
    {
        public string Nombres { get; set; }
        public string ApellidoPaterno { get; set; }
        public string ApellidoMaterno { get; set; }
        public string NombreUsuario { get; set; }
        public string ClaveHash { get; set; }
    }
}

namespace CRM.WhatsappCola.DTOs.Usuario
{
    public class UsuarioEditDTO
    {
        public string Nombres { get; set; }
        public string ApellidoPaterno { get; set; }
        public string? ApellidoMaterno { get; set; }
        public string NombreUsuario { get; set; }
        public string? Clave { get; set; }
        public string? Rol { get; set; }
    }
}

namespace CRM.WhatsappCola.DTOs.Base
{
    public class BaseDTO
    {
        public int Id { get; set; }
        public bool Estado { get; set; }
        public string UsuarioCreacion { get; set; }
        public string UsuarioModificacion { get; set; }
        public DateTime FechaCreacion { get; set; }
        public DateTime FechaModificacion{ get; set; }
    }
}

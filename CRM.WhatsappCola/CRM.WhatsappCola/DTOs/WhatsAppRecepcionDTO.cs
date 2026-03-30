using System.ComponentModel.DataAnnotations;

namespace CRM.WhatsappCola.DTOs
{
    public class WhatsAppRecepcionDTO
    {
        [Required]
        public string NumeroDestino { get; set; }
        [Required]
        public string NumeroOrigen { get; set; }
        public string? Mensage { get; set; }
        public string? AdjuntoBase64 { get; set; }
        public string? NombreArchivo { get; set; }
        public string? MimeType { get; set; }
        public int? NroByte { get; set; }
        [Url]
        public string? UrlArchivo { get; set; }
    }
}

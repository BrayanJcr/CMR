namespace CRM.WhatsappCola.DTOs
{
    public class SendMultimediaDTO
    {
        public string Numero        { get; set; } = string.Empty;
        public string Base64         { get; set; } = string.Empty;
        public string NombreArchivo  { get; set; } = string.Empty;
        public string MimeType       { get; set; } = string.Empty;
        public string? Caption       { get; set; }
    }
}

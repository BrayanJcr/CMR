namespace CRM.WhatsappCola.DTOs.WaEntrante
{
    public class WaMensajeEntranteDTO
    {
        public string NumeroDesde { get; set; }
        public string NumeroPara { get; set; }
        public string Mensaje { get; set; }
        public string WhatsAppTipo { get; set; }
        public DateTime FechaEnvio { get; set; }
        public string WhatsAppId { get; set; }
        public string? WhatsAppIdPadre { get; set; }
        
        public bool? TieneAdjunto { get; set; }
        public string? AdjuntoBase64 { get; set; }
        public string? NombreArchivo { get; set; }
        public string? MimeType { get; set; }
        public int? NroByte { get; set; }
        public bool? EsErrorDescargaMultimedia { get; set; }
        public string? NombreContacto { get; set; }
    }
}

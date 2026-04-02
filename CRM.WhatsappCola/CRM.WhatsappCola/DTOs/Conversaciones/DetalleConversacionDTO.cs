namespace CRM.WhatsappCola.DTOs.Conversaciones
{
    public class DetalleConversacionDTO
    {
        public int? IdMensajeSaliente { get; set; }

        public int? IdMensajeEntrante { get; set; }

        public string NumeroCuenta { get; set; }

        public string NumeroCliente { get; set; }

        public DateOnly? Fecha { get; set; }

        public DateTime? FechaEnvio { get; set; }

        public string WhatsAppId { get; set; }

        public string Mensaje { get; set; }

        public string WhatsAppIdPadre { get; set; }

        public int? IdMensajeSalientePadre { get; set; }

        public int? IdMensajeEntrantePadre { get; set; }

        public string Error { get; set; }

        public int? AckEstado { get; set; }

        //adjuntos
        public string MimeType { get; set; }
        public string AdjuntoBase64 { get; set; }
        public string NombreArchivo { get; set; }
        public bool? EsErrorDescargaMultimedia { get; set; }
    }
}

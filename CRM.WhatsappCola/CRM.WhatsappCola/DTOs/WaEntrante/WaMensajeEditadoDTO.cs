namespace CRM.WhatsappCola.DTOs.WaEntrante
{
    public class WaMensajeEditadoDTO
    {
        public string NumeroDesde { get; set; }
        public string NumeroPara { get; set; }
        public string MensajeActual { get; set; }
        public string MensajeAnterior { get; set; }
        public string WhatsAppTipo { get; set; }
        public DateTime FechaEnvio { get; set; }
        public string WhatsAppId { get; set; }
    }
}

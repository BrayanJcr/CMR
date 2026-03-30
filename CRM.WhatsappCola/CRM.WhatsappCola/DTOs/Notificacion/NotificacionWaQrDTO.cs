namespace CRM.WhatsappCola.DTOs.Notificacion
{
    public class NotificacionWaQrDTO
    {
        public string NumeroCuenta { get; set; }
        public string CodigoQr { get; set; }
        public object? Payload { get; set; }
    }
}

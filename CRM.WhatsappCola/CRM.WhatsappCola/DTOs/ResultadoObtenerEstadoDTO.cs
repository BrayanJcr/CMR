namespace CRM.WhatsappCola.DTOs
{
    public class ResultadoObtenerEstadoDTO
    {
        public bool Estado { get; set; }
        //public string Respuesta { get; set; }
        public int? MensageId { get; set; }
        public string? EstadoMensaje { get; set; }
        public string MensajeError { get; set; }
    }
}

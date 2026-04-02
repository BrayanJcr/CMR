namespace CRM.WhatsappCola.DTOs
{
    public class SendPollDTO
    {
        public string Numero   { get; set; } = string.Empty;
        public string Pregunta { get; set; } = string.Empty;
        public List<string> Opciones { get; set; } = new();
    }
}

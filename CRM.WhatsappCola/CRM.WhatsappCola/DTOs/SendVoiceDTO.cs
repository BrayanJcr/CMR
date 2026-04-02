namespace CRM.WhatsappCola.DTOs
{
    public class SendVoiceDTO
    {
        public string Numero     { get; set; } = string.Empty;
        public string AudioBase64 { get; set; } = string.Empty;
    }
}

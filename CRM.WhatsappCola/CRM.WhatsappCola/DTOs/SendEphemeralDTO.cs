namespace CRM.WhatsappCola.DTOs
{
    public class SendEphemeralDTO
    {
        public string Numero           { get; set; } = string.Empty;
        public string Mensaje          { get; set; } = string.Empty;
        public int    DuracionSegundos { get; set; } = 86400;
    }
}

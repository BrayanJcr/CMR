namespace CRM.WhatsappCola.DTOs
{
    public class SendContactCardDTO
    {
        public string NumeroDestino { get; set; } = string.Empty;
        public string Vcard { get; set; } = string.Empty;
        public string? NumeroOrigen { get; set; }
    }
}

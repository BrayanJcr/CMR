namespace CRM.WhatsappCola.DTOs.Base
{
    public class ConfiguracionAutenticacionDTO
    {
        public string Secret { get; set; } = "";
        public string SecretPaciente { get; set; } = "";
        public double ExpirationMinutes { get; set; }
        public string Issuer { get; set; }
        public string Audience { get; set; }
    }
}

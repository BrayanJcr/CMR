using Newtonsoft.Json;

namespace CRM.WhatsappCola.DTOs
{
    public class WARespuestaDTO
    {
        [JsonProperty("responseStatus")]
        public bool Estado { get; set; }
        [JsonProperty("messageResponse")]
        public string Mensage { get; set; }
        [JsonProperty("whatsAppId")]
        public string? WhatsAppId { get; set; }
    }
}

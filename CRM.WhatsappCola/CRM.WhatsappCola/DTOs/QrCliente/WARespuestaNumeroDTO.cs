using Newtonsoft.Json;

namespace CRM.WhatsappCola.DTOs
{
    public class WARespuestaNumeroDTO
    {
        [JsonProperty("responseStatus")]
        public bool Estado { get; set; }
        [JsonProperty("messageResponse")]
        public string Mensage { get; set; }
        [JsonProperty("number")]
        public string? Numero { get; set; }
    }
}

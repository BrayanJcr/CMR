using Newtonsoft.Json;

namespace CRM.WhatsappCola.DTOs
{
    public class WAMensajeVozDTO
    {
        [JsonProperty("to")]
        public string NumeroDestino { get; set; }

        [JsonProperty("base64Audio")]
        public string Base64Audio { get; set; }

        [JsonProperty("mimeType")]
        public string? MimeType { get; set; }
    }
}

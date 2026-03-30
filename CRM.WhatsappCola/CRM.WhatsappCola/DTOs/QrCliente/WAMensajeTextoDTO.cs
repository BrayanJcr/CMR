using Newtonsoft.Json;

namespace CRM.WhatsappCola.DTOs
{
    public class WAMensajeTextoDTO
    {
        [JsonProperty("phoneDestination")]
        public string NumeroDestino { get; set; }
        [JsonProperty("phoneFrom")]
        public string NumeroOrigen { get; set; }
        [JsonProperty("message")]
        public string? Mensage { get; set; }
    }
}

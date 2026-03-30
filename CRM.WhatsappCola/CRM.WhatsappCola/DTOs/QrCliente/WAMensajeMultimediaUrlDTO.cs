using Newtonsoft.Json;

namespace CRM.WhatsappCola.DTOs
{
    public class WAMensajeMultimediaUrlDTO
    {
        [JsonProperty("phoneDestination")]
        public string NumeroDestino { get; set; }
        [JsonProperty("phoneFrom")]
        public string NumeroOrigen { get; set; }
        [JsonProperty("caption")]
        public string? Mensage { get; set; }
        [JsonProperty("mediaUrl")]
        public string? UrlArchivo { get; set; }

    }
}

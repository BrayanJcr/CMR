using Newtonsoft.Json;

namespace CRM.WhatsappCola.DTOs
{
    public class WAMensajeMultimediaPayloadDTO
    {
        [JsonProperty("phoneDestination")]
        public string NumeroDestino { get; set; }
        [JsonProperty("phoneFrom")]
        public string NumeroOrigen { get; set; }
        [JsonProperty("caption")]
        public string? Mensage { get; set; }
        [JsonProperty("dataBase64")]
        public string? AdjuntoBase64 { get; set; }
        [JsonProperty("fileName")]
        public string? NombreArchivo { get; set; }
        [JsonProperty("mimeType")]
        public string? MimeType { get; set; }
        [JsonProperty("totalByte")]
        public int? NroByte { get; set; }
    }
}

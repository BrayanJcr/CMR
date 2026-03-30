using Newtonsoft.Json;

namespace CRM.WhatsappCola.DTOs
{
    public class WAInicializarDTO
    {
        [JsonProperty("phoneNumber")]
        public string NumeroCuenta{ get; set; }
    }
}

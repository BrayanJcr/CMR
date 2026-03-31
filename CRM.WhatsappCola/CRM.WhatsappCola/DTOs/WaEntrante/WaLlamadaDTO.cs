namespace CRM.WhatsappCola.DTOs.WaEntrante;

public class WaLlamadaDTO
{
    public string CallId { get; set; }
    public string From { get; set; }
    public bool IsVideo { get; set; }
    public long? Timestamp { get; set; }
}

namespace CRM.WhatsappCola.DTOs.WaEntrante;

public class WaGrupoEventoDTO
{
    public string ChatId { get; set; }
    public string Tipo { get; set; }
    public string Author { get; set; }
    public List<string> RecipientIds { get; set; } = new();
    public long? Timestamp { get; set; }
}

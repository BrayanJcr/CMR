namespace CRM.WhatsappCola.Models;

public partial class TGrupoEvento
{
    public int Id { get; set; }
    public string ChatId { get; set; }
    public string Tipo { get; set; }
    public string Author { get; set; }
    public string? Recipients { get; set; }
    public DateTime FechaEvento { get; set; }
    public bool Estado { get; set; }
}

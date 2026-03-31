namespace CRM.WhatsappCola.Models;

public partial class TMensajeReaccion
{
    public int Id { get; set; }
    public string WhatsAppId { get; set; }
    public string Emoji { get; set; }
    public string SenderId { get; set; }
    public DateTime FechaReaccion { get; set; }
    public bool Estado { get; set; }
}

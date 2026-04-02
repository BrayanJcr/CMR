namespace CRM.WhatsappCola.Models;

public partial class TLlamadaEntrante
{
    public int Id { get; set; }
    public string CallId { get; set; } = string.Empty;
    public string NumeroDesde { get; set; } = string.Empty;
    public bool EsVideo { get; set; } = false;
    public DateTime FechaLlamada { get; set; } = DateTime.Now;
    public bool Estado { get; set; } = true;
}

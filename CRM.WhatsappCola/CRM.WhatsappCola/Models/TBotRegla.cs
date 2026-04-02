namespace CRM.WhatsappCola.Models;

public partial class TBotRegla
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Patron { get; set; } = string.Empty;
    public string Respuesta { get; set; } = string.Empty;
    public string TipoAccion { get; set; } = "respuesta_texto";
    public int Prioridad { get; set; } = 100;
    public bool EsActivo { get; set; } = true;
    public bool Estado { get; set; } = true;
    public string UsuarioCreacion { get; set; } = string.Empty;
    public string UsuarioModificacion { get; set; } = string.Empty;
    public DateTime FechaCreacion { get; set; } = DateTime.Now;
    public DateTime FechaModificacion { get; set; } = DateTime.Now;
}

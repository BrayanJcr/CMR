#nullable disable
namespace CRM.WhatsappCola.Models;

/// <summary>Relación N:M entre conversaciones y etiquetas</summary>
public partial class TConversacionEtiqueta
{
    public int IdConversacion { get; set; }
    public int IdEtiqueta     { get; set; }

    public virtual TConversacion IdConversacionNavigation { get; set; }
    public virtual TEtiqueta     IdEtiquetaNavigation     { get; set; }
}

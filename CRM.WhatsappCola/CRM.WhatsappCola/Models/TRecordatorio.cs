#nullable disable
namespace CRM.WhatsappCola.Models;

/// <summary>Recordatorio de seguimiento para una conversación</summary>
public class TRecordatorio
{
    public int      Id                        { get; set; }
    public int      IdConversacion            { get; set; }
    public string   Texto                     { get; set; }
    public DateTime FechaRecordatorio         { get; set; }
    public bool     Completado                { get; set; } = false;
    public string   UsuarioCreacion           { get; set; } = "sistema";
    public DateTime FechaCreacion             { get; set; } = DateTime.Now;

    public virtual TConversacion IdConversacionNavigation { get; set; }
}

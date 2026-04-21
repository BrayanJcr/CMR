#nullable disable
using System;

namespace CRM.WhatsappCola.Models;

/// <summary>Notas internas de equipo sobre una conversación (no se envían al cliente)</summary>
public partial class TNotaConversacion
{
    public int Id { get; set; }
    public int IdConversacion { get; set; }
    public string Texto { get; set; }
    public string Usuario { get; set; } = "sistema";
    public DateTime FechaCreacion { get; set; } = DateTime.Now;
}

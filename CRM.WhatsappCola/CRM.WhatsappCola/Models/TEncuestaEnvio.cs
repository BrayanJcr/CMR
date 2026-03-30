#nullable disable
using System;
using System.Collections.Generic;

namespace CRM.WhatsappCola.Models;

/// <summary>
/// Envios de encuestas a contactos
/// </summary>
public partial class TEncuestaEnvio
{
    /// <summary>Identificador de tabla</summary>
    public int Id { get; set; }

    /// <summary>Id de la encuesta</summary>
    public int IdEncuesta { get; set; }

    /// <summary>Id del contacto</summary>
    public int? IdContacto { get; set; }

    /// <summary>Token unico para acceder a la encuesta</summary>
    public string Token { get; set; }

    /// <summary>Estado del envio (pendiente, completado)</summary>
    public string EstadoEnvio { get; set; }

    /// <summary>Fecha de envio</summary>
    public DateTime FechaEnvio { get; set; }

    /// <summary>Fecha en que fue completada la encuesta</summary>
    public DateTime? FechaCompletado { get; set; }

    /// <summary>Estado del elemento</summary>
    public bool Estado { get; set; }

    public virtual TEncuesta IdEncuestaNavigation { get; set; }
    public virtual TContacto IdContactoNavigation { get; set; }
    public virtual ICollection<TEncuestaRespuesta> TEncuestaRespuesta { get; set; } = new List<TEncuestaRespuesta>();
}

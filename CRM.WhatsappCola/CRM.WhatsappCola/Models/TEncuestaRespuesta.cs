#nullable disable
using System;

namespace CRM.WhatsappCola.Models;

/// <summary>
/// Respuestas de los contactos a las encuestas
/// </summary>
public partial class TEncuestaRespuesta
{
    /// <summary>Identificador de tabla</summary>
    public int Id { get; set; }

    /// <summary>Id del envio de encuesta</summary>
    public int IdEncuestaEnvio { get; set; }

    /// <summary>Id de la pregunta respondida</summary>
    public int IdPregunta { get; set; }

    /// <summary>Valor de la respuesta</summary>
    public string Valor { get; set; }

    /// <summary>Estado del elemento</summary>
    public bool Estado { get; set; }

    public virtual TEncuestaEnvio IdEncuestaEnvioNavigation { get; set; }
    public virtual TEncuestaPregunta IdPreguntaNavigation { get; set; }
}

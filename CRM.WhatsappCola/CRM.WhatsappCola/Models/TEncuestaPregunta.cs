#nullable disable
using System;
using System.Collections.Generic;

namespace CRM.WhatsappCola.Models;

/// <summary>
/// Preguntas de una encuesta
/// </summary>
public partial class TEncuestaPregunta
{
    /// <summary>Identificador de tabla</summary>
    public int Id { get; set; }

    /// <summary>Id de la encuesta</summary>
    public int IdEncuesta { get; set; }

    /// <summary>Orden de la pregunta</summary>
    public int Orden { get; set; }

    /// <summary>Texto de la pregunta</summary>
    public string Texto { get; set; }

    /// <summary>Tipo de pregunta (texto, opcion_multiple, escala, si_no)</summary>
    public string Tipo { get; set; }

    /// <summary>Opciones en JSON para preguntas de seleccion</summary>
    public string Opciones { get; set; }

    /// <summary>Indica si la pregunta es obligatoria</summary>
    public bool Obligatorio { get; set; }

    /// <summary>Id de la pregunta condicion</summary>
    public int? CondicionPreguntaId { get; set; }

    /// <summary>Respuesta condicion para mostrar esta pregunta</summary>
    public string CondicionRespuesta { get; set; }

    /// <summary>Estado del elemento</summary>
    public bool Estado { get; set; }

    public virtual TEncuesta IdEncuestaNavigation { get; set; }
    public virtual ICollection<TEncuestaRespuesta> TEncuestaRespuesta { get; set; } = new List<TEncuestaRespuesta>();
}

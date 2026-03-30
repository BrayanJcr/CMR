#nullable disable
using System;
using System.Collections.Generic;

namespace CRM.WhatsappCola.Models;

/// <summary>
/// Encuestas de satisfaccion y formularios
/// </summary>
public partial class TEncuesta
{
    /// <summary>Identificador de tabla</summary>
    public int Id { get; set; }

    /// <summary>Nombre de la encuesta</summary>
    public string Nombre { get; set; }

    /// <summary>Descripcion de la encuesta</summary>
    public string Descripcion { get; set; }

    /// <summary>Categoria de la encuesta</summary>
    public string Categoria { get; set; }

    /// <summary>Estado del elemento</summary>
    public bool Estado { get; set; }

    /// <summary>Usuario de creacion del registro</summary>
    public string UsuarioCreacion { get; set; }

    /// <summary>Usuario de modificacion del registro</summary>
    public string UsuarioModificacion { get; set; }

    /// <summary>Fecha de creacion del registro</summary>
    public DateTime FechaCreacion { get; set; }

    /// <summary>Fecha de modificacion del registro</summary>
    public DateTime FechaModificacion { get; set; }

    public virtual ICollection<TEncuestaPregunta> TEncuestaPregunta { get; set; } = new List<TEncuestaPregunta>();
    public virtual ICollection<TEncuestaEnvio> TEncuestaEnvio { get; set; } = new List<TEncuestaEnvio>();
}

#nullable disable
using System;
using System.Collections.Generic;

namespace CRM.WhatsappCola.Models;

/// <summary>
/// Etapas del pipeline de ventas
/// </summary>
public partial class TPipelineEtapa
{
    /// <summary>Identificador de tabla</summary>
    public int Id { get; set; }

    /// <summary>Nombre de la etapa</summary>
    public string Nombre { get; set; }

    /// <summary>Orden de la etapa en el pipeline</summary>
    public int Orden { get; set; }

    /// <summary>Color en formato hex</summary>
    public string Color { get; set; }

    /// <summary>Descripcion de la etapa</summary>
    public string Descripcion { get; set; }

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

    public virtual ICollection<TOportunidad> TOportunidad { get; set; } = new List<TOportunidad>();
}

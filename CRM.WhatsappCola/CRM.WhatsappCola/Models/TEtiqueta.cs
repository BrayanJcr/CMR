#nullable disable
using System;
using System.Collections.Generic;

namespace CRM.WhatsappCola.Models;

/// <summary>
/// Almacena las etiquetas para clasificar contactos
/// </summary>
public partial class TEtiqueta
{
    /// <summary>Identificador de tabla</summary>
    public int Id { get; set; }

    /// <summary>Nombre de la etiqueta</summary>
    public string Nombre { get; set; }

    /// <summary>Color en formato hex</summary>
    public string Color { get; set; }

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

    public virtual ICollection<TContactoEtiqueta>    TContactoEtiqueta    { get; set; } = new List<TContactoEtiqueta>();

    public virtual ICollection<TConversacionEtiqueta> TConversacionEtiqueta { get; set; } = new List<TConversacionEtiqueta>();
}

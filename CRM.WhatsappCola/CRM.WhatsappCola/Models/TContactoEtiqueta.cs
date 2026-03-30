#nullable disable
using System;

namespace CRM.WhatsappCola.Models;

/// <summary>
/// Relacion entre contactos y etiquetas
/// </summary>
public partial class TContactoEtiqueta
{
    /// <summary>Identificador de tabla</summary>
    public int Id { get; set; }

    /// <summary>Id del contacto</summary>
    public int IdContacto { get; set; }

    /// <summary>Id de la etiqueta</summary>
    public int IdEtiqueta { get; set; }

    /// <summary>Estado del elemento</summary>
    public bool Estado { get; set; }

    /// <summary>Usuario de creacion del registro</summary>
    public string UsuarioCreacion { get; set; }

    /// <summary>Fecha de creacion del registro</summary>
    public DateTime FechaCreacion { get; set; }

    public virtual TContacto IdContactoNavigation { get; set; }
    public virtual TEtiqueta IdEtiquetaNavigation { get; set; }
}

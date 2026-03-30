#nullable disable
using System;
using System.Collections.Generic;

namespace CRM.WhatsappCola.Models;

/// <summary>
/// Almacena las empresas del CRM
/// </summary>
public partial class TEmpresa
{
    /// <summary>Identificador de tabla</summary>
    public int Id { get; set; }

    /// <summary>Nombre de la empresa</summary>
    public string Nombre { get; set; }

    /// <summary>RUC de la empresa</summary>
    public string Ruc { get; set; }

    /// <summary>Sector al que pertenece</summary>
    public string Sector { get; set; }

    /// <summary>Tamaño de la empresa</summary>
    public string Tamano { get; set; }

    /// <summary>Sitio web</summary>
    public string Web { get; set; }

    /// <summary>Dirección</summary>
    public string Direccion { get; set; }

    /// <summary>Logo en base64 o URL</summary>
    public string Logo { get; set; }

    /// <summary>Notas adicionales</summary>
    public string Notas { get; set; }

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

    public virtual ICollection<TContacto> TContacto { get; set; } = new List<TContacto>();
    public virtual ICollection<TOportunidad> TOportunidad { get; set; } = new List<TOportunidad>();
    public virtual ICollection<TActividad> TActividad { get; set; } = new List<TActividad>();
}

#nullable disable
using System;
using System.Collections.Generic;

namespace CRM.WhatsappCola.Models;

/// <summary>
/// Almacena los contactos del CRM
/// </summary>
public partial class TContacto
{
    /// <summary>Identificador de tabla</summary>
    public int Id { get; set; }

    /// <summary>Nombres del contacto</summary>
    public string Nombres { get; set; }

    /// <summary>Apellidos del contacto</summary>
    public string Apellidos { get; set; }

    /// <summary>Numero de WhatsApp</summary>
    public string NumeroWhatsApp { get; set; }

    /// <summary>Correo electronico</summary>
    public string Email { get; set; }

    /// <summary>Cargo en la empresa</summary>
    public string Cargo { get; set; }

    /// <summary>Id de la empresa asociada</summary>
    public int? IdEmpresa { get; set; }

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

    public virtual TEmpresa IdEmpresaNavigation { get; set; }
    public virtual ICollection<TContactoEtiqueta> TContactoEtiqueta { get; set; } = new List<TContactoEtiqueta>();
    public virtual ICollection<TOportunidad> TOportunidad { get; set; } = new List<TOportunidad>();
    public virtual ICollection<TActividad> TActividad { get; set; } = new List<TActividad>();
}

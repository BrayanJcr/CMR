#nullable disable
using System;

namespace CRM.WhatsappCola.Models;

/// <summary>
/// Almacena las actividades del CRM
/// </summary>
public partial class TActividad
{
    /// <summary>Identificador de tabla</summary>
    public int Id { get; set; }

    /// <summary>Tipo de actividad (llamada, reunion, tarea, email)</summary>
    public string Tipo { get; set; }

    /// <summary>Titulo de la actividad</summary>
    public string Titulo { get; set; }

    /// <summary>Descripcion de la actividad</summary>
    public string Descripcion { get; set; }

    /// <summary>Fecha programada de la actividad</summary>
    public DateTime? FechaActividad { get; set; }

    /// <summary>Estado de la actividad (pendiente, completada, cancelada)</summary>
    public string EstadoActividad { get; set; }

    /// <summary>Id del usuario responsable</summary>
    public int? IdResponsable { get; set; }

    /// <summary>Id del contacto asociado</summary>
    public int? IdContacto { get; set; }

    /// <summary>Id de la empresa asociada</summary>
    public int? IdEmpresa { get; set; }

    /// <summary>Id de la oportunidad asociada</summary>
    public int? IdOportunidad { get; set; }

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

    public virtual TUsuario IdResponsableNavigation { get; set; }
    public virtual TContacto IdContactoNavigation { get; set; }
    public virtual TEmpresa IdEmpresaNavigation { get; set; }
    public virtual TOportunidad IdOportunidadNavigation { get; set; }
}

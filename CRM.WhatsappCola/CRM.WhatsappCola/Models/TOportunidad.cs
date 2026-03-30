#nullable disable
using System;
using System.Collections.Generic;

namespace CRM.WhatsappCola.Models;

/// <summary>
/// Almacena las oportunidades de venta
/// </summary>
public partial class TOportunidad
{
    /// <summary>Identificador de tabla</summary>
    public int Id { get; set; }

    /// <summary>Titulo de la oportunidad</summary>
    public string Titulo { get; set; }

    /// <summary>Id del contacto asociado</summary>
    public int? IdContacto { get; set; }

    /// <summary>Id de la empresa asociada</summary>
    public int? IdEmpresa { get; set; }

    /// <summary>Id del usuario responsable</summary>
    public int? IdResponsable { get; set; }

    /// <summary>Id de la etapa del pipeline</summary>
    public int IdEtapa { get; set; }

    /// <summary>Monto estimado de la oportunidad</summary>
    public decimal MontoEstimado { get; set; }

    /// <summary>Moneda del monto</summary>
    public string Moneda { get; set; }

    /// <summary>Probabilidad de cierre en porcentaje</summary>
    public int Probabilidad { get; set; }

    /// <summary>Fecha estimada de cierre</summary>
    public DateTime? FechaCierre { get; set; }

    /// <summary>Origen de la oportunidad</summary>
    public string Origen { get; set; }

    /// <summary>Prioridad de la oportunidad</summary>
    public string Prioridad { get; set; }

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

    public virtual TContacto IdContactoNavigation { get; set; }
    public virtual TEmpresa IdEmpresaNavigation { get; set; }
    public virtual TUsuario IdResponsableNavigation { get; set; }
    public virtual TPipelineEtapa IdEtapaNavigation { get; set; }
    public virtual ICollection<TOportunidadProducto> TOportunidadProducto { get; set; } = new List<TOportunidadProducto>();
    public virtual ICollection<TActividad> TActividad { get; set; } = new List<TActividad>();
}

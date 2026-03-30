#nullable disable
using System;

namespace CRM.WhatsappCola.Models;

/// <summary>
/// Productos asociados a una oportunidad
/// </summary>
public partial class TOportunidadProducto
{
    /// <summary>Identificador de tabla</summary>
    public int Id { get; set; }

    /// <summary>Id de la oportunidad</summary>
    public int IdOportunidad { get; set; }

    /// <summary>Id del producto</summary>
    public int IdProducto { get; set; }

    /// <summary>Cantidad</summary>
    public decimal Cantidad { get; set; }

    /// <summary>Precio unitario al momento de la cotizacion</summary>
    public decimal PrecioUnitario { get; set; }

    /// <summary>Estado del elemento</summary>
    public bool Estado { get; set; }

    /// <summary>Usuario de creacion del registro</summary>
    public string UsuarioCreacion { get; set; }

    /// <summary>Fecha de creacion del registro</summary>
    public DateTime FechaCreacion { get; set; }

    public virtual TOportunidad IdOportunidadNavigation { get; set; }
    public virtual TProducto IdProductoNavigation { get; set; }
}

#nullable disable
using System;
using System.Collections.Generic;

namespace CRM.WhatsappCola.Models;

/// <summary>
/// Almacena los productos del catalogo
/// </summary>
public partial class TProducto
{
    /// <summary>Identificador de tabla</summary>
    public int Id { get; set; }

    /// <summary>Nombre del producto</summary>
    public string Nombre { get; set; }

    /// <summary>Codigo del producto</summary>
    public string Codigo { get; set; }

    /// <summary>Descripcion del producto</summary>
    public string Descripcion { get; set; }

    /// <summary>Precio unitario</summary>
    public decimal Precio { get; set; }

    /// <summary>Unidad de medida</summary>
    public string Unidad { get; set; }

    /// <summary>Id de la categoria</summary>
    public int? IdCategoria { get; set; }

    /// <summary>Imagen en base64 o URL</summary>
    public string Imagen { get; set; }

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

    public virtual TProductoCategoria IdCategoriaNavigation { get; set; }
    public virtual ICollection<TOportunidadProducto> TOportunidadProducto { get; set; } = new List<TOportunidadProducto>();
}

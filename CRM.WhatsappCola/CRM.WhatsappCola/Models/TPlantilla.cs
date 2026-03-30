#nullable disable
using System;

namespace CRM.WhatsappCola.Models;

/// <summary>
/// Plantillas de mensajes para WhatsApp
/// </summary>
public partial class TPlantilla
{
    /// <summary>Identificador de tabla</summary>
    public int Id { get; set; }

    /// <summary>Nombre de la plantilla</summary>
    public string Nombre { get; set; }

    /// <summary>Categoria de la plantilla</summary>
    public string Categoria { get; set; }

    /// <summary>Contenido de la plantilla con variables {{varname}}</summary>
    public string Contenido { get; set; }

    /// <summary>Variables de la plantilla en JSON</summary>
    public string Variables { get; set; }

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
}

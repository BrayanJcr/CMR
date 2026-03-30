#nullable disable
using System;

namespace CRM.WhatsappCola.Models;

/// <summary>
/// Configuracion del sistema CRM
/// </summary>
public partial class TConfiguracionSistema
{
    /// <summary>Identificador de tabla</summary>
    public int Id { get; set; }

    /// <summary>Clave de configuracion</summary>
    public string Clave { get; set; }

    /// <summary>Valor de configuracion</summary>
    public string Valor { get; set; }

    /// <summary>Tipo de dato (string, boolean, number)</summary>
    public string Tipo { get; set; }

    /// <summary>Descripcion del parametro</summary>
    public string Descripcion { get; set; }

    /// <summary>Usuario de modificacion del registro</summary>
    public string UsuarioModificacion { get; set; }

    /// <summary>Fecha de modificacion del registro</summary>
    public DateTime FechaModificacion { get; set; }
}

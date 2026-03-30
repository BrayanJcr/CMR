#nullable disable
using System;
using System.Collections.Generic;

namespace CRM.WhatsappCola.Models;

/// <summary>
/// Campanas de mensajeria masiva
/// </summary>
public partial class TCampana
{
    /// <summary>Identificador de tabla</summary>
    public int Id { get; set; }

    /// <summary>Nombre de la campana</summary>
    public string Nombre { get; set; }

    /// <summary>Id de la plantilla asociada</summary>
    public int? IdPlantilla { get; set; }

    /// <summary>Mensaje personalizado</summary>
    public string Mensaje { get; set; }

    /// <summary>Tags de la campana en JSON</summary>
    public string Tags { get; set; }

    /// <summary>Estado de la campana (borrador, programada, enviando, completada)</summary>
    public string EstadoCampana { get; set; }

    /// <summary>Fecha programada de envio</summary>
    public DateTime? ProgramadaPara { get; set; }

    /// <summary>Total de contactos</summary>
    public int Total { get; set; }

    /// <summary>Cantidad de mensajes enviados</summary>
    public int Enviados { get; set; }

    /// <summary>Cantidad de mensajes fallidos</summary>
    public int Fallidos { get; set; }

    /// <summary>Cantidad de mensajes pendientes</summary>
    public int Pendientes { get; set; }

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

    public virtual TPlantilla IdPlantillaNavigation { get; set; }
    public virtual ICollection<TCampanaContacto> TCampanaContacto { get; set; } = new List<TCampanaContacto>();
}

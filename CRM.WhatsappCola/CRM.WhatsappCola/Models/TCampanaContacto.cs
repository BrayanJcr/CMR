#nullable disable
using System;

namespace CRM.WhatsappCola.Models;

/// <summary>
/// Contactos incluidos en una campana
/// </summary>
public partial class TCampanaContacto
{
    /// <summary>Identificador de tabla</summary>
    public int Id { get; set; }

    /// <summary>Id de la campana</summary>
    public int IdCampana { get; set; }

    /// <summary>Id del contacto</summary>
    public int IdContacto { get; set; }

    /// <summary>Indica si el mensaje fue enviado</summary>
    public bool Enviado { get; set; }

    /// <summary>Error de envio si existe</summary>
    public string ErrorEnvio { get; set; }

    /// <summary>Fecha de envio del mensaje</summary>
    public DateTime? FechaEnvio { get; set; }

    /// <summary>Estado del elemento</summary>
    public bool Estado { get; set; }

    public virtual TCampana IdCampanaNavigation { get; set; }
    public virtual TContacto IdContactoNavigation { get; set; }
}

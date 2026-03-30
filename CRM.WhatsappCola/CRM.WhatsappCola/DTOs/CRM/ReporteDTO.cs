#nullable disable
using System;
using System.Collections.Generic;

namespace CRM.WhatsappCola.DTOs.CRM;

public class ResumenDashboardDTO
{
    public int ConversacionesActivas { get; set; }
    public int MensajesHoy { get; set; }
    public int MensajesEntrantesHoy { get; set; }
    public int MensajesSalientesHoy { get; set; }
    public int ContactosTotal { get; set; }
    public int OportunidadesActivas { get; set; }
    public decimal ValorPipelineTotal { get; set; }
    public string WhatsAppEstado { get; set; }
    public string WhatsAppNumero { get; set; }
}

public class MensajesPorDiaDTO
{
    public DateTime Fecha { get; set; }
    public int Entrantes { get; set; }
    public int Salientes { get; set; }
}

public class PipelineReporteDTO
{
    public string NombreEtapa { get; set; }
    public string Color { get; set; }
    public int Cantidad { get; set; }
    public decimal ValorTotal { get; set; }
}

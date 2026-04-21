namespace CRM.WhatsappCola.DTOs.Conversaciones;

public class CrearRecordatorioDTO
{
    public int      IdConversacion    { get; set; }
    public string   Texto             { get; set; }
    public DateTime FechaRecordatorio { get; set; }
}

public class UpdateAgenteConversacionDTO
{
    public string AgenteAsignado { get; set; }
}

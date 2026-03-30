namespace CRM.WhatsappCola.DTOs.Conversaciones
{
    public class FiltroDetalleConversacionDTO
    {
        public string? NumeroCuenta { get; set; }
        public string? NumeroCliente{ get; set; }
        public DateOnly? FechaInicio { get; set; }
        public DateOnly? FechaFin{ get; set; }
    }
}

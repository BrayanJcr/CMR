namespace CRM.WhatsappCola.DTOs
{
    public class SendLocationDTO
    {
        public string Numero   { get; set; } = string.Empty;
        public double Latitud  { get; set; }
        public double Longitud { get; set; }
        public string? Nombre    { get; set; }
        public string? Direccion { get; set; }
    }
}

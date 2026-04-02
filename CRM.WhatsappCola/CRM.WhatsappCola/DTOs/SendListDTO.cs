namespace CRM.WhatsappCola.DTOs
{
    public class SendListDTO
    {
        public string NumeroDestino { get; set; } = string.Empty;
        public string Titulo { get; set; } = string.Empty;
        public string Cuerpo { get; set; } = string.Empty;
        public string TextoBoton { get; set; } = string.Empty;
        public List<ListSeccionDTO> Secciones { get; set; } = new();
        public string? NumeroOrigen { get; set; }
    }

    public class ListSeccionDTO
    {
        public string Title { get; set; } = string.Empty;
        public List<ListRowDTO> Rows { get; set; } = new();
    }

    public class ListRowDTO
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string RowId { get; set; } = string.Empty;
    }
}

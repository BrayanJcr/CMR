namespace CRM.WhatsappCola.DTOs
{
    public class BotReglaDTO
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Patron { get; set; } = string.Empty;
        public string Respuesta { get; set; } = string.Empty;
        public string TipoAccion { get; set; } = "respuesta_texto";
        public int Prioridad { get; set; } = 100;
        public bool EsActivo { get; set; } = true;
    }
}

#nullable disable

namespace CRM.WhatsappCola.DTOs.CRM;

public class EtiquetaDTO
{
    public int Id { get; set; }
    public string Nombre { get; set; }
    public string Color { get; set; }
    public bool Estado { get; set; }
}

public class EtiquetaCreateDTO
{
    public string Nombre { get; set; }
    public string Color { get; set; }
}

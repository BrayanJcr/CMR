#nullable disable

namespace CRM.WhatsappCola.DTOs.CRM;

public class ConfiguracionDTO
{
    public string Clave { get; set; }
    public string Valor { get; set; }
    public string Tipo { get; set; }
    public string Descripcion { get; set; }
}

public class ConfiguracionUpdateDTO
{
    public string Clave { get; set; }
    public string Valor { get; set; }
}

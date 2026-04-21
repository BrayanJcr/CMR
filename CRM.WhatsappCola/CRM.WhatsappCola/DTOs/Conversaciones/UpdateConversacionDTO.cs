namespace CRM.WhatsappCola.DTOs.Conversaciones;

public class UpdateEstadoConversacionDTO
{
    /// <summary>abierta | en_progreso | resuelta | spam</summary>
    public string Estado { get; set; }
}

public class UpdateNotaConversacionDTO
{
    public string Nota { get; set; }
}

public class UpdateNombreContactoDTO
{
    public string NombreContacto { get; set; }
}

public class AddEtiquetaConversacionDTO
{
    public int IdEtiqueta { get; set; }
}

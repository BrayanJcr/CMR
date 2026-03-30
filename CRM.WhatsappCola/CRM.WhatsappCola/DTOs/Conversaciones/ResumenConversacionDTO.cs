namespace CRM.WhatsappCola.DTOs.Conversaciones
{
    public class ResumenConversacionDTO
    {
        public string NumeroCuenta { get; set; }

        public string NumeroCliente { get; set; }

        public DateTime? FechaUltimoMensaje { get; set; }

        public string NombreContacto { get; set; }
    }
}

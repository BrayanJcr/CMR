using Microsoft.AspNetCore.SignalR;

namespace CRM.WhatsappCola.Hubs
{
    /// <summary>
    /// Contenedor estático de IHubContext para ser usado por servicios instanciados con "new"
    /// que no tienen acceso a inyección de dependencias.
    /// </summary>
    public static class HubContextHolder
    {
        public static IHubContext<ChatHub>? ChatContext { get; set; }
        public static IHubContext<QrHub>? QrContext { get; set; }
    }
}

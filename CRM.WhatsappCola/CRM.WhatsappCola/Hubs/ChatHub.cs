using Microsoft.AspNetCore.SignalR;

namespace CRM.WhatsappCola.Hubs
{
    public class ChatHub : Hub
    {
        // Método invocado por los servicios internos para retransmitir a todos los clientes web
        public async Task NotificarNuevoMensajeGeneral(string payload)
        {
            await Clients.Others.SendAsync("NuevoMensaje", payload);
        }
    }
}

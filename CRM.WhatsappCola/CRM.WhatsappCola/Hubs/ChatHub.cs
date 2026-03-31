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

        public async Task NotificarAckActualizado(string whatsAppId, int ackEstado)
        {
            await Clients.Others.SendAsync("AckActualizado", whatsAppId, ackEstado);
        }

        public async Task NotificarNuevaReaccion(string whatsAppId, string emoji, string senderId)
        {
            await Clients.Others.SendAsync("NuevaReaccion", whatsAppId, emoji, senderId);
        }

        public async Task NotificarLlamadaEntrante(string from, bool isVideo)
        {
            await Clients.Others.SendAsync("LlamadaEntrante", from, isVideo);
        }
    }
}

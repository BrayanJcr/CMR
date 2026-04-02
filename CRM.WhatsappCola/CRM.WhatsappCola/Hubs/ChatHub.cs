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

        // Métodos estáticos invocados por servicios internos via HubContextHolder

        public static async Task NotificarMensajeEditado(string whatsAppId, string mensajeNuevo, string mensajeAnterior)
        {
            if (HubContextHolder.ChatContext != null)
                await HubContextHolder.ChatContext.Clients.All.SendAsync("MensajeEditado",
                    new { whatsAppId, mensajeNuevo, mensajeAnterior });
        }

        public static async Task NotificarMensajeEliminado(string whatsAppId)
        {
            if (HubContextHolder.ChatContext != null)
                await HubContextHolder.ChatContext.Clients.All.SendAsync("MensajeEliminado",
                    new { whatsAppId });
        }

        public static async Task NotificarPresenciaActualizada(string numero, string presencia)
        {
            if (HubContextHolder.ChatContext != null)
                await HubContextHolder.ChatContext.Clients.All.SendAsync("PresenciaActualizada",
                    new { numero, presencia });
        }

        public static async Task NotificarGrupoEvento(string chatId, string tipo, string author)
        {
            if (HubContextHolder.ChatContext != null)
                await HubContextHolder.ChatContext.Clients.All.SendAsync("GrupoEventoRecibido",
                    new { chatId, tipo, author });
        }

        public static async Task NotificarLlamada(string callId, string numeroDesde, bool esVideo)
        {
            if (HubContextHolder.ChatContext != null)
                await HubContextHolder.ChatContext.Clients.All.SendAsync("LlamadaEntrante",
                    new { callId, numeroDesde, esVideo });
        }
    }
}

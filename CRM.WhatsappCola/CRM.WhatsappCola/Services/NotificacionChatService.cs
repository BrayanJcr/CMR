using CRM.WhatsappCola.DTOs.Notificacion;
using CRM.WhatsappCola.Hubs;
using Microsoft.AspNetCore.SignalR;
using Newtonsoft.Json;

namespace CRM.WhatsappCola.Services
{
    public class NotificacionChatService
    {
        public bool EnviarNotificacion_NuevoMensajeGeneral(NotificacionWaChatDTO notificacion, string payload)
        {
            try
            {
                HubContextHolder.ChatContext?.Clients.All
                    .SendAsync("NuevoMensaje", JsonConvert.SerializeObject(notificacion))
                    .Wait();
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }
    }
}

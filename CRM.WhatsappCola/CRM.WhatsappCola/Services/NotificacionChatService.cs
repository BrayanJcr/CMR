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
                if (HubContextHolder.ChatContext == null)
                {
                    Console.WriteLine("[SignalR] ❌ ChatContext es NULL - no se puede enviar notificación");
                    return false;
                }

                var json = JsonConvert.SerializeObject(notificacion);
                Console.WriteLine($"[SignalR] 📤 Enviando NuevoMensaje: {json}");
                HubContextHolder.ChatContext.Clients.All
                    .SendAsync("NuevoMensaje", json)
                    .Wait();
                Console.WriteLine("[SignalR] ✅ NuevoMensaje enviado correctamente");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SignalR] ❌ Error enviando NuevoMensaje: {ex.Message}");
                return false;
            }
        }
    }
}

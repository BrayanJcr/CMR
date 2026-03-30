using Newtonsoft.Json;
using Microsoft.AspNetCore.SignalR.Client;
using CRM.WhatsappCola.DTOs.Notificacion;
using CRM.WhatsappCola.DTOs.WaEntrante;

namespace CRM.WhatsappCola.Services
{
    public class NotificacionChatService
    {
        private bool EnvioNotificacion(string evento, object payload)
        {
            try
            {
                HubConnection connection = new HubConnectionBuilder()
                ////.WithUrl("https://localhost:44396/hub-chat", (opts) =>
                .WithUrl("https://dev.sr.crm.clinicacayetanoheredia.com/hub-chat", (opts) =>
                {
                    opts.HttpMessageHandlerFactory = (message) =>
                        {
                            if (message is HttpClientHandler clientHandler)
                                // always verify the SSL certificate
                                clientHandler.ServerCertificateCustomValidationCallback +=
                                    (sender, certificate, chain, sslPolicyErrors) => { return true; };
                            return message;
                        };
                })
                    .Build();

                connection.StartAsync().Wait();
                connection.InvokeAsync(evento, JsonConvert.SerializeObject(payload)).Wait();
                connection.DisposeAsync();
                return true;
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }

        public bool EnviarNotificacion_NuevoMensajeGeneral(NotificacionWaChatDTO notificacion, string payload)
        {
            try
            {
                var respuesta = EnvioNotificacion("NotificarNuevoMensajeGeneral", notificacion);

                return respuesta;
            }
            catch (Exception ex)
            {
                return false;
            }
        }
    }
}
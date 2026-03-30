using Newtonsoft.Json;
using Microsoft.AspNetCore.SignalR.Client;
using CRM.WhatsappCola.DTOs.Notificacion;
using CRM.WhatsappCola.DTOs.WaEntrante;

namespace CRM.WhatsappCola.Services
{
    public class NotificacionQRService
    {
        private bool EnvioNotificacion(string evento, object payload)
        {
            try
            {
                HubConnection connection = new HubConnectionBuilder()
                ////.WithUrl("https://localhost:44396/hub-qr", (opts) =>
                .WithUrl("https://dev.sr.crm.clinicacayetanoheredia.com/hub-qr", (opts) =>
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

        public bool EnviarNotificacion_RecepcionQR(WaMensajeQrEntranteDTO qrDto, string payload)
        {
            try
            {
                NotificacionWaQrDTO notificacion = new NotificacionWaQrDTO()
                {
                    CodigoQr = qrDto.QrCode,
                    Payload = payload
                };

                var respuesta = EnvioNotificacion("NotificarQr", notificacion);

                return respuesta;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public bool EnviarNotificacion_RecepcionNumero(WaMensajeNumeroEntranteDTO numeroDto, string payload)
        {
            try
            {
                NotificacionWaNumeroDTO notificacion = new NotificacionWaNumeroDTO()
                {
                    NumeroCuenta = numeroDto.NumeroDesde,
                    Payload = payload
                };

                var respuesta = EnvioNotificacion("NotificarNumero", notificacion);

                return respuesta;
            }
            catch (Exception ex)
            {
                return false;
            }
        }
    }
}
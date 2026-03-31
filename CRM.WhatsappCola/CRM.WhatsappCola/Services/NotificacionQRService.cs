using CRM.WhatsappCola.DTOs.Notificacion;
using CRM.WhatsappCola.DTOs.WaEntrante;
using CRM.WhatsappCola.Hubs;
using Microsoft.AspNetCore.SignalR;
using Newtonsoft.Json;

namespace CRM.WhatsappCola.Services
{
    public class NotificacionQRService
    {
        public bool EnviarNotificacion_RecepcionQR(WaMensajeQrEntranteDTO qrDto, string qrImageBase64 = null)
        {
            try
            {
                var notificacion = new NotificacionWaQrDTO()
                {
                    CodigoQr = qrDto.QrCode,
                    Payload = qrImageBase64
                };
                HubContextHolder.QrContext?.Clients.All
                    .SendAsync("NuevoQr", JsonConvert.SerializeObject(notificacion))
                    .Wait();
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        public bool EnviarNotificacion_RecepcionNumero(WaMensajeNumeroEntranteDTO numeroDto, string payload)
        {
            try
            {
                var notificacion = new NotificacionWaNumeroDTO()
                {
                    NumeroCuenta = numeroDto.NumeroDesde,
                    Payload = payload
                };
                HubContextHolder.QrContext?.Clients.All
                    .SendAsync("NuevoNumero", JsonConvert.SerializeObject(notificacion))
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

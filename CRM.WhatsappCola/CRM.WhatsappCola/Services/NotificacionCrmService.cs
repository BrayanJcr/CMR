using CRM.WhatsappCola.DTOs.WaEntrante;
using CRM.WhatsappCola.Models;
using Newtonsoft.Json;
using System.Net;
using System.Net.Security;

namespace CRM.WhatsappCola.Services
{
    public class NotificacionCrmService
    {
        private string _baseUrl = "https://api.crm.clinicacayetanoheredia.com/";
        private string _token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZFVzdWFyaW8iOiI5IiwiaWRUaXBvRG9jdW1lbnRvIjoiMSIsIm51bWVyb0RvY3VtZW50byI6IjEwMDAwMDAwMDAxIiwibm9tYnJlcyI6IldoYXRzQXBwIFFSIiwiYXBlbGxpZG9QYXRlcm5vIjoiV2hhdHNBcHAgUVIiLCJhcGVsbGlkb01hdGVybm8iOiJXaGF0c0FwcCBRUiIsImZlY2hhRXhwaXJhY2lvbiI6IjI1LzA5LzMxMDQgMTg6Mjg6MDIiLCJuYmYiOjE3MjczMDY4ODIsImV4cCI6MzU4MDg3MzcyODIsImlzcyI6Imh0dHBzOi8vKi5jcm0uY29uZmlhc2FsdWQucGUiLCJhdWQiOiJodHRwczovLyouY3JtLmNvbmZpYXNhbHVkLnBlIn0.f8-9yo5HV7x3ZjMyrPhhy83s3W3XYoj9NckODyLBVKY";
        private WebClient _webclient { get; set; }

        public NotificacionCrmService()
        {
            _webclient = new WebClient();

            _webclient.Headers.Add("Content-Type", "application/json");
            _webclient.Headers.Add(HttpRequestHeader.Authorization, "Bearer " + _token);

            ServicePointManager.ServerCertificateValidationCallback =
                new RemoteCertificateValidationCallback(
                    delegate
                    { return true; }
                );
        }

        public bool Envio_MensajeEntrante_WhatsApp(TMensajeEntrante mensaje)
        {
            try
            {
                string url = _baseUrl + "api/Whatsapp/RecibirMensaje";
                var data = JsonConvert.SerializeObject(mensaje);
                var respuesta = _webclient.UploadString(url, "POST", data);

                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public bool Envio_MensajeEdicion_WhatsApp(WaMensajeEditadoDTO mensaje)
        {
            try
            {
                string url = _baseUrl + "api/Whatsapp/RecibirEdicion";
                var data = JsonConvert.SerializeObject(mensaje);
                var respuesta = _webclient.UploadString(url, "POST", data);

                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public bool Envio_MensajeEdicion_WhatsApp(WaMensajeEliminadoDTO mensaje)
        {
            try
            {
                string url = _baseUrl + "api/Whatsapp/RecibirEliminacion";
                var data = JsonConvert.SerializeObject(mensaje);
                var respuesta = _webclient.UploadString(url, "POST", data);

                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }
    }
}
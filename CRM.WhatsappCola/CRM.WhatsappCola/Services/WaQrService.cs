using CRM.WhatsappCola.DTOs;
using CRM.WhatsappCola.Helper;
using Newtonsoft.Json;
using System;
using System.Net;

namespace CRM.WhatsappCola.Services
{
    public class WaQrService
    {
        private string _baseUrl;
        private WebClientWA _webclient;

        public WaQrService()
        {
            _baseUrl = "http://localhost:3000";
            _webclient = new WebClientWA();
        }

        public WaQrService(string baseUrl)
        {
            _baseUrl = string.IsNullOrWhiteSpace(baseUrl) ? "http://localhost:3000" : baseUrl;
            _webclient = new WebClientWA();
        }

        private void GenerarHeaders()
        {
            //_webclient.Headers.Add("Authorization", $"Token {_token}");
            _webclient.Headers.Add("Content-Type", "application/json");
        }

        public WARespuestaDTO EnviarMensajeTexto(WAMensajeTextoDTO mensaje)
        {
            WARespuestaDTO respuesta = new WARespuestaDTO();

            try
            {
                string url = $"{_baseUrl}/send-text-message";
                string data = JsonConvert.SerializeObject(mensaje);
                GenerarHeaders();
                var response = _webclient.UploadString(url, "POST", data);
                var dto = JsonConvert.DeserializeObject<WARespuestaDTO>(response);

                respuesta = dto;
            }
            catch (WebException ex)
            {
                string errorApi = "";

                if (ex.Status == WebExceptionStatus.ProtocolError)
                {
                    errorApi += ((HttpWebResponse)ex.Response).StatusCode + " - ";
                    errorApi += ((HttpWebResponse)ex.Response).StatusDescription + " - ";
                    using (Stream data = ex.Response.GetResponseStream())
                    using (var reader = new StreamReader(data))
                    {
                        errorApi = reader.ReadToEnd();
                    }
                }

                respuesta = new WARespuestaDTO()
                {
                    Estado = false,
                    Mensage = $"{ex.Message} - {errorApi}"
                };
            }

            return respuesta;
        }

        public WARespuestaDTO EnviarMensajeMultimediaPayload(WAMensajeMultimediaPayloadDTO mensaje)
        {
            WARespuestaDTO respuesta = new WARespuestaDTO();

            try
            {
                string url = $"{_baseUrl}/send-multimedia-message";
                string data = JsonConvert.SerializeObject(mensaje);
                GenerarHeaders();
                var response = _webclient.UploadString(url, "POST", data);
                var dto = JsonConvert.DeserializeObject<WARespuestaDTO>(response);

                respuesta = dto;
            }
            catch (Exception ex)
            {
                respuesta = new WARespuestaDTO()
                {
                    Estado = false,
                    Mensage = ex.Message
                };
            }

            return respuesta;
        }

        public WARespuestaDTO EnviarMensajeMultimediaUrl(WAMensajeMultimediaUrlDTO mensaje)
        {
            WARespuestaDTO respuesta = new WARespuestaDTO();

            try
            {
                string url = $"{_baseUrl}/send-multimedia-url-message";
                string data = JsonConvert.SerializeObject(mensaje);
                GenerarHeaders();
                var response = _webclient.UploadString(url, "POST", data);
                var dto = JsonConvert.DeserializeObject<WARespuestaDTO>(response);

                respuesta = dto;
            }
            catch (Exception ex)
            {
                respuesta = new WARespuestaDTO()
                {
                    Estado = false,
                    Mensage = ex.Message
                };
            }

            return respuesta;
        }

        public WARespuestaDTO IniciarCliente(WAInicializarDTO mensaje)
        {
            WARespuestaDTO respuesta = new WARespuestaDTO();

            try
            {
                string url = $"{_baseUrl}/client-initialize?phoneNumber=" + mensaje.NumeroCuenta;
                GenerarHeaders();
                var response = _webclient.DownloadString(url);
                var dto = JsonConvert.DeserializeObject<WARespuestaDTO>(response);

                respuesta = dto;
            }
            catch (WebException ex)
            {
                string errorApi = "";

                if (ex.Status == WebExceptionStatus.ProtocolError)
                {
                    errorApi += ((HttpWebResponse)ex.Response).StatusCode + " - ";
                    errorApi += ((HttpWebResponse)ex.Response).StatusDescription + " - ";
                    using (Stream data = ex.Response.GetResponseStream())
                    using (var reader = new StreamReader(data))
                    {
                        errorApi = reader.ReadToEnd();
                    }
                }

                respuesta = new WARespuestaDTO()
                {
                    Estado = false,
                    Mensage = $"{ex.Message} - {errorApi}"
                };
            }

            return respuesta;
        }

        public WARespuestaNumeroDTO ObtenerNumero()
        {
            WARespuestaNumeroDTO respuesta = new WARespuestaNumeroDTO();

            try
            {
                string url = $"{_baseUrl}/get-active-number";
                GenerarHeaders();
                var response = _webclient.DownloadString(url);
                var dto = JsonConvert.DeserializeObject<WARespuestaNumeroDTO>(response);

                respuesta = dto;
            }
            catch (WebException ex)
            {
                string errorApi = "";

                if (ex.Status == WebExceptionStatus.ProtocolError)
                {
                    errorApi += ((HttpWebResponse)ex.Response).StatusCode + " - ";
                    errorApi += ((HttpWebResponse)ex.Response).StatusDescription + " - ";
                    using (Stream data = ex.Response.GetResponseStream())
                    using (var reader = new StreamReader(data))
                    {
                        errorApi = reader.ReadToEnd();
                    }
                }

                respuesta = new WARespuestaNumeroDTO()
                {
                    Estado = false,
                    Mensage = $"{ex.Message} - {errorApi}"
                };
            }

            return respuesta;
        }

        public WARespuestaDTO CerrarSesion(string numero)
        {
            WARespuestaDTO respuesta = new WARespuestaDTO();

            try
            {
                if (string.IsNullOrWhiteSpace(numero))
                {
                    throw new ArgumentException("El número es obligatorio para cerrar sesión");
                }

                string encoded = Uri.EscapeDataString(numero);
                string url = $"{_baseUrl}/logout?phoneNumber={encoded}";
                GenerarHeaders();
                var response = _webclient.DownloadString(url);
                var dto = JsonConvert.DeserializeObject<WARespuestaDTO>(response);

                respuesta = dto;
            }
            catch (WebException ex)
            {
                string errorApi = "";

                if (ex.Status == WebExceptionStatus.ProtocolError)
                {
                    errorApi += ((HttpWebResponse)ex.Response).StatusCode + " - ";
                    errorApi += ((HttpWebResponse)ex.Response).StatusDescription + " - ";
                    using (Stream data = ex.Response.GetResponseStream())
                    using (var reader = new StreamReader(data))
                    {
                        errorApi = reader.ReadToEnd();
                    }
                }

                respuesta = new WARespuestaDTO()
                {
                    Estado = false,
                    Mensage = $"{ex.Message} - {errorApi}"
                };
            }
            catch (Exception ex)
            {
                respuesta = new WARespuestaDTO()
                {
                    Estado = false,
                    Mensage = ex.Message
                };
            }

            return respuesta;
        }
    }
}
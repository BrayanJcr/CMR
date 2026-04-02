using CRM.WhatsappCola.DTOs;
using CRM.WhatsappCola.Helper;
using CRM.WhatsappCola.Models;
using Newtonsoft.Json;

namespace CRM.WhatsappCola.Services
{
    public class BaileysProxyService
    {
        private readonly WA_ColaContext _db;

        public BaileysProxyService(WA_ColaContext db)
        {
            _db = db;
        }

        private string GetBaileysUrl()
        {
            return _db.TConfiguracionSistema
                .FirstOrDefault(c => c.Clave == "whatsapp_baileys_url")?.Valor
                ?? "http://localhost:3002";
        }

        private WebClientWA CrearWebClient()
        {
            var client = new WebClientWA();
            client.Headers.Add("Content-Type", "application/json");
            return client;
        }

        public WARespuestaDTO SendMessage(SendMessageDTO dto)
        {
            WARespuestaDTO respuesta = new WARespuestaDTO();
            try
            {
                string url  = $"{GetBaileysUrl()}/send-text-message";
                string data = JsonConvert.SerializeObject(new { phoneDestination = dto.Numero, message = dto.Mensaje });
                Console.WriteLine($"[Baileys] 📤 POST {url} → {data}");
                var response = CrearWebClient().UploadString(url, "POST", data);
                Console.WriteLine($"[Baileys] ✅ Respuesta: {response}");
                respuesta = JsonConvert.DeserializeObject<WARespuestaDTO>(response);
            }
            catch (System.Net.WebException wex) when (wex.Response is System.Net.HttpWebResponse httpResp)
            {
                using var reader = new System.IO.StreamReader(httpResp.GetResponseStream());
                var body = reader.ReadToEnd();
                Console.WriteLine($"[Baileys] ❌ HTTP {(int)httpResp.StatusCode}: {body}");
                try
                {
                    respuesta = JsonConvert.DeserializeObject<WARespuestaDTO>(body);
                }
                catch
                {
                    respuesta = new WARespuestaDTO() { Estado = false, Mensage = body };
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Baileys] ❌ Error: {ex.Message}");
                respuesta = new WARespuestaDTO() { Estado = false, Mensage = ex.Message };
            }
            return respuesta;
        }

        public WARespuestaDTO SendVoice(SendVoiceDTO dto)
        {
            WARespuestaDTO respuesta = new WARespuestaDTO();
            try
            {
                string url  = $"{GetBaileysUrl()}/send-voice";
                string data = JsonConvert.SerializeObject(new { to = dto.Numero, base64Audio = dto.AudioBase64 });
                var response = CrearWebClient().UploadString(url, "POST", data);
                respuesta = JsonConvert.DeserializeObject<WARespuestaDTO>(response);
            }
            catch (Exception ex)
            {
                respuesta = new WARespuestaDTO() { Estado = false, Mensage = ex.Message };
            }
            return respuesta;
        }

        public WARespuestaDTO SendLocation(SendLocationDTO dto)
        {
            WARespuestaDTO respuesta = new WARespuestaDTO();
            try
            {
                string url  = $"{GetBaileysUrl()}/send-location";
                string data = JsonConvert.SerializeObject(new { to = dto.Numero, lat = dto.Latitud, lng = dto.Longitud, name = dto.Nombre ?? "", address = dto.Direccion ?? "" });
                var response = CrearWebClient().UploadString(url, "POST", data);
                respuesta = JsonConvert.DeserializeObject<WARespuestaDTO>(response);
            }
            catch (Exception ex)
            {
                respuesta = new WARespuestaDTO() { Estado = false, Mensage = ex.Message };
            }
            return respuesta;
        }

        public WARespuestaDTO SendPoll(SendPollDTO dto)
        {
            WARespuestaDTO respuesta = new WARespuestaDTO();
            try
            {
                string url  = $"{GetBaileysUrl()}/send-poll";
                string data = JsonConvert.SerializeObject(new { to = dto.Numero, question = dto.Pregunta, options = dto.Opciones });
                var response = CrearWebClient().UploadString(url, "POST", data);
                respuesta = JsonConvert.DeserializeObject<WARespuestaDTO>(response);
            }
            catch (Exception ex)
            {
                respuesta = new WARespuestaDTO() { Estado = false, Mensage = ex.Message };
            }
            return respuesta;
        }

        public WARespuestaDTO SendList(SendListDTO dto)
        {
            WARespuestaDTO respuesta = new WARespuestaDTO();
            try
            {
                string url  = $"{GetBaileysUrl()}/send-list";
                string data = JsonConvert.SerializeObject(new {
                    to         = dto.NumeroDestino,
                    title      = dto.Titulo,
                    body       = dto.Cuerpo,
                    buttonText = dto.TextoBoton,
                    sections   = dto.Secciones?.Select(s => new {
                        title = s.Title,
                        rows  = s.Rows?.Select(r => new { title = r.Title, description = r.Description, rowId = r.RowId })
                    })
                });
                var response = CrearWebClient().UploadString(url, "POST", data);
                respuesta = JsonConvert.DeserializeObject<WARespuestaDTO>(response);
            }
            catch (Exception ex)
            {
                respuesta = new WARespuestaDTO() { Estado = false, Mensage = ex.Message };
            }
            return respuesta;
        }

        public WARespuestaDTO SendContactCard(SendContactCardDTO dto)
        {
            WARespuestaDTO respuesta = new WARespuestaDTO();
            try
            {
                string url  = $"{GetBaileysUrl()}/send-contact-card";
                string data = JsonConvert.SerializeObject(new { to = dto.NumeroDestino, vcard = dto.Vcard });
                var response = CrearWebClient().UploadString(url, "POST", data);
                respuesta = JsonConvert.DeserializeObject<WARespuestaDTO>(response);
            }
            catch (Exception ex)
            {
                respuesta = new WARespuestaDTO() { Estado = false, Mensage = ex.Message };
            }
            return respuesta;
        }

        public WARespuestaDTO? SendReaction(SendReactionDTO dto)
        {
            try
            {
                string url  = $"{GetBaileysUrl()}/send-reaction";
                string data = JsonConvert.SerializeObject(new { to = dto.Numero, messageId = dto.WhatsAppId, emoji = dto.Emoji });
                var response = CrearWebClient().UploadString(url, "POST", data);
                return JsonConvert.DeserializeObject<WARespuestaDTO>(response);
            }
            catch (Exception)
            {
                return null;
            }
        }

        public WARespuestaDTO SendEphemeral(SendEphemeralDTO dto)
        {
            WARespuestaDTO respuesta = new WARespuestaDTO();
            try
            {
                string url  = $"{GetBaileysUrl()}/send-ephemeral";
                string data = JsonConvert.SerializeObject(new { to = dto.Numero, text = dto.Mensaje, expirationSeconds = dto.DuracionSegundos });
                var response = CrearWebClient().UploadString(url, "POST", data);
                respuesta = JsonConvert.DeserializeObject<WARespuestaDTO>(response);
            }
            catch (Exception ex)
            {
                respuesta = new WARespuestaDTO() { Estado = false, Mensage = ex.Message };
            }
            return respuesta;
        }

        public WARespuestaDTO SendText(string numeroDestino, string mensaje)
        {
            WARespuestaDTO respuesta = new WARespuestaDTO();
            try
            {
                string url  = $"{GetBaileysUrl()}/send-text-message";
                string data = JsonConvert.SerializeObject(new { phoneDestination = numeroDestino, message = mensaje });
                var response = CrearWebClient().UploadString(url, "POST", data);
                respuesta = JsonConvert.DeserializeObject<WARespuestaDTO>(response);
            }
            catch (Exception ex)
            {
                respuesta = new WARespuestaDTO() { Estado = false, Mensage = ex.Message };
            }
            return respuesta;
        }

        public WARespuestaDTO SendMultimedia(SendMultimediaDTO dto)
        {
            WARespuestaDTO respuesta = new WARespuestaDTO();
            try
            {
                string url  = $"{GetBaileysUrl()}/send-multimedia-message";
                string data = JsonConvert.SerializeObject(new {
                    phoneDestination = dto.Numero,
                    dataBase64       = dto.Base64,
                    fileName         = dto.NombreArchivo,
                    mimeType         = dto.MimeType,
                    caption          = dto.Caption ?? string.Empty
                });
                var response = CrearWebClient().UploadString(url, "POST", data);
                respuesta = JsonConvert.DeserializeObject<WARespuestaDTO>(response);
            }
            catch (Exception ex)
            {
                respuesta = new WARespuestaDTO() { Estado = false, Mensage = ex.Message };
            }
            return respuesta;
        }
    }
}

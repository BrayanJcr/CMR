using CRM.WhatsappCola.Enum;
using CRM.WhatsappCola.Models;
using System.Text.RegularExpressions;

namespace CRM.WhatsappCola.Services
{
    public class BotService
    {
        private readonly WA_ColaContext _db;
        private readonly BaileysProxyService _baileysProxy;

        public BotService(WA_ColaContext db, BaileysProxyService baileysProxy)
        {
            _db = db;
            _baileysProxy = baileysProxy;
        }

        public void EvaluarReglas(string mensaje, string numeroCliente, string modoConversacion)
        {
            try
            {
                if (modoConversacion != "bot")
                    return;

                var reglas = _db.TBotRegla
                    .Where(r => r.EsActivo && r.Estado)
                    .OrderBy(r => r.Prioridad)
                    .ToList();

                var numeroCuenta = _db.TConfiguracionSistema
                    .FirstOrDefault(c => c.Clave == "whatsapp_numero")?.Valor ?? string.Empty;

                foreach (var regla in reglas)
                {
                    bool coincide = false;
                    try
                    {
                        coincide = Regex.IsMatch(
                            mensaje,
                            regla.Patron,
                            RegexOptions.IgnoreCase,
                            TimeSpan.FromMilliseconds(100));
                    }
                    catch (RegexMatchTimeoutException)
                    {
                        continue;
                    }
                    catch (ArgumentException)
                    {
                        continue;
                    }

                    if (!coincide)
                        continue;

                    // Acción: pasar a agente humano
                    if (regla.TipoAccion == "redirigir_agente")
                    {
                        var conv = _db.TConversacion.FirstOrDefault(c =>
                            c.NumeroCuenta == numeroCuenta &&
                            c.NumeroCliente == numeroCliente &&
                            c.Estado);
                        if (conv != null)
                        {
                            conv.ModoConversacion = "agente";
                            conv.FechaModificacion = DateTime.Now;
                        }

                        // Si hay mensaje de aviso, enviarlo
                        if (!string.IsNullOrWhiteSpace(regla.Respuesta))
                        {
                            string aviso = regla.Respuesta
                                .Replace("{numero}", numeroCliente)
                                .Replace("{nombre}", numeroCliente);

                            var resultadoAviso = _baileysProxy.SendText(numeroCliente, aviso);
                            _db.TMensajeCola.Add(new TMensajeCola
                            {
                                IdMensajeColaEstado = resultadoAviso.Estado
                                    ? (int)MensajeColaEstadoEnum.Enviado
                                    : (int)MensajeColaEstadoEnum.Error,
                                NumeroRemitente = numeroCuenta,
                                NumeroDestino = numeroCliente,
                                Mensaje = aviso,
                                WhatsAppId = resultadoAviso.WhatsAppId,
                                Error = resultadoAviso.Estado ? null : resultadoAviso.Mensage,
                                FechaEnvio = DateTime.Now,
                                Estado = true,
                                UsuarioCreacion = "bot-service",
                                UsuarioModificacion = "bot-service",
                                FechaCreacion = DateTime.Now,
                                FechaModificacion = DateTime.Now,
                                AckEstado = 0
                            });
                        }

                        _db.SaveChanges();
                        break;
                    }

                    // Acción por defecto: respuesta_texto
                    string respuestaFinal = regla.Respuesta
                        .Replace("{numero}", numeroCliente)
                        .Replace("{nombre}", numeroCliente);

                    var resultado = _baileysProxy.SendText(numeroCliente, respuestaFinal);

                    _db.TMensajeCola.Add(new TMensajeCola
                    {
                        IdMensajeColaEstado = resultado.Estado
                            ? (int)MensajeColaEstadoEnum.Enviado
                            : (int)MensajeColaEstadoEnum.Error,
                        NumeroRemitente = numeroCuenta,
                        NumeroDestino = numeroCliente,
                        Mensaje = respuestaFinal,
                        WhatsAppId = resultado.WhatsAppId,
                        Error = resultado.Estado ? null : resultado.Mensage,
                        FechaEnvio = DateTime.Now,
                        Estado = true,
                        UsuarioCreacion = "bot-service",
                        UsuarioModificacion = "bot-service",
                        FechaCreacion = DateTime.Now,
                        FechaModificacion = DateTime.Now,
                        AckEstado = 0
                    });
                    _db.SaveChanges();

                    // Solo aplicar la primera regla que coincida
                    break;
                }
            }
            catch (Exception)
            {
                // Silencioso — el bot no debe interrumpir la recepción de mensajes
            }
        }
    }
}

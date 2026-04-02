using CRM.WhatsappCola.DTOs;
using CRM.WhatsappCola.DTOs.Notificacion;
using CRM.WhatsappCola.DTOs.WaEntrante;
using CRM.WhatsappCola.Enum;
using CRM.WhatsappCola.Models;
using Newtonsoft.Json;

namespace CRM.WhatsappCola.Services
{
    public class ColaService
    {
        private const string UsuarioConfigSistema = "wa-recepcion";
        private WA_ColaContext _db;

        public ColaService(WA_ColaContext db)
        {
            this._db = db;
        }

        public ResultadoAgendarDTO AgendarMensaje(WhatsAppRecepcionDTO agendarDto)
        {
            ResultadoAgendarDTO respuesta = new ResultadoAgendarDTO() { Estado = false };

            // Si no viene NumeroOrigen, usar el número activo guardado en BD
            if (string.IsNullOrWhiteSpace(agendarDto.NumeroOrigen))
            {
                agendarDto.NumeroOrigen = _db.TConfiguracionSistema
                    .FirstOrDefault(c => c.Clave == "whatsapp_numero")?.Valor;
            }

            //validaciones
            if (string.IsNullOrWhiteSpace(agendarDto.NumeroOrigen) || agendarDto.NumeroOrigen.Length != 11)
            {
                respuesta.Respuesta = "El número de origen no tiene la longitud requerida o no está configurado";
                return respuesta;
            }
            if (agendarDto.NumeroDestino.Length != 11)
            {
                respuesta.Respuesta = "El número de destino no tiene la longitud requerida";
                return respuesta;
            }
            var t = agendarDto.NumeroDestino.Substring(2, 1);
            if (agendarDto.NumeroDestino.Substring(2, 1) != "9")
            {
                respuesta.Respuesta = "El número de destino no es un celular válido";
                return respuesta;
            }
            if ((!string.IsNullOrEmpty(agendarDto.AdjuntoBase64) && (
                string.IsNullOrEmpty(agendarDto.NombreArchivo) ||
                string.IsNullOrEmpty(agendarDto.MimeType) ||
                agendarDto.NroByte == null
                )
              )
            )
            {
                respuesta.Respuesta = "Para enviar archivos multimedia se requiere: ArchivoBase64/NombreArchivo/MimeType/NroByte";
                return respuesta;
            }

            try
            {
                TMensajeCola mensaje = new TMensajeCola()
                {
                    IdMensajeColaEstado = (int)MensajeColaEstadoEnum.Pendiente,
                    NumeroRemitente = agendarDto.NumeroOrigen,
                    NumeroDestino = agendarDto.NumeroDestino,
                    Mensaje = agendarDto.Mensage,
                    AdjuntoBase64 = agendarDto.AdjuntoBase64,
                    NombreArchivo = agendarDto.NombreArchivo,
                    MimeType = agendarDto.MimeType,
                    NroByte = agendarDto.NroByte,
                    UrlArchivo = agendarDto.UrlArchivo,

                    Estado = true,
                    UsuarioCreacion = "webapp",
                    UsuarioModificacion = "webapp",
                    FechaCreacion = DateTime.Now,
                    FechaModificacion = DateTime.Now,
                };
                _db.TMensajeCola.Add(mensaje);
                _db.SaveChanges();

                respuesta = new ResultadoAgendarDTO()
                {
                    Estado = true,
                    Respuesta = "Mensaje agendado corectamente",
                    MensageId = mensaje.Id,
                    EstadoMensaje = "Pendiente"
                };

                //envio
                try
                {
                    var resultadoEnvio = EnviarMensaje(mensaje.Id);
                    if (resultadoEnvio.Estado == true)
                    {
                        respuesta.Respuesta = resultadoEnvio.Respuesta;
                        respuesta.EstadoMensaje = "Enviado";
                        respuesta.WhatsAppId = resultadoEnvio.WhatsAppId;
                    }
                    if (resultadoEnvio.Estado == false)
                    {
                        respuesta.Respuesta = resultadoEnvio.Respuesta;
                        respuesta.EstadoMensaje = "Error";
                    }
                }
                catch (Exception exEnvio)
                {
                }
            }
            catch (Exception ex)
            {
                respuesta = new ResultadoAgendarDTO()
                {
                    Estado = false,
                    Respuesta = $"El Mensaje no se pudo almacenar en la base de datos - {ex.Message} {(ex.InnerException != null ? ex.InnerException.Message : "")}",
                };
            }

            return respuesta;
        }

        public ResultadoEnviarDTO EnviarMensaje(int idMensaje)
        {
            ResultadoEnviarDTO respuesta = new ResultadoEnviarDTO();

            try
            {
                TMensajeCola mensaje = _db.TMensajeCola.FirstOrDefault(w => w.Id == idMensaje);
                if (mensaje == null)
                {
                    respuesta = new ResultadoEnviarDTO()
                    {
                        Estado = false,
                        Respuesta = "El Mensaje no existe",
                    };
                }
                else
                {
                    if (
                        !(mensaje.IdMensajeColaEstado == (int)MensajeColaEstadoEnum.Pendiente ||
                        mensaje.IdMensajeColaEstado == (int)MensajeColaEstadoEnum.Error)
                        )
                    {
                        respuesta = new ResultadoEnviarDTO()
                        {
                            Estado = false,
                            Respuesta = "El Mensaje no se encuentra en estado Pendiente o Error",
                        };
                    }
                    else
                    {
                        WaQrService waService = new WaQrService(ObtenerUrlProveedorActivo());
                        WARespuestaDTO respuestaEnvio;

                        //validacion numero de cuenta
                        var numero = waService.ObtenerNumero();
                        if (numero.Estado && numero.Numero != mensaje.NumeroRemitente)
                        {
                            respuesta = new ResultadoEnviarDTO()
                            {
                                Estado = false,
                                Respuesta = "El Numero de NumeroOrigen no se encuentra registrado",
                            };
                        }
                        else
                        {
                            if (!string.IsNullOrEmpty(mensaje.UrlArchivo))
                            {
                                respuestaEnvio = waService.EnviarMensajeMultimediaUrl(new WAMensajeMultimediaUrlDTO()
                                {
                                    NumeroOrigen = mensaje.NumeroRemitente,
                                    NumeroDestino = mensaje.NumeroDestino,
                                    Mensage = mensaje.Mensaje,

                                    UrlArchivo = mensaje.UrlArchivo,
                                });
                            }
                            else
                            {
                                if (!string.IsNullOrEmpty(mensaje.AdjuntoBase64))
                                {
                                    bool esAudio = !string.IsNullOrEmpty(mensaje.MimeType) &&
                                                   mensaje.MimeType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase);

                                    if (esAudio)
                                    {
                                        respuestaEnvio = waService.EnviarMensajeVoz(new WAMensajeVozDTO()
                                        {
                                            NumeroDestino = mensaje.NumeroDestino,
                                            Base64Audio = mensaje.AdjuntoBase64,
                                            MimeType = mensaje.MimeType,
                                        });
                                    }
                                    else
                                    {
                                        respuestaEnvio = waService.EnviarMensajeMultimediaPayload(new WAMensajeMultimediaPayloadDTO()
                                        {
                                            NumeroOrigen = mensaje.NumeroRemitente,
                                            NumeroDestino = mensaje.NumeroDestino,
                                            Mensage = mensaje.Mensaje,

                                            AdjuntoBase64 = mensaje.AdjuntoBase64,
                                            NombreArchivo = mensaje.NombreArchivo,
                                            MimeType = mensaje.MimeType,
                                            NroByte = mensaje.NroByte,
                                        });
                                    }
                                }
                                else
                                {
                                    respuestaEnvio = waService.EnviarMensajeTexto(new WAMensajeTextoDTO()
                                    {
                                        NumeroOrigen = mensaje.NumeroRemitente,
                                        NumeroDestino = mensaje.NumeroDestino,
                                        Mensage = mensaje.Mensaje
                                    });
                                }
                            }
                            mensaje.FechaEnvio = DateTime.Now;

                            mensaje.UsuarioModificacion = "webappenvio";
                            mensaje.FechaModificacion = DateTime.Now;


                            if (respuestaEnvio.Estado)
                            {
                                mensaje.IdMensajeColaEstado = (int)MensajeColaEstadoEnum.Enviado;
                                mensaje.WhatsAppId = respuestaEnvio.WhatsAppId;

                                _db.TMensajeCola.Update(mensaje);
                                _db.SaveChanges();

                                //envio notificacion signal
                                bool resultadoNotificacion = EnviarNotificacionMensaje_General(mensaje.NumeroRemitente, mensaje.NumeroDestino, true);

                                respuesta = new ResultadoEnviarDTO()
                                {
                                    Estado = true,
                                    Respuesta = "Mensaje enviado corectamente",
                                    MensageId = mensaje.Id,
                                    EstadoMensaje = "Enviado",
                                    WhatsAppId = respuestaEnvio.WhatsAppId
                                };
                            }
                            else
                            {
                                mensaje.IdMensajeColaEstado = (int)MensajeColaEstadoEnum.Error;
                                mensaje.Error = respuestaEnvio.Mensage;

                                _db.TMensajeCola.Update(mensaje);
                                _db.SaveChanges();

                                respuesta = new ResultadoEnviarDTO()
                                {
                                    Estado = false,
                                    Respuesta = respuestaEnvio.Mensage
                                };
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                respuesta = new ResultadoEnviarDTO()
                {
                    Estado = false,
                    Respuesta = $"El Mensaje no se pudo enviar - {ex.Message} {(ex.InnerException != null ? ex.InnerException.Message : "")}",
                };
            }

            return respuesta;
        }

        internal ResultadoObtenerEstadoDTO ObtenerEstado(int idMensaje)
        {
            ResultadoObtenerEstadoDTO respuesta = new ResultadoObtenerEstadoDTO();

            try
            {
                TMensajeCola mensaje = _db.TMensajeCola.FirstOrDefault(w => w.Id == idMensaje);
                if (mensaje == null)
                {
                    respuesta = new ResultadoObtenerEstadoDTO()
                    {
                        Estado = false,
                        MensajeError = "El Mensaje no existe",
                    };
                }
                else
                {
                    string estadoMensage = "";
                    string mensajeError = "";
                    switch (mensaje.IdMensajeColaEstado)
                    {
                        case (int)MensajeColaEstadoEnum.Pendiente:
                            estadoMensage = "Pendiente";
                            break;
                        case (int)MensajeColaEstadoEnum.Enviado:
                            estadoMensage = "Enviado";
                            break;
                        case (int)MensajeColaEstadoEnum.Error:
                            estadoMensage = "Error";
                            mensajeError = mensaje.Error;
                            break;
                        default:
                            break;
                    }

                    respuesta = new ResultadoObtenerEstadoDTO()
                    {
                        Estado = true,
                        MensageId = idMensaje,
                        EstadoMensaje = estadoMensage,
                        MensajeError = mensajeError
                    };
                }
            }
            catch (Exception ex)
            {
                respuesta = new ResultadoObtenerEstadoDTO()
                {
                    Estado = false,
                    MensajeError = $"No se pudo obtener el estado del mensaje",
                };
            }

            return respuesta;
        }

        public ResultadoInicializarDTO IniciarCliente()
        {
            ResultadoInicializarDTO respuesta = new ResultadoInicializarDTO() { Estado = false };

            try
            {
                WaQrService waService = new WaQrService(ObtenerUrlProveedorActivo());
                WARespuestaDTO respuestaEnvio;

                WAInicializarDTO inicializarDTO = new WAInicializarDTO() { NumeroCuenta = "" };

                respuestaEnvio = waService.IniciarCliente(inicializarDTO);

                respuesta.Respuesta = respuestaEnvio.Mensage;
                respuesta.Estado = respuestaEnvio.Estado;
            }
            catch (Exception ex)
            {
                respuesta = new ResultadoInicializarDTO()
                {
                    Estado = false,
                    Respuesta = $"Ocurrión un error al inicializar el número - {ex.Message} {(ex.InnerException != null ? ex.InnerException.Message : "")}",
                };
            }

            return respuesta;
        }

        public ResultadoObtenerNumeroDTO ObtenerNumero()
        {
            ResultadoObtenerNumeroDTO respuesta = new ResultadoObtenerNumeroDTO() { Estado = false };

            try
            {
                WaQrService waService = new WaQrService(ObtenerUrlProveedorActivo());
                WARespuestaNumeroDTO respuestaEnvio;

                respuestaEnvio = waService.ObtenerNumero();

                respuesta.Respuesta = respuestaEnvio.Mensage;
                respuesta.Estado = respuestaEnvio.Estado;
                respuesta.Numero = respuestaEnvio.Numero;
            }
            catch (Exception ex)
            {
                respuesta = new ResultadoObtenerNumeroDTO()
                {
                    Estado = false,
                    Respuesta = $"Ocurrión un error al obtener el número - {ex.Message} {(ex.InnerException != null ? ex.InnerException.Message : "")}",
                };
            }

            return respuesta;
        }

        public ResultadoCerrarSesionDTO CerrarSesion(string numero)
        {
            ResultadoCerrarSesionDTO respuesta = new ResultadoCerrarSesionDTO() { Estado = false };

            try
            {
                string numeroObjetivo = string.IsNullOrWhiteSpace(numero)
                    ? _db.TConfiguracionSistema.FirstOrDefault(c => c.Clave == "whatsapp_numero")?.Valor
                    : numero;

                if (string.IsNullOrWhiteSpace(numeroObjetivo))
                {
                    respuesta.Respuesta = "No existe un número activo configurado";
                    return respuesta;
                }

                WaQrService waService = new WaQrService(ObtenerUrlProveedorActivo());
                WARespuestaDTO resultadoApi = waService.CerrarSesion(numeroObjetivo);

                respuesta.Respuesta = resultadoApi.Mensage;
                respuesta.Estado = resultadoApi.Estado;

                if (resultadoApi.Estado)
                {
                    ActualizarConfiguracionLocal("whatsapp_estado", "desconectado");
                    ActualizarConfiguracionLocal("whatsapp_qr", string.Empty);
                    ActualizarConfiguracionLocal("whatsapp_numero", string.Empty);
                    _db.SaveChanges();
                }
            }
            catch (Exception ex)
            {
                respuesta.Estado = false;
                respuesta.Respuesta = $"Ocurrión un error al cerrar la sesión - {ex.Message} {(ex.InnerException != null ? ex.InnerException.Message : "")}";
            }

            return respuesta;
        }

        private string ObtenerUrlProveedorActivo()
        {
            var proveedor = _db.TConfiguracionSistema
                .FirstOrDefault(c => c.Clave == "whatsapp_proveedor")?.Valor ?? "wwebjs";
            var urlClave = proveedor == "baileys" ? "whatsapp_baileys_url" : "whatsapp_wwebjs_url";
            return _db.TConfiguracionSistema
                .FirstOrDefault(c => c.Clave == urlClave)?.Valor ?? "http://localhost:3000";
        }

        private void ActualizarConfiguracionLocal(string clave, string valor)
        {
            var config = _db.TConfiguracionSistema.FirstOrDefault(c => c.Clave == clave);
            if (config == null) return;

            config.Valor = valor;
            config.UsuarioModificacion = UsuarioConfigSistema;
            config.FechaModificacion = DateTime.Now;
        }


        #region Notificaciones
        private bool EnviarNotificacionMensaje_General(string numeroCuenta, string numeroCliente, bool esEntrante)
        {
            try
            {
                NotificacionChatService servicioNotificacion = new NotificacionChatService();
                NotificacionWaChatDTO notificacion = new NotificacionWaChatDTO()
                {
                    NumeroCuenta = numeroCuenta,
                    NumeroCliente = numeroCliente,
                    EsEntrante = esEntrante
                };
                string? payload = null;
                bool resultado = servicioNotificacion.EnviarNotificacion_NuevoMensajeGeneral(notificacion, payload);
                return resultado;
            }
            catch (Exception)
            {
                return false;
            }
        }
        #endregion
    }
}

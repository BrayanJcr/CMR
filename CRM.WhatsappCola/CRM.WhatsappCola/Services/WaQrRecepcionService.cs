using CRM.WhatsappCola.DTOs;
using CRM.WhatsappCola.DTOs.Notificacion;
using CRM.WhatsappCola.DTOs.WaEntrante;
using CRM.WhatsappCola.Enum;
using CRM.WhatsappCola.Hubs;
using CRM.WhatsappCola.Models;
using Microsoft.AspNetCore.SignalR;
using Newtonsoft.Json;
using QRCoder;

namespace CRM.WhatsappCola.Services
{
    public class WaQrRecepcionService
    {
        private const string ConfigUsuario = "wa-recepcion";
        private WA_ColaContext _db;

        public WaQrRecepcionService(WA_ColaContext db)
        {
            this._db = db;
        }

        public ResultadoRecibirDTO RecepcionarMensaje(WaMensajeEntranteDTO entranteDto)
        {
            ResultadoRecibirDTO respuesta = new ResultadoRecibirDTO();

            try
            {
                //clear date time zone
                entranteDto.FechaEnvio = entranteDto.FechaEnvio.AddHours(-5);

                TMensajeEntrante mensaje = new TMensajeEntrante()
                {
                    IdMensajeEntranteEstado = (int)MensajeEntranteEstadoEnum.Recibido,
                    NumeroCuenta = entranteDto.NumeroPara,
                    NumeroCliente = entranteDto.NumeroDesde,
                    Mensaje = entranteDto.Mensaje,
                    FechaEnvio = entranteDto.FechaEnvio,

                    WhatsAppTipo = entranteDto.WhatsAppTipo,
                    WhatsAppId = entranteDto.WhatsAppId,
                    WhatsAppIdPadre = entranteDto.WhatsAppIdPadre,

                    TieneAdjunto = entranteDto.TieneAdjunto,
                    AdjuntoBase64 = entranteDto.AdjuntoBase64,
                    NombreArchivo = entranteDto.NombreArchivo,
                    MimeType = entranteDto.MimeType,
                    NroByte = entranteDto.NroByte,
                    EsErrorDescargaMultimedia = entranteDto.EsErrorDescargaMultimedia,
                    NombreContacto = entranteDto.NombreContacto,

                    Estado = true,
                    UsuarioCreacion = "webapp-recepcion",
                    UsuarioModificacion = "webapp-recepcion",
                    FechaCreacion = DateTime.Now,
                    FechaModificacion = DateTime.Now,
                };
                _db.TMensajeEntrante.Add(mensaje);
                _db.SaveChanges();

                //envio notificacion signal
                bool resultadoNotificacion = EnviarNotificacionMensaje_General(mensaje.NumeroCuenta, mensaje.NumeroCliente, true);

                //envio de info al CRM
                bool resultadoNotificacionCrm = EnviarNotificacionMensaje_CRM(mensaje);

                //almacenamiento de mensajes padre
                if (!string.IsNullOrEmpty(entranteDto.WhatsAppIdPadre))
                    RegularizarIdMensajePadreLocal(mensaje.Id);

                respuesta = new ResultadoRecibirDTO()
                {
                    Estado = true,
                    Respuesta = "Mensaje recibido corectamente",
                    MensageId = mensaje.Id
                };
            }
            catch (Exception ex)
            {
                respuesta = new ResultadoRecibirDTO()
                {
                    Estado = false,
                    Respuesta = $"Ocurrió un error al recibir el mensaje - {ex.Message}"
                };
            }

            return respuesta;
        }

        private bool RegularizarIdMensajePadreLocal(int id)
        {
            try
            {
                var mensaje = _db.TMensajeEntrante.FirstOrDefault(x => x.Id == id);
                if (mensaje != null)
                {
                    var mensajeEntrantePadre = _db.TMensajeEntrante.FirstOrDefault(x => x.WhatsAppId == mensaje.WhatsAppIdPadre);
                    var mensajeSalientePadre = _db.TMensajeCola.FirstOrDefault(x => x.WhatsAppId == mensaje.WhatsAppIdPadre);

                    if (mensajeEntrantePadre != null || mensajeSalientePadre != null)
                    {
                        mensaje.IdMensajeEntrantePadre = mensajeEntrantePadre != null ? mensajeEntrantePadre.Id : null;
                        mensaje.IdMensajeColaPadre = mensajeSalientePadre != null ? mensajeSalientePadre.Id : null;

                        mensaje.FechaModificacion = DateTime.Now;
                        mensaje.UsuarioModificacion = "regularizacion-padre";
                        _db.TMensajeEntrante.Update(mensaje);
                        _db.SaveChanges();
                        return true;
                    }
                }
            }
            catch (Exception)
            {
                return false;
            }
            return false;
        }

        public ResultadoRecibirDTO RecepcionarEdicion(WaMensajeEditadoDTO editadoDto)
        {
            ResultadoRecibirDTO respuesta = new ResultadoRecibirDTO()
            {
                Estado = true,
                Respuesta = "Mensaje recibido corectamente",
            };

            try
            {
                //clear date time zone
                editadoDto.FechaEnvio = editadoDto.FechaEnvio.AddHours(-5);

                var mensajeExistente = _db.TMensajeEntrante.FirstOrDefault(w => w.WhatsAppId == editadoDto.WhatsAppId);
                if (mensajeExistente == null)
                {
                    respuesta = new ResultadoRecibirDTO()
                    {
                        Estado = false,
                        Respuesta = $"Mensaje no Exite - {editadoDto.WhatsAppId}",
                    };
                }
                else
                {
                    mensajeExistente.Mensaje = editadoDto.MensajeActual;
                    mensajeExistente.FechaEnvio = editadoDto.FechaEnvio;

                    mensajeExistente.UsuarioModificacion = "webapp-edicion";
                    mensajeExistente.FechaModificacion = DateTime.Now;

                    _db.TMensajeEntrante.Update(mensajeExistente);
                    _db.SaveChanges();

                    respuesta.MensageId = mensajeExistente.Id;

                    //envio notificacion signal
                    bool resultadoNotificacion = EnviarNotificacionMensaje_General(mensajeExistente.NumeroCuenta, mensajeExistente.NumeroCliente, true);

                    //envio de info al CRM
                    bool resultadoNotificacionCrm = EnviarNotificacionEdicionMensaje_CRM(editadoDto);
                }
            }
            catch (Exception ex)
            {
                respuesta = new ResultadoRecibirDTO()
                {
                    Estado = false,
                    Respuesta = $"Ocurrió un error al recibir el mensaje - {ex.Message}"
                };
            }

            return respuesta;
        }

        public ResultadoRecibirDTO RecepcionarEliminacion(WaMensajeEliminadoDTO eliminadoDto)
        {
            ResultadoRecibirDTO respuesta = new ResultadoRecibirDTO()
            {
                Estado = true,
                Respuesta = "Mensaje eliminado corectamente",
            };

            try
            {
                var mensajeExistente = _db.TMensajeEntrante.FirstOrDefault(w => w.WhatsAppId == eliminadoDto.WhatsAppId);
                if (mensajeExistente == null)
                {
                    respuesta = new ResultadoRecibirDTO()
                    {
                        Estado = false,
                        Respuesta = $"Mensaje no Exite - {eliminadoDto.WhatsAppId}",
                    };
                }
                else
                {
                    mensajeExistente.FueEliminado = true;
                    mensajeExistente.FechaRecepcionEliminacion = DateTime.Now;

                    mensajeExistente.UsuarioModificacion = "webapp-eliminacion";
                    mensajeExistente.FechaModificacion = DateTime.Now;

                    _db.TMensajeEntrante.Update(mensajeExistente);
                    _db.SaveChanges();

                    respuesta.MensageId = mensajeExistente.Id;

                    //envio notificacion signal
                    bool resultadoNotificacion = EnviarNotificacionMensaje_General(mensajeExistente.NumeroCuenta, mensajeExistente.NumeroCliente, true);

                    //envio de info al CRM
                    bool resultadoNotificacionCrm = EnviarNotificacionEliminacionMensaje_CRM(eliminadoDto);
                }
            }
            catch (Exception ex)
            {
                respuesta = new ResultadoRecibirDTO()
                {
                    Estado = false,
                    Respuesta = $"Ocurrió un error al eliminar el mensaje - {ex.Message}"
                };
            }

            return respuesta;
        }

        public ResultadoRecibirQrDTO RecepcionarQr(WaMensajeQrEntranteDTO qrDto)
        {
            ResultadoRecibirQrDTO respuesta = new ResultadoRecibirQrDTO()
            {
                Estado = true,
                Respuesta = "Qr recibido corectamente",
            };

            try
            {
                var qrImageBase64 = GenerarCodigoQRBase64(qrDto.QrCode);
                if (!string.IsNullOrWhiteSpace(qrImageBase64))
                {
                    var dataUri = $"data:image/png;base64,{qrImageBase64}";
                    GuardarConfiguracion("whatsapp_qr", dataUri);
                }
                else
                {
                    // Guardar el código QR en texto plano si no se pudo generar imagen
                    GuardarConfiguracion("whatsapp_qr", qrDto.QrCode ?? string.Empty);
                }

                // Siempre marcar como iniciando para que el frontend haga polling
                GuardarConfiguracion("whatsapp_estado", "iniciando");

                //envio notificacion signal
                bool resultadoNotificacion = EnviarNotificacion_RecepcionQR(qrDto, qrImageBase64);
            }
            catch (Exception ex)
            {
                respuesta = new ResultadoRecibirQrDTO()
                {
                    Estado = false,
                    Respuesta = $"Ocurrió un error al procesar el qr - {ex.Message}",
                };
            }

            return respuesta;
        }

        public ResultadoRecibirNumeroDTO RecepcionarNumero(WaMensajeNumeroEntranteDTO numeroDto)
        {
            ResultadoRecibirNumeroDTO respuesta = new ResultadoRecibirNumeroDTO()
            {
                Estado = true,
                Respuesta = "Número recibido corectamente",
                Numero = numeroDto.NumeroDesde
            };

            try
            {
                GuardarConfiguracion("whatsapp_estado", "conectado");
                GuardarConfiguracion("whatsapp_qr", string.Empty);
                if (!string.IsNullOrWhiteSpace(numeroDto.NumeroDesde))
                    GuardarConfiguracion("whatsapp_numero", numeroDto.NumeroDesde);

                bool resultadoNotificacion = EnviarNotificacion_RecepcionNumero(numeroDto);
            }
            catch (Exception ex)
            {
                respuesta = new ResultadoRecibirNumeroDTO()
                {
                    Estado = false,
                    Respuesta = $"Ocurrió un error al procesar el número - {ex.Message}",
                    Numero = numeroDto.NumeroDesde
                };
            }

            return respuesta;
        }

        private string GenerarCodigoQRBase64(string qrCodeText)
        {
            string response = null;
            // Intentar con nivel L (mayor capacidad de datos) primero
            foreach (var nivel in new[] { QRCodeGenerator.ECCLevel.L, QRCodeGenerator.ECCLevel.M, QRCodeGenerator.ECCLevel.Q })
            {
                try
                {
                    QRCodeGenerator qrGenerator = new QRCodeGenerator();
                    QRCodeData qrCodeData = qrGenerator.CreateQrCode(qrCodeText, nivel);
                    PngByteQRCode qrCode = new PngByteQRCode(qrCodeData);
                    byte[] qrCodeImage = qrCode.GetGraphic(20);
                    response = Convert.ToBase64String(qrCodeImage);
                    break;
                }
                catch
                {
                    // Intentar con siguiente nivel
                }
            }
            return response;
        }

        #region Notificaciones

        private bool EnviarNotificacion_RecepcionQR(WaMensajeQrEntranteDTO qrDto, string qrImageBase64 = null)
        {
            try
            {
                NotificacionQRService servicioNotificacion = new NotificacionQRService();
                string payload = JsonConvert.SerializeObject(
                    new { QrCodeBase64 = qrImageBase64 ?? GenerarCodigoQRBase64(qrDto.QrCode) }
                    );
                bool resultado = servicioNotificacion.EnviarNotificacion_RecepcionQR(qrDto, payload);
                return resultado;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        private void GuardarConfiguracion(string clave, string valor)
        {
            if (string.IsNullOrWhiteSpace(clave)) return;

            var config = _db.TConfiguracionSistema.FirstOrDefault(c => c.Clave == clave);
            if (config == null)
            {
                config = new TConfiguracionSistema
                {
                    Clave = clave,
                    Tipo = "string",
                    Descripcion = null,
                    UsuarioModificacion = ConfigUsuario,
                    FechaModificacion = DateTime.Now,
                    Valor = valor
                };
                _db.TConfiguracionSistema.Add(config);
            }
            else
            {
                config.Valor = valor;
                config.UsuarioModificacion = ConfigUsuario;
                config.FechaModificacion = DateTime.Now;
            }

            _db.SaveChanges();
        }

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
                string payload = null;
                bool resultado = servicioNotificacion.EnviarNotificacion_NuevoMensajeGeneral(notificacion, payload);
                return resultado;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        private bool EnviarNotificacion_RecepcionNumero(WaMensajeNumeroEntranteDTO numeroDto)
        {
            try
            {
                NotificacionQRService servicioNotificacion = new NotificacionQRService();
                string payload = JsonConvert.SerializeObject(
                    new { NumeroDesde = GenerarCodigoQRBase64(numeroDto.NumeroDesde) }
                    );
                bool resultado = servicioNotificacion.EnviarNotificacion_RecepcionNumero(numeroDto, payload);
                return resultado;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        #endregion Notificaciones

        public async Task<object> RecepcionarAck(WaAckDTO dto)
        {
            try
            {
                var mensaje = _db.TMensajeCola
                    .FirstOrDefault(m => m.WhatsAppId == dto.WhatsAppId);

                if (mensaje != null)
                {
                    mensaje.AckEstado = dto.AckEstado;
                    mensaje.FechaModificacion = DateTime.Now;
                    _db.SaveChanges();
                }

                HubContextHolder.ChatContext?.Clients.All
                    .SendAsync("AckActualizado", dto.WhatsAppId, dto.AckEstado)
                    .Wait();

                return new { success = true };
            }
            catch (Exception ex)
            {
                return new { success = false, error = ex.Message };
            }
        }

        public async Task<object> RecepcionarReaccion(WaReaccionDTO dto)
        {
            try
            {
                var reaccion = new TMensajeReaccion
                {
                    WhatsAppId = dto.WhatsAppId,
                    Emoji = dto.Emoji,
                    SenderId = dto.SenderId,
                    FechaReaccion = DateTime.Now,
                    Estado = true
                };
                _db.TMensajeReaccion.Add(reaccion);
                _db.SaveChanges();

                HubContextHolder.ChatContext?.Clients.All
                    .SendAsync("NuevaReaccion", dto.WhatsAppId, dto.Emoji, dto.SenderId)
                    .Wait();

                return new { success = true };
            }
            catch (Exception ex)
            {
                return new { success = false, error = ex.Message };
            }
        }

        public async Task<object> RecepcionarGrupoEvento(WaGrupoEventoDTO dto)
        {
            try
            {
                var evento = new TGrupoEvento
                {
                    ChatId = dto.ChatId,
                    Tipo = dto.Tipo,
                    Author = dto.Author ?? "",
                    Recipients = dto.RecipientIds != null && dto.RecipientIds.Any()
                        ? System.Text.Json.JsonSerializer.Serialize(dto.RecipientIds)
                        : null,
                    FechaEvento = DateTime.Now,
                    Estado = true
                };
                _db.TGrupoEvento.Add(evento);
                _db.SaveChanges();

                return new { success = true };
            }
            catch (Exception ex)
            {
                return new { success = false, error = ex.Message };
            }
        }

        public Task<object> RecepcionarLlamada(WaLlamadaDTO dto)
        {
            try
            {
                HubContextHolder.ChatContext?.Clients.All
                    .SendAsync("LlamadaEntrante", dto.From, dto.IsVideo)
                    .Wait();

                return Task.FromResult<object>(new { success = true });
            }
            catch (Exception ex)
            {
                return Task.FromResult<object>(new { success = false, error = ex.Message });
            }
        }

        #region Notificaciones - CRM

        private bool EnviarNotificacionMensaje_CRM(TMensajeEntrante mensaje)
        {
            try
            {
                NotificacionCrmService servicioNotificacion = new NotificacionCrmService();
                bool resultado = servicioNotificacion.Envio_MensajeEntrante_WhatsApp(mensaje);
                return resultado;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        private bool EnviarNotificacionEdicionMensaje_CRM(WaMensajeEditadoDTO mensaje)
        {
            try
            {
                NotificacionCrmService servicioNotificacion = new NotificacionCrmService();
                bool resultado = servicioNotificacion.Envio_MensajeEdicion_WhatsApp(mensaje);
                return resultado;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        private bool EnviarNotificacionEliminacionMensaje_CRM(WaMensajeEliminadoDTO mensaje)
        {
            try
            {
                NotificacionCrmService servicioNotificacion = new NotificacionCrmService();
                bool resultado = servicioNotificacion.Envio_MensajeEdicion_WhatsApp(mensaje);
                return resultado;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        #endregion Notificaciones - CRM
    }
}
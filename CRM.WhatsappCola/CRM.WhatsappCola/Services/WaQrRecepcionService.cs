using CRM.WhatsappCola.DTOs;
using CRM.WhatsappCola.DTOs.Notificacion;
using CRM.WhatsappCola.DTOs.WaEntrante;
using CRM.WhatsappCola.Enum;
using CRM.WhatsappCola.Models;
using Newtonsoft.Json;
using QRCoder;

namespace CRM.WhatsappCola.Services
{
    public class WaQrRecepcionService
    {
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
                //envio notificacion signal
                bool resultadoNotificacion = EnviarNotificacion_RecepcionQR(qrDto);
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
            try
            {
                QRCodeGenerator qrGenerator = new QRCodeGenerator();
                QRCodeData qrCodeData = qrGenerator.CreateQrCode(qrCodeText, QRCodeGenerator.ECCLevel.Q);
                PngByteQRCode qrCode = new PngByteQRCode(qrCodeData);
                byte[] qrCodeImage = qrCode.GetGraphic(20);
                var base64 = Convert.ToBase64String(qrCodeImage);
                response = base64;
            }
            catch (Exception ex)
            {
            }
            return response;
        }

        #region Notificaciones

        private bool EnviarNotificacion_RecepcionQR(WaMensajeQrEntranteDTO qrDto)
        {
            try
            {
                NotificacionQRService servicioNotificacion = new NotificacionQRService();
                string payload = JsonConvert.SerializeObject(
                    new { QrCodeBase64 = GenerarCodigoQRBase64(qrDto.QrCode) }
                    );
                bool resultado = servicioNotificacion.EnviarNotificacion_RecepcionQR(qrDto, payload);
                return resultado;
            }
            catch (Exception ex)
            {
                return false;
            }
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
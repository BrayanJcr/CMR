using CRM.WhatsappCola.DTOs.CRM;
using CRM.WhatsappCola.DTOs;
using CRM.WhatsappCola.Models;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Services
{
    /// <summary>
    /// Servicio de gestion de campanas de mensajeria
    /// </summary>
    public class CampanaService
    {
        private readonly WA_ColaContext _db;

        public CampanaService(WA_ColaContext db)
        {
            _db = db;
        }

        /// <summary>Obtiene todas las campanas activas</summary>
        public async Task<List<CampanaDTO>> ObtenerTodas()
        {
            var lista = await _db.TCampana
                .Include(c => c.IdPlantillaNavigation)
                .Include(c => c.TCampanaContacto.Where(cc => cc.Estado))
                    .ThenInclude(cc => cc.IdContactoNavigation)
                .Where(c => c.Estado)
                .OrderByDescending(c => c.FechaCreacion)
                .ToListAsync();

            return lista.Select(c => MapearCampanaDTO(c)).ToList();
        }

        /// <summary>Obtiene una campana por Id</summary>
        public async Task<CampanaDTO> ObtenerPorId(int id)
        {
            var campana = await _db.TCampana
                .Include(c => c.IdPlantillaNavigation)
                .Include(c => c.TCampanaContacto.Where(cc => cc.Estado))
                    .ThenInclude(cc => cc.IdContactoNavigation)
                        .ThenInclude(ct => ct.IdEmpresaNavigation)
                .Include(c => c.TCampanaContacto.Where(cc => cc.Estado))
                    .ThenInclude(cc => cc.IdContactoNavigation)
                        .ThenInclude(ct => ct.TContactoEtiqueta.Where(ce => ce.Estado))
                            .ThenInclude(ce => ce.IdEtiquetaNavigation)
                .FirstOrDefaultAsync(c => c.Id == id && c.Estado);

            if (campana == null) return null;
            return MapearCampanaDTO(campana);
        }

        /// <summary>Crea una nueva campana</summary>
        public async Task<CampanaDTO> Crear(CampanaCreateDTO dto, string usuario)
        {
            var campana = new TCampana
            {
                Nombre = dto.Nombre,
                IdPlantilla = dto.IdPlantilla,
                Mensaje = dto.Mensaje,
                Tags = dto.Tags != null && dto.Tags.Any() ? JsonConvert.SerializeObject(dto.Tags) : null,
                EstadoCampana = "borrador",
                ProgramadaPara = dto.ProgramadaPara,
                Total = dto.IdsContactos?.Count ?? 0,
                Enviados = 0,
                Fallidos = 0,
                Pendientes = dto.IdsContactos?.Count ?? 0,
                Estado = true,
                UsuarioCreacion = usuario,
                UsuarioModificacion = usuario,
                FechaCreacion = DateTime.Now,
                FechaModificacion = DateTime.Now
            };

            _db.TCampana.Add(campana);
            await _db.SaveChangesAsync();

            if (dto.IdsContactos != null)
            {
                foreach (var idContacto in dto.IdsContactos)
                {
                    _db.TCampanaContacto.Add(new TCampanaContacto
                    {
                        IdCampana = campana.Id,
                        IdContacto = idContacto,
                        Enviado = false,
                        Estado = true
                    });
                }
                await _db.SaveChangesAsync();
            }

            return await ObtenerPorId(campana.Id);
        }

        /// <summary>Inicia una campana enviando mensajes via WaQrService</summary>
        public async Task<CampanaDTO> IniciarCampana(int id, string waGatewayUrl)
        {
            var campana = await _db.TCampana
                .Include(c => c.TCampanaContacto.Where(cc => cc.Estado && !cc.Enviado))
                    .ThenInclude(cc => cc.IdContactoNavigation)
                .FirstOrDefaultAsync(c => c.Id == id && c.Estado);

            if (campana == null) return null;

            campana.EstadoCampana = "enviando";
            campana.UsuarioModificacion = "sistema";
            campana.FechaModificacion = DateTime.Now;
            await _db.SaveChangesAsync();

            string baseUrl = string.IsNullOrWhiteSpace(waGatewayUrl) ? "http://localhost:3000" : waGatewayUrl;
            var waService = new WaQrService(baseUrl);

            int enviados = 0;
            int fallidos = 0;

            foreach (var cc in campana.TCampanaContacto)
            {
                if (cc.IdContactoNavigation == null) continue;

                string mensaje = campana.Mensaje ?? campana.IdPlantillaNavigation?.Contenido ?? "";

                var mensajeDto = new WAMensajeTextoDTO
                {
                    NumeroDestino = cc.IdContactoNavigation.NumeroWhatsApp,
                    Mensage = mensaje
                };

                var resultado = waService.EnviarMensajeTexto(mensajeDto);

                cc.Enviado = resultado.Estado;
                cc.FechaEnvio = DateTime.Now;
                cc.ErrorEnvio = resultado.Estado ? null : resultado.Mensage;

                if (resultado.Estado) enviados++;
                else fallidos++;
            }

            campana.Enviados += enviados;
            campana.Fallidos += fallidos;
            campana.Pendientes = campana.TCampanaContacto.Count(cc => !cc.Enviado);
            campana.EstadoCampana = campana.Pendientes == 0 ? "completada" : "parcial";
            campana.UsuarioModificacion = "sistema";
            campana.FechaModificacion = DateTime.Now;

            await _db.SaveChangesAsync();
            return await ObtenerPorId(id);
        }

        /// <summary>Eliminacion logica de una campana</summary>
        public async Task<bool> Eliminar(int id, string usuario)
        {
            var campana = await _db.TCampana.FindAsync(id);
            if (campana == null) return false;

            campana.Estado = false;
            campana.UsuarioModificacion = usuario;
            campana.FechaModificacion = DateTime.Now;

            await _db.SaveChangesAsync();
            return true;
        }

        private CampanaDTO MapearCampanaDTO(TCampana c)
        {
            List<string> tags = new List<string>();
            if (!string.IsNullOrWhiteSpace(c.Tags))
            {
                try { tags = JsonConvert.DeserializeObject<List<string>>(c.Tags) ?? new List<string>(); }
                catch { tags = new List<string>(); }
            }

            var contactos = c.TCampanaContacto?
                .Where(cc => cc.Estado && cc.IdContactoNavigation != null)
                .Select(cc => new ContactoDTO
                {
                    Id = cc.IdContactoNavigation.Id,
                    Nombres = cc.IdContactoNavigation.Nombres,
                    Apellidos = cc.IdContactoNavigation.Apellidos,
                    NumeroWhatsApp = cc.IdContactoNavigation.NumeroWhatsApp,
                    Email = cc.IdContactoNavigation.Email,
                    Estado = cc.IdContactoNavigation.Estado,
                    IdEmpresa = cc.IdContactoNavigation.IdEmpresa,
                    NombreEmpresa = cc.IdContactoNavigation.IdEmpresaNavigation?.Nombre,
                    FechaCreacion = cc.IdContactoNavigation.FechaCreacion,
                    Etiquetas = cc.IdContactoNavigation.TContactoEtiqueta?
                        .Where(ce => ce.Estado && ce.IdEtiquetaNavigation != null)
                        .Select(ce => new EtiquetaDTO
                        {
                            Id = ce.IdEtiquetaNavigation.Id,
                            Nombre = ce.IdEtiquetaNavigation.Nombre,
                            Color = ce.IdEtiquetaNavigation.Color,
                            Estado = ce.IdEtiquetaNavigation.Estado
                        }).ToList() ?? new List<EtiquetaDTO>()
                }).ToList() ?? new List<ContactoDTO>();

            return new CampanaDTO
            {
                Id = c.Id,
                Nombre = c.Nombre,
                IdPlantilla = c.IdPlantilla,
                NombrePlantilla = c.IdPlantillaNavigation?.Nombre,
                Mensaje = c.Mensaje,
                Tags = tags,
                EstadoCampana = c.EstadoCampana,
                ProgramadaPara = c.ProgramadaPara,
                Total = c.Total,
                Enviados = c.Enviados,
                Fallidos = c.Fallidos,
                Pendientes = c.Pendientes,
                Estado = c.Estado,
                FechaCreacion = c.FechaCreacion,
                Contactos = contactos
            };
        }
    }
}

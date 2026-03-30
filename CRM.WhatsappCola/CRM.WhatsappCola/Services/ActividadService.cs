using CRM.WhatsappCola.DTOs.CRM;
using CRM.WhatsappCola.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Services
{
    /// <summary>
    /// Servicio de gestion de actividades CRM
    /// </summary>
    public class ActividadService
    {
        private readonly WA_ColaContext _db;

        public ActividadService(WA_ColaContext db)
        {
            _db = db;
        }

        /// <summary>Obtiene actividades con filtros opcionales</summary>
        public async Task<List<ActividadDTO>> ObtenerTodas(int? idContacto = null, int? idEmpresa = null, int? idOportunidad = null, string estadoActividad = null)
        {
            var query = _db.TActividad
                .Include(a => a.IdResponsableNavigation)
                .Include(a => a.IdContactoNavigation)
                .Include(a => a.IdEmpresaNavigation)
                .Include(a => a.IdOportunidadNavigation)
                .Where(a => a.Estado);

            if (idContacto.HasValue) query = query.Where(a => a.IdContacto == idContacto.Value);
            if (idEmpresa.HasValue) query = query.Where(a => a.IdEmpresa == idEmpresa.Value);
            if (idOportunidad.HasValue) query = query.Where(a => a.IdOportunidad == idOportunidad.Value);
            if (!string.IsNullOrWhiteSpace(estadoActividad)) query = query.Where(a => a.EstadoActividad == estadoActividad);

            var lista = await query.OrderByDescending(a => a.FechaActividad ?? a.FechaCreacion).ToListAsync();
            return lista.Select(a => MapearActividadDTO(a)).ToList();
        }

        /// <summary>Obtiene una actividad por Id</summary>
        public async Task<ActividadDTO> ObtenerPorId(int id)
        {
            var actividad = await _db.TActividad
                .Include(a => a.IdResponsableNavigation)
                .Include(a => a.IdContactoNavigation)
                .Include(a => a.IdEmpresaNavigation)
                .Include(a => a.IdOportunidadNavigation)
                .FirstOrDefaultAsync(a => a.Id == id && a.Estado);

            if (actividad == null) return null;
            return MapearActividadDTO(actividad);
        }

        /// <summary>Crea una nueva actividad</summary>
        public async Task<ActividadDTO> Crear(ActividadCreateDTO dto, string usuario)
        {
            var actividad = new TActividad
            {
                Tipo = dto.Tipo,
                Titulo = dto.Titulo,
                Descripcion = dto.Descripcion,
                FechaActividad = dto.FechaActividad,
                EstadoActividad = dto.EstadoActividad ?? "pendiente",
                IdResponsable = dto.IdResponsable,
                IdContacto = dto.IdContacto,
                IdEmpresa = dto.IdEmpresa,
                IdOportunidad = dto.IdOportunidad,
                Estado = true,
                UsuarioCreacion = usuario,
                UsuarioModificacion = usuario,
                FechaCreacion = DateTime.Now,
                FechaModificacion = DateTime.Now
            };

            _db.TActividad.Add(actividad);
            await _db.SaveChangesAsync();
            return await ObtenerPorId(actividad.Id);
        }

        /// <summary>Actualiza una actividad</summary>
        public async Task<ActividadDTO> Actualizar(ActividadUpdateDTO dto, string usuario)
        {
            var actividad = await _db.TActividad.FindAsync(dto.Id);
            if (actividad == null) return null;

            actividad.Tipo = dto.Tipo;
            actividad.Titulo = dto.Titulo;
            actividad.Descripcion = dto.Descripcion;
            actividad.FechaActividad = dto.FechaActividad;
            actividad.EstadoActividad = dto.EstadoActividad ?? "pendiente";
            actividad.IdResponsable = dto.IdResponsable;
            actividad.IdContacto = dto.IdContacto;
            actividad.IdEmpresa = dto.IdEmpresa;
            actividad.IdOportunidad = dto.IdOportunidad;
            actividad.UsuarioModificacion = usuario;
            actividad.FechaModificacion = DateTime.Now;

            await _db.SaveChangesAsync();
            return await ObtenerPorId(dto.Id);
        }

        /// <summary>Eliminacion logica de una actividad</summary>
        public async Task<bool> Eliminar(int id, string usuario)
        {
            var actividad = await _db.TActividad.FindAsync(id);
            if (actividad == null) return false;

            actividad.Estado = false;
            actividad.UsuarioModificacion = usuario;
            actividad.FechaModificacion = DateTime.Now;

            await _db.SaveChangesAsync();
            return true;
        }

        private ActividadDTO MapearActividadDTO(TActividad a)
        {
            return new ActividadDTO
            {
                Id = a.Id,
                Tipo = a.Tipo,
                Titulo = a.Titulo,
                Descripcion = a.Descripcion,
                FechaActividad = a.FechaActividad,
                EstadoActividad = a.EstadoActividad,
                IdResponsable = a.IdResponsable,
                NombreResponsable = a.IdResponsableNavigation != null
                    ? $"{a.IdResponsableNavigation.Nombres} {a.IdResponsableNavigation.ApellidoPaterno}".Trim()
                    : null,
                IdContacto = a.IdContacto,
                NombreContacto = a.IdContactoNavigation != null
                    ? $"{a.IdContactoNavigation.Nombres} {a.IdContactoNavigation.Apellidos}".Trim()
                    : null,
                IdEmpresa = a.IdEmpresa,
                NombreEmpresa = a.IdEmpresaNavigation?.Nombre,
                IdOportunidad = a.IdOportunidad,
                TituloOportunidad = a.IdOportunidadNavigation?.Titulo,
                Estado = a.Estado,
                FechaCreacion = a.FechaCreacion
            };
        }
    }
}

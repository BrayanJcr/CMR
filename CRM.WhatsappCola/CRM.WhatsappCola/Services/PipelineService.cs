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
    /// Servicio de gestion del pipeline de ventas
    /// </summary>
    public class PipelineService
    {
        private readonly WA_ColaContext _db;

        public PipelineService(WA_ColaContext db)
        {
            _db = db;
        }

        /// <summary>Obtiene las etapas ordenadas por Orden</summary>
        public async Task<List<PipelineEtapaDTO>> ObtenerEtapas()
        {
            var etapas = await _db.TPipelineEtapa
                .Include(e => e.TOportunidad.Where(o => o.Estado))
                .Where(e => e.Estado)
                .OrderBy(e => e.Orden)
                .ToListAsync();

            return etapas.Select(e => new PipelineEtapaDTO
            {
                Id = e.Id,
                Nombre = e.Nombre,
                Orden = e.Orden,
                Color = e.Color,
                Descripcion = e.Descripcion,
                Estado = e.Estado,
                CantidadOportunidades = e.TOportunidad?.Count(o => o.Estado) ?? 0,
                ValorTotal = e.TOportunidad?.Where(o => o.Estado).Sum(o => o.MontoEstimado) ?? 0
            }).ToList();
        }

        /// <summary>Crea una nueva etapa</summary>
        public async Task<PipelineEtapaDTO> CrearEtapa(PipelineEtapaCreateDTO dto, string usuario)
        {
            var etapa = new TPipelineEtapa
            {
                Nombre = dto.Nombre,
                Orden = dto.Orden,
                Color = dto.Color ?? "#3B82F6",
                Descripcion = dto.Descripcion,
                Estado = true,
                UsuarioCreacion = usuario,
                UsuarioModificacion = usuario,
                FechaCreacion = DateTime.Now,
                FechaModificacion = DateTime.Now
            };

            _db.TPipelineEtapa.Add(etapa);
            await _db.SaveChangesAsync();

            return new PipelineEtapaDTO
            {
                Id = etapa.Id,
                Nombre = etapa.Nombre,
                Orden = etapa.Orden,
                Color = etapa.Color,
                Descripcion = etapa.Descripcion,
                Estado = etapa.Estado,
                CantidadOportunidades = 0,
                ValorTotal = 0
            };
        }

        /// <summary>Actualiza una etapa</summary>
        public async Task<PipelineEtapaDTO> ActualizarEtapa(int id, PipelineEtapaCreateDTO dto, string usuario)
        {
            var etapa = await _db.TPipelineEtapa.FindAsync(id);
            if (etapa == null) return null;

            etapa.Nombre = dto.Nombre;
            etapa.Orden = dto.Orden;
            etapa.Color = dto.Color ?? "#3B82F6";
            etapa.Descripcion = dto.Descripcion;
            etapa.UsuarioModificacion = usuario;
            etapa.FechaModificacion = DateTime.Now;

            await _db.SaveChangesAsync();

            var cantOport = await _db.TOportunidad.CountAsync(o => o.IdEtapa == id && o.Estado);
            var valorTotal = await _db.TOportunidad
                .Where(o => o.IdEtapa == id && o.Estado)
                .SumAsync(o => o.MontoEstimado);

            return new PipelineEtapaDTO
            {
                Id = etapa.Id,
                Nombre = etapa.Nombre,
                Orden = etapa.Orden,
                Color = etapa.Color,
                Descripcion = etapa.Descripcion,
                Estado = etapa.Estado,
                CantidadOportunidades = cantOport,
                ValorTotal = valorTotal
            };
        }

        /// <summary>Eliminacion logica de una etapa</summary>
        public async Task<bool> EliminarEtapa(int id, string usuario)
        {
            var etapa = await _db.TPipelineEtapa.FindAsync(id);
            if (etapa == null) return false;

            etapa.Estado = false;
            etapa.UsuarioModificacion = usuario;
            etapa.FechaModificacion = DateTime.Now;

            await _db.SaveChangesAsync();
            return true;
        }

        /// <summary>Obtiene el kanban con todas las etapas y oportunidades activas</summary>
        public async Task<KanbanDTO> ObtenerKanban()
        {
            var etapas = await _db.TPipelineEtapa
                .Where(e => e.Estado)
                .OrderBy(e => e.Orden)
                .ToListAsync();

            var oportunidades = await _db.TOportunidad
                .Include(o => o.IdContactoNavigation)
                .Include(o => o.IdEmpresaNavigation)
                .Include(o => o.IdResponsableNavigation)
                .Where(o => o.Estado)
                .ToListAsync();

            var kanban = new KanbanDTO();

            foreach (var etapa in etapas)
            {
                var optsEtapa = oportunidades.Where(o => o.IdEtapa == etapa.Id).ToList();
                var columna = new KanbanColumnaDTO
                {
                    Id = etapa.Id,
                    Nombre = etapa.Nombre,
                    Color = etapa.Color,
                    Orden = etapa.Orden,
                    ValorTotal = optsEtapa.Sum(o => o.MontoEstimado),
                    Oportunidades = optsEtapa.Select(o => new OportunidadResumenDTO
                    {
                        Id = o.Id,
                        Titulo = o.Titulo,
                        NombreContacto = o.IdContactoNavigation != null
                            ? $"{o.IdContactoNavigation.Nombres} {o.IdContactoNavigation.Apellidos}".Trim()
                            : null,
                        NombreEmpresa = o.IdEmpresaNavigation?.Nombre,
                        MontoEstimado = o.MontoEstimado,
                        Moneda = o.Moneda,
                        Prioridad = o.Prioridad,
                        NombreResponsable = o.IdResponsableNavigation != null
                            ? $"{o.IdResponsableNavigation.Nombres} {o.IdResponsableNavigation.ApellidoPaterno}".Trim()
                            : null,
                        FechaCierre = o.FechaCierre
                    }).ToList()
                };

                kanban.Columnas.Add(columna);
            }

            return kanban;
        }
    }
}

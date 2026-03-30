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
    /// Servicio de gestion de oportunidades de venta
    /// </summary>
    public class OportunidadService
    {
        private readonly WA_ColaContext _db;

        public OportunidadService(WA_ColaContext db)
        {
            _db = db;
        }

        /// <summary>Obtiene lista de oportunidades activas</summary>
        public async Task<List<OportunidadDTO>> ObtenerTodas(int? idEtapa = null, int? idContacto = null, int? idEmpresa = null)
        {
            var query = _db.TOportunidad
                .Include(o => o.IdContactoNavigation)
                .Include(o => o.IdEmpresaNavigation)
                .Include(o => o.IdResponsableNavigation)
                .Include(o => o.IdEtapaNavigation)
                .Include(o => o.TOportunidadProducto.Where(p => p.Estado))
                    .ThenInclude(op => op.IdProductoNavigation)
                .Where(o => o.Estado);

            if (idEtapa.HasValue) query = query.Where(o => o.IdEtapa == idEtapa.Value);
            if (idContacto.HasValue) query = query.Where(o => o.IdContacto == idContacto.Value);
            if (idEmpresa.HasValue) query = query.Where(o => o.IdEmpresa == idEmpresa.Value);

            var lista = await query.OrderByDescending(o => o.FechaCreacion).ToListAsync();
            return lista.Select(o => MapearOportunidadDTO(o)).ToList();
        }

        /// <summary>Obtiene una oportunidad por Id</summary>
        public async Task<OportunidadDTO> ObtenerPorId(int id)
        {
            var oportunidad = await _db.TOportunidad
                .Include(o => o.IdContactoNavigation)
                .Include(o => o.IdEmpresaNavigation)
                .Include(o => o.IdResponsableNavigation)
                .Include(o => o.IdEtapaNavigation)
                .Include(o => o.TOportunidadProducto.Where(p => p.Estado))
                    .ThenInclude(op => op.IdProductoNavigation)
                .FirstOrDefaultAsync(o => o.Id == id && o.Estado);

            if (oportunidad == null) return null;
            return MapearOportunidadDTO(oportunidad);
        }

        /// <summary>Crea una nueva oportunidad con productos</summary>
        public async Task<OportunidadDTO> Crear(OportunidadCreateDTO dto, string usuario)
        {
            var oportunidad = new TOportunidad
            {
                Titulo = dto.Titulo,
                IdContacto = dto.IdContacto,
                IdEmpresa = dto.IdEmpresa,
                IdResponsable = dto.IdResponsable,
                IdEtapa = dto.IdEtapa,
                MontoEstimado = dto.MontoEstimado,
                Moneda = dto.Moneda ?? "USD",
                Probabilidad = dto.Probabilidad,
                FechaCierre = dto.FechaCierre,
                Origen = dto.Origen ?? "whatsapp",
                Prioridad = dto.Prioridad ?? "media",
                Notas = dto.Notas,
                Estado = true,
                UsuarioCreacion = usuario,
                UsuarioModificacion = usuario,
                FechaCreacion = DateTime.Now,
                FechaModificacion = DateTime.Now
            };

            _db.TOportunidad.Add(oportunidad);
            await _db.SaveChangesAsync();

            foreach (var prod in dto.Productos)
            {
                _db.TOportunidadProducto.Add(new TOportunidadProducto
                {
                    IdOportunidad = oportunidad.Id,
                    IdProducto = prod.IdProducto,
                    Cantidad = prod.Cantidad,
                    PrecioUnitario = prod.PrecioUnitario,
                    Estado = true,
                    UsuarioCreacion = usuario,
                    FechaCreacion = DateTime.Now
                });
            }

            await _db.SaveChangesAsync();
            return await ObtenerPorId(oportunidad.Id);
        }

        /// <summary>Actualiza una oportunidad y sus productos</summary>
        public async Task<OportunidadDTO> Actualizar(OportunidadUpdateDTO dto, string usuario)
        {
            var oportunidad = await _db.TOportunidad.FindAsync(dto.Id);
            if (oportunidad == null) return null;

            oportunidad.Titulo = dto.Titulo;
            oportunidad.IdContacto = dto.IdContacto;
            oportunidad.IdEmpresa = dto.IdEmpresa;
            oportunidad.IdResponsable = dto.IdResponsable;
            oportunidad.IdEtapa = dto.IdEtapa;
            oportunidad.MontoEstimado = dto.MontoEstimado;
            oportunidad.Moneda = dto.Moneda ?? "USD";
            oportunidad.Probabilidad = dto.Probabilidad;
            oportunidad.FechaCierre = dto.FechaCierre;
            oportunidad.Origen = dto.Origen ?? "whatsapp";
            oportunidad.Prioridad = dto.Prioridad ?? "media";
            oportunidad.Notas = dto.Notas;
            oportunidad.UsuarioModificacion = usuario;
            oportunidad.FechaModificacion = DateTime.Now;

            // Eliminar productos anteriores y reemplazar
            var productosActuales = await _db.TOportunidadProducto
                .Where(op => op.IdOportunidad == dto.Id && op.Estado)
                .ToListAsync();

            foreach (var p in productosActuales)
                p.Estado = false;

            foreach (var prod in dto.Productos)
            {
                _db.TOportunidadProducto.Add(new TOportunidadProducto
                {
                    IdOportunidad = dto.Id,
                    IdProducto = prod.IdProducto,
                    Cantidad = prod.Cantidad,
                    PrecioUnitario = prod.PrecioUnitario,
                    Estado = true,
                    UsuarioCreacion = usuario,
                    FechaCreacion = DateTime.Now
                });
            }

            await _db.SaveChangesAsync();
            return await ObtenerPorId(dto.Id);
        }

        /// <summary>Mueve la oportunidad a otra etapa</summary>
        public async Task<OportunidadDTO> MoverEtapa(int id, int idEtapa, string usuario)
        {
            var oportunidad = await _db.TOportunidad.FindAsync(id);
            if (oportunidad == null) return null;

            oportunidad.IdEtapa = idEtapa;
            oportunidad.UsuarioModificacion = usuario;
            oportunidad.FechaModificacion = DateTime.Now;

            await _db.SaveChangesAsync();
            return await ObtenerPorId(id);
        }

        /// <summary>Eliminacion logica de una oportunidad</summary>
        public async Task<bool> Eliminar(int id, string usuario)
        {
            var oportunidad = await _db.TOportunidad.FindAsync(id);
            if (oportunidad == null) return false;

            oportunidad.Estado = false;
            oportunidad.UsuarioModificacion = usuario;
            oportunidad.FechaModificacion = DateTime.Now;

            await _db.SaveChangesAsync();
            return true;
        }

        private OportunidadDTO MapearOportunidadDTO(TOportunidad o)
        {
            var productos = o.TOportunidadProducto?
                .Where(op => op.Estado)
                .Select(op => new OportunidadProductoDTO
                {
                    Id = op.Id,
                    IdProducto = op.IdProducto,
                    NombreProducto = op.IdProductoNavigation?.Nombre,
                    CodigoProducto = op.IdProductoNavigation?.Codigo,
                    Cantidad = op.Cantidad,
                    PrecioUnitario = op.PrecioUnitario
                }).ToList() ?? new List<OportunidadProductoDTO>();

            return new OportunidadDTO
            {
                Id = o.Id,
                Titulo = o.Titulo,
                IdContacto = o.IdContacto,
                NombreContacto = o.IdContactoNavigation != null
                    ? $"{o.IdContactoNavigation.Nombres} {o.IdContactoNavigation.Apellidos}".Trim()
                    : null,
                NumeroContacto = o.IdContactoNavigation?.NumeroWhatsApp,
                IdEmpresa = o.IdEmpresa,
                NombreEmpresa = o.IdEmpresaNavigation?.Nombre,
                IdResponsable = o.IdResponsable,
                NombreResponsable = o.IdResponsableNavigation != null
                    ? $"{o.IdResponsableNavigation.Nombres} {o.IdResponsableNavigation.ApellidoPaterno}".Trim()
                    : null,
                IdEtapa = o.IdEtapa,
                NombreEtapa = o.IdEtapaNavigation?.Nombre,
                ColorEtapa = o.IdEtapaNavigation?.Color,
                MontoEstimado = o.MontoEstimado,
                Moneda = o.Moneda,
                Probabilidad = o.Probabilidad,
                FechaCierre = o.FechaCierre,
                Origen = o.Origen,
                Prioridad = o.Prioridad,
                Notas = o.Notas,
                Estado = o.Estado,
                Productos = productos,
                MontoTotal = productos.Sum(p => p.Cantidad * p.PrecioUnitario),
                FechaCreacion = o.FechaCreacion
            };
        }
    }
}

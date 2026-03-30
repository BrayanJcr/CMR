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
    /// Servicio de gestion de empresas CRM
    /// </summary>
    public class EmpresaService
    {
        private readonly WA_ColaContext _db;

        public EmpresaService(WA_ColaContext db)
        {
            _db = db;
        }

        /// <summary>Obtiene lista paginada de empresas</summary>
        public async Task<List<EmpresaDTO>> ObtenerTodas(FiltroEmpresaDTO filtro)
        {
            var query = _db.TEmpresa
                .Include(e => e.TContacto)
                .Where(e => e.Estado);

            if (!string.IsNullOrWhiteSpace(filtro.Busqueda))
            {
                string b = filtro.Busqueda.ToLower();
                query = query.Where(e =>
                    e.Nombre.ToLower().Contains(b) ||
                    (e.Ruc != null && e.Ruc.Contains(b)) ||
                    (e.Sector != null && e.Sector.ToLower().Contains(b)));
            }

            int skip = (filtro.Pagina - 1) * filtro.TamanoPagina;

            var lista = await query
                .OrderBy(e => e.Nombre)
                .Skip(skip)
                .Take(filtro.TamanoPagina)
                .ToListAsync();

            return lista.Select(e => MapearEmpresaDTO(e)).ToList();
        }

        /// <summary>Obtiene total de paginas</summary>
        public async Task<int> ObtenerTotalPaginas(FiltroEmpresaDTO filtro)
        {
            var query = _db.TEmpresa.Where(e => e.Estado);

            if (!string.IsNullOrWhiteSpace(filtro.Busqueda))
            {
                string b = filtro.Busqueda.ToLower();
                query = query.Where(e => e.Nombre.ToLower().Contains(b));
            }

            int total = await query.CountAsync();
            return (int)Math.Ceiling((double)total / filtro.TamanoPagina);
        }

        /// <summary>Obtiene una empresa por Id</summary>
        public async Task<EmpresaDTO> ObtenerPorId(int id)
        {
            var empresa = await _db.TEmpresa
                .Include(e => e.TContacto.Where(c => c.Estado))
                .FirstOrDefaultAsync(e => e.Id == id && e.Estado);

            if (empresa == null) return null;
            return MapearEmpresaDTO(empresa);
        }

        /// <summary>Crea una nueva empresa</summary>
        public async Task<EmpresaDTO> Crear(EmpresaCreateDTO dto, string usuario)
        {
            var empresa = new TEmpresa
            {
                Nombre = dto.Nombre,
                Ruc = dto.Ruc,
                Sector = dto.Sector,
                Tamano = dto.Tamano,
                Web = dto.Web,
                Direccion = dto.Direccion,
                Logo = dto.Logo,
                Notas = dto.Notas,
                Estado = true,
                UsuarioCreacion = usuario,
                UsuarioModificacion = usuario,
                FechaCreacion = DateTime.Now,
                FechaModificacion = DateTime.Now
            };

            _db.TEmpresa.Add(empresa);
            await _db.SaveChangesAsync();
            return await ObtenerPorId(empresa.Id);
        }

        /// <summary>Actualiza una empresa</summary>
        public async Task<EmpresaDTO> Actualizar(EmpresaUpdateDTO dto, string usuario)
        {
            var empresa = await _db.TEmpresa.FindAsync(dto.Id);
            if (empresa == null) return null;

            empresa.Nombre = dto.Nombre;
            empresa.Ruc = dto.Ruc;
            empresa.Sector = dto.Sector;
            empresa.Tamano = dto.Tamano;
            empresa.Web = dto.Web;
            empresa.Direccion = dto.Direccion;
            empresa.Logo = dto.Logo;
            empresa.Notas = dto.Notas;
            empresa.UsuarioModificacion = usuario;
            empresa.FechaModificacion = DateTime.Now;

            await _db.SaveChangesAsync();
            return await ObtenerPorId(dto.Id);
        }

        /// <summary>Eliminacion logica de una empresa</summary>
        public async Task<bool> Eliminar(int id, string usuario)
        {
            var empresa = await _db.TEmpresa.FindAsync(id);
            if (empresa == null) return false;

            empresa.Estado = false;
            empresa.UsuarioModificacion = usuario;
            empresa.FechaModificacion = DateTime.Now;

            await _db.SaveChangesAsync();
            return true;
        }

        private EmpresaDTO MapearEmpresaDTO(TEmpresa e)
        {
            return new EmpresaDTO
            {
                Id = e.Id,
                Nombre = e.Nombre,
                Ruc = e.Ruc,
                Sector = e.Sector,
                Tamano = e.Tamano,
                Web = e.Web,
                Direccion = e.Direccion,
                Logo = e.Logo,
                Notas = e.Notas,
                Estado = e.Estado,
                CantidadContactos = e.TContacto?.Count(c => c.Estado) ?? 0,
                FechaCreacion = e.FechaCreacion
            };
        }
    }
}

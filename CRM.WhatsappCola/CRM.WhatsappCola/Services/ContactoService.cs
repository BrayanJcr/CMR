using CRM.WhatsappCola.DTOs.CRM;
using CRM.WhatsappCola.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Services
{
    /// <summary>
    /// Servicio de gestion de contactos CRM
    /// </summary>
    public class ContactoService
    {
        private readonly WA_ColaContext _db;

        public ContactoService(WA_ColaContext db)
        {
            _db = db;
        }

        /// <summary>Obtiene lista paginada de contactos con filtros</summary>
        public async Task<List<ContactoDTO>> ObtenerTodos(FiltroContactoDTO filtro)
        {
            var query = _db.TContacto
                .Include(c => c.IdEmpresaNavigation)
                .Include(c => c.TContactoEtiqueta.Where(ce => ce.Estado))
                    .ThenInclude(ce => ce.IdEtiquetaNavigation)
                .Where(c => c.Estado);

            if (!string.IsNullOrWhiteSpace(filtro.Busqueda))
            {
                string b = filtro.Busqueda.ToLower();
                query = query.Where(c =>
                    c.Nombres.ToLower().Contains(b) ||
                    (c.Apellidos != null && c.Apellidos.ToLower().Contains(b)) ||
                    c.NumeroWhatsApp.Contains(b) ||
                    (c.Email != null && c.Email.ToLower().Contains(b)));
            }

            if (filtro.IdEmpresa.HasValue)
                query = query.Where(c => c.IdEmpresa == filtro.IdEmpresa.Value);

            if (filtro.IdEtiqueta.HasValue)
                query = query.Where(c => c.TContactoEtiqueta.Any(ce => ce.IdEtiqueta == filtro.IdEtiqueta.Value && ce.Estado));

            int skip = (filtro.Pagina - 1) * filtro.TamanoPagina;

            var lista = await query
                .OrderBy(c => c.Nombres)
                .Skip(skip)
                .Take(filtro.TamanoPagina)
                .ToListAsync();

            return lista.Select(c => MapearContactoDTO(c)).ToList();
        }

        /// <summary>Obtiene total de paginas para paginacion</summary>
        public async Task<int> ObtenerTotalPaginas(FiltroContactoDTO filtro)
        {
            var query = _db.TContacto
                .Include(c => c.TContactoEtiqueta.Where(ce => ce.Estado))
                .Where(c => c.Estado);

            if (!string.IsNullOrWhiteSpace(filtro.Busqueda))
            {
                string b = filtro.Busqueda.ToLower();
                query = query.Where(c =>
                    c.Nombres.ToLower().Contains(b) ||
                    (c.Apellidos != null && c.Apellidos.ToLower().Contains(b)) ||
                    c.NumeroWhatsApp.Contains(b) ||
                    (c.Email != null && c.Email.ToLower().Contains(b)));
            }

            if (filtro.IdEmpresa.HasValue)
                query = query.Where(c => c.IdEmpresa == filtro.IdEmpresa.Value);

            if (filtro.IdEtiqueta.HasValue)
                query = query.Where(c => c.TContactoEtiqueta.Any(ce => ce.IdEtiqueta == filtro.IdEtiqueta.Value && ce.Estado));

            int total = await query.CountAsync();
            return (int)System.Math.Ceiling((double)total / filtro.TamanoPagina);
        }

        /// <summary>Obtiene un contacto por Id con detalle completo</summary>
        public async Task<ContactoDTO> ObtenerPorId(int id)
        {
            var contacto = await _db.TContacto
                .Include(c => c.IdEmpresaNavigation)
                .Include(c => c.TContactoEtiqueta.Where(ce => ce.Estado))
                    .ThenInclude(ce => ce.IdEtiquetaNavigation)
                .FirstOrDefaultAsync(c => c.Id == id && c.Estado);

            if (contacto == null) return null;
            return MapearContactoDTO(contacto);
        }

        /// <summary>Crea un nuevo contacto y asigna etiquetas</summary>
        public async Task<ContactoDTO> Crear(ContactoCreateDTO dto, string usuario)
        {
            var contacto = new TContacto
            {
                Nombres = dto.Nombres,
                Apellidos = dto.Apellidos,
                NumeroWhatsApp = dto.NumeroWhatsApp,
                Email = dto.Email,
                Cargo = dto.Cargo,
                IdEmpresa = dto.IdEmpresa,
                Notas = dto.Notas,
                Estado = true,
                UsuarioCreacion = usuario,
                UsuarioModificacion = usuario,
                FechaCreacion = System.DateTime.Now,
                FechaModificacion = System.DateTime.Now
            };

            _db.TContacto.Add(contacto);
            await _db.SaveChangesAsync();

            foreach (var idEtiqueta in dto.IdsEtiquetas)
            {
                _db.TContactoEtiqueta.Add(new TContactoEtiqueta
                {
                    IdContacto = contacto.Id,
                    IdEtiqueta = idEtiqueta,
                    Estado = true,
                    UsuarioCreacion = usuario,
                    FechaCreacion = System.DateTime.Now
                });
            }

            await _db.SaveChangesAsync();
            return await ObtenerPorId(contacto.Id);
        }

        /// <summary>Actualiza un contacto y sincroniza etiquetas</summary>
        public async Task<ContactoDTO> Actualizar(ContactoUpdateDTO dto, string usuario)
        {
            var contacto = await _db.TContacto.FindAsync(dto.Id);
            if (contacto == null) return null;

            contacto.Nombres = dto.Nombres;
            contacto.Apellidos = dto.Apellidos;
            contacto.NumeroWhatsApp = dto.NumeroWhatsApp;
            contacto.Email = dto.Email;
            contacto.Cargo = dto.Cargo;
            contacto.IdEmpresa = dto.IdEmpresa;
            contacto.Notas = dto.Notas;
            contacto.UsuarioModificacion = usuario;
            contacto.FechaModificacion = System.DateTime.Now;

            // Sincronizar etiquetas: desactivar las que no estan en la nueva lista
            var etiquetasActuales = await _db.TContactoEtiqueta
                .Where(ce => ce.IdContacto == dto.Id && ce.Estado)
                .ToListAsync();

            foreach (var ce in etiquetasActuales)
            {
                if (!dto.IdsEtiquetas.Contains(ce.IdEtiqueta))
                    ce.Estado = false;
            }

            // Agregar las nuevas etiquetas
            var idsActuales = etiquetasActuales.Where(ce => ce.Estado).Select(ce => ce.IdEtiqueta).ToList();
            foreach (var idEtiqueta in dto.IdsEtiquetas)
            {
                if (!idsActuales.Contains(idEtiqueta))
                {
                    _db.TContactoEtiqueta.Add(new TContactoEtiqueta
                    {
                        IdContacto = dto.Id,
                        IdEtiqueta = idEtiqueta,
                        Estado = true,
                        UsuarioCreacion = usuario,
                        FechaCreacion = System.DateTime.Now
                    });
                }
            }

            await _db.SaveChangesAsync();
            return await ObtenerPorId(dto.Id);
        }

        /// <summary>Eliminacion logica de un contacto</summary>
        public async Task<bool> Eliminar(int id, string usuario)
        {
            var contacto = await _db.TContacto.FindAsync(id);
            if (contacto == null) return false;

            contacto.Estado = false;
            contacto.UsuarioModificacion = usuario;
            contacto.FechaModificacion = System.DateTime.Now;

            await _db.SaveChangesAsync();
            return true;
        }

        private ContactoDTO MapearContactoDTO(TContacto c)
        {
            return new ContactoDTO
            {
                Id = c.Id,
                Nombres = c.Nombres,
                Apellidos = c.Apellidos,
                NumeroWhatsApp = c.NumeroWhatsApp,
                Email = c.Email,
                Cargo = c.Cargo,
                IdEmpresa = c.IdEmpresa,
                NombreEmpresa = c.IdEmpresaNavigation?.Nombre,
                Notas = c.Notas,
                Estado = c.Estado,
                FechaCreacion = c.FechaCreacion,
                Etiquetas = c.TContactoEtiqueta?
                    .Where(ce => ce.Estado && ce.IdEtiquetaNavigation != null)
                    .Select(ce => new EtiquetaDTO
                    {
                        Id = ce.IdEtiquetaNavigation.Id,
                        Nombre = ce.IdEtiquetaNavigation.Nombre,
                        Color = ce.IdEtiquetaNavigation.Color,
                        Estado = ce.IdEtiquetaNavigation.Estado
                    }).ToList() ?? new List<EtiquetaDTO>()
            };
        }
    }
}

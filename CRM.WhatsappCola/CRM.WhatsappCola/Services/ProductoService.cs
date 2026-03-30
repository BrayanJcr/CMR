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
    /// Servicio de gestion de productos y categorias
    /// </summary>
    public class ProductoService
    {
        private readonly WA_ColaContext _db;

        public ProductoService(WA_ColaContext db)
        {
            _db = db;
        }

        /// <summary>Obtiene todos los productos activos</summary>
        public async Task<List<ProductoDTO>> ObtenerTodos(string busqueda = null, int? idCategoria = null)
        {
            var query = _db.TProducto
                .Include(p => p.IdCategoriaNavigation)
                .Where(p => p.Estado);

            if (!string.IsNullOrWhiteSpace(busqueda))
            {
                string b = busqueda.ToLower();
                query = query.Where(p =>
                    p.Nombre.ToLower().Contains(b) ||
                    (p.Codigo != null && p.Codigo.ToLower().Contains(b)));
            }

            if (idCategoria.HasValue)
                query = query.Where(p => p.IdCategoria == idCategoria.Value);

            var lista = await query.OrderBy(p => p.Nombre).ToListAsync();
            return lista.Select(p => MapearProductoDTO(p)).ToList();
        }

        /// <summary>Obtiene un producto por Id</summary>
        public async Task<ProductoDTO> ObtenerPorId(int id)
        {
            var producto = await _db.TProducto
                .Include(p => p.IdCategoriaNavigation)
                .FirstOrDefaultAsync(p => p.Id == id && p.Estado);

            if (producto == null) return null;
            return MapearProductoDTO(producto);
        }

        /// <summary>Crea un nuevo producto</summary>
        public async Task<ProductoDTO> Crear(ProductoCreateDTO dto, string usuario)
        {
            var producto = new TProducto
            {
                Nombre = dto.Nombre,
                Codigo = dto.Codigo,
                Descripcion = dto.Descripcion,
                Precio = dto.Precio,
                Unidad = dto.Unidad ?? "unidad",
                IdCategoria = dto.IdCategoria,
                Imagen = dto.Imagen,
                Estado = dto.Estado,
                UsuarioCreacion = usuario,
                UsuarioModificacion = usuario,
                FechaCreacion = DateTime.Now,
                FechaModificacion = DateTime.Now
            };

            _db.TProducto.Add(producto);
            await _db.SaveChangesAsync();
            return await ObtenerPorId(producto.Id);
        }

        /// <summary>Actualiza un producto</summary>
        public async Task<ProductoDTO> Actualizar(int id, ProductoCreateDTO dto, string usuario)
        {
            var producto = await _db.TProducto.FindAsync(id);
            if (producto == null) return null;

            producto.Nombre = dto.Nombre;
            producto.Codigo = dto.Codigo;
            producto.Descripcion = dto.Descripcion;
            producto.Precio = dto.Precio;
            producto.Unidad = dto.Unidad ?? "unidad";
            producto.IdCategoria = dto.IdCategoria;
            producto.Imagen = dto.Imagen;
            producto.Estado = dto.Estado;
            producto.UsuarioModificacion = usuario;
            producto.FechaModificacion = DateTime.Now;

            await _db.SaveChangesAsync();
            return await ObtenerPorId(id);
        }

        /// <summary>Eliminacion logica de un producto</summary>
        public async Task<bool> Eliminar(int id, string usuario)
        {
            var producto = await _db.TProducto.FindAsync(id);
            if (producto == null) return false;

            producto.Estado = false;
            producto.UsuarioModificacion = usuario;
            producto.FechaModificacion = DateTime.Now;

            await _db.SaveChangesAsync();
            return true;
        }

        // ===================== CATEGORIAS =====================

        /// <summary>Obtiene todas las categorias activas</summary>
        public async Task<List<ProductoCategoriaDTO>> ObtenerCategorias()
        {
            var lista = await _db.TProductoCategoria
                .Where(c => c.Estado)
                .OrderBy(c => c.Nombre)
                .ToListAsync();

            return lista.Select(c => new ProductoCategoriaDTO
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Color = c.Color,
                Descripcion = c.Descripcion,
                Estado = c.Estado
            }).ToList();
        }

        /// <summary>Obtiene una categoria por Id</summary>
        public async Task<ProductoCategoriaDTO> ObtenerCategoriaPorId(int id)
        {
            var cat = await _db.TProductoCategoria.FirstOrDefaultAsync(c => c.Id == id && c.Estado);
            if (cat == null) return null;

            return new ProductoCategoriaDTO
            {
                Id = cat.Id,
                Nombre = cat.Nombre,
                Color = cat.Color,
                Descripcion = cat.Descripcion,
                Estado = cat.Estado
            };
        }

        /// <summary>Crea una nueva categoria</summary>
        public async Task<ProductoCategoriaDTO> CrearCategoria(ProductoCategoriaCreateDTO dto, string usuario)
        {
            var cat = new TProductoCategoria
            {
                Nombre = dto.Nombre,
                Color = dto.Color ?? "#3B82F6",
                Descripcion = dto.Descripcion,
                Estado = true,
                UsuarioCreacion = usuario,
                UsuarioModificacion = usuario,
                FechaCreacion = DateTime.Now,
                FechaModificacion = DateTime.Now
            };

            _db.TProductoCategoria.Add(cat);
            await _db.SaveChangesAsync();
            return await ObtenerCategoriaPorId(cat.Id);
        }

        /// <summary>Actualiza una categoria</summary>
        public async Task<ProductoCategoriaDTO> ActualizarCategoria(int id, ProductoCategoriaCreateDTO dto, string usuario)
        {
            var cat = await _db.TProductoCategoria.FindAsync(id);
            if (cat == null) return null;

            cat.Nombre = dto.Nombre;
            cat.Color = dto.Color ?? "#3B82F6";
            cat.Descripcion = dto.Descripcion;
            cat.UsuarioModificacion = usuario;
            cat.FechaModificacion = DateTime.Now;

            await _db.SaveChangesAsync();
            return await ObtenerCategoriaPorId(id);
        }

        /// <summary>Eliminacion logica de una categoria</summary>
        public async Task<bool> EliminarCategoria(int id, string usuario)
        {
            var cat = await _db.TProductoCategoria.FindAsync(id);
            if (cat == null) return false;

            cat.Estado = false;
            cat.UsuarioModificacion = usuario;
            cat.FechaModificacion = DateTime.Now;

            await _db.SaveChangesAsync();
            return true;
        }

        private ProductoDTO MapearProductoDTO(TProducto p)
        {
            return new ProductoDTO
            {
                Id = p.Id,
                Nombre = p.Nombre,
                Codigo = p.Codigo,
                Descripcion = p.Descripcion,
                Precio = p.Precio,
                Unidad = p.Unidad,
                IdCategoria = p.IdCategoria,
                NombreCategoria = p.IdCategoriaNavigation?.Nombre,
                ColorCategoria = p.IdCategoriaNavigation?.Color,
                Imagen = p.Imagen,
                Estado = p.Estado,
                FechaCreacion = p.FechaCreacion
            };
        }
    }
}

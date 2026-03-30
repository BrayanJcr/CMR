using CRM.WhatsappCola.DTOs.CRM;
using CRM.WhatsappCola.Models;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace CRM.WhatsappCola.Services
{
    /// <summary>
    /// Servicio de gestion de plantillas de mensajes
    /// </summary>
    public class PlantillaService
    {
        private readonly WA_ColaContext _db;

        public PlantillaService(WA_ColaContext db)
        {
            _db = db;
        }

        /// <summary>Obtiene todas las plantillas activas</summary>
        public async Task<List<PlantillaDTO>> ObtenerTodas(string categoria = null)
        {
            var query = _db.TPlantilla.Where(p => p.Estado);

            if (!string.IsNullOrWhiteSpace(categoria))
                query = query.Where(p => p.Categoria == categoria);

            var lista = await query.OrderBy(p => p.Nombre).ToListAsync();
            return lista.Select(p => MapearPlantillaDTO(p)).ToList();
        }

        /// <summary>Obtiene una plantilla por Id</summary>
        public async Task<PlantillaDTO> ObtenerPorId(int id)
        {
            var plantilla = await _db.TPlantilla.FirstOrDefaultAsync(p => p.Id == id && p.Estado);
            if (plantilla == null) return null;
            return MapearPlantillaDTO(plantilla);
        }

        /// <summary>Crea una nueva plantilla y extrae variables del contenido</summary>
        public async Task<PlantillaDTO> Crear(PlantillaCreateDTO dto, string usuario)
        {
            var variablesDetectadas = ExtraerVariables(dto.Contenido);
            var todasVariables = dto.Variables?.Union(variablesDetectadas).Distinct().ToList() ?? variablesDetectadas;

            var plantilla = new TPlantilla
            {
                Nombre = dto.Nombre,
                Categoria = dto.Categoria ?? "general",
                Contenido = dto.Contenido,
                Variables = JsonConvert.SerializeObject(todasVariables),
                Estado = dto.Estado,
                UsuarioCreacion = usuario,
                UsuarioModificacion = usuario,
                FechaCreacion = DateTime.Now,
                FechaModificacion = DateTime.Now
            };

            _db.TPlantilla.Add(plantilla);
            await _db.SaveChangesAsync();
            return await ObtenerPorId(plantilla.Id);
        }

        /// <summary>Actualiza una plantilla</summary>
        public async Task<PlantillaDTO> Actualizar(PlantillaUpdateDTO dto, string usuario)
        {
            var plantilla = await _db.TPlantilla.FindAsync(dto.Id);
            if (plantilla == null) return null;

            var variablesDetectadas = ExtraerVariables(dto.Contenido);
            var todasVariables = dto.Variables?.Union(variablesDetectadas).Distinct().ToList() ?? variablesDetectadas;

            plantilla.Nombre = dto.Nombre;
            plantilla.Categoria = dto.Categoria ?? "general";
            plantilla.Contenido = dto.Contenido;
            plantilla.Variables = JsonConvert.SerializeObject(todasVariables);
            plantilla.Estado = dto.Estado;
            plantilla.UsuarioModificacion = usuario;
            plantilla.FechaModificacion = DateTime.Now;

            await _db.SaveChangesAsync();
            return await ObtenerPorId(dto.Id);
        }

        /// <summary>Eliminacion logica de una plantilla</summary>
        public async Task<bool> Eliminar(int id, string usuario)
        {
            var plantilla = await _db.TPlantilla.FindAsync(id);
            if (plantilla == null) return false;

            plantilla.Estado = false;
            plantilla.UsuarioModificacion = usuario;
            plantilla.FechaModificacion = DateTime.Now;

            await _db.SaveChangesAsync();
            return true;
        }

        /// <summary>Extrae variables en formato {{varname}} del contenido</summary>
        private List<string> ExtraerVariables(string contenido)
        {
            if (string.IsNullOrWhiteSpace(contenido)) return new List<string>();

            var matches = Regex.Matches(contenido, @"\{\{(\w+)\}\}");
            return matches.Select(m => m.Groups[1].Value).Distinct().ToList();
        }

        private PlantillaDTO MapearPlantillaDTO(TPlantilla p)
        {
            List<string> variables = new List<string>();
            if (!string.IsNullOrWhiteSpace(p.Variables))
            {
                try { variables = JsonConvert.DeserializeObject<List<string>>(p.Variables) ?? new List<string>(); }
                catch { variables = new List<string>(); }
            }

            return new PlantillaDTO
            {
                Id = p.Id,
                Nombre = p.Nombre,
                Categoria = p.Categoria,
                Contenido = p.Contenido,
                Variables = variables,
                Estado = p.Estado,
                FechaCreacion = p.FechaCreacion
            };
        }
    }
}

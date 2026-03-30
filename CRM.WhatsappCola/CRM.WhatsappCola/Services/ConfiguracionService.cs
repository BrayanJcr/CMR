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
    /// Servicio de gestion de configuracion del sistema
    /// </summary>
    public class ConfiguracionService
    {
        private readonly WA_ColaContext _db;

        public ConfiguracionService(WA_ColaContext db)
        {
            _db = db;
        }

        /// <summary>Obtiene todos los parametros de configuracion</summary>
        public async Task<List<ConfiguracionDTO>> ObtenerTodas()
        {
            var lista = await _db.TConfiguracionSistema
                .OrderBy(c => c.Clave)
                .ToListAsync();

            return lista.Select(c => new ConfiguracionDTO
            {
                Clave = c.Clave,
                Valor = c.Valor,
                Tipo = c.Tipo,
                Descripcion = c.Descripcion
            }).ToList();
        }

        /// <summary>Obtiene un valor de configuracion por clave</summary>
        public async Task<ConfiguracionDTO> ObtenerPorClave(string clave)
        {
            var config = await _db.TConfiguracionSistema
                .FirstOrDefaultAsync(c => c.Clave == clave);

            if (config == null) return null;

            return new ConfiguracionDTO
            {
                Clave = config.Clave,
                Valor = config.Valor,
                Tipo = config.Tipo,
                Descripcion = config.Descripcion
            };
        }

        /// <summary>Actualiza o crea un parametro de configuracion</summary>
        public async Task<ConfiguracionDTO> Actualizar(string clave, string valor, string usuario)
        {
            var config = await _db.TConfiguracionSistema.FirstOrDefaultAsync(c => c.Clave == clave);

            if (config == null)
            {
                config = new TConfiguracionSistema
                {
                    Clave = clave,
                    Valor = valor,
                    Tipo = "string",
                    UsuarioModificacion = usuario,
                    FechaModificacion = DateTime.Now
                };
                _db.TConfiguracionSistema.Add(config);
            }
            else
            {
                config.Valor = valor;
                config.UsuarioModificacion = usuario;
                config.FechaModificacion = DateTime.Now;
            }

            await _db.SaveChangesAsync();

            return new ConfiguracionDTO
            {
                Clave = config.Clave,
                Valor = config.Valor,
                Tipo = config.Tipo,
                Descripcion = config.Descripcion
            };
        }
    }
}

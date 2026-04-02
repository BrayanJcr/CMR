using CRM.WhatsappCola.DTOs.CRM;
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
    /// Servicio de gestion de encuestas y formularios
    /// </summary>
    public class EncuestaService
    {
        private readonly WA_ColaContext _db;

        public EncuestaService(WA_ColaContext db)
        {
            _db = db;
        }

        /// <summary>Obtiene todas las encuestas activas</summary>
        public async Task<List<EncuestaDTO>> ObtenerTodas()
        {
            var lista = await _db.TEncuesta
                .Include(e => e.TEncuestaPregunta.Where(p => p.Estado))
                .Include(e => e.TEncuestaEnvio.Where(en => en.Estado))
                .Where(e => e.Estado)
                .OrderByDescending(e => e.FechaCreacion)
                .ToListAsync();

            return lista.Select(e => MapearEncuestaDTO(e)).ToList();
        }

        /// <summary>Obtiene una encuesta por Id</summary>
        public async Task<EncuestaDTO> ObtenerPorId(int id)
        {
            var encuesta = await _db.TEncuesta
                .Include(e => e.TEncuestaPregunta.Where(p => p.Estado))
                .Include(e => e.TEncuestaEnvio.Where(en => en.Estado))
                .FirstOrDefaultAsync(e => e.Id == id && e.Estado);

            if (encuesta == null) return null;
            return MapearEncuestaDTO(encuesta);
        }

        /// <summary>Crea una nueva encuesta con sus preguntas</summary>
        public async Task<EncuestaDTO> Crear(EncuestaCreateDTO dto, string usuario)
        {
            var encuesta = new TEncuesta
            {
                Nombre = dto.Nombre,
                Descripcion = dto.Descripcion,
                Categoria = dto.Categoria ?? "general",
                Estado = true,
                UsuarioCreacion = usuario,
                UsuarioModificacion = usuario,
                FechaCreacion = DateTime.Now,
                FechaModificacion = DateTime.Now
            };

            _db.TEncuesta.Add(encuesta);
            await _db.SaveChangesAsync();

            int orden = 1;
            foreach (var p in dto.Preguntas.OrderBy(p => p.Orden))
            {
                _db.TEncuestaPregunta.Add(new TEncuestaPregunta
                {
                    IdEncuesta = encuesta.Id,
                    Orden = p.Orden > 0 ? p.Orden : orden++,
                    Texto = p.Texto,
                    Tipo = p.Tipo,
                    Opciones = p.Opciones != null && p.Opciones.Any()
                        ? JsonConvert.SerializeObject(p.Opciones)
                        : null,
                    Obligatorio = p.Obligatorio,
                    CondicionPreguntaId = p.CondicionPreguntaId,
                    CondicionRespuesta = p.CondicionRespuesta,
                    Estado = true
                });
            }

            await _db.SaveChangesAsync();
            return await ObtenerPorId(encuesta.Id);
        }

        /// <summary>Actualiza una encuesta</summary>
        public async Task<EncuestaDTO> Actualizar(int id, EncuestaCreateDTO dto, string usuario)
        {
            var encuesta = await _db.TEncuesta.FindAsync(id);
            if (encuesta == null) return null;

            encuesta.Nombre = dto.Nombre;
            encuesta.Descripcion = dto.Descripcion;
            encuesta.Categoria = dto.Categoria ?? "general";
            encuesta.UsuarioModificacion = usuario;
            encuesta.FechaModificacion = DateTime.Now;

            // Eliminar preguntas existentes y recrear
            var preguntasExistentes = await _db.TEncuestaPregunta
                .Where(p => p.IdEncuesta == id && p.Estado)
                .ToListAsync();
            foreach (var p in preguntasExistentes) p.Estado = false;

            int orden = 1;
            foreach (var p in dto.Preguntas.OrderBy(p => p.Orden))
            {
                _db.TEncuestaPregunta.Add(new TEncuestaPregunta
                {
                    IdEncuesta = id,
                    Orden = p.Orden > 0 ? p.Orden : orden++,
                    Texto = p.Texto,
                    Tipo = p.Tipo,
                    Opciones = p.Opciones != null && p.Opciones.Any()
                        ? JsonConvert.SerializeObject(p.Opciones)
                        : null,
                    Obligatorio = p.Obligatorio,
                    CondicionPreguntaId = p.CondicionPreguntaId,
                    CondicionRespuesta = p.CondicionRespuesta,
                    Estado = true
                });
            }

            await _db.SaveChangesAsync();
            return await ObtenerPorId(id);
        }

        /// <summary>Eliminacion logica de una encuesta</summary>
        public async Task<bool> Eliminar(int id, string usuario)
        {
            var encuesta = await _db.TEncuesta.FindAsync(id);
            if (encuesta == null) return false;

            encuesta.Estado = false;
            encuesta.UsuarioModificacion = usuario;
            encuesta.FechaModificacion = DateTime.Now;

            await _db.SaveChangesAsync();
            return true;
        }

        /// <summary>Envia la encuesta a una lista de contactos generando tokens unicos</summary>
        public async Task<int> EnviarEncuesta(int id, List<int> idsContactos, string usuario)
        {
            int enviados = 0;
            foreach (var idContacto in idsContactos)
            {
                string token = Guid.NewGuid().ToString("N");
                _db.TEncuestaEnvio.Add(new TEncuestaEnvio
                {
                    IdEncuesta = id,
                    IdContacto = idContacto,
                    Token = token,
                    EstadoEnvio = "pendiente",
                    FechaEnvio = DateTime.Now,
                    Estado = true
                });
                enviados++;
            }

            await _db.SaveChangesAsync();
            return enviados;
        }

        /// <summary>Obtiene el formulario publico de una encuesta por token</summary>
        public async Task<EncuestaPublicaDTO> ObtenerFormularioPublico(string token)
        {
            var envio = await _db.TEncuestaEnvio
                .Include(e => e.IdEncuestaNavigation)
                    .ThenInclude(enc => enc.TEncuestaPregunta.Where(p => p.Estado))
                .FirstOrDefaultAsync(e => e.Token == token && e.Estado);

            if (envio == null) return null;

            var encuesta = envio.IdEncuestaNavigation;

            return new EncuestaPublicaDTO
            {
                NombreEncuesta = encuesta.Nombre,
                DescripcionEncuesta = encuesta.Descripcion,
                EstadoEnvio = envio.EstadoEnvio,
                Preguntas = encuesta.TEncuestaPregunta?
                    .Where(p => p.Estado)
                    .OrderBy(p => p.Orden)
                    .Select(p => MapearPreguntaDTO(p))
                    .ToList() ?? new List<EncuestaPreguntaDTO>()
            };
        }

        /// <summary>Guarda las respuestas de un encuestado y marca como completada</summary>
        public async Task<bool> SubmitRespuestas(string token, EncuestaResponderDTO dto)
        {
            var envio = await _db.TEncuestaEnvio
                .FirstOrDefaultAsync(e => e.Token == token && e.Estado);

            if (envio == null || envio.EstadoEnvio == "completado") return false;

            foreach (var respuesta in dto.Respuestas)
            {
                _db.TEncuestaRespuesta.Add(new TEncuestaRespuesta
                {
                    IdEncuestaEnvio = envio.Id,
                    IdPregunta = respuesta.IdPregunta,
                    Valor = respuesta.Valor,
                    Estado = true
                });
            }

            envio.EstadoEnvio = "completado";
            envio.FechaCompletado = DateTime.Now;

            await _db.SaveChangesAsync();
            return true;
        }

        /// <summary>Obtiene resultados agregados de una encuesta</summary>
        public async Task<EncuestaResultadosDTO?> ObtenerResultados(int id)
        {
            var encuesta = await _db.TEncuesta
                .Include(e => e.TEncuestaPregunta.Where(p => p.Estado))
                .Include(e => e.TEncuestaEnvio.Where(en => en.Estado))
                    .ThenInclude(en => en.TEncuestaRespuesta.Where(r => r.Estado))
                .Include(e => e.TEncuestaEnvio.Where(en => en.Estado))
                    .ThenInclude(en => en.IdContactoNavigation)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (encuesta == null) return null;

            var totalEnviadas = encuesta.TEncuestaEnvio?.Count ?? 0;
            var totalCompletadas = encuesta.TEncuestaEnvio?.Count(en => en.EstadoEnvio == "completado") ?? 0;
            var totalPendientes = totalEnviadas - totalCompletadas;

            var resultadosPorPregunta = new List<ResultadoPreguntaDTO>();

            foreach (var pregunta in encuesta.TEncuestaPregunta?.OrderBy(p => p.Orden) ?? Enumerable.Empty<TEncuestaPregunta>())
            {
                var respuestasPreg = encuesta.TEncuestaEnvio?
                    .SelectMany(en => en.TEncuestaRespuesta ?? new List<TEncuestaRespuesta>())
                    .Where(r => r.IdPregunta == pregunta.Id && r.Estado && !string.IsNullOrWhiteSpace(r.Valor))
                    .Select(r => r.Valor)
                    .ToList() ?? new List<string>();

                var resultadoPreg = new ResultadoPreguntaDTO
                {
                    IdPregunta = pregunta.Id,
                    Texto = pregunta.Texto,
                    Tipo = pregunta.Tipo
                };

                if (pregunta.Tipo == "escala" || pregunta.Tipo == "numero")
                {
                    var numeros = respuestasPreg
                        .Select(v => double.TryParse(v, out double n) ? (double?)n : null)
                        .Where(n => n.HasValue)
                        .Select(n => n!.Value)
                        .ToList();

                    resultadoPreg.Promedio = numeros.Any() ? numeros.Average() : null;
                    var conteo = respuestasPreg.GroupBy(v => v)
                        .Select(g => new OpcionConteoDTO { Opcion = g.Key, Conteo = g.Count(), Porcentaje = respuestasPreg.Count > 0 ? Math.Round((double)g.Count() / respuestasPreg.Count * 100, 1) : 0 })
                        .ToList();
                    resultadoPreg.Conteos = conteo;
                }
                else if (pregunta.Tipo == "texto" || pregunta.Tipo == "texto_largo")
                {
                    resultadoPreg.TextosLibres = respuestasPreg;
                }
                else
                {
                    var conteo = respuestasPreg.GroupBy(v => v)
                        .Select(g => new OpcionConteoDTO { Opcion = g.Key, Conteo = g.Count(), Porcentaje = respuestasPreg.Count > 0 ? Math.Round((double)g.Count() / respuestasPreg.Count * 100, 1) : 0 })
                        .OrderByDescending(c => c.Conteo)
                        .ToList();
                    resultadoPreg.Conteos = conteo;
                }

                resultadosPorPregunta.Add(resultadoPreg);
            }

            var respuestasIndividuales = encuesta.TEncuestaEnvio?
                .Where(en => en.EstadoEnvio == "completado")
                .Select(en => new RespuestaIndividualDTO
                {
                    IdEnvio = en.Id,
                    NombreContacto = en.IdContactoNavigation != null
                        ? $"{en.IdContactoNavigation.Nombres} {en.IdContactoNavigation.Apellidos}".Trim()
                        : "Anonimo",
                    NumeroContacto = en.IdContactoNavigation?.NumeroWhatsApp,
                    FechaCompletado = en.FechaCompletado,
                    Respuestas = en.TEncuestaRespuesta?
                        .Where(r => r.Estado)
                        .Select(r => new RespuestaPreguntaDTO { IdPregunta = r.IdPregunta, Valor = r.Valor })
                        .ToList() ?? new List<RespuestaPreguntaDTO>()
                }).ToList() ?? new List<RespuestaIndividualDTO>();

            return new EncuestaResultadosDTO
            {
                IdEncuesta = encuesta.Id,
                Nombre = encuesta.Nombre,
                TotalEnviadas = totalEnviadas,
                TotalCompletadas = totalCompletadas,
                TotalPendientes = totalPendientes,
                ResultadosPorPregunta = resultadosPorPregunta,
                RespuestasIndividuales = respuestasIndividuales
            };
        }

        private EncuestaDTO MapearEncuestaDTO(TEncuesta e)
        {
            return new EncuestaDTO
            {
                Id = e.Id,
                Nombre = e.Nombre,
                Descripcion = e.Descripcion,
                Categoria = e.Categoria,
                Estado = e.Estado,
                Preguntas = e.TEncuestaPregunta?
                    .Where(p => p.Estado)
                    .OrderBy(p => p.Orden)
                    .Select(p => MapearPreguntaDTO(p))
                    .ToList() ?? new List<EncuestaPreguntaDTO>(),
                TotalEnviadas = e.TEncuestaEnvio?.Count(en => en.Estado) ?? 0,
                TotalCompletadas = e.TEncuestaEnvio?.Count(en => en.Estado && en.EstadoEnvio == "completado") ?? 0,
                FechaCreacion = e.FechaCreacion
            };
        }

        private EncuestaPreguntaDTO MapearPreguntaDTO(TEncuestaPregunta p)
        {
            List<string> opciones = new List<string>();
            if (!string.IsNullOrWhiteSpace(p.Opciones))
            {
                try { opciones = JsonConvert.DeserializeObject<List<string>>(p.Opciones) ?? new List<string>(); }
                catch { opciones = new List<string>(); }
            }

            return new EncuestaPreguntaDTO
            {
                Id = p.Id,
                Orden = p.Orden,
                Texto = p.Texto,
                Tipo = p.Tipo,
                Opciones = opciones,
                Obligatorio = p.Obligatorio,
                CondicionPreguntaId = p.CondicionPreguntaId,
                CondicionRespuesta = p.CondicionRespuesta
            };
        }
    }
}

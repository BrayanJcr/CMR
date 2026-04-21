using CRM.WhatsappCola.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CRM.WhatsappCola.Controllers;

[Route("api/[controller]")]
[ApiController]
public class BusquedaController : ControllerBase
{
    private readonly WA_ColaContext _db;

    public BusquedaController(WA_ColaContext db) { _db = db; }

    /// <summary>GET /api/Busqueda?q=texto — búsqueda global en conversaciones, contactos y mensajes</summary>
    [HttpGet]
    public IActionResult Get([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return BadRequest(new { mensaje = "La búsqueda requiere al menos 2 caracteres" });

        var term = q.Trim().ToLower();

        // Conversaciones por nombre o número
        var conversaciones = _db.TConversacion
            .Where(c => c.Estado && (
                (c.NombreContacto != null && c.NombreContacto.ToLower().Contains(term)) ||
                c.NumeroCliente.ToLower().Contains(term)))
            .OrderByDescending(c => c.FechaModificacion)
            .Take(6)
            .Select(c => new
            {
                tipo              = "conversacion",
                id                = c.Id,
                nombreContacto    = c.NombreContacto ?? c.NumeroCliente,
                numeroCliente     = c.NumeroCliente,
                estadoConversacion = c.EstadoConversacion ?? "abierta",
                agenteAsignado    = c.AgenteAsignado,
            })
            .ToList();

        // Contactos CRM
        var contactos = _db.TContacto
            .Where(c => c.Estado && (
                c.Nombres.ToLower().Contains(term) ||
                (c.Apellidos != null && c.Apellidos.ToLower().Contains(term)) ||
                c.NumeroWhatsApp.ToLower().Contains(term) ||
                (c.Email != null && c.Email.ToLower().Contains(term))))
            .Take(5)
            .Select(c => new
            {
                tipo           = "contacto",
                id             = c.Id,
                nombre         = (c.Nombres + " " + (c.Apellidos ?? "")).Trim(),
                numeroWhatsApp = c.NumeroWhatsApp,
                email          = c.Email,
                cargo          = c.Cargo,
            })
            .ToList();

        // ── Cache de conversaciones activas (1 query, resuelve N+1) ────────────
        // Se cargan solo las columnas necesarias para resolver mensajes y notas
        var convCache = _db.TConversacion
            .Where(c => c.Estado)
            .Select(c => new { c.Id, c.NumeroCuenta, c.NumeroCliente, c.NombreContacto })
            .ToList();

        var convByKey = convCache
            .GroupBy(c => $"{c.NumeroCuenta}|{c.NumeroCliente}")
            .ToDictionary(g => g.Key, g => g.First());

        var convById = convCache.ToDictionary(c => c.Id, c => c);

        // ── Mensajes entrantes ────────────────────────────────────────────────
        var rawEntrantes = _db.TMensajeEntrante
            .Where(m => m.Estado && m.Mensaje != null && m.Mensaje.ToLower().Contains(term))
            .OrderByDescending(m => m.FechaEnvio)
            .Take(5)
            .Select(m => new { m.Id, m.Mensaje, m.FechaEnvio, m.NumeroCliente, m.NumeroCuenta })
            .ToList();

        var mensajesEntrantes = rawEntrantes.Select(m =>
        {
            convByKey.TryGetValue($"{m.NumeroCuenta}|{m.NumeroCliente}", out var conv);
            return (object)new
            {
                tipo           = "mensaje",
                id             = m.Id,
                cuerpo         = m.Mensaje,
                fechaEnvio     = m.FechaEnvio,
                numeroCliente  = m.NumeroCliente,
                esEntrante     = true,
                idConversacion = conv?.Id,
                nombreContacto = conv != null ? (conv.NombreContacto ?? conv.NumeroCliente) : m.NumeroCliente,
            };
        }).ToList<object>();

        // ── Mensajes salientes ────────────────────────────────────────────────
        var rawSalientes = _db.TMensajeCola
            .Where(m => m.Estado && m.Mensaje != null && m.Mensaje.ToLower().Contains(term))
            .OrderByDescending(m => m.FechaEnvio)
            .Take(5)
            .Select(m => new { m.Id, m.Mensaje, m.FechaEnvio, m.NumeroDestino, m.NumeroRemitente })
            .ToList();

        var mensajesSalientes = rawSalientes.Select(m =>
        {
            convByKey.TryGetValue($"{m.NumeroRemitente}|{m.NumeroDestino}", out var conv);
            return (object)new
            {
                tipo           = "mensaje",
                id             = m.Id,
                cuerpo         = m.Mensaje,
                fechaEnvio     = m.FechaEnvio,
                numeroCliente  = m.NumeroDestino,
                esEntrante     = false,
                idConversacion = conv?.Id,
                nombreContacto = conv != null ? (conv.NombreContacto ?? conv.NumeroCliente) : m.NumeroDestino,
            };
        }).ToList<object>();

        // ── Notas internas ────────────────────────────────────────────────────
        var rawNotas = _db.TNotaConversacion
            .Where(n => n.Texto.ToLower().Contains(term))
            .OrderByDescending(n => n.FechaCreacion)
            .Take(4)
            .Select(n => new { n.Id, n.Texto, n.FechaCreacion, n.IdConversacion, n.Usuario })
            .ToList();

        var notas = rawNotas.Select(n =>
        {
            convById.TryGetValue(n.IdConversacion, out var conv);
            return (object)new
            {
                tipo           = "nota",
                id             = n.Id,
                cuerpo         = n.Texto,
                fechaEnvio     = n.FechaCreacion,
                idConversacion = n.IdConversacion,
                usuario        = n.Usuario,
                nombreContacto = conv != null ? (conv.NombreContacto ?? conv.NumeroCliente) : null,
            };
        }).ToList<object>();

        var mensajes = mensajesEntrantes.Concat(mensajesSalientes)
            .OrderByDescending(m => ((dynamic)m).fechaEnvio)
            .Take(8)
            .ToList();

        return Ok(new
        {
            query         = q,
            conversaciones,
            contactos,
            mensajes,
            notas,
            totalResultados = conversaciones.Count + contactos.Count + mensajes.Count + notas.Count
        });
    }
}

#nullable disable
using System;
using System.Collections.Generic;

namespace CRM.WhatsappCola.DTOs.CRM;

public class EncuestaDTO
{
    public int Id { get; set; }
    public string Nombre { get; set; }
    public string Descripcion { get; set; }
    public string Categoria { get; set; }
    public bool Estado { get; set; }
    public List<EncuestaPreguntaDTO> Preguntas { get; set; } = new();
    public int TotalEnviadas { get; set; }
    public int TotalCompletadas { get; set; }
    public DateTime FechaCreacion { get; set; }
}

public class EncuestaPreguntaDTO
{
    public int Id { get; set; }
    public int Orden { get; set; }
    public string Texto { get; set; }
    public string Tipo { get; set; }
    public List<string> Opciones { get; set; } = new();
    public bool Obligatorio { get; set; }
    public int? CondicionPreguntaId { get; set; }
    public string CondicionRespuesta { get; set; }
}

public class EncuestaCreateDTO
{
    public string Nombre { get; set; }
    public string Descripcion { get; set; }
    public string Categoria { get; set; } = "general";
    public List<EncuestaPreguntaCreateDTO> Preguntas { get; set; } = new();
}

public class EncuestaPreguntaCreateDTO
{
    public int Orden { get; set; }
    public string Texto { get; set; }
    public string Tipo { get; set; }
    public List<string> Opciones { get; set; } = new();
    public bool Obligatorio { get; set; } = true;
    public int? CondicionPreguntaId { get; set; }
    public string CondicionRespuesta { get; set; }
}

public class EncuestaEnviarDTO
{
    public List<int> IdsContactos { get; set; } = new();
}

public class EncuestaPublicaDTO
{
    public string NombreEncuesta { get; set; }
    public string DescripcionEncuesta { get; set; }
    public string EstadoEnvio { get; set; }
    public List<EncuestaPreguntaDTO> Preguntas { get; set; } = new();
}

public class EncuestaResponderDTO
{
    public List<RespuestaPreguntaDTO> Respuestas { get; set; } = new();
}

public class RespuestaPreguntaDTO
{
    public int IdPregunta { get; set; }
    public string Valor { get; set; }
}

public class EncuestaResultadosDTO
{
    public int IdEncuesta { get; set; }
    public string Nombre { get; set; }
    public int TotalEnviadas { get; set; }
    public int TotalCompletadas { get; set; }
    public int TotalPendientes { get; set; }
    public List<ResultadoPreguntaDTO> ResultadosPorPregunta { get; set; } = new();
    public List<RespuestaIndividualDTO> RespuestasIndividuales { get; set; } = new();
}

public class ResultadoPreguntaDTO
{
    public int IdPregunta { get; set; }
    public string Texto { get; set; }
    public string Tipo { get; set; }
    public List<OpcionConteoDTO> Conteos { get; set; } = new();
    public double? Promedio { get; set; }
    public List<string> TextosLibres { get; set; } = new();
}

public class OpcionConteoDTO
{
    public string Opcion { get; set; }
    public int Conteo { get; set; }
    public double Porcentaje { get; set; }
}

public class RespuestaIndividualDTO
{
    public int IdEnvio { get; set; }
    public string NombreContacto { get; set; }
    public string NumeroContacto { get; set; }
    public DateTime? FechaCompletado { get; set; }
    public List<RespuestaPreguntaDTO> Respuestas { get; set; } = new();
}

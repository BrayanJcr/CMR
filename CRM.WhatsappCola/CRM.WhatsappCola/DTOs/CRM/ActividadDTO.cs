#nullable disable
using System;

namespace CRM.WhatsappCola.DTOs.CRM;

public class ActividadDTO
{
    public int Id { get; set; }
    public string Tipo { get; set; }
    public string Titulo { get; set; }
    public string Descripcion { get; set; }
    public DateTime? FechaActividad { get; set; }
    public string EstadoActividad { get; set; }
    public int? IdResponsable { get; set; }
    public string NombreResponsable { get; set; }
    public int? IdContacto { get; set; }
    public string NombreContacto { get; set; }
    public int? IdEmpresa { get; set; }
    public string NombreEmpresa { get; set; }
    public int? IdOportunidad { get; set; }
    public string TituloOportunidad { get; set; }
    public bool Estado { get; set; }
    public DateTime FechaCreacion { get; set; }
}

public class ActividadCreateDTO
{
    public string Tipo { get; set; }
    public string Titulo { get; set; }
    public string Descripcion { get; set; }
    public DateTime? FechaActividad { get; set; }
    public string EstadoActividad { get; set; } = "pendiente";
    public int? IdResponsable { get; set; }
    public int? IdContacto { get; set; }
    public int? IdEmpresa { get; set; }
    public int? IdOportunidad { get; set; }
}

public class ActividadUpdateDTO : ActividadCreateDTO
{
    public int Id { get; set; }
}

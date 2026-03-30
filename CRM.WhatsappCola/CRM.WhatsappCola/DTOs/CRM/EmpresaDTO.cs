#nullable disable
using System;

namespace CRM.WhatsappCola.DTOs.CRM;

public class EmpresaDTO
{
    public int Id { get; set; }
    public string Nombre { get; set; }
    public string Ruc { get; set; }
    public string Sector { get; set; }
    public string Tamano { get; set; }
    public string Web { get; set; }
    public string Direccion { get; set; }
    public string Logo { get; set; }
    public string Notas { get; set; }
    public bool Estado { get; set; }
    public int CantidadContactos { get; set; }
    public DateTime FechaCreacion { get; set; }
}

public class EmpresaCreateDTO
{
    public string Nombre { get; set; }
    public string Ruc { get; set; }
    public string Sector { get; set; }
    public string Tamano { get; set; }
    public string Web { get; set; }
    public string Direccion { get; set; }
    public string Logo { get; set; }
    public string Notas { get; set; }
}

public class EmpresaUpdateDTO : EmpresaCreateDTO
{
    public int Id { get; set; }
}

public class FiltroEmpresaDTO
{
    public string Busqueda { get; set; }
    public int Pagina { get; set; } = 1;
    public int TamanoPagina { get; set; } = 20;
}

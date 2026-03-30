#nullable disable
using System;
using System.Collections.Generic;

namespace CRM.WhatsappCola.DTOs.CRM;

public class PipelineEtapaDTO
{
    public int Id { get; set; }
    public string Nombre { get; set; }
    public int Orden { get; set; }
    public string Color { get; set; }
    public string Descripcion { get; set; }
    public bool Estado { get; set; }
    public int CantidadOportunidades { get; set; }
    public decimal ValorTotal { get; set; }
}

public class PipelineEtapaCreateDTO
{
    public string Nombre { get; set; }
    public int Orden { get; set; }
    public string Color { get; set; }
    public string Descripcion { get; set; }
}

public class KanbanDTO
{
    public List<KanbanColumnaDTO> Columnas { get; set; } = new();
}

public class KanbanColumnaDTO
{
    public int Id { get; set; }
    public string Nombre { get; set; }
    public string Color { get; set; }
    public int Orden { get; set; }
    public decimal ValorTotal { get; set; }
    public List<OportunidadResumenDTO> Oportunidades { get; set; } = new();
}

public class OportunidadResumenDTO
{
    public int Id { get; set; }
    public string Titulo { get; set; }
    public string NombreContacto { get; set; }
    public string NombreEmpresa { get; set; }
    public decimal MontoEstimado { get; set; }
    public string Moneda { get; set; }
    public string Prioridad { get; set; }
    public string NombreResponsable { get; set; }
    public DateTime? FechaCierre { get; set; }
}

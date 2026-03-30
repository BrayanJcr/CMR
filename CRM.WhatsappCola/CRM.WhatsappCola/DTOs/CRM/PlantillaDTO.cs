#nullable disable
using System;
using System.Collections.Generic;

namespace CRM.WhatsappCola.DTOs.CRM;

public class PlantillaDTO
{
    public int Id { get; set; }
    public string Nombre { get; set; }
    public string Categoria { get; set; }
    public string Contenido { get; set; }
    public List<string> Variables { get; set; } = new();
    public bool Estado { get; set; }
    public DateTime FechaCreacion { get; set; }
}

public class PlantillaCreateDTO
{
    public string Nombre { get; set; }
    public string Categoria { get; set; } = "general";
    public string Contenido { get; set; }
    public List<string> Variables { get; set; } = new();
    public bool Estado { get; set; } = true;
}

public class PlantillaUpdateDTO : PlantillaCreateDTO
{
    public int Id { get; set; }
}

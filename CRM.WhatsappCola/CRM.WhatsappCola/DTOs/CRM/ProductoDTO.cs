#nullable disable
using System;

namespace CRM.WhatsappCola.DTOs.CRM;

public class ProductoDTO
{
    public int Id { get; set; }
    public string Nombre { get; set; }
    public string Codigo { get; set; }
    public string Descripcion { get; set; }
    public decimal Precio { get; set; }
    public string Unidad { get; set; }
    public int? IdCategoria { get; set; }
    public string NombreCategoria { get; set; }
    public string ColorCategoria { get; set; }
    public string Imagen { get; set; }
    public bool Estado { get; set; }
    public DateTime FechaCreacion { get; set; }
}

public class ProductoCreateDTO
{
    public string Nombre { get; set; }
    public string Codigo { get; set; }
    public string Descripcion { get; set; }
    public decimal Precio { get; set; }
    public string Unidad { get; set; }
    public int? IdCategoria { get; set; }
    public string Imagen { get; set; }
    public bool Estado { get; set; } = true;
}

public class ProductoCategoriaDTO
{
    public int Id { get; set; }
    public string Nombre { get; set; }
    public string Color { get; set; }
    public string Descripcion { get; set; }
    public bool Estado { get; set; }
}

public class ProductoCategoriaCreateDTO
{
    public string Nombre { get; set; }
    public string Color { get; set; }
    public string Descripcion { get; set; }
}

#nullable disable
using System;
using System.Collections.Generic;

namespace CRM.WhatsappCola.DTOs.CRM;

public class OportunidadDTO
{
    public int Id { get; set; }
    public string Titulo { get; set; }
    public int? IdContacto { get; set; }
    public string NombreContacto { get; set; }
    public string NumeroContacto { get; set; }
    public int? IdEmpresa { get; set; }
    public string NombreEmpresa { get; set; }
    public int? IdResponsable { get; set; }
    public string NombreResponsable { get; set; }
    public int IdEtapa { get; set; }
    public string NombreEtapa { get; set; }
    public string ColorEtapa { get; set; }
    public decimal MontoEstimado { get; set; }
    public string Moneda { get; set; }
    public int Probabilidad { get; set; }
    public DateTime? FechaCierre { get; set; }
    public string Origen { get; set; }
    public string Prioridad { get; set; }
    public string Notas { get; set; }
    public bool Estado { get; set; }
    public List<OportunidadProductoDTO> Productos { get; set; } = new();
    public decimal MontoTotal { get; set; }
    public DateTime FechaCreacion { get; set; }
}

public class OportunidadCreateDTO
{
    public string Titulo { get; set; }
    public int? IdContacto { get; set; }
    public int? IdEmpresa { get; set; }
    public int? IdResponsable { get; set; }
    public int IdEtapa { get; set; }
    public decimal MontoEstimado { get; set; }
    public string Moneda { get; set; } = "USD";
    public int Probabilidad { get; set; } = 50;
    public DateTime? FechaCierre { get; set; }
    public string Origen { get; set; } = "whatsapp";
    public string Prioridad { get; set; } = "media";
    public string Notas { get; set; }
    public List<OportunidadProductoCreateDTO> Productos { get; set; } = new();
}

public class OportunidadUpdateDTO : OportunidadCreateDTO
{
    public int Id { get; set; }
}

public class OportunidadProductoDTO
{
    public int Id { get; set; }
    public int IdProducto { get; set; }
    public string NombreProducto { get; set; }
    public string CodigoProducto { get; set; }
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Subtotal => Cantidad * PrecioUnitario;
}

public class OportunidadProductoCreateDTO
{
    public int IdProducto { get; set; }
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
}

public class MoverEtapaDTO
{
    public int IdEtapa { get; set; }
}

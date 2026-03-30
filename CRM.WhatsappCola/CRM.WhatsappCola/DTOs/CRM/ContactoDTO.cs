#nullable disable
using System;
using System.Collections.Generic;

namespace CRM.WhatsappCola.DTOs.CRM;

public class ContactoDTO
{
    public int Id { get; set; }
    public string Nombres { get; set; }
    public string Apellidos { get; set; }
    public string NombreCompleto => $"{Nombres} {Apellidos}".Trim();
    public string NumeroWhatsApp { get; set; }
    public string Email { get; set; }
    public string Cargo { get; set; }
    public int? IdEmpresa { get; set; }
    public string NombreEmpresa { get; set; }
    public string Notas { get; set; }
    public bool Estado { get; set; }
    public List<EtiquetaDTO> Etiquetas { get; set; } = new();
    public DateTime FechaCreacion { get; set; }
}

public class ContactoCreateDTO
{
    public string Nombres { get; set; }
    public string Apellidos { get; set; }
    public string NumeroWhatsApp { get; set; }
    public string Email { get; set; }
    public string Cargo { get; set; }
    public int? IdEmpresa { get; set; }
    public string Notas { get; set; }
    public List<int> IdsEtiquetas { get; set; } = new();
}

public class ContactoUpdateDTO : ContactoCreateDTO
{
    public int Id { get; set; }
}

public class FiltroContactoDTO
{
    public string Busqueda { get; set; }
    public int? IdEtiqueta { get; set; }
    public int? IdEmpresa { get; set; }
    public int Pagina { get; set; } = 1;
    public int TamanoPagina { get; set; } = 20;
}

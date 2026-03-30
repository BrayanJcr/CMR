#nullable disable
using System;
using System.Collections.Generic;

namespace CRM.WhatsappCola.DTOs.CRM;

public class CampanaDTO
{
    public int Id { get; set; }
    public string Nombre { get; set; }
    public int? IdPlantilla { get; set; }
    public string NombrePlantilla { get; set; }
    public string Mensaje { get; set; }
    public List<string> Tags { get; set; } = new();
    public string EstadoCampana { get; set; }
    public DateTime? ProgramadaPara { get; set; }
    public int Total { get; set; }
    public int Enviados { get; set; }
    public int Fallidos { get; set; }
    public int Pendientes { get; set; }
    public bool Estado { get; set; }
    public DateTime FechaCreacion { get; set; }
    public List<ContactoDTO> Contactos { get; set; } = new();
}

public class CampanaCreateDTO
{
    public string Nombre { get; set; }
    public int? IdPlantilla { get; set; }
    public string Mensaje { get; set; }
    public List<int> IdsContactos { get; set; } = new();
    public List<string> Tags { get; set; } = new();
    public DateTime? ProgramadaPara { get; set; }
}

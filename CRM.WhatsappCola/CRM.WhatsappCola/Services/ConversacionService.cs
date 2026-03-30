using AutoMapper;
using CRM.WhatsappCola.DTOs.Conversaciones;
using CRM.WhatsappCola.Models;

namespace CRM.WhatsappCola.Services
{
    public class ConversacionService
    {
        private WA_ColaContext _db;
        private Mapper mapper;

        public ConversacionService(WA_ColaContext db)
        {
            this._db = db;
            var config = new MapperConfiguration(cfg =>
            {
                cfg.CreateMap<VObtenerDetalleMensajes, DetalleConversacionDTO>(MemberList.None).ReverseMap();
                cfg.CreateMap<VObtenerResumenConversacion, ResumenConversacionDTO>(MemberList.None).ReverseMap();
            });
            mapper = new Mapper(config);
        }

        internal List<DetalleConversacionDTO> ObtenerDetalllePorFiltros(FiltroDetalleConversacionDTO filtroDto)
        {
            //validaciones
            if (string.IsNullOrEmpty(filtroDto.NumeroCuenta) && string.IsNullOrEmpty(filtroDto.NumeroCliente) &&
                !(filtroDto.FechaInicio != null && filtroDto.FechaFin != null)
                )
                throw new Exception("Debe de ingresar un criterio de busqueda");

            List<DetalleConversacionDTO> respuesta = new List<DetalleConversacionDTO>();

            var query = _db.VObtenerDetalleMensajes.AsQueryable();

            if (!string.IsNullOrEmpty(filtroDto.NumeroCuenta))
                query = query.Where(w => w.NumeroCuenta == filtroDto.NumeroCuenta);
            if (!string.IsNullOrEmpty(filtroDto.NumeroCliente))
                query = query.Where(w => w.NumeroCliente == filtroDto.NumeroCliente);
            if (filtroDto.FechaInicio != null && filtroDto.FechaFin != null)
                query = query.Where(w => w.Fecha >= filtroDto.FechaInicio.Value && w.Fecha <= filtroDto.FechaFin.Value);

            var listado = query.OrderBy(o => o.FechaEnvio).ToList();
            respuesta = mapper.Map<List<DetalleConversacionDTO>>(listado);

            return respuesta;
        }

        public List<ResumenConversacionDTO> ObtenerResumenPorFiltros(FiltroResumenConversacionDTO filtroDto)
        {
            List<ResumenConversacionDTO> respuesta = new List<ResumenConversacionDTO>();

            var query = _db.VObtenerResumenConversacion.AsQueryable();

            if (!string.IsNullOrEmpty(filtroDto.NumeroCuenta))
                query = query.Where(w => w.NumeroCuenta == filtroDto.NumeroCuenta);
            if (!string.IsNullOrEmpty(filtroDto.NumeroCliente))
                query = query.Where(w => w.NumeroCliente == filtroDto.NumeroCliente);

            var listado = query.OrderBy(o => o.NumeroCuenta).ThenBy(o => o.NumeroCliente).ToList();
            respuesta = mapper.Map<List<ResumenConversacionDTO>>(listado);

            return respuesta;
        }
    }
}

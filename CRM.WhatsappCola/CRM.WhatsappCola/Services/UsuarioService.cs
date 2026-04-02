using AutoMapper;
using CRM.WhatsappCola.DTOs.Conversaciones;
using CRM.WhatsappCola.DTOs.Usuario;
using CRM.WhatsappCola.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace CRM.WhatsappCola.Services
{
    public class UsuarioService
    {
        private WA_ColaContext _db;
        private Mapper _mapper;

        public UsuarioService(WA_ColaContext db)
        {
            this._db = db;
            var config = new MapperConfiguration(cfg =>
            {
                cfg.CreateMap<UsuarioCreateDTO, TUsuario>(MemberList.None).ReverseMap();
                cfg.CreateMap<UsuarioDTO, TUsuario>(MemberList.None).ReverseMap();
            });

            _mapper = new Mapper(config);
        }

        public UsuarioDTO GetByUserName(string userName)
        {
            try
            {
                var entity = _db.TUsuario.FirstOrDefault(f => f.NombreUsuario == userName);
                return _mapper.Map<UsuarioDTO>(entity);
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public UsuarioDTO GetById(int id)
        {
            try
            {
                var entity = _db.TUsuario.FirstOrDefault(f => f.Id == id);
                return _mapper.Map<UsuarioDTO>(entity);
            }
            catch (Exception ex)
            {
                throw;
            }
        }


        public bool ValidateHashPassword(string userName, string password)
        {
            try
            {
                var usuarioDB = GetByUserName(userName);
                if (usuarioDB == null)
                    throw new Exception("El usuario no existe");
                return BCrypt.Net.BCrypt.Verify(password, usuarioDB.ClaveHash);
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public int Create(UsuarioCreateDTO createDTO)
        {
            try
            {
                //validacion 
                var existingUser = GetByUserName(createDTO.NombreUsuario);
                if (existingUser != null)
                {
                    throw new Exception("El Nombre de Usuario ya está en uso");
                }

                var entity = _mapper.Map<TUsuario>(createDTO);
                entity.ClaveHash = BCrypt.Net.BCrypt.HashPassword(createDTO.Clave);
                entity.Estado = true;
                entity.UsuarioCreacion = createDTO.UsuarioResponsable;
                entity.UsuarioModificacion = createDTO.UsuarioResponsable;
                entity.FechaCreacion = DateTime.Now;
                entity.FechaModificacion = DateTime.Now;

                _db.TUsuario.Add(entity);
                _db.SaveChanges();

                return entity.Id;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public int Update(UsuarioUpdateDTO updateDTO)
        {
            try
            {
                //validacion 
                var existingUser = GetById(updateDTO.Id);
                if (existingUser == null)
                {
                    throw new Exception("El Usuario no existe");
                }

                var sameUserName = GetByUserName(updateDTO.NombreUsuario);
                if (sameUserName != null && sameUserName.Id != updateDTO.Id)
                {
                    throw new Exception("El Nombre de Usuario ya está en uso");
                }

                var entity = _db.TUsuario.FirstOrDefault(x => x.Id == updateDTO.Id);
                entity.Nombres = updateDTO.Nombres;
                entity.ApellidoPaterno = updateDTO.ApellidoPaterno;
                entity.ApellidoMaterno = updateDTO.ApellidoMaterno;
                entity.NombreUsuario = updateDTO.NombreUsuario;

                entity.ClaveHash = BCrypt.Net.BCrypt.HashPassword(updateDTO.Clave);
                entity.UsuarioModificacion = updateDTO.UsuarioResponsable;
                entity.FechaModificacion = DateTime.Now;

                _db.TUsuario.Update(entity);
                _db.SaveChanges();

                return existingUser.Id;
            }
            catch (Exception ex)
            {
                throw;
            }
        }
    }
}

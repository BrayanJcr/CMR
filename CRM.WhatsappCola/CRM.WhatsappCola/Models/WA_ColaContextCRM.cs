#nullable disable
using Microsoft.EntityFrameworkCore;

namespace CRM.WhatsappCola.Models;

/// <summary>
/// Extension del contexto WA_ColaContext para los modulos CRM
/// </summary>
public partial class WA_ColaContext
{
    public virtual DbSet<TEmpresa> TEmpresa { get; set; }
    public virtual DbSet<TContacto> TContacto { get; set; }
    public virtual DbSet<TEtiqueta> TEtiqueta { get; set; }
    public virtual DbSet<TContactoEtiqueta> TContactoEtiqueta { get; set; }
    public virtual DbSet<TProductoCategoria> TProductoCategoria { get; set; }
    public virtual DbSet<TProducto> TProducto { get; set; }
    public virtual DbSet<TPipelineEtapa> TPipelineEtapa { get; set; }
    public virtual DbSet<TOportunidad> TOportunidad { get; set; }
    public virtual DbSet<TOportunidadProducto> TOportunidadProducto { get; set; }
    public virtual DbSet<TActividad> TActividad { get; set; }
    public virtual DbSet<TPlantilla> TPlantilla { get; set; }
    public virtual DbSet<TCampana> TCampana { get; set; }
    public virtual DbSet<TCampanaContacto> TCampanaContacto { get; set; }
    public virtual DbSet<TEncuesta> TEncuesta { get; set; }
    public virtual DbSet<TEncuestaPregunta> TEncuestaPregunta { get; set; }
    public virtual DbSet<TEncuestaEnvio> TEncuestaEnvio { get; set; }
    public virtual DbSet<TEncuestaRespuesta> TEncuestaRespuesta { get; set; }
    public virtual DbSet<TConfiguracionSistema> TConfiguracionSistema { get; set; }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder)
    {
        // T_Empresa
        modelBuilder.Entity<TEmpresa>(entity =>
        {
            entity.ToTable("T_Empresa");
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(256);
            entity.Property(e => e.Ruc).HasMaxLength(20).IsUnicode(false);
            entity.Property(e => e.Sector).HasMaxLength(128);
            entity.Property(e => e.Tamano).HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.Web).HasMaxLength(256).IsUnicode(false);
            entity.Property(e => e.UsuarioCreacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.UsuarioModificacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.FechaCreacion).HasColumnType("timestamp without time zone");
            entity.Property(e => e.FechaModificacion).HasColumnType("timestamp without time zone");
        });

        // T_Contacto
        modelBuilder.Entity<TContacto>(entity =>
        {
            entity.ToTable("T_Contacto");
            entity.Property(e => e.Nombres).IsRequired().HasMaxLength(256);
            entity.Property(e => e.Apellidos).HasMaxLength(256);
            entity.Property(e => e.NumeroWhatsApp).IsRequired().HasMaxLength(20).IsUnicode(false);
            entity.Property(e => e.Email).HasMaxLength(256).IsUnicode(false);
            entity.Property(e => e.Cargo).HasMaxLength(128);
            entity.Property(e => e.UsuarioCreacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.UsuarioModificacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.FechaCreacion).HasColumnType("timestamp without time zone");
            entity.Property(e => e.FechaModificacion).HasColumnType("timestamp without time zone");
            entity.HasOne(d => d.IdEmpresaNavigation)
                .WithMany(p => p.TContacto)
                .HasForeignKey(d => d.IdEmpresa)
                .HasConstraintName("FK_T_Contacto_T_Empresa");
        });

        // T_Etiqueta
        modelBuilder.Entity<TEtiqueta>(entity =>
        {
            entity.ToTable("T_Etiqueta");
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(100).IsUnicode(false);
            entity.Property(e => e.Color).IsRequired().HasMaxLength(20).IsUnicode(false).HasDefaultValue("#3B82F6");
            entity.Property(e => e.UsuarioCreacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.UsuarioModificacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.FechaCreacion).HasColumnType("timestamp without time zone");
            entity.Property(e => e.FechaModificacion).HasColumnType("timestamp without time zone");
        });

        // T_ContactoEtiqueta
        modelBuilder.Entity<TContactoEtiqueta>(entity =>
        {
            entity.ToTable("T_ContactoEtiqueta");
            entity.Property(e => e.UsuarioCreacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.FechaCreacion).HasColumnType("timestamp without time zone");
            entity.HasOne(d => d.IdContactoNavigation).WithMany(p => p.TContactoEtiqueta)
                .HasForeignKey(d => d.IdContacto).HasConstraintName("FK_T_ContactoEtiqueta_T_Contacto");
            entity.HasOne(d => d.IdEtiquetaNavigation).WithMany(p => p.TContactoEtiqueta)
                .HasForeignKey(d => d.IdEtiqueta).HasConstraintName("FK_T_ContactoEtiqueta_T_Etiqueta");
        });

        // T_ProductoCategoria
        modelBuilder.Entity<TProductoCategoria>(entity =>
        {
            entity.ToTable("T_ProductoCategoria");
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(128);
            entity.Property(e => e.Color).IsRequired().HasMaxLength(20).IsUnicode(false).HasDefaultValue("#3B82F6");
            entity.Property(e => e.UsuarioCreacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.UsuarioModificacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.FechaCreacion).HasColumnType("timestamp without time zone");
            entity.Property(e => e.FechaModificacion).HasColumnType("timestamp without time zone");
        });

        // T_Producto
        modelBuilder.Entity<TProducto>(entity =>
        {
            entity.ToTable("T_Producto");
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(256);
            entity.Property(e => e.Codigo).HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.Precio).HasColumnType("decimal(18,2)").HasDefaultValue(0m);
            entity.Property(e => e.Unidad).HasMaxLength(50).IsUnicode(false).HasDefaultValue("unidad");
            entity.Property(e => e.UsuarioCreacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.UsuarioModificacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.FechaCreacion).HasColumnType("timestamp without time zone");
            entity.Property(e => e.FechaModificacion).HasColumnType("timestamp without time zone");
            entity.HasOne(d => d.IdCategoriaNavigation).WithMany(p => p.TProducto)
                .HasForeignKey(d => d.IdCategoria).HasConstraintName("FK_T_Producto_T_ProductoCategoria");
        });

        // T_PipelineEtapa
        modelBuilder.Entity<TPipelineEtapa>(entity =>
        {
            entity.ToTable("T_PipelineEtapa");
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(128);
            entity.Property(e => e.Color).IsRequired().HasMaxLength(20).IsUnicode(false).HasDefaultValue("#3B82F6");
            entity.Property(e => e.UsuarioCreacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.UsuarioModificacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.FechaCreacion).HasColumnType("timestamp without time zone");
            entity.Property(e => e.FechaModificacion).HasColumnType("timestamp without time zone");
        });

        // T_Oportunidad
        modelBuilder.Entity<TOportunidad>(entity =>
        {
            entity.ToTable("T_Oportunidad");
            entity.Property(e => e.Titulo).IsRequired().HasMaxLength(256);
            entity.Property(e => e.MontoEstimado).HasColumnType("decimal(18,2)").HasDefaultValue(0m);
            entity.Property(e => e.Moneda).HasMaxLength(10).IsUnicode(false).HasDefaultValue("USD");
            entity.Property(e => e.Probabilidad).HasDefaultValue(50);
            entity.Property(e => e.FechaCierre).HasColumnType("timestamp without time zone");
            entity.Property(e => e.Origen).HasMaxLength(50).IsUnicode(false).HasDefaultValue("whatsapp");
            entity.Property(e => e.Prioridad).HasMaxLength(20).IsUnicode(false).HasDefaultValue("media");
            entity.Property(e => e.UsuarioCreacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.UsuarioModificacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.FechaCreacion).HasColumnType("timestamp without time zone");
            entity.Property(e => e.FechaModificacion).HasColumnType("timestamp without time zone");
            entity.HasOne(d => d.IdContactoNavigation).WithMany(p => p.TOportunidad)
                .HasForeignKey(d => d.IdContacto).HasConstraintName("FK_T_Oportunidad_T_Contacto");
            entity.HasOne(d => d.IdEmpresaNavigation).WithMany(p => p.TOportunidad)
                .HasForeignKey(d => d.IdEmpresa).HasConstraintName("FK_T_Oportunidad_T_Empresa");
            entity.HasOne(d => d.IdResponsableNavigation).WithMany()
                .HasForeignKey(d => d.IdResponsable).HasConstraintName("FK_T_Oportunidad_T_Usuario");
            entity.HasOne(d => d.IdEtapaNavigation).WithMany(p => p.TOportunidad)
                .HasForeignKey(d => d.IdEtapa).HasConstraintName("FK_T_Oportunidad_T_PipelineEtapa");
        });

        // T_OportunidadProducto
        modelBuilder.Entity<TOportunidadProducto>(entity =>
        {
            entity.ToTable("T_OportunidadProducto");
            entity.Property(e => e.Cantidad).HasColumnType("decimal(18,2)").HasDefaultValue(1m);
            entity.Property(e => e.PrecioUnitario).HasColumnType("decimal(18,2)").HasDefaultValue(0m);
            entity.Property(e => e.UsuarioCreacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.FechaCreacion).HasColumnType("timestamp without time zone");
            entity.HasOne(d => d.IdOportunidadNavigation).WithMany(p => p.TOportunidadProducto)
                .HasForeignKey(d => d.IdOportunidad).HasConstraintName("FK_T_OportunidadProducto_T_Oportunidad");
            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.TOportunidadProducto)
                .HasForeignKey(d => d.IdProducto).HasConstraintName("FK_T_OportunidadProducto_T_Producto");
        });

        // T_Actividad
        modelBuilder.Entity<TActividad>(entity =>
        {
            entity.ToTable("T_Actividad");
            entity.Property(e => e.Tipo).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.Titulo).IsRequired().HasMaxLength(256);
            entity.Property(e => e.EstadoActividad).HasMaxLength(20).IsUnicode(false).HasDefaultValue("pendiente");
            entity.Property(e => e.FechaActividad).HasColumnType("timestamp without time zone");
            entity.Property(e => e.UsuarioCreacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.UsuarioModificacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.FechaCreacion).HasColumnType("timestamp without time zone");
            entity.Property(e => e.FechaModificacion).HasColumnType("timestamp without time zone");
            entity.HasOne(d => d.IdResponsableNavigation).WithMany()
                .HasForeignKey(d => d.IdResponsable).HasConstraintName("FK_T_Actividad_T_Usuario");
            entity.HasOne(d => d.IdContactoNavigation).WithMany(p => p.TActividad)
                .HasForeignKey(d => d.IdContacto).HasConstraintName("FK_T_Actividad_T_Contacto");
            entity.HasOne(d => d.IdEmpresaNavigation).WithMany(p => p.TActividad)
                .HasForeignKey(d => d.IdEmpresa).HasConstraintName("FK_T_Actividad_T_Empresa");
            entity.HasOne(d => d.IdOportunidadNavigation).WithMany(p => p.TActividad)
                .HasForeignKey(d => d.IdOportunidad).HasConstraintName("FK_T_Actividad_T_Oportunidad");
        });

        // T_Plantilla
        modelBuilder.Entity<TPlantilla>(entity =>
        {
            entity.ToTable("T_Plantilla");
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(256);
            entity.Property(e => e.Categoria).HasMaxLength(100).IsUnicode(false).HasDefaultValue("general");
            entity.Property(e => e.Contenido).IsRequired();
            entity.Property(e => e.UsuarioCreacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.UsuarioModificacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.FechaCreacion).HasColumnType("timestamp without time zone");
            entity.Property(e => e.FechaModificacion).HasColumnType("timestamp without time zone");
        });

        // T_Campana
        modelBuilder.Entity<TCampana>(entity =>
        {
            entity.ToTable("T_Campana");
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(256);
            entity.Property(e => e.EstadoCampana).HasMaxLength(20).IsUnicode(false).HasDefaultValue("borrador");
            entity.Property(e => e.ProgramadaPara).HasColumnType("timestamp without time zone");
            entity.Property(e => e.UsuarioCreacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.UsuarioModificacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.FechaCreacion).HasColumnType("timestamp without time zone");
            entity.Property(e => e.FechaModificacion).HasColumnType("timestamp without time zone");
            entity.HasOne(d => d.IdPlantillaNavigation).WithMany()
                .HasForeignKey(d => d.IdPlantilla).HasConstraintName("FK_T_Campana_T_Plantilla");
        });

        // T_CampanaContacto
        modelBuilder.Entity<TCampanaContacto>(entity =>
        {
            entity.ToTable("T_CampanaContacto");
            entity.Property(e => e.FechaEnvio).HasColumnType("timestamp without time zone");
            entity.HasOne(d => d.IdCampanaNavigation).WithMany(p => p.TCampanaContacto)
                .HasForeignKey(d => d.IdCampana).HasConstraintName("FK_T_CampanaContacto_T_Campana");
            entity.HasOne(d => d.IdContactoNavigation).WithMany()
                .HasForeignKey(d => d.IdContacto).HasConstraintName("FK_T_CampanaContacto_T_Contacto");
        });

        // T_Encuesta
        modelBuilder.Entity<TEncuesta>(entity =>
        {
            entity.ToTable("T_Encuesta");
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(256);
            entity.Property(e => e.Categoria).HasMaxLength(100).IsUnicode(false).HasDefaultValue("general");
            entity.Property(e => e.UsuarioCreacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.UsuarioModificacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.FechaCreacion).HasColumnType("timestamp without time zone");
            entity.Property(e => e.FechaModificacion).HasColumnType("timestamp without time zone");
        });

        // T_EncuestaPregunta
        modelBuilder.Entity<TEncuestaPregunta>(entity =>
        {
            entity.ToTable("T_EncuestaPregunta");
            entity.Property(e => e.Texto).IsRequired();
            entity.Property(e => e.Tipo).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.HasOne(d => d.IdEncuestaNavigation).WithMany(p => p.TEncuestaPregunta)
                .HasForeignKey(d => d.IdEncuesta).HasConstraintName("FK_T_EncuestaPregunta_T_Encuesta");
        });

        // T_EncuestaEnvio
        modelBuilder.Entity<TEncuestaEnvio>(entity =>
        {
            entity.ToTable("T_EncuestaEnvio");
            entity.HasIndex(e => e.Token, "UQ_EncuestaEnvio_Token").IsUnique();
            entity.Property(e => e.Token).IsRequired().HasMaxLength(100).IsUnicode(false);
            entity.Property(e => e.EstadoEnvio).HasMaxLength(20).IsUnicode(false).HasDefaultValue("pendiente");
            entity.Property(e => e.FechaEnvio).HasColumnType("timestamp without time zone");
            entity.Property(e => e.FechaCompletado).HasColumnType("timestamp without time zone");
            entity.HasOne(d => d.IdEncuestaNavigation).WithMany(p => p.TEncuestaEnvio)
                .HasForeignKey(d => d.IdEncuesta).HasConstraintName("FK_T_EncuestaEnvio_T_Encuesta");
            entity.HasOne(d => d.IdContactoNavigation).WithMany()
                .HasForeignKey(d => d.IdContacto).HasConstraintName("FK_T_EncuestaEnvio_T_Contacto");
        });

        // T_EncuestaRespuesta
        modelBuilder.Entity<TEncuestaRespuesta>(entity =>
        {
            entity.ToTable("T_EncuestaRespuesta");
            entity.HasOne(d => d.IdEncuestaEnvioNavigation).WithMany(p => p.TEncuestaRespuesta)
                .HasForeignKey(d => d.IdEncuestaEnvio).HasConstraintName("FK_T_EncuestaRespuesta_T_EncuestaEnvio");
            entity.HasOne(d => d.IdPreguntaNavigation).WithMany(p => p.TEncuestaRespuesta)
                .HasForeignKey(d => d.IdPregunta).HasConstraintName("FK_T_EncuestaRespuesta_T_EncuestaPregunta");
        });

        // T_ConfiguracionSistema
        modelBuilder.Entity<TConfiguracionSistema>(entity =>
        {
            entity.ToTable("T_ConfiguracionSistema");
            entity.HasIndex(e => e.Clave, "UQ_ConfiguracionSistema_Clave").IsUnique();
            entity.Property(e => e.Clave).IsRequired().HasMaxLength(100).IsUnicode(false);
            entity.Property(e => e.Tipo).HasMaxLength(20).IsUnicode(false).HasDefaultValue("string");
            entity.Property(e => e.UsuarioModificacion).IsRequired().HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.FechaModificacion).HasColumnType("timestamp without time zone");
        });
    }
}

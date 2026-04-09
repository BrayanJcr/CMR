using CRM.WhatsappCola.DTOs.Base;
using CRM.WhatsappCola.Hubs;
using CRM.WhatsappCola.Models;
using CRM.WhatsappCola.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

// Npgsql 6+: permite DateTime con Kind=Local/Unspecified mapeado a timestamp sin zona horaria
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddScoped<TokenGeneradorService>();
var configuracionJwt = new ConfiguracionAutenticacionDTO();
builder.Configuration.Bind("JWTAuthentication", configuracionJwt);
builder.Services.AddSingleton<ConfiguracionAutenticacionDTO>(configuracionJwt);

builder.Services.Configure<FormOptions>(x =>
{
    x.ValueLengthLimit = int.MaxValue;
    x.MultipartBodyLengthLimit = int.MaxValue;
});

// JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuracionJwt.Secret)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddControllers(options =>
    options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true);
builder.Services.AddSignalR();
builder.Services.AddCors(options =>
{
    options.AddPolicy("UI-Angular", builder =>
    {
        builder.WithOrigins(
                    "http://localhost:4200",
                    "http://localhost:3000",
                    "http://localhost:3001",
                    "https://dev.ui.crm.clinicacayetanoheredia.com",
                    "https://uat.ui.crm.clinicacayetanoheredia.com")
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();  // requerido por SignalR WebSocket
    });
});

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
//builder.Services.AddSwaggerGen();
builder.Services.AddSwaggerGen(options =>
{
    options.MapType<DateOnly>(() => new OpenApiSchema
    {
        Type = "string",
        Format = "date"
    });
});

var dbProvider = builder.Configuration["DatabaseProvider"] ?? "SqlServer";
builder.Services.AddDbContext<WA_ColaContext>(options =>
{
    if (dbProvider == "PostgreSQL")
        options.UseNpgsql(builder.Configuration.GetConnectionString("PostgreSQL"));
    else
        options.UseSqlServer(builder.Configuration.GetConnectionString("SqlServer"));
});

var app = builder.Build();

// Inicializar HubContextHolder con los contextos del contenedor DI
HubContextHolder.ChatContext = app.Services.GetRequiredService<IHubContext<ChatHub>>();
HubContextHolder.QrContext   = app.Services.GetRequiredService<IHubContext<QrHub>>();

// Configure the HTTP request pipeline.
//if (app.Environment.IsDevelopment())
//{
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "V1");
    c.RoutePrefix = "api-documentacion";
});
//}

app.UseHttpsRedirection();

app.UseCors("UI-Angular");

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/hub-chat");
app.MapHub<QrHub>("/hub-qr");

app.Run();

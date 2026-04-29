using System.Text;
using GarageSystem.Api.Extensions;
using GarageSystem.Api.Hubs;
using GarageSystem.Api.Middleware;
using GarageSystem.Infrastructure.Identity;
using GarageSystem.Infrastructure.Persistence;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using QuestPDF.Infrastructure;
using Serilog;


//// Treat DateTime with Kind=Unspecified as UTC globally (Npgsql 6+)
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

QuestPDF.Settings.License = LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

// ── Serilog ──────────────────────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithEnvironmentName()
    .Enrich.WithProperty("Application", "GarageSystem")
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

// ── EF Core ───────────────────────────────────────────────────────────────────
var connStr = builder.Configuration["Database:ConnectionString"]
    ?? builder.Configuration.GetConnectionString("Default")!;

builder.Services.AddDbContext<ApplicationDbContext>(opt =>
    opt.UseNpgsql(connStr)
       .UseSnakeCaseNamingConvention());

// ── Identity ──────────────────────────────────────────────────────────────────
builder.Services.AddIdentity<AppUser, AppRole>(opt =>
{
    opt.Password.RequireDigit = true;
    opt.Password.RequiredLength = 8;
    opt.Password.RequireUppercase = false;
    opt.Password.RequireNonAlphanumeric = false;
    opt.Lockout.AllowedForNewUsers = false;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// ── JWT ───────────────────────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"]!;
builder.Services.AddAuthentication(opt =>
{
    opt.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    opt.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(opt =>
{
    opt.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer           = true,
        ValidateAudience         = true,
        ValidateLifetime         = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer              = builder.Configuration["Jwt:Issuer"],
        ValidAudience            = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ClockSkew                = TimeSpan.Zero,
    };
    // SignalR : token via query string
    opt.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            var token = ctx.Request.Query["access_token"];
            if (!string.IsNullOrEmpty(token) && ctx.Request.Path.StartsWithSegments("/hubs"))
                ctx.Token = token;
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// ── Maintenance config ────────────────────────────────────────────────────────
builder.Services.Configure<GarageSystem.Domain.Services.Maintenance.MaintenanceConfig>(
    builder.Configuration.GetSection("Maintenance"));

// ── Garage config (pour PDF) ──────────────────────────────────────────────────
builder.Services.Configure<GarageSystem.Api.Services.GarageConfig>(
    builder.Configuration.GetSection("Garage"));

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<GarageSystem.Infrastructure.Persistence.DatabaseSeeder>();
builder.Services.AddApplicationServices();   // OrdreReparationService + IMemoryCache

// ── SignalR ───────────────────────────────────────────────────────────────────
builder.Services.AddSignalR();

// ── Hangfire ──────────────────────────────────────────────────────────────────
builder.Services.AddHangfire(cfg => cfg
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(opt => opt.UseNpgsqlConnection(connStr)));
builder.Services.AddHangfireServer();

// ── Health Checks ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>(name: "database");

// ── CORS ──────────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p => p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

builder.Services.AddControllers()
    .AddJsonOptions(opt =>
        opt.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<OrdresHub>("/hubs/ordres");        // SignalR — Kanban temps réel
app.MapHealthChecks("/health");
app.MapHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = [] // TODO: ajouter auth admin
});

// ── Auto-migration au démarrage ───────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await db.Database.MigrateAsync();

    // Enregistrement des jobs Hangfire récurrents
    GarageSystem.Api.Extensions.ServiceExtensions.ConfigureHangfireJobs();

    // Seed rôles + utilisateur admin par défaut
    await scope.ServiceProvider
        .GetRequiredService<GarageSystem.Infrastructure.Persistence.DatabaseSeeder>()
        .SeedAsync();
}

app.Run();

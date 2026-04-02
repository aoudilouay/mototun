using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Tokens;
using mototun.Core.Entities;
using mototun.Core.Enums;
using mototun.Infrastructure.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;

namespace mototun.API.IntegrationTests;

public sealed class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    public const int RevendeurUserId = 1001;
    public const int FournisseurUserId = 1002;
    public const int AdminUserId = 1003;
    public const int RevendeurId = 2001;
    public const int FournisseurId = 2002;
    public const int ClientId = 3001;
    public const int InvoiceId = 4001;
    public const string ClientPortalAccessCode = "A1B2C3D4E5F60718293A4B5C6D7E8F90";

    private const string JwtSecret = "MototunSecretKey2026VerySecureAndLongEnoughForProductionUse!";
    private const string JwtIssuer = "MototunAPI";
    private const string JwtAudience = "MototunClient";

    private readonly string _dbName = $"mototun-api-tests-{Guid.NewGuid():N}";
    private readonly Action<IServiceCollection>? _configureAdditionalServices;

    public TestWebApplicationFactory(Action<IServiceCollection>? configureAdditionalServices = null)
    {
        _configureAdditionalServices = configureAdditionalServices;
    }

    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        Environment.SetEnvironmentVariable("JwtSettings__SecretKey", JwtSecret);
        Environment.SetEnvironmentVariable("JwtSettings__Issuer", JwtIssuer);
        Environment.SetEnvironmentVariable("JwtSettings__Audience", JwtAudience);
        Environment.SetEnvironmentVariable("Database__EnableInMemoryFallback", "false");

        builder.UseEnvironment("Development");

        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JwtSettings:SecretKey"] = JwtSecret,
                ["JwtSettings:Issuer"] = JwtIssuer,
                ["JwtSettings:Audience"] = JwtAudience,
                ["ConnectionStrings:DefaultConnection"] = "Server=(localdb)\\mssqllocaldb;Database=mototun_dummy;Trusted_Connection=True;TrustServerCertificate=True"
            });
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll(typeof(DbContextOptions<ApplicationDbContext>));

            services.AddDbContext<ApplicationDbContext>(options =>
                options
                    .UseInMemoryDatabase(_dbName)
                    .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning)));

            _configureAdditionalServices?.Invoke(services);

            using var scope = services.BuildServiceProvider().CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Database.EnsureDeleted();
            db.Database.EnsureCreated();
            Seed(db);
        });
    }

    public HttpClient CreateAuthenticatedClient(int userId, UserRole role)
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var token = BuildJwt(userId, role);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private static string BuildJwt(int userId, UserRole role)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, role.ToString()),
            new Claim(ClaimTypes.Name, $"test-user-{userId}")
        };

        var token = new JwtSecurityToken(
            issuer: JwtIssuer,
            audience: JwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static void Seed(ApplicationDbContext db)
    {
        var now = DateTime.UtcNow;

        db.Users.AddRange(
            new User
            {
                Id = RevendeurUserId,
                Email = "revendeur.integration@mototun.test",
                PasswordHash = "hash",
                FullName = "Revendeur Integration",
                Role = UserRole.Revendeur,
                Status = UserStatus.Active,
                CanLogin = true,
                CreatedAt = now,
                UpdatedAt = now
            },
            new User
            {
                Id = FournisseurUserId,
                Email = "fournisseur.integration@mototun.test",
                PasswordHash = "hash",
                FullName = "Fournisseur Integration",
                Role = UserRole.Fournisseur,
                Status = UserStatus.Active,
                CanLogin = true,
                CreatedAt = now,
                UpdatedAt = now
            },
            new User
            {
                Id = AdminUserId,
                Email = "admin.integration@mototun.test",
                PasswordHash = "hash",
                FullName = "Admin Integration",
                Role = UserRole.Admin,
                Status = UserStatus.Active,
                CanLogin = true,
                CreatedAt = now,
                UpdatedAt = now
            });

        db.Revendeurs.Add(new Revendeur
        {
            Id = RevendeurId,
            UserId = RevendeurUserId,
            BusinessName = "Revendeur Integration SARL",
            TaxId = "RV-TAX-0001",
            Address = "Adresse Revendeur",
            City = "Tunis",
            CreatedAt = now
        });

        db.Fournisseurs.Add(new Fournisseur
        {
            Id = FournisseurId,
            UserId = FournisseurUserId,
            BusinessName = "Fournisseur Integration SARL",
            TaxId = "FR-TAX-0001",
            Address = "Adresse Fournisseur",
            City = "Sfax",
            CreatedAt = now
        });

        db.Clients.Add(new Client
        {
            Id = ClientId,
            RevendeurId = RevendeurId,
            FullName = "Client Integration",
            CIN = "CIN-INT-0001",
            Email = "client.integration@mototun.test",
            Phone = "55000000",
            Address = "Adresse Client",
            City = "Sousse",
            Status = ClientStatus.Active,
            CreatedAt = now
        });

        db.Invoices.Add(new Invoice
        {
            Id = InvoiceId,
            RevendeurId = RevendeurId,
            ClientId = ClientId,
            AssignedFournisseurId = FournisseurId,
            InvoiceNumber = "INV-INTEGRATION-001",
            ClientPortalAccessCode = ClientPortalAccessCode,
            InvoiceDate = now.Date,
            Status = InvoiceStatus.Paid,
            CarteGriseStatus = CarteGriseStatus.DocumentsReceived,
            SentToFournisseurAt = now.AddHours(-2),
            TotalAmount = 25000m,
            CreatedAt = now.AddHours(-3),
            UpdatedAt = now.AddHours(-1)
        });

        db.SoldMotorcycles.Add(new SoldMotorcycle
        {
            Id = 5001,
            RevendeurId = RevendeurId,
            InvoiceId = InvoiceId,
            Company = "Honda",
            Brand = "CB",
            Model = "CB500F",
            ChassisNumber = "CHASSIS-INT-001",
            EngineNumber = "ENGINE-INT-001",
            Matricule = "123TU456",
            PurchasePrice = 20000m,
            SalePrice = 25000m,
            CreatedAt = now.AddHours(-3)
        });

        db.SaveChanges();
    }
}

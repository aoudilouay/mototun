using mototun.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace mototun.Infrastructure.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Revendeur> Revendeurs { get; set; }
        public DbSet<Fournisseur> Fournisseurs { get; set; }
        public DbSet<Client> Clients { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);

    // User Configuration
    modelBuilder.Entity<User>(entity =>
    {
        entity.HasKey(e => e.Id);
        entity.HasIndex(e => e.Email).IsUnique();
        entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
        entity.Property(e => e.FullName).IsRequired().HasMaxLength(255);
        entity.Property(e => e.PasswordHash).IsRequired().HasMaxLength(500);
        entity.Property(e => e.Phone).HasMaxLength(50);
        entity.Property(e => e.Avatar).HasMaxLength(500);
        entity.Property(e => e.Role).HasConversion<int>();
        entity.Property(e => e.Status).HasConversion<int>();
        entity.HasIndex(e => e.Role);
        entity.HasIndex(e => e.Status);
        entity.HasIndex(e => e.CreatedAt);
    });

    // Revendeur Configuration
    modelBuilder.Entity<Revendeur>(entity =>
    {
        entity.HasKey(e => e.Id);
        entity.HasIndex(e => e.TaxId).IsUnique();
        
        entity.HasOne(e => e.User)
            .WithOne(u => u.RevendeurProfile)
            .HasForeignKey<Revendeur>(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict); // Changed from Cascade
        
        entity.Property(e => e.BusinessName).IsRequired().HasMaxLength(255);
        entity.Property(e => e.TaxId).IsRequired().HasMaxLength(50);
        entity.Property(e => e.Address).HasMaxLength(500);
        entity.Property(e => e.City).HasMaxLength(100);
        entity.Property(e => e.PostalCode).HasMaxLength(20);
        entity.Property(e => e.RegistrationNumber).HasMaxLength(100);
        entity.HasIndex(e => e.City);
        entity.HasIndex(e => e.CreatedAt);
    });

    // Fournisseur Configuration
    modelBuilder.Entity<Fournisseur>(entity =>
    {
        entity.HasKey(e => e.Id);
        entity.HasIndex(e => e.TaxId).IsUnique();
        
        entity.HasOne(e => e.User)
            .WithOne(u => u.FournisseurProfile)
            .HasForeignKey<Fournisseur>(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict); // Changed from Cascade
        
        entity.Property(e => e.BusinessName).IsRequired().HasMaxLength(255);
        entity.Property(e => e.TaxId).IsRequired().HasMaxLength(50);
        entity.Property(e => e.Address).HasMaxLength(500);
        entity.Property(e => e.City).HasMaxLength(100);
        entity.Property(e => e.RegistrationNumber).HasMaxLength(100);
        entity.HasIndex(e => e.City);
        entity.HasIndex(e => e.CreatedAt);
    });

    // Client Configuration
    modelBuilder.Entity<Client>(entity =>
    {
        entity.HasKey(e => e.Id);
        entity.HasIndex(e => e.CIN).IsUnique();
        
        entity.HasOne(e => e.User)
            .WithOne(u => u.ClientProfile)
            .HasForeignKey<Client>(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict); // Changed from Cascade

        entity.HasOne(e => e.Revendeur)
            .WithMany()
            .HasForeignKey(e => e.RevendeurId)
            .OnDelete(DeleteBehavior.SetNull);
        
        entity.Property(e => e.CIN).IsRequired().HasMaxLength(50);
        entity.Property(e => e.Address).HasMaxLength(500);
        entity.Property(e => e.City).HasMaxLength(100);
        entity.HasIndex(e => e.City);
        entity.HasIndex(e => e.RevendeurId);
        entity.HasIndex(e => e.CreatedAt);
    });
}

    }
}

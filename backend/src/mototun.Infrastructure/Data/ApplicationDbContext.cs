using Microsoft.EntityFrameworkCore;
using mototun.Core.Entities;

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
        public DbSet<RevendeurInvoiceSettings> RevendeurInvoiceSettings { get; set; }
        public DbSet<Fournisseur> Fournisseurs { get; set; }
        public DbSet<Client> Clients { get; set; }
        public DbSet<Motorcycle> Motorcycles { get; set; }
        public DbSet<Invoice> Invoices { get; set; }
        public DbSet<InvoiceTimelineEvent> InvoiceTimelineEvents { get; set; }
        public DbSet<SoldMotorcycle> SoldMotorcycles { get; set; }
        public DbSet<ClientPortalDocument> ClientPortalDocuments { get; set; }
        public DbSet<RevendeurFournisseurConnection> RevendeurFournisseurConnections { get; set; }
        public DbSet<NotificationState> NotificationStates { get; set; }
        public DbSet<RevendeurSettings> RevendeurSettings { get; set; }
        public DbSet<SupportTicket> SupportTickets { get; set; }
        public DbSet<SupportTicketMessage> SupportTicketMessages { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.HasIndex(e => e.GoogleSubject).IsUnique().HasFilter("[GoogleSubject] IS NOT NULL");
                entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
                entity.Property(e => e.FullName).IsRequired().HasMaxLength(255);
                entity.Property(e => e.PasswordHash).IsRequired().HasMaxLength(500);
                entity.Property(e => e.Phone).HasMaxLength(50);
                entity.Property(e => e.Avatar).HasMaxLength(500);
                entity.Property(e => e.PasswordResetTokenHash).HasMaxLength(128);
                entity.Property(e => e.GoogleSubject).HasMaxLength(255);
                entity.Property(e => e.Role).HasConversion<int>();
                entity.Property(e => e.Status).HasConversion<int>();
                entity.HasIndex(e => e.Role);
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.CreatedAt);
                entity.HasIndex(e => e.PasswordResetTokenHash);
                entity.HasIndex(e => e.LockoutEndAt);
            });

            modelBuilder.Entity<Revendeur>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TaxId).IsUnique();

                entity.HasOne(e => e.User)
                    .WithOne(u => u.RevendeurProfile)
                    .HasForeignKey<Revendeur>(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.Property(e => e.BusinessName).IsRequired().HasMaxLength(255);
                entity.Property(e => e.TaxId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Address).HasMaxLength(500);
                entity.Property(e => e.City).HasMaxLength(100);
                entity.Property(e => e.PostalCode).HasMaxLength(20);
                entity.Property(e => e.RegistrationNumber).HasMaxLength(100);
                entity.HasIndex(e => e.City);
                entity.HasIndex(e => e.CreatedAt);
            });

            modelBuilder.Entity<RevendeurSettings>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.Revendeur)
                    .WithOne(r => r.Settings)
                    .HasForeignKey<RevendeurSettings>(e => e.RevendeurId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.Property(e => e.PlanTier).HasConversion<int>();
                entity.HasIndex(e => e.RevendeurId).IsUnique();
                entity.HasIndex(e => e.PlanTier);
                entity.HasIndex(e => e.UpdatedAt);
            });

            modelBuilder.Entity<RevendeurInvoiceSettings>(entity =>
            {
                entity.HasKey(e => e.RevendeurId);

                entity.HasOne(e => e.Revendeur)
                    .WithOne()
                    .HasForeignKey<RevendeurInvoiceSettings>(e => e.RevendeurId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.Property(e => e.CompanyName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.LogoImage).IsRequired(false);
                entity.Property(e => e.SignatureImage).IsRequired(false);
            });

            modelBuilder.Entity<Fournisseur>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TaxId).IsUnique();

                entity.HasOne(e => e.User)
                    .WithOne(u => u.FournisseurProfile)
                    .HasForeignKey<Fournisseur>(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.Property(e => e.BusinessName).IsRequired().HasMaxLength(255);
                entity.Property(e => e.TaxId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Address).HasMaxLength(500);
                entity.Property(e => e.City).HasMaxLength(100);
                entity.Property(e => e.RegistrationNumber).HasMaxLength(100);
                entity.HasIndex(e => e.City);
                entity.HasIndex(e => e.CreatedAt);
            });

            modelBuilder.Entity<Client>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.CIN).IsUnique();

                entity.HasOne(e => e.Revendeur)
                    .WithMany()
                    .HasForeignKey(e => e.RevendeurId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.Property(e => e.FullName).IsRequired().HasMaxLength(255);
                entity.Property(e => e.Email).HasMaxLength(255);
                entity.Property(e => e.Phone).HasMaxLength(50);
                entity.Property(e => e.CIN).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Address).HasMaxLength(500);
                entity.Property(e => e.City).HasMaxLength(100);
                entity.Property(e => e.Status).HasConversion<int>();
                entity.HasIndex(e => e.FullName);
                entity.HasIndex(e => e.Email);
                entity.HasIndex(e => e.City);
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.RevendeurId);
                entity.HasIndex(e => e.CreatedAt);
            });

            modelBuilder.Entity<Motorcycle>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.Revendeur)
                    .WithMany()
                    .HasForeignKey(e => e.RevendeurId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.Property(e => e.Company).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Brand).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Model).IsRequired().HasMaxLength(150);
                entity.Property(e => e.PurchasePrice).HasColumnType("decimal(18,2)");
                entity.Property(e => e.SalePrice).HasColumnType("decimal(18,2)");

                entity.HasIndex(e => e.RevendeurId);
                entity.HasIndex(e => e.Company);
                entity.HasIndex(e => e.Brand);
            });

            modelBuilder.Entity<Invoice>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.Revendeur)
                    .WithMany()
                    .HasForeignKey(e => e.RevendeurId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Client)
                    .WithMany()
                    .HasForeignKey(e => e.ClientId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.AssignedFournisseur)
                    .WithMany()
                    .HasForeignKey(e => e.AssignedFournisseurId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasMany(e => e.SoldMotorcycles)
                    .WithOne(e => e.Invoice)
                    .HasForeignKey(e => e.InvoiceId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.ClientPortalDocuments)
                    .WithOne(e => e.Invoice)
                    .HasForeignKey(e => e.InvoiceId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.TimelineEvents)
                    .WithOne(e => e.Invoice)
                    .HasForeignKey(e => e.InvoiceId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.Property(e => e.InvoiceNumber).IsRequired().HasMaxLength(64);
                entity.Property(e => e.ClientPortalAccessCode).IsRequired().HasMaxLength(64);
                entity.Property(e => e.Status).HasConversion<int>();
                entity.Property(e => e.CarteGriseStatus).HasConversion<int>();
                entity.Property(e => e.TotalAmount).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Notes).HasMaxLength(2000);
                entity.Property(e => e.DocumentIssueMessage).HasMaxLength(2000);
                entity.Property(e => e.DocumentIssueReasonsJson).HasMaxLength(2000);
                entity.Property(e => e.DocumentFixChecklistJson).HasMaxLength(4000);
                entity.Property(e => e.ClientUpdateMessage).HasMaxLength(2000);

                entity.HasIndex(e => new { e.RevendeurId, e.InvoiceNumber }).IsUnique();
                entity.HasIndex(e => e.ClientPortalAccessCode).IsUnique();
                entity.HasIndex(e => e.AssignedFournisseurId);
                entity.HasIndex(e => e.InvoiceDate);
                entity.HasIndex(e => e.CreatedAt);
            });

            modelBuilder.Entity<InvoiceTimelineEvent>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.EventType).HasConversion<int>();
                entity.Property(e => e.ActorRole).HasConversion<int>();
                entity.Property(e => e.Title).IsRequired().HasMaxLength(160);
                entity.Property(e => e.Message).IsRequired().HasMaxLength(2000);

                entity.HasIndex(e => e.InvoiceId);
                entity.HasIndex(e => new { e.InvoiceId, e.CreatedAt });
                entity.HasIndex(e => e.EventType);
                entity.HasIndex(e => e.CreatedAt);
            });

            modelBuilder.Entity<SoldMotorcycle>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.Revendeur)
                    .WithMany()
                    .HasForeignKey(e => e.RevendeurId)
                    .OnDelete(DeleteBehavior.NoAction);

                entity.HasOne(e => e.StockMotorcycle)
                    .WithMany()
                    .HasForeignKey(e => e.StockMotorcycleId)
                    .OnDelete(DeleteBehavior.NoAction);

                entity.Property(e => e.Company).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Brand).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Model).IsRequired().HasMaxLength(150);
                entity.Property(e => e.ChassisNumber).IsRequired().HasMaxLength(120);
                entity.Property(e => e.EngineNumber).HasMaxLength(120);
                entity.Property(e => e.Matricule).HasMaxLength(120);
                entity.Property(e => e.PurchasePrice).HasColumnType("decimal(18,2)");
                entity.Property(e => e.SalePrice).HasColumnType("decimal(18,2)");

                entity.HasIndex(e => new { e.RevendeurId, e.ChassisNumber }).IsUnique();
                entity.HasIndex(e => e.InvoiceId);
                entity.HasIndex(e => e.StockMotorcycleId);
            });

            modelBuilder.Entity<ClientPortalDocument>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.DocumentType).HasConversion<int>();
                entity.Property(e => e.OriginalFileName).IsRequired().HasMaxLength(255);
                entity.Property(e => e.StoredFileName).IsRequired().HasMaxLength(255);
                entity.Property(e => e.ContentType).IsRequired().HasMaxLength(255);
                entity.Property(e => e.RelativePath).IsRequired().HasMaxLength(500);

                entity.HasIndex(e => e.InvoiceId);
                entity.HasIndex(e => new { e.InvoiceId, e.DocumentType }).IsUnique();
            });

            modelBuilder.Entity<NotificationState>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.Revendeur)
                    .WithMany()
                    .HasForeignKey(e => e.RevendeurId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.Property(e => e.NotificationId).IsRequired().HasMaxLength(200);

                entity.HasIndex(e => new { e.RevendeurId, e.NotificationId }).IsUnique();
                entity.HasIndex(e => new { e.RevendeurId, e.IsRead, e.IsDismissed });
                entity.HasIndex(e => e.UpdatedAt);
            });

            modelBuilder.Entity<RevendeurFournisseurConnection>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.Revendeur)
                    .WithMany()
                    .HasForeignKey(e => e.RevendeurId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Fournisseur)
                    .WithMany()
                    .HasForeignKey(e => e.FournisseurId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.Property(e => e.Status).HasConversion<int>();
                entity.Property(e => e.RequestedByRole).HasConversion<int>();
                entity.Property(e => e.RejectReason).HasMaxLength(1000);

                entity.HasIndex(e => new { e.RevendeurId, e.FournisseurId }).IsUnique();
                entity.HasIndex(e => new { e.RevendeurId, e.Status });
                entity.HasIndex(e => new { e.FournisseurId, e.Status });
                entity.HasIndex(e => e.UpdatedAt);
            });

            modelBuilder.Entity<SupportTicket>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.AssignedAdminUser)
                    .WithMany()
                    .HasForeignKey(e => e.AssignedAdminUserId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasMany(e => e.Messages)
                    .WithOne(e => e.Ticket)
                    .HasForeignKey(e => e.SupportTicketId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.Property(e => e.TicketNumber).IsRequired().HasMaxLength(32);
                entity.Property(e => e.Subject).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Category).IsRequired().HasMaxLength(80);
                entity.Property(e => e.Priority).HasConversion<int>();
                entity.Property(e => e.Status).HasConversion<int>();

                entity.HasIndex(e => e.TicketNumber).IsUnique();
                entity.HasIndex(e => e.CreatedByUserId);
                entity.HasIndex(e => e.AssignedAdminUserId);
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.Priority);
                entity.HasIndex(e => e.LastMessageAt);
                entity.HasIndex(e => e.CreatedAt);
            });

            modelBuilder.Entity<SupportTicketMessage>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.SenderUser)
                    .WithMany()
                    .HasForeignKey(e => e.SenderUserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.Property(e => e.SenderRole).HasConversion<int>();
                entity.Property(e => e.Body).IsRequired().HasMaxLength(3000);

                entity.HasIndex(e => e.SupportTicketId);
                entity.HasIndex(e => new { e.SupportTicketId, e.CreatedAt });
                entity.HasIndex(e => e.SenderUserId);
                entity.HasIndex(e => e.CreatedAt);
            });
        }
    }
}

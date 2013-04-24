using System.ComponentModel.DataAnnotations.Schema;
using System.Data.Entity;

namespace Inheritance.Models
{
    public class InheritanceContext : DbContext
    {
        // DEVELOPMENT ONLY: initialize the database
        static InheritanceContext()
        {
            Database.SetInitializer(new InheritanceDbInitializer());
        }

        public static string ContextName { get { return "InheritanceContext"; } }

        public InheritanceContext() : base(ContextName)
        {
            // Disable proxy creation and lazy loading; not wanted in this service context.
            Configuration.ProxyCreationEnabled = false;
            Configuration.LazyLoadingEnabled = false;
        }
        protected override void OnModelCreating(DbModelBuilder modelBuilder){

            // TPHs
            modelBuilder.Entity<BillingDetailTPH>()
                .Map<BankAccountTPH>(m => m.Requires("BillingDetailType").HasValue("BA"))
                .Map<CreditCardTPH>(m => m.Requires("BillingDetailType").HasValue("CC"));

            // TPTs
            modelBuilder.Entity<BankAccountTPT>().ToTable("BankAccountTPTs");
            modelBuilder.Entity<CreditCardTPT>().ToTable("CreditCardTPTs");

            // TPCs
            modelBuilder.Entity<BillingDetailTPC>()
            // Client must set the ID.
            // Why? See http://weblogs.asp.net/manavi/archive/2011/01/03/inheritance-mapping-strategies-with-entity-framework-code-first-ctp5-part-3-table-per-concrete-type-tpc-and-choosing-strategy-guidelines.aspx
                        .Property(p => p.Id)
                        .HasDatabaseGeneratedOption(DatabaseGeneratedOption.None);

            modelBuilder.Entity<BankAccountTPC>().Map(m =>
            {
                m.MapInheritedProperties();
                m.ToTable("BankAccountTPCs");
            });

            modelBuilder.Entity<CreditCardTPC>().Map(m =>
            {
                m.MapInheritedProperties();
                m.ToTable("CreditCardsTPCs");
            }); 
           
            modelBuilder.Entity<AccountType>()
                        .Property(p => p.Id)
                        .HasDatabaseGeneratedOption(DatabaseGeneratedOption.None);
        }

        public DbSet<AccountType> AccountTypes { get; set; }

        public DbSet<BillingDetailTPH> BillingDetailTPHs { get; set; }
        public DbSet<BillingDetailTPT> BillingDetailTPTs { get; set; }
        public DbSet<BillingDetailTPC> BillingDetailTPCs { get; set; }

        // Public for initializer; should not expose to client in Web API controller
        public DbSet<DepositTPH> DepositTPHs { get; set; }
        public DbSet<DepositTPT> DepositTPTs { get; set; }
        public DbSet<DepositTPC> DepositTPCs { get; set; }
    }
}


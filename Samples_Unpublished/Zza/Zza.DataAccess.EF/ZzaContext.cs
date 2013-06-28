using System.ComponentModel.DataAnnotations.Schema;
using System.Data.Entity;
using System.Data.Entity.ModelConfiguration.Conventions;
using Zza.Model;

namespace Zza.DataAccess.EF
{
    public class ZzaContext : DbContext
    {
        static ZzaContext()
        {
            Database.SetInitializer<ZzaContext>(null);
        }

        public static string ContextName { get { return "ZzaContextEf"; } }

        public ZzaContext() : base(ContextName)
        {
            // Disable proxy creation and lazy loading; not wanted in this service context.
            Configuration.ProxyCreationEnabled = false;
            Configuration.LazyLoadingEnabled = false;
        }
        protected override void OnModelCreating(DbModelBuilder modelBuilder)
        {
            // Table names match entity names by default (don't pluralize)
            modelBuilder.Conventions.Remove<PluralizingTableNameConvention>();
            // Globally disable the convention for cascading deletes
            modelBuilder.Conventions.Remove<OneToManyCascadeDeleteConvention>(); 

            modelBuilder.Entity<Customer>()
                        .Property(c => c.Id) // Client must set the ID.
                        .HasDatabaseGeneratedOption(DatabaseGeneratedOption.None);
        }

        public DbSet<Customer> Customers { get; set; }
        public DbSet<Order> Orders { get; set; }
        internal DbSet<OrderItem> OrderItems { get; set; }
        internal DbSet<OrderItemOption> OrderItemOptions { get; set; }
        public DbSet<OrderStatus> OrderStatuses { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<ProductOption> ProductOptions { get; set; }
        public DbSet<ProductSize> ProductSizes { get; set; }
    }
}


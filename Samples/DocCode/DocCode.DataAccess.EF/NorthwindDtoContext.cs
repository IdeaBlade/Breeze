using System.ComponentModel.DataAnnotations.Schema;
using System.Data.Entity;
using System.Data.Entity.ModelConfiguration.Conventions;

namespace Northwind.DtoModels
{
    public class NorthwindDtoContext : DbContext
    {
        static NorthwindDtoContext()
        {
            // Prevent attempt to initialize a database for this context
            Database.SetInitializer<NorthwindDtoContext>(null);
        }

        private const string _contextName = "NorthwindDtoContext";

        public static string ContextName { get { return _contextName; } }

        public NorthwindDtoContext() : base(ContextName)
        {
            // Disable proxy creation and lazy loading; not wanted in this service context.
            Configuration.ProxyCreationEnabled = false;
            Configuration.LazyLoadingEnabled = false;
        }

        protected override void OnModelCreating(DbModelBuilder modelBuilder)
        {
            // Table names match entity names by default (don't pluralize)
            modelBuilder.Conventions.Remove<PluralizingTableNameConvention>();

            modelBuilder.Configurations.Add(new CustomerDtoConfiguration());
            modelBuilder.Configurations.Add(new OrderDtoConfiguration());
            modelBuilder.Configurations.Add(new OrderDetailDtoConfiguration());
            modelBuilder.Configurations.Add(new ProductDtoConfiguration());
        }

        // Dto versions of these classes
        public DbSet<Customer> Customers { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<Product> Products { get; set; }
    }
}


#region EntityType Configurations

namespace Northwind.DtoModels
{
    using System.Data.Entity.ModelConfiguration;

    public class CustomerDtoConfiguration : EntityTypeConfiguration<Customer>
    {
        public CustomerDtoConfiguration()
        {
            HasKey(c => new { c.CustomerID});
            Property(c => c.CustomerID)
                .HasDatabaseGeneratedOption(DatabaseGeneratedOption.None);
        }
    }

    public class OrderDtoConfiguration : EntityTypeConfiguration<Order>
    {
        public OrderDtoConfiguration()
        {
            HasKey(o => new { o.OrderID });

            HasOptional(o => o.Customer).WithMany(c => c.Orders).HasForeignKey(o => o.CustomerID);
            Ignore(o => o.UserSessionId);
        }
    }

    public class OrderDetailDtoConfiguration : EntityTypeConfiguration<OrderDetail>
    {
        public OrderDetailDtoConfiguration()
        {
            HasKey(od => new { od.OrderID, od.ProductID });
            Property(od => od.OrderID)
                .HasDatabaseGeneratedOption(DatabaseGeneratedOption.None);
            Property(od => od.ProductID)
                .HasDatabaseGeneratedOption(DatabaseGeneratedOption.None);

            HasRequired(od => od.Product).WithMany().HasForeignKey(od => od.ProductID);
            HasRequired(od => od.Order).WithMany(o => o.OrderDetails).HasForeignKey(od => od.OrderID);
        }
    }

    public class ProductDtoConfiguration : EntityTypeConfiguration<Product>
    {
        public ProductDtoConfiguration()
        {
            HasKey(p => new { p.ProductID });
        }
    }
}

#endregion

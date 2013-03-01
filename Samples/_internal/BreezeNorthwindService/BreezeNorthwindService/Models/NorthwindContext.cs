using System.ComponentModel.DataAnnotations.Schema;
using System.Data.Entity;
using System.Data.Entity.ModelConfiguration.Conventions;

namespace NWS.Models
{
    public class NorthwindContext : DbContext
    {
        private const string _contextName = "NorthwindContext";

        public static string ContextName { get { return _contextName; } }

        public NorthwindContext() : base(ContextName)
        {
            // Disable proxy creation and lazy loading; not wanted in this service context.
            Configuration.ProxyCreationEnabled = false;
            Configuration.LazyLoadingEnabled = false;
        }

        protected override void OnModelCreating(DbModelBuilder modelBuilder)
        {
            // Table names match entity names by default (don't pluralize)
            modelBuilder.Conventions.Remove<PluralizingTableNameConvention>();

            modelBuilder.Configurations.Add(new CustomerConfiguration());
            modelBuilder.Configurations.Add(new OrderDetailConfiguration());
            modelBuilder.Configurations.Add(new PreviousEmployeeConfiguration());
        }

        #region DbSets

        public DbSet<Category> Categories { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<Employee> Employees { get; set; }
        public DbSet<EmployeeTerritory> EmployeeTerritories { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderDetail> OrderDetails { get; set; }
        public DbSet<PreviousEmployee> PreviousEmployees { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Region> Regions { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Supplier> Suppliers { get; set; }
        public DbSet<Territory> Territories { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<UserRole> UserRoles { get; set; }
        public DbSet<InternationalOrder> InternationalOrders { get; set; }

        #endregion EntityQueries
    }
}


#region EntityType Configurations

namespace NWS.Models
{
    using System.Data.Entity.ModelConfiguration;

    public class CustomerConfiguration : EntityTypeConfiguration<Customer>
    {
        public CustomerConfiguration()
        {
            Property(o => o.CustomerID)
                .HasDatabaseGeneratedOption(DatabaseGeneratedOption.Identity);
        }
    }

    public class OrderDetailConfiguration : EntityTypeConfiguration<OrderDetail>
    {
        public OrderDetailConfiguration()
        {
            HasKey(od => new {od.OrderID, od.ProductID});
            Property(od => od.OrderID)
                .HasDatabaseGeneratedOption(DatabaseGeneratedOption.None);
            Property(od => od.ProductID)
                .HasDatabaseGeneratedOption(DatabaseGeneratedOption.None);
        }
    }

    public class PreviousEmployeeConfiguration : EntityTypeConfiguration<PreviousEmployee>
    {
        public PreviousEmployeeConfiguration()
        {
            HasKey(e => new { e.EmployeeID });
            Property(e => e.EmployeeID)
                .HasDatabaseGeneratedOption(DatabaseGeneratedOption.None);
        }
    }
}

#endregion

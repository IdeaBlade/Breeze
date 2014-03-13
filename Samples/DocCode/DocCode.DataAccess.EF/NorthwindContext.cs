using System.ComponentModel.DataAnnotations.Schema;
using System.Data.Entity;
using System.Data.Entity.ModelConfiguration.Conventions;

namespace Northwind.Models
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
            modelBuilder.Configurations.Add(new EmployeeConfiguration());
            modelBuilder.Configurations.Add(new InternationalOrderConfiguration());
            modelBuilder.Configurations.Add(new OrderConfiguration());
            modelBuilder.Configurations.Add(new OrderDetailConfiguration());
            modelBuilder.Configurations.Add(new PreviousEmployeeConfiguration());
            modelBuilder.Configurations.Add(new SupplierConfiguration());
        }

        #region DbSets

        public DbSet<Category> Categories { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<Employee> Employees { get; set; }
        public DbSet<EmployeeTerritory> EmployeeTerritories { get; set; }
        public DbSet<InternationalOrder> InternationalOrders { get; set; }
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


        #endregion EntityQueries
    }
}


#region EntityType Configurations

namespace Northwind.Models
{
    using System.Data.Entity.ModelConfiguration;

    public class CustomerConfiguration : EntityTypeConfiguration<Customer>
    {
        public CustomerConfiguration()
        {
            Property(c => c.CustomerID)
                .HasDatabaseGeneratedOption(DatabaseGeneratedOption.None);
        }
    }

    public class EmployeeConfiguration : EntityTypeConfiguration<Employee>
    {
        public EmployeeConfiguration()
        {
            HasMany(e => e.EmployeeTerritories)
            .WithRequired()

            // Either of the following configs is fine in EF and Web API
            // (assuming the corresponding EmployeeTerritory property name is in play)
            // Confirm by hitting this URL in a browser
            //http://localhost:31439/breeze/Northwind/Employees/?$top=1&$expand=EmployeeTerritories

            .HasForeignKey(et => et.EmpID); 
        }
    }

    // InternationalOrder TPT inherits from Order
    public class InternationalOrderConfiguration : EntityTypeConfiguration<InternationalOrder>
    {
        public InternationalOrderConfiguration()
        {
            ToTable("InternationalOrder");
        }
    }

    public class OrderConfiguration : EntityTypeConfiguration<Order>
    {
        public OrderConfiguration()
        {
            // map Shipping address columns to the Location complex type
            Property(o => o.ShipTo.Address).HasColumnName("ShipAddress");
            Property(o => o.ShipTo.City).HasColumnName("ShipCity");
            Property(o => o.ShipTo.Region).HasColumnName("ShipRegion");
            Property(o => o.ShipTo.PostalCode).HasColumnName("ShipPostalCode");
            Property(o => o.ShipTo.Country).HasColumnName("ShipCountry");
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
    public class SupplierConfiguration : EntityTypeConfiguration<Supplier>
    {
        public SupplierConfiguration()
        {
            // map address columns to the Location complex type
            Property(s => s.Location.Address).HasColumnName("Address");
            Property(s => s.Location.City).HasColumnName("City");
            Property(s => s.Location.Region).HasColumnName("Region");
            Property(s => s.Location.PostalCode).HasColumnName("PostalCode");
            Property(s => s.Location.Country).HasColumnName("Country");
        }
    }
}

#endregion

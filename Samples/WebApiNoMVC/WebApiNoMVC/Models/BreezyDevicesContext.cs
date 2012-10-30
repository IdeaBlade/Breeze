using System.Data.Entity;

namespace WebApiNoMVC.Models
{
    public class BreezyDevicesContext : DbContext
    {
        // DEVELOPMENT ONLY: initialize the database
        static BreezyDevicesContext()
        {
            Database.SetInitializer(new BreezyDevicesDatabaseInitializer());
        }

        public BreezyDevicesContext()
            : base("name=BreezyDevicesContext")
        {
            // Disable proxy creation and lazy loading; 
            Configuration.ProxyCreationEnabled = false;
            Configuration.LazyLoadingEnabled = false;
        }

        public DbSet<Person> People { get; set; }
        public DbSet<Device> Devices { get; set; }
    }
}

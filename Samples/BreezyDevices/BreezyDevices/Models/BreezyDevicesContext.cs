using System.Data.Entity;

namespace BreezyDevices.Models
{
    public class BreezyDevicesContext : DbContext
    {
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

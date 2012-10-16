using System.Data.Entity;

namespace BreezyDevices.Models {
    
    public class BreezeSampleContext : DbContext {
        public DbSet<BreezeSampleItem> Samples { get; set; }
    }
    
}
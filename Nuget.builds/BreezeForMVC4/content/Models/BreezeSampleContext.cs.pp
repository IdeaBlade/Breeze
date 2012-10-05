using System.Data.Entity;

namespace $rootnamespace$.Models {
    
    public class BreezeSampleContext : DbContext {
        public DbSet<BreezeSampleItem> SampleItems { get; set; }
    }
    
}
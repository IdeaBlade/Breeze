using System.Data.Entity;

namespace Breeze.Learn.Models {
    
    public class BreezeSampleContext : DbContext {
        public DbSet<BreezeSampleTodoItem> Todos { get; set; }
    }
    
}
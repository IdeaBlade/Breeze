using System.Data.Entity;

namespace MemTester.Models {
    
    public class BreezeSampleContext : DbContext 
    {
        // DEVELOPMENT ONLY: initialize the database
        static BreezeSampleContext()
        {
            Database.SetInitializer(new BreezeSampleDatabaseInitializer());
        }    
        public DbSet<BreezeSampleTodoItem> Todos { get; set; }
    }
    
}
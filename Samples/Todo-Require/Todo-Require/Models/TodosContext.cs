namespace Todo_Require.Models {
    using System.Data.Entity;

    public class TodosContext : DbContext 
    {
        // DEVELOPMENT ONLY: initialize the database
        static TodosContext()
        {
            Database.SetInitializer(new TodoDatabaseInitializer());
        }
        public DbSet<TodoItem> Todos { get; set; }
    }
}
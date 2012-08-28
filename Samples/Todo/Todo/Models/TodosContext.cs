namespace Todo.Models {
    using System.Data.Entity;

    public class TodosContext : DbContext {
        public DbSet<TodoItem> Todos { get; set; }
    }
}
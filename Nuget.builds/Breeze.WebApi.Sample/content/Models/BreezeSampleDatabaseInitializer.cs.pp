using System;
using System.Data.Entity;

namespace $rootnamespace$.Models
{
    public class BreezeSampleDatabaseInitializer :
        // If you prefer to preserve the database between server sessions
        // inherit from DropCreateDatabaseIfModelChanges
        //DropCreateDatabaseIfModelChanges<BreezeSampleContext>

        // When creating the database the first time or 
        // if you prefer to recreate with every new server session
        // inherit from DropCreateDatabaseAlways 
        DropCreateDatabaseAlways<BreezeSampleContext>
    {
        protected override void Seed(BreezeSampleContext context)
        {
            var todos = new []
                {
                    new BreezeSampleTodoItem{Description = "Wake up"},
                    new BreezeSampleTodoItem{Description = "Do dishes", IsDone = true},
                    new BreezeSampleTodoItem{Description = "Mow lawn", IsDone = true},
                    new BreezeSampleTodoItem{Description = "Try Breeze"},
                    new BreezeSampleTodoItem{Description = "Tell the world"},
                    new BreezeSampleTodoItem{Description = "Go home early"},
                };

            Array.ForEach(todos, t => context.Todos.Add(t));

            context.SaveChanges(); // Save 'em
        }
    }
}

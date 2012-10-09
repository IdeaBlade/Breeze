using System;
using System.Data.Entity;

namespace Todo.Models
{
    public class TodoDatabaseInitializer:
        DropCreateDatabaseIfModelChanges<TodosContext> 
    {
        protected override void Seed(TodosContext context)
        {
            SeedDatabase(context);
        }

        public static void SeedDatabase(TodosContext context)
        {
            TodoItem todo;
            var baseCreatedAtDate = new DateTime(2012, 8, 22, 9, 0, 0);

            // Archived
            todo = new TodoItem
                {
                    CreatedAt = baseCreatedAtDate,
                    Description = "Food",
                    IsDone = true,
                    IsArchived = true
                };
            context.Todos.Add(todo);

            todo = new TodoItem
            {
                CreatedAt = baseCreatedAtDate.AddMinutes(1),
                Description = "Water",
                IsDone = true,
                IsArchived = true
            };
            context.Todos.Add(todo);

            todo = new TodoItem
            {
                CreatedAt = baseCreatedAtDate.AddMinutes(2),
                Description = "Shelter",
                IsDone = true,
                IsArchived = true
            };
            context.Todos.Add(todo);

            // Active
            var activeCreatedAtDate = baseCreatedAtDate.AddDays(1);

            todo = new TodoItem
            {
                CreatedAt = activeCreatedAtDate,
                Description = "Bread",
                IsDone = false,
                IsArchived = false
            };
            context.Todos.Add(todo);

            todo = new TodoItem
            {
                CreatedAt = activeCreatedAtDate.AddMinutes(1),
                Description = "Cheese",
                IsDone = true,
                IsArchived = false
            };
            context.Todos.Add(todo);

            todo = new TodoItem
            {
                CreatedAt = activeCreatedAtDate.AddMinutes(2),
                Description = "Wine",
                IsDone = false,
                IsArchived = false
            };
            context.Todos.Add(todo);

            context.SaveChanges(); // Save 'em

        }

        public static void PurgeDatabase(TodosContext context)
        {
            var todos = context.Todos;
            foreach (var todoItem in todos)
            {
                todos.Remove(todoItem);
            }

            context.SaveChanges();
        }
    }


}
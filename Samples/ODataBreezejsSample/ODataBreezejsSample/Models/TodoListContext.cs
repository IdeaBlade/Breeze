using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;

namespace ODataBreezejsSample.Models
{
    public class TodoListContext : DbContext
    {
        static TodoListContext()
        {
            Database.SetInitializer(new TodoListContextInitializer());
        }

        public DbSet<TodoList> TodoLists { get; set; }
        public DbSet<TodoItem> TodoItems { get; set; }

        private class TodoListContextInitializer : DropCreateDatabaseAlways<TodoListContext>
        {
            protected override void Seed(TodoListContext context)
            {
                int maxElements = 5;
                DateTime created = DateTime.UtcNow;
                IList<TodoList> todoLists = Enumerable.Range(0, maxElements).Select(i => new TodoList
                    {
                        Id = i,
                        Title = "Title " + i,
                        Created = created,
                        TodoItems = Enumerable.Range(0, i).Select(j => new TodoItem
                        {
                            Id = i * maxElements + j,
                            Description = "Description for item " + i * maxElements + j,
                            IsDone = j % 3 == 0,
                            TodoListId = i
                        }).ToList()
                    }).ToList();
                context.TodoLists.AddRange(todoLists);
            }
        }
    }
}
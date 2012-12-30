using System.Collections.Generic;
using System.Data.Entity;

namespace TodoNoEF.Models
{
    public class TodoDatabaseInitializer :
        DropCreateDatabaseAlways<TodoItemContext> // re-creates every time the server starts
        //DropCreateDatabaseIfModelChanges<BreezeTodoContext> 
    {
        // This sample lacks authentication so fake it
        public const string FakeUserName = "FakeUser";

        protected override void Seed(TodoItemContext context)
        {
            Context = context;
            InitiateDatabaseForNewUser(FakeUserName); 
        }

        private TodoItemContext Context { get; set; }

        /// <summary>
        /// Initiate a new todo list for new user
        /// </summary>
        private void InitiateDatabaseForNewUser(string userName)
        {
            var todoList = new TodoList {UserId = userName, Title = "My Todo List #1", Todos = new List<TodoItem>()};
            Context.TodoLists.Add(todoList);
            Context.SaveChanges();

            todoList.Todos.Add(new TodoItem { Title = "Todo item #1", TodoListId = todoList.TodoListId, IsDone = false });
            todoList.Todos.Add(new TodoItem { Title = "Todo item #2", TodoListId = todoList.TodoListId, IsDone = false });
            Context.SaveChanges();
        }
    }
}
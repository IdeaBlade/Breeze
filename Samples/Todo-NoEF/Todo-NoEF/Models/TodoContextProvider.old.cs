using System;
using System.Linq;
using System.Data.Entity.Infrastructure;
using System.Security;
using System.Security.Principal;
using Breeze.WebApi;

// ReSharper disable InconsistentNaming
namespace TodoNoEF.Models
{
    public class TodoContextProvider : EFContextProvider<TodoItemContext>
    {
        // DEVELOPMENT ONLY: initialize the database
        static TodoContextProvider()
        {
            System.Data.Entity.Database.SetInitializer(new TodoDatabaseInitializer());
        }
        public TodoContextProvider(IPrincipal user)
        {
            // This sample lacks authentication so fake it
            //UserId = user.Identity.Name;
            UserId = TodoDatabaseInitializer.FakeUserName;
        }

        public string UserId { get; private set; }

        public DbQuery<TodoItem> Todos
        {
            get { return (DbQuery<TodoItem>)Context.TodoItems
                .Where(t => t.TodoList.UserId == UserId); }
        }

        public DbQuery<TodoList> TodoLists
        {
            get {
                return (DbQuery<TodoList>)Context.TodoLists
                    .Where(t => t.UserId == UserId); 
            }
        }

        #region Save processing

        // Todo: delegate to helper classes when it gets more complicated
        protected override bool BeforeSaveEntity(EntityInfo entityInfo)
        {
            var entity = entityInfo.Entity;
            if (entity is TodoList)
            {
                return BeforeSaveTodoList(entity as TodoList, entityInfo);
            }
            if (entity is TodoItem)
            {
                return BeforeSaveTodoItem(entity as TodoItem, entityInfo);
            }
            throw new InvalidOperationException("Cannot save entity of unknown type");
        }


        private bool BeforeSaveTodoList(TodoList todoList, EntityInfo info)
        {
            if (info.EntityState == EntityState.Added)
            {
                todoList.UserId = UserId;
                return true;
            }
            return UserId == todoList.UserId || throwCannotSaveEntityForThisUser();
        }

        private bool BeforeSaveTodoItem(TodoItem todoItem, EntityInfo info)
        {
            var todoList = Context.TodoLists.Find(todoItem.TodoListId);
            return (null == todoList)
                       ? throwCannotFindParentTodoList()
                       : UserId == todoList.UserId || throwCannotSaveEntityForThisUser();
        }

        private static bool throwCannotSaveEntityForThisUser()
        {
            throw new SecurityException("Unauthorized user");
        }

        private static bool throwCannotFindParentTodoList()
        {
            throw new InvalidOperationException("Invalid TodoItem");
        }

        #endregion

    }
}
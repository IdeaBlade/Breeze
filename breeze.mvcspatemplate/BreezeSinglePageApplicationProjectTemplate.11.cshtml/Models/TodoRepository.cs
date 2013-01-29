using System;
using System.Linq;
using System.Data.Entity.Infrastructure;
using System.Security;
using System.Security.Principal;
using Breeze.WebApi;

// ReSharper disable InconsistentNaming
namespace $safeprojectname$.Models
{
    public class TodoRepository : EFContextProvider<TodoItemContext>
    {
        public TodoRepository(IPrincipal user)
        {
            UserId = user.Identity.Name;
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
            var todoList = ValidationContext.TodoLists.Find(todoItem.TodoListId);
            return (null == todoList)
                       ? throwCannotFindParentTodoList()
                       : UserId == todoList.UserId || throwCannotSaveEntityForThisUser();
        }

        // "this.Context" is reserved for Breeze save only!
        // A second, lazily instantiated DbContext will be used
        // for db access during custom save validation. 
        // See this stackoverflow question and reply for an explanation:
        // http://stackoverflow.com/questions/14517945/using-this-context-inside-beforesaveentity
        private TodoItemContext ValidationContext
        {
            get { return _validationContext ?? (_validationContext = new TodoItemContext()); }
        }
        private TodoItemContext _validationContext;

        private bool throwCannotSaveEntityForThisUser()
        {
            throw new SecurityException("Unauthorized user");
        }

        private bool throwCannotFindParentTodoList()
        {
            throw new InvalidOperationException("Invalid TodoItem");
        }

        #endregion

    }
}
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security;
using System.Security.Principal;
using Breeze.WebApi;

// ReSharper disable InconsistentNaming
namespace NoDb.Models {
  public class TodoContextProvider : ContextProvider {

    public TodoContext Context { get { return _todoContext; } }

    public TodoContextProvider(IPrincipal user) {
      // This sample lacks authentication so fake it
      //UserId = user.Identity.Name;
      UserId = TodoContext.FakeUserName;
    }

    public string UserId { get; private set; }

    /// <summary>
    /// Not currently called.
    /// </summary>
    public IQueryable<TodoItem> Todos {
      get {
        return Context.TodoLists
                      .SelectMany(l => l.Todos)
                      .Where(t => t.TodoList.UserId == UserId)
                      .AsQueryable();
      }
    }

    /// <summary>
    /// This could just as well be an IEnumerable.
    /// </summary
    public IQueryable<TodoList> TodoLists {
      get {
        return Context.TodoLists
                      .Where(t => t.UserId == UserId)
                      .AsQueryable();
      }
    }

    protected override string BuildJsonMetadata() {
      return null;
    }

    #region Save processing

    // Todo: delegate to helper classes when it gets more complicated
    protected override bool BeforeSaveEntity(EntityInfo entityInfo) {
      var entity = entityInfo.Entity;
      if (entity is TodoList) {
        return BeforeSaveTodoList(entity as TodoList, entityInfo);
      }
      if (entity is TodoItem) {
        return BeforeSaveTodoItem(entity as TodoItem, entityInfo);
      }
      throw new InvalidOperationException("Cannot save entity of unknown type");
    }

    protected override List<KeyMapping> SaveChangesCore(Dictionary<Type, List<EntityInfo>> saveMap) {
      return Context.SaveChanges(saveMap);
    }

    private bool BeforeSaveTodoList(TodoList todoList, EntityInfo info) {
      if (info.EntityState == EntityState.Added) {
        todoList.UserId = UserId;
        return true;
      }
      return UserId == todoList.UserId || throwCannotSaveEntityForThisUser();
    }

    private bool BeforeSaveTodoItem(TodoItem todoItem, EntityInfo info) {
      var todoList = Context.TodoLists.FirstOrDefault( l => l.TodoListId == todoItem.TodoListId);
      return (null == todoList)
                 ? throwCannotFindParentTodoList()
                 : UserId == todoList.UserId || throwCannotSaveEntityForThisUser();
    }

    private static bool throwCannotSaveEntityForThisUser() {
      throw new SecurityException("Unauthorized user");
    }

    private static bool throwCannotFindParentTodoList() {
      throw new InvalidOperationException("Invalid TodoItem");
    }

    #endregion

    private TodoContext _todoContext = TodoContext.Instance;

  }
}
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security;
using System.Security.Principal;
using Breeze.WebApi;

// ReSharper disable InconsistentNaming
namespace ToDoNoEF.Models {
  public class ToDoContextProvider : ContextProvider {

    public ToDoContext Context { get { return _todoContext; } }

    
    // DEVELOPMENT ONLY: initialize the database
    static ToDoContextProvider() {
      
    }

    public ToDoContextProvider(IPrincipal user) {
      // This sample lacks authentication so fake it
      //UserId = user.Identity.Name;
      UserId = ToDoContext.FakeUserName;
    }

    public string UserId { get; private set; }

    public IQueryable<ToDoItem> ToDos {
      get {
        return Context.ToDoLists
                      .SelectMany(l => l.ToDos)
                      .Where(t => t.ToDoList.UserId == UserId)
                      .AsQueryable();
      }
    }

    public IQueryable<ToDoList> ToDoLists {
      get {
        return Context.ToDoLists
                      .Where(t => t.UserId == UserId)
                      .AsQueryable();
      }
    }

    protected override string BuildJsonMetadata() {
      return null;
    }

    #region Save processing

    // ToDo: delegate to helper classes when it gets more complicated
    protected override bool BeforeSaveEntity(EntityInfo entityInfo) {
      var entity = entityInfo.Entity;
      if (entity is ToDoList) {
        return BeforeSaveToDoList(entity as ToDoList, entityInfo);
      }
      if (entity is ToDoItem) {
        return BeforeSaveToDoItem(entity as ToDoItem, entityInfo);
      }
      throw new InvalidOperationException("Cannot save entity of unknown type");
    }

    protected override List<KeyMapping> SaveChangesCore(Dictionary<Type, List<EntityInfo>> saveMap) {
      return Context.SaveChanges(saveMap);
    }

    private bool BeforeSaveToDoList(ToDoList todoList, EntityInfo info) {
      if (info.EntityState == EntityState.Added) {
        todoList.UserId = UserId;
        return true;
      }
      return UserId == todoList.UserId || throwCannotSaveEntityForThisUser();
    }

    private bool BeforeSaveToDoItem(ToDoItem todoItem, EntityInfo info) {
      var todoList = Context.ToDoLists.FirstOrDefault( l => l.ToDoListId == todoItem.ToDoListId);
      return (null == todoList)
                 ? throwCannotFindParentToDoList()
                 : UserId == todoList.UserId || throwCannotSaveEntityForThisUser();
    }

    private static bool throwCannotSaveEntityForThisUser() {
      throw new SecurityException("Unauthorized user");
    }

    private static bool throwCannotFindParentToDoList() {
      throw new InvalidOperationException("Invalid ToDoItem");
    }

    #endregion

    private ToDoContext _todoContext = ToDoContext.Instance;

  }
}
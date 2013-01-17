// DISCLAIMER:
// Inherits from "ContextProvider" in the Breeze.WebApi assembly.
// You don't "need" it but we are using it because
// we want to use the BreezeJS "saveChanges" method
// to save a bunch of data in a single POST.
// If you don't want to use BreezeJS "saveChanges" method
// for saves or you want to parse and process the JSON 
// change-set bundle yourself
// you don't need Breeze.WebApi

// ReSharper disable InconsistentNaming
using System;
using System.Collections.Generic;
using System.Linq;
using Breeze.WebApi;

namespace NoDb.Models {
  public class TodoContextProvider : ContextProvider {

    public TodoContextNoDb Context { get { return TodoContextNoDb.Instance; } }

    /// <summary>Get all TodoLists</summary>
    /// <remarks>Could have returned an IEnumerable.</remarks>
    public IQueryable<TodoList> TodoLists
    {
        get { return Context.TodoLists.AsQueryable(); }
    }

    // No metadata from this provider but must implement abstract method.
    protected override string BuildJsonMetadata() { return null;}

    #region Save processing

    // Todo: delegate to helper classes when it gets more complicated
    protected override bool BeforeSaveEntity(EntityInfo entityInfo) {
      var entity = entityInfo.Entity;
      if (entity is TodoList) { return true; }
      if (entity is TodoItem) {
        return BeforeSaveTodoItem(entity as TodoItem, entityInfo);
      }
      throw new InvalidOperationException("Cannot save entity of unknown type");
    }

    protected override List<KeyMapping> SaveChangesCore(Dictionary<Type, List<EntityInfo>> saveMap) {
      return Context.SaveChanges(saveMap);
    }

    private bool BeforeSaveTodoItem(TodoItem todoItem, EntityInfo info) {
        var todoList = Context.TodoLists.FirstOrDefault(tl => tl.TodoListId == todoItem.TodoListId);
        return (null != todoList) || throwCannotFindParentTodoList();
    }

    private static bool throwCannotFindParentTodoList() {
      throw new InvalidOperationException("Invalid TodoItem - can't find parent TodoList");
    }

    #endregion
  }
}
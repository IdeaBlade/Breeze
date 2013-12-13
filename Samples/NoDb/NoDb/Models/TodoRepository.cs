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
using Breeze.ContextProvider;
using Breeze.WebApi2;
using System.Data;

namespace NoDb.Models {
  public class TodoRepository : ContextProvider {

    private TodoContext Context { get { return TodoContext.Instance; } }

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

    protected override void SaveChangesCore(SaveWorkState saveWorkState) {
      Context.SaveChanges(saveWorkState);
    }

    private bool BeforeSaveTodoItem(TodoItem todoItem, EntityInfo info) {
        var todoList = Context.TodoLists.FirstOrDefault(tl => tl.TodoListId == todoItem.TodoListId);
        return (null != todoList) || throwCannotFindParentTodoList();
    }

    private static bool throwCannotFindParentTodoList() {
      throw new InvalidOperationException("Invalid TodoItem - can't find parent TodoList");
    }

    // No DbConnections needed
    public override IDbConnection GetDbConnection() {
      return null;
    }

    protected override void OpenDbConnection() {
      // do nothing
    }
    
    protected override void CloseDbConnection() {
      // do nothing 
    }


    #endregion
  }
}
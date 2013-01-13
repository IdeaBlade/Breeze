using System;
using System.Linq;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel.DataAnnotations;

namespace NoDb.Models {
  /// <summary>
  /// Todo list entity
  /// </summary>
  public class TodoList {

    public int TodoListId { get; set; }

    [Required]
    public string UserId { get; set; }

    [Required]
    public string Title { get; set; }

    public virtual ReadOnlyCollection<TodoItem> Todos {
      get { return _todoItems.AsReadOnly(); }
    }

    public int AddItem(TodoItem item) {
      item.TodoListId = this.TodoListId;
      item.TodoList = this;
      _todoItems.Add(item);
      return item.TodoItemId;
    }

    public void RemoveItem(TodoItem item) {
      var ix = FindIndex(item);
      _todoItems.RemoveAt(ix);
      item.TodoList = null;
    }

    public void ReplaceItem(TodoItem item) {
      var ix = FindIndex(item);
      item.TodoList = this;
      _todoItems[ix] = item;
      
    }

    private Int32 FindIndex(TodoItem item) {
      var ix = _todoItems.FindIndex(s => s.TodoItemId == item.TodoItemId);
      if (ix == -1) {
        throw new Exception("Unable to locate TodoItem: " + item.TodoItemId);
      }
      return ix;
    }

    private List<TodoItem> _todoItems = new List<TodoItem>();
  }




}
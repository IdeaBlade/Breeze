using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel.DataAnnotations;

namespace ToDoNoEF.Models {
  /// <summary>
  /// ToDo list entity
  /// </summary>
  public class ToDoList {

    public int ToDoListId { get; set; }

    [Required]
    public string UserId { get; set; }

    [Required]
    public string Title { get; set; }

    public virtual ReadOnlyCollection<ToDoItem> ToDos {
      get { return _toDoItems.AsReadOnly(); }
    }

    public int AddItem(ToDoItem item) {
      item.ToDoListId = this.ToDoListId;
      item.ToDoList = this;
      _toDoItems.Add(item);
      return item.ToDoItemId;
    }

    public void RemoveItem(ToDoItem item) {
      var ix = FindIndex(item);
      _toDoItems.RemoveAt(ix);
      item.ToDoList = null;
    }

    public void ReplaceItem(ToDoItem item) {
      var ix = FindIndex(item);
      item.ToDoList = this;
      _toDoItems[ix] = item;
      
    }

    private Int32 FindIndex(ToDoItem item) {
      var ix = _toDoItems.FindIndex(s => s.ToDoItemId == item.ToDoItemId);
      if (ix == -1) {
        throw new Exception("Unable to locate ToDoItem: " + item.ToDoItemId);
      }
      return ix;
    }

    private List<ToDoItem> _toDoItems = new List<ToDoItem>();
  }




}
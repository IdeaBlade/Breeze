
using System;
using System.Collections.Generic;
using System.Linq;
using Breeze.WebApi;

namespace NoDb.Models {

  public class TodoContext {

    // Explicit static constructor to tell C# compiler
    // not to mark type as beforefieldinit
    static TodoContext() { }

    public static TodoContext Instance {
      get {
        if (!__instance._initialized) {
          __instance.PopulateWithSampleData();
          __instance._initialized = true;
        }
        return __instance;
      }
    }

    public const string FakeUserName = "FakeUser";

    public TodoContext() {
      
    }

    public List<TodoList> TodoLists {
      get {
        lock (__lock) {
          return _todoLists;
        }
      }
    }

    public List<KeyMapping> SaveChanges(Dictionary<Type, List<EntityInfo>> saveMap) {
      lock (__lock) {
        _keyMappings.Clear();
        SaveTodoLists(saveMap);
        SaveTodoItems(saveMap);
        // ToList effectively copies the _keyMappings so that an incoming SaveChanges call doesn't clear the 
        // keyMappings before the previous version has completed serializing. 
        return _keyMappings.ToList(); 
      }
    }

    #region Private methods

    private void SaveTodoLists(Dictionary<Type, List<EntityInfo>> saveMap) {
      List<EntityInfo> infos;
      if (!saveMap.TryGetValue(typeof(TodoList), out infos)) {
        return;
      }
      foreach (var ei in infos) {
        var todoList = (TodoList)ei.Entity;
        if (ei.EntityState == EntityState.Added) {
          AddTodoList(todoList);
        } else if (ei.EntityState == EntityState.Modified) {
          ModifyTodoList(todoList);
        } else if (ei.EntityState == EntityState.Deleted) {
          DeleteTodoList(todoList);
        }
      }
    }

    private void SaveTodoItems(Dictionary<Type, List<EntityInfo>> saveMap) {
      List<EntityInfo> items;
      if (!saveMap.TryGetValue(typeof(TodoItem), out items)) {
        return;
      }
      foreach (var ei in items) {
        var todoItem = (TodoItem)ei.Entity;
        if (ei.EntityState == EntityState.Added) {
          AddTodoItem(todoItem);
        } else if (ei.EntityState == EntityState.Modified) {
          ModifyTodoItem(todoItem);
        } else if (ei.EntityState == EntityState.Deleted) {
          DeleteTodoItem(todoItem);
        }
      }
    }


    private void AddTodoList(TodoList list) {
      if (list.TodoListId <= 0) {
        list.TodoListId = AddMapping(typeof(TodoList), list.TodoListId);
      }
      TodoLists.Add(list);
    }

    private void ModifyTodoList(TodoList list) {
      var todoList = FindTodoList(list.TodoListId);
      todoList.Title = list.Title;
      todoList.UserId = list.UserId;
    }

    private void DeleteTodoList(TodoList list) {
      var todoList = FindTodoList(list.TodoListId);
      TodoLists.Remove(todoList);
    }

    private void AddTodoItem(TodoItem item) {
      if (item.TodoItemId <= 0) {
        item.TodoItemId = AddMapping(typeof(TodoItem), item.TodoItemId);
      }
      if (item.TodoListId < 0) {
        item.TodoListId = FindRealId(typeof(TodoList), item.TodoListId);
      }

      var todoList = FindTodoList(item.TodoListId);
      todoList.AddItem(item);
    }

    private void ModifyTodoItem(TodoItem item) {
      var todoList = FindTodoList(item.TodoListId);
      todoList.ReplaceItem(item);
    }

    private void DeleteTodoItem(TodoItem item) {
      var todoList = FindTodoList(item.TodoListId, true);
      // if we delete a list ; by the time we get to the items the list is no longer there.
      if (todoList != null) {
        todoList.RemoveItem(item);
      }
    }

    private Int32 AddMapping(Type type, Int32 tempId) {
      var newId = IdGenerator.Instance.GetNextId(type);
      _keyMappings.Add(new KeyMapping() {
        EntityTypeName = type.FullName,
        RealValue = newId,
        TempValue = tempId
      });
      return newId;
    }

    private TodoList FindTodoList(Int32 todoListId, bool okToFail = false) {
      var todoList = TodoLists.FirstOrDefault(l => todoListId == l.TodoListId);
      if (todoList == null) {
        if (okToFail) return null;
        throw new Exception("Unable to locate TodoList: " + todoListId);
      }
      return todoList;
    }

    private Int32 FindRealId(Type type, Int32 tempId) {
      var mapping = _keyMappings.FirstOrDefault(km => km.EntityTypeName == type.FullName && tempId == (Int32)km.TempValue);
      if (mapping == null) {
        throw new Exception("Unable to locate mapping for temporary key: " + type.FullName + "-" + tempId.ToString());
      }
      return (Int32)mapping.RealValue;
    }

    public void PopulateWithSampleData() {
      var newList = new TodoList();
      newList.Title = "Before work";
      newList.UserId = FakeUserName;
      
      AddTodoList(newList);
      var listId = newList.TodoListId;
      var newItem = new TodoItem() { TodoListId = listId, Title ="Make coffee", IsDone = false };
      AddTodoItem(newItem);
      newItem = new TodoItem() { TodoListId = listId, Title = "Turn heater off", IsDone = false };
      AddTodoItem(newItem);
    }

    #endregion

    private static Object __lock = new Object();
    private static readonly TodoContext __instance = new TodoContext();

    private bool _initialized = false;
    private List<TodoList> _todoLists = new List<TodoList>();
    private List<KeyMapping> _keyMappings = new List<KeyMapping>();
  }

  public sealed class IdGenerator {

    // Explicit static constructor to tell C# compiler
    // not to mark type as beforefieldinit
    static IdGenerator() { }

    private IdGenerator() {

    }

    public static IdGenerator Instance {
      get {
        return _instance;
      }
    }

    public int GetNextId(Type type) {
      lock (_idMap) {
        Int32 val;
        if (!_idMap.TryGetValue(type, out val)) {
          val = 1;
        }
        _idMap[type] = val + 1;
        return val;
      }
    }

    private Dictionary<Type, Int32> _idMap = new Dictionary<Type, int>();

    private static readonly IdGenerator _instance = new IdGenerator();
  }
}
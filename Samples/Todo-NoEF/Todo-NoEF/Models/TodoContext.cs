
using System;
using System.Collections.Generic;
using System.Linq;
using Breeze.WebApi;

namespace ToDoNoEF.Models {

  public class ToDoContext {

    // Explicit static constructor to tell C# compiler
    // not to mark type as beforefieldinit
    static ToDoContext() { }

    public static ToDoContext Instance {
      get {
        if (!__instance._initialized) {
          __instance.PopulateWithSampleData();
          __instance._initialized = true;
        }
        return __instance;
      }
    }

    public const string FakeUserName = "FakeUser";

    public ToDoContext() {
      
    }

    public List<ToDoList> ToDoLists {
      get {
        lock (__lock) {
          return _toDoLists;
        }
      }
    }

    public List<KeyMapping> SaveChanges(Dictionary<Type, List<EntityInfo>> saveMap) {
      lock (__lock) {
        _keyMappings.Clear();
        SaveToDoLists(saveMap);
        SaveToDoItems(saveMap);
        // ToList effectively copies the _keyMappings so that an incoming SaveChanges call doesn't clear the 
        // keyMappings before the previous version has completed serializing. 
        return _keyMappings.ToList(); 
      }
    }

    #region Private methods

    private void SaveToDoLists(Dictionary<Type, List<EntityInfo>> saveMap) {
      List<EntityInfo> infos;
      if (!saveMap.TryGetValue(typeof(ToDoList), out infos)) {
        return;
      }
      foreach (var ei in infos) {
        var toDoList = (ToDoList)ei.Entity;
        if (ei.EntityState == EntityState.Added) {
          AddToDoList(toDoList);
        } else if (ei.EntityState == EntityState.Modified) {
          ModifyToDoList(toDoList);
        } else if (ei.EntityState == EntityState.Deleted) {
          DeleteToDoList(toDoList);
        }
      }
    }

    private void SaveToDoItems(Dictionary<Type, List<EntityInfo>> saveMap) {
      List<EntityInfo> items;
      if (!saveMap.TryGetValue(typeof(ToDoItem), out items)) {
        return;
      }
      foreach (var ei in items) {
        var toDoItem = (ToDoItem)ei.Entity;
        if (ei.EntityState == EntityState.Added) {
          AddToDoItem(toDoItem);
        } else if (ei.EntityState == EntityState.Modified) {
          ModifyToDoItem(toDoItem);
        } else if (ei.EntityState == EntityState.Deleted) {
          DeleteToDoItem(toDoItem);
        }
      }
    }


    private void AddToDoList(ToDoList list) {
      if (list.ToDoListId <= 0) {
        list.ToDoListId = AddMapping(typeof(ToDoList), list.ToDoListId);
      }
      ToDoLists.Add(list);
    }

    private void ModifyToDoList(ToDoList list) {
      var toDoList = FindToDoList(list.ToDoListId);
      toDoList.Title = list.Title;
      toDoList.UserId = list.UserId;
    }

    private void DeleteToDoList(ToDoList list) {
      var toDoList = FindToDoList(list.ToDoListId);
      ToDoLists.Remove(toDoList);
    }

    private void AddToDoItem(ToDoItem item) {
      if (item.ToDoItemId <= 0) {
        item.ToDoItemId = AddMapping(typeof(ToDoItem), item.ToDoItemId);
      }
      if (item.ToDoListId < 0) {
        item.ToDoListId = FindRealId(typeof(ToDoList), item.ToDoListId);
      }

      var toDoList = FindToDoList(item.ToDoListId);
      toDoList.AddItem(item);
    }

    private void ModifyToDoItem(ToDoItem item) {
      var toDoList = FindToDoList(item.ToDoListId);
      toDoList.ReplaceItem(item);
    }

    private void DeleteToDoItem(ToDoItem item) {
      var toDoList = FindToDoList(item.ToDoListId, true);
      // if we delete a list ; by the time we get to the items the list is no longer there.
      if (toDoList != null) {
        toDoList.RemoveItem(item);
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

    private ToDoList FindToDoList(Int32 toDoListId, bool okToFail = false) {
      var toDoList = ToDoLists.FirstOrDefault(l => toDoListId == l.ToDoListId);
      if (toDoList == null) {
        if (okToFail) return null;
        throw new Exception("Unable to locate ToDoList: " + toDoListId);
      }
      return toDoList;
    }

    private Int32 FindRealId(Type type, Int32 tempId) {
      var mapping = _keyMappings.FirstOrDefault(km => km.EntityTypeName == type.FullName && tempId == (Int32)km.TempValue);
      if (mapping == null) {
        throw new Exception("Unable to locate mapping for temporary key: " + type.FullName + "-" + tempId.ToString());
      }
      return (Int32)mapping.RealValue;
    }

    public void PopulateWithSampleData() {
      var newList = new ToDoList();
      newList.Title = "Before work";
      newList.UserId = FakeUserName;
      
      AddToDoList(newList);
      var listId = newList.ToDoListId;
      var newItem = new ToDoItem() { ToDoListId = listId, Title ="Make coffee", IsDone = false };
      AddToDoItem(newItem);
      newItem = new ToDoItem() { ToDoListId = listId, Title = "Turn heater off", IsDone = false };
      AddToDoItem(newItem);
    }

    #endregion

    private static Object __lock = new Object();
    private static readonly ToDoContext __instance = new ToDoContext();

    private bool _initialized = false;
    private List<ToDoList> _toDoLists = new List<ToDoList>();

    private static List<KeyMapping> _keyMappings = new List<KeyMapping>();
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
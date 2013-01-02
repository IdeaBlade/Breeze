
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.Serialization.Formatters;
using System.Threading;
using System.Web;
using Breeze.WebApi;
using Newtonsoft.Json;

// Not yet completed - intended as a persistent replacement for the ToDoContext.cs class that store changes on the local file system.
//    Writes to local file system on a separate thread for each save.
//    Each ToDoList gets its own ToDoList_xxx file in App_Data.
//    Reloading saved data and error handling is not yet completed - 
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
        _pm = new PersistenceManager();
        SaveToDoLists(saveMap);
        SaveToDoItems(saveMap);
        // ToList effectively copies the _keyMappings so that an incoming SaveChanges call doesn't clear the 
        // keyMappings before the previous version has completed serializing. 
        _pm.Persist();
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
        _pm.Update(toDoList, ei.EntityState);
      }
    }

    private void SaveToDoItems(Dictionary<Type, List<EntityInfo>> saveMap) {
      List<EntityInfo> items;
      if (!saveMap.TryGetValue(typeof(ToDoItem), out items)) {
        return;
      }
      foreach (var ei in items) {
        var toDoItem = (ToDoItem)ei.Entity;
        ToDoList toDoList = null;
        if (ei.EntityState == EntityState.Added) {
          toDoList = AddToDoItem(toDoItem);
        } else if (ei.EntityState == EntityState.Modified) {
          toDoList = ModifyToDoItem(toDoItem);
        } else if (ei.EntityState == EntityState.Deleted) {
          toDoList = DeleteToDoItem(toDoItem);
        }
        _pm.Update(toDoList, EntityState.Modified);
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

    private ToDoList AddToDoItem(ToDoItem item) {
      if (item.ToDoItemId <= 0) {
        item.ToDoItemId = AddMapping(typeof(ToDoItem), item.ToDoItemId);
      }
      if (item.ToDoListId < 0) {
        item.ToDoListId = FindRealId(typeof(ToDoList), item.ToDoListId);
      }

      var toDoList = FindToDoList(item.ToDoListId);
      toDoList.AddItem(item);
      return toDoList;
    }

    private ToDoList ModifyToDoItem(ToDoItem item) {
      var toDoList = FindToDoList(item.ToDoListId);
      toDoList.ReplaceItem(item);
      return toDoList;
    }

    private ToDoList DeleteToDoItem(ToDoItem item) {
      var toDoList = FindToDoList(item.ToDoListId, true);
      // if we delete a list ; by the time we get to the items the list is no longer there.
      if (toDoList != null) {
        toDoList.RemoveItem(item);
      }
      return toDoList;
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
    private List<KeyMapping> _keyMappings = new List<KeyMapping>();
    private PersistenceManager _pm = new PersistenceManager();
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

  // Forces persistence saves onto a separate thread.
  internal class PersistenceManager {

    public PersistenceManager() {
      if (__jsonSerializer == null) {
        __jsonSerializer = new JsonSerializer();
        __jsonSerializer.NullValueHandling = NullValueHandling.Ignore;
        __jsonSerializer.PreserveReferencesHandling = PreserveReferencesHandling.Objects;
        __jsonSerializer.ReferenceLoopHandling = ReferenceLoopHandling.Ignore;
        __jsonSerializer.TypeNameHandling = TypeNameHandling.Objects;
        __jsonSerializer.TypeNameAssemblyFormat = FormatterAssemblyStyle.Simple;
        var baseDir = AppDomain.CurrentDomain.GetData("DataDirectory");
        __baseFileName = baseDir + @"/ToDoList_";
      }
    }

    public void LoadFromFileSystem() {
      // Not yet complete
    }

    public void Update(ToDoList list, EntityState es) {
      if (list == null) return;
      if (es == EntityState.Deleted) {
        _pendingDeletes.Add(list.ToDoListId);
      } else {
        _pendingSaves.Add(list);
      }
    }

    public void Persist() {
      _pendingSaveClones = _pendingSaves.Select(CloneToDoList).ToList();
      // var t = new Thread(new ParameterizedThreadStart(PersistCore));
      var t = new Thread(PersistCore);
      t.Start();
    }

    // We want a thead safe copy during serialization and write to file.
    private  ToDoList CloneToDoList(ToDoList toDoList) {
      var clone = new ToDoList() {
        ToDoListId = toDoList.ToDoListId,
        Title = toDoList.Title,
      };
      foreach (var item in toDoList.ToDos) {
        clone.AddItem(new ToDoItem() {
          ToDoItemId = item.ToDoItemId,
          IsDone = item.IsDone,
          Title = item.Title,
        });
      }
      return clone;
    }

    private void PersistCore(Object arg) {
      _pendingSaveClones.ForEach(WriteToFile);
      _pendingDeletes.ForEach(DeleteFile);
    }

    private void WriteToFile(ToDoList toDoList) {
      using (var sw = new StreamWriter(__baseFileName + toDoList.ToDoListId.ToString() + ".json")) {
        using (var writer = new JsonTextWriter(sw)) {
          __jsonSerializer.Serialize(writer, toDoList);
        }
      }
    }

    private void DeleteFile(Int32 id) {
      File.Delete(__baseFileName + id.ToString() + ".json");
    }

    private static JsonSerializer __jsonSerializer;
    private static String __baseFileName;
    private HashSet<ToDoList> _pendingSaves = new HashSet<ToDoList>();
    private List<ToDoList> _pendingSaveClones = new List<ToDoList>();
    private List<Int32> _pendingDeletes = new List<int>();
    
  }
}
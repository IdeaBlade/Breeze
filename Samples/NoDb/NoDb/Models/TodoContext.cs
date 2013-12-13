using System;
using System.Collections.Generic;
using System.Linq;
using Breeze.ContextProvider;
using Breeze.WebApi2;

namespace NoDb.Models
{
    /// <summary>In-memory "database" and "data access" layer.</summary>
    /// <remarks>
    /// When web app starts, fills in-mem "database" with sample data
    /// Client changes are accumulated.
    /// When app shuts down, all data are lost.
    /// </remarks>
    public class TodoContext
    {
        // DO NOT REMOVE explicit static constructor which
        // tells C# compiler not to mark type as 'beforefieldinit'
        static TodoContext() { }

        // No one can instantiate
        private TodoContext() { }

        // Singleton instance of this in-memory "database"
        public static TodoContext Instance
        {
            get
            {
                if (!__instance._initialized)
                {
                    __instance.PopulateWithSampleData();
                    __instance._initialized = true;
                }
                return __instance;
            }
        }
        public List<TodoList> TodoLists
        {
            get
            {
                lock (__lock)
                {
                    return _todoLists;
                }
            }
        }

        public void SaveChanges(SaveWorkState saveWorkState)
        {
            lock (__lock)
            {
                _keyMappings.Clear();
                var saveMap = saveWorkState.SaveMap;
                SaveTodoLists(saveMap);
                SaveTodoItems(saveMap);
                // ToList effectively copies the _keyMappings so that an incoming SaveChanges call doesn't clear the 
                // keyMappings before the previous version has completed serializing. 
                saveWorkState.KeyMappings = _keyMappings.ToList();
            }
        }

        #region Private methods

        private void SaveTodoLists(Dictionary<Type, List<EntityInfo>> saveMap)
        {
            List<EntityInfo> infos;
            if (!saveMap.TryGetValue(typeof(TodoList), out infos))
            {
                return;
            }
            foreach (var ei in infos)
            {
                var todoList = (TodoList)ei.Entity;
                if (ei.EntityState == EntityState.Added)
                {
                    AddTodoList(todoList);
                }
                else if (ei.EntityState == EntityState.Modified)
                {
                    ModifyTodoList(todoList);
                }
                else if (ei.EntityState == EntityState.Deleted)
                {
                    DeleteTodoList(todoList);
                }
            }
        }

        private void SaveTodoItems(Dictionary<Type, List<EntityInfo>> saveMap)
        {
            List<EntityInfo> items;
            if (!saveMap.TryGetValue(typeof(TodoItem), out items))
            {
                return;
            }
            foreach (var ei in items)
            {
                var todoItem = (TodoItem)ei.Entity;
                if (ei.EntityState == EntityState.Added)
                {
                    AddTodoItem(todoItem);
                }
                else if (ei.EntityState == EntityState.Modified)
                {
                    ModifyTodoItem(todoItem);
                }
                else if (ei.EntityState == EntityState.Deleted)
                {
                    DeleteTodoItem(todoItem);
                }
            }
        }

        private void AddTodoList(TodoList list)
        {
            if (list.TodoListId <= 0)
            {
                list.TodoListId = AddMapping(typeof(TodoList), list.TodoListId);
            }
            ValidateTodoList(list);
            TodoLists.Add(list);
        }

        private void ModifyTodoList(TodoList list)
        {
            ValidateTodoList(list);
            var todoList = FindTodoList(list.TodoListId);
            todoList.Title = list.Title;
        }

        private void DeleteTodoList(TodoList list)
        {
            var todoList = FindTodoList(list.TodoListId);
            TodoLists.Remove(todoList);
        }

        private void AddTodoItem(TodoItem item)
        {
            if (item.TodoItemId <= 0)
            {
                item.TodoItemId = AddMapping(typeof(TodoItem), item.TodoItemId);
            }
            if (item.TodoListId < 0)
            {
                item.TodoListId = FindRealId(typeof(TodoList), item.TodoListId);
            }

            ValidateTodoItem(item);
            var todoList = FindTodoList(item.TodoListId);
            todoList.AddItem(item);
        }

        private void ModifyTodoItem(TodoItem item)
        {
            ValidateTodoItem(item);
            var todoList = FindTodoList(item.TodoListId);
            todoList.ReplaceItem(item);
        }

        private void DeleteTodoItem(TodoItem item)
        {
            var todoList = FindTodoList(item.TodoListId, true);
            // if we delete a list ; by the time we get to the items the list is no longer there.
            if (todoList != null)
            {
                todoList.RemoveItem(item);
            }
        }

        private int AddMapping(Type type, int tempId)
        {
            var newId = IdGenerator.Instance.GetNextId(type);
            _keyMappings.Add(new KeyMapping
                {
                    EntityTypeName = type.FullName,
                    RealValue = newId,
                    TempValue = tempId
                });
            return newId;
        }

        private TodoList FindTodoList(int todoListId, bool okToFail = false)
        {
            var todoList = TodoLists.FirstOrDefault(l => todoListId == l.TodoListId);
            if (todoList == null)
            {
                if (okToFail) return null;
                throw new Exception("Can't find TodoList " + todoListId);
            }
            return todoList;
        }

        private int FindRealId(Type type, int tempId)
        {
            var mapping = _keyMappings.FirstOrDefault(km => km.EntityTypeName == type.FullName && tempId == (int)km.TempValue);
            if (mapping == null)
            {
                throw new Exception("Unable to locate mapping for temporary key: " + type.FullName + "-" + tempId);
            }
            return (int)mapping.RealValue;
        }

        public void ValidateTodoItem(TodoItem todoItem)
        {
            var errs = todoItem.Validate();
            if (errs.Length <= 0) return;
            var msg =
                string.Format("TodoItem {0} '{1}' failed validation: {2}",
                              todoItem.TodoItemId, todoItem.Title, errs);
            throw new ValidationError(msg);
        }

        public void ValidateTodoList(TodoList todoList)
        {
            var errs = todoList.Validate();
            if (errs.Length <= 0) return;
            var msg =
                string.Format("TodoList {0} '{1}' failed validation: {2}",
                              todoList.TodoListId, todoList.Title, errs);
            throw new ValidationError(msg);
        }

        public void PopulateWithSampleData()
        {
            var newList = new TodoList { Title = "Before work"};

            AddTodoList(newList);
            var listId = newList.TodoListId;
            var newItem = new TodoItem { TodoListId = listId, Title = "Make coffee", IsDone = false };
            AddTodoItem(newItem);
            newItem = new TodoItem { TodoListId = listId, Title = "Turn heater off", IsDone = false };
            AddTodoItem(newItem);
        }

        #endregion

        private static readonly Object __lock = new Object();
        private static readonly TodoContext __instance = new TodoContext();

        private bool _initialized;
        private readonly List<TodoList> _todoLists = new List<TodoList>();
        private readonly List<KeyMapping> _keyMappings = new List<KeyMapping>();
    }

    public class ValidationError : Exception
    {
        public ValidationError(string message) : base(message){ }
    }

    public sealed class IdGenerator
    {
        // DO NOT REMOVE explicit static constructor which
        // tells C# compiler not to mark type as 'beforefieldinit'
        static IdGenerator() { }

        private IdGenerator() { } // only this class can instantiate

        public static IdGenerator Instance
        {
            get { return _instance; }
        }

        public int GetNextId(Type type)
        {
            lock (_idMap)
            {
                int val;
                if (!_idMap.TryGetValue(type, out val))
                {
                    val = 1;
                }
                _idMap[type] = val + 1;
                return val;
            }
        }

        private static readonly IdGenerator _instance = new IdGenerator();
        private readonly Dictionary<Type, int> _idMap = new Dictionary<Type, int>();
    }
}
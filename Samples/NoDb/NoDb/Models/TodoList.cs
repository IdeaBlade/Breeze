using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

namespace NoDb.Models
{
    public class TodoList
    {
        public int TodoListId { get; set; }
        public string Title { get; set; }

        public virtual ReadOnlyCollection<TodoItem> Todos
        {
            get { return _todoItems.AsReadOnly(); }
        }

        public int AddItem(TodoItem item)
        {
            item.TodoListId = TodoListId;
            item.TodoList = this;
            _todoItems.Add(item);
            return item.TodoItemId;
        }

        public void RemoveItem(TodoItem item)
        {
            var ix = FindIndex(item);
            _todoItems.RemoveAt(ix);
            item.TodoList = null;
        }

        public void ReplaceItem(TodoItem item)
        {
            var ix = FindIndex(item);
            item.TodoList = this;
            _todoItems[ix] = item;
        }

        public string Validate()
        {
            var errs = string.Empty;
            if (TodoListId <= 0)
            {
                errs += "TodoListId must be a positive integer";
            }
            if (string.IsNullOrWhiteSpace(Title))
            {
                errs += "Title is required";
            }
            else if (Title.Length > 30)
            {
                errs += "Title cannot be longer than 30 characters";
            }
            return errs;
        }

        private int FindIndex(TodoItem item)
        {
            var ix = _todoItems.FindIndex(s => s.TodoItemId == item.TodoItemId);
            if (ix == -1)
            {
                throw new Exception("Can't find TodoItem: " + item.TodoItemId);
            }
            return ix;
        }

        private readonly List<TodoItem> _todoItems = new List<TodoItem>();
    }
}
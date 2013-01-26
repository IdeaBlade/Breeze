using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;
using Newtonsoft.Json;

namespace MvcSpaTemplate2012_2.Models
{
    /// <summary>
    /// Data transfer object for <see cref="TodoList"/>
    /// </summary>
    public class TodoListDto
    {
        public TodoListDto() { }

        public TodoListDto(TodoList todoList)
        {
            TodoListId = todoList.TodoListId;
            UserId = todoList.UserId;
            Title = todoList.Title;
            Todos = new List<TodoItemDto>();
            foreach (TodoItem item in todoList.Todos)
            {
                Todos.Add(new TodoItemDto(item));
            }
        }

        [Key]
        public int TodoListId { get; set; }

        [Required]
        public string UserId { get; set; }

        [Required]
        public string Title { get; set; }

        public virtual List<TodoItemDto> Todos { get; set; }

        public TodoList ToEntity()
        {
            TodoList todo = new TodoList
            {
                Title = Title,
                TodoListId = TodoListId,
                UserId = UserId,
                Todos = new List<TodoItem>()
            };
            foreach (TodoItemDto item in Todos)
            {
                todo.Todos.Add(item.ToEntity());
            }

            return todo;
        }
    }
}
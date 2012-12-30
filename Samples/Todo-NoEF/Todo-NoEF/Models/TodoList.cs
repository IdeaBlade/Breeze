using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TodoNoEF.Models
{
    /// <summary>
    /// Todo list entity
    /// </summary>
    public class TodoList
    {
        public int TodoListId { get; set; }

        [Required]
        public string UserId { get; set; }

        [Required]
        public string Title { get; set; }

        public virtual List<TodoItem> Todos { get; set; }
    }
}
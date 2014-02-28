using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace ODataBreezejsSample.Models
{
    public class TodoItem
    {
        public virtual int Id { get; set; }
        public virtual int TodoListId { get; set; }
        public virtual TodoList TodoList { get; set; }
        [Required, MaxLength(60)]
        public virtual string Description { get; set; }
        public virtual bool? IsDone { get; set; }
    }
}
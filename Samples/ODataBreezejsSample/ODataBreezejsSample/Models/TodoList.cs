using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace ODataBreezejsSample.Models
{
    public class TodoList
    {
        public virtual int Id { get; set; }
        [Required, MaxLength(30)]
        public virtual string Title { get; set; }
        public virtual DateTime Created { get; set; }
        public virtual ICollection<TodoItem> TodoItems { get; set; }
    }
}
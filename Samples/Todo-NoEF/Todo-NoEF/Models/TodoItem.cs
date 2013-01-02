using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ToDoNoEF.Models {
  /// <summary>
  /// ToDo item entity
  /// </summary>
  public class ToDoItem {
    public int ToDoItemId { get; set; }

    [Required]
    public string Title { get; set; }
    public bool IsDone { get; set; }

    [ForeignKey("ToDoList")]
    public int ToDoListId { get; set; }
    public virtual ToDoList ToDoList { get; set; }
  }
}
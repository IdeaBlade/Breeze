namespace NoDb.Models {

  public class TodoItem {
    public int    TodoItemId { get; set; }
    public string Title { get; set; }
    public bool   IsDone { get; set; }

    public int TodoListId { get; set; }  // Foreign key
    public virtual TodoList TodoList { get; set; }
  }
}
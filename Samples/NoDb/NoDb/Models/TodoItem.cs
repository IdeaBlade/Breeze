namespace NoDb.Models {

  public class TodoItem {
    public int TodoItemId { get; set; }
    public string Title { get; set; }
    public bool IsDone { get; set; }

    public int TodoListId { get; set; }  // Foreign key
    public virtual TodoList TodoList { get; set; }

    public string Validate()
    {
        var errs = string.Empty;
        if (TodoItemId <= 0)
        {
            errs += "TodoItemId must be a positive integer";
        }
        if (string.IsNullOrWhiteSpace(Title))
        {
            errs += "Title is required";
        }
        else if (Title.Length > 30)
        {
            errs += "Title cannot be longer than 30 characters";
        }
        if (TodoListId <= 0)
        {
            errs += "TodoListId must be a positive integer";
        }
        return errs;
    }
  }
}
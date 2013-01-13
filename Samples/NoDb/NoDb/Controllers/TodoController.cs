namespace NoDb.Controllers {
    using System.Linq;
    using System.Web.Http;
    using Breeze.WebApi;
    using Models;
    using Newtonsoft.Json.Linq;

    //[Authorize]
    [BreezeController]
    public class TodoController : ApiController
    {
        private readonly TodoContextProvider _context;

        public TodoController() {
            _context = new TodoContextProvider(User);
        }

        // POST ~/api/BreezeTodo/SaveChanges
        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _context.SaveChanges(saveBundle);
        }

        // GET ~/api/BreezeTodo/TodoList
        // GET ~/api/breezetodo/todolists/?$expand=todos
        [HttpGet]
        public IQueryable<TodoList> TodoLists() {
            return _context.TodoLists
                //.Include("Todos")// do it client-side
                .OrderByDescending(t => t.TodoListId);
        }

    }
}
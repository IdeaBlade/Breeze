namespace $safeprojectname$.Controllers {
    using System.Linq;
    using System.Web.Http;
    using Breeze.WebApi;
    using Models;
    using Newtonsoft.Json.Linq;

    [Authorize]
    [BreezeController]
    public class TodoController : ApiController
    {
        private readonly TodoContextProvider _context;

        public TodoController() {
            _context = new TodoContextProvider(User);
        }

        // GET ~/api/Todo/Metadata 
        [HttpGet]
        public string Metadata() {
            return _context.Metadata();
        }

        // POST ~/api/Todo/SaveChanges
        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle) {
            return _context.SaveChanges(saveBundle);
        }

        // GET ~/api/Todo/TodoList
        [HttpGet]
        public IQueryable<TodoList> TodoLists() {
            return _context.TodoLists
                //.Include("Todos")// do it client-side
                .OrderByDescending(t => t.TodoListId);
        }

    }
}
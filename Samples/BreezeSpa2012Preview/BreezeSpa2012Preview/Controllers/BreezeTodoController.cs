namespace BreezeSpa2012Preview.Controllers {
    using System.Linq;
    using System.Web.Http;
    using Breeze.WebApi;
    using Models;
    using Newtonsoft.Json.Linq;

    [Authorize]
    [JsonFormatter, ODataActionFilter]
    public class BreezeTodoController : ApiController
    {
        private readonly BreezeTodoContext _context;

        public BreezeTodoController() {
            _context = new BreezeTodoContext(User);
        }

        // GET ~/api/BreezeTodo/Metadata 
        [HttpGet]
        public string Metadata() {
            return _context.Metadata();
        }

        // POST ~/api/BreezeTodo/SaveChanges
        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _context.SaveChanges(saveBundle);
        }

        // GET ~/api/BreezeTodo/TodoList
        [HttpGet]
        public IQueryable<TodoList> TodoLists() {
            return _context.TodoLists
                //.Include("Todos")// do it client-side
                .OrderByDescending(t => t.TodoListId);
        }

    }
}
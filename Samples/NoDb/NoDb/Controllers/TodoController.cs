// DISCLAIMER:
// This sample includes the Breeze.WebApi assembly.
// You don't "need" it but we included it because
// we wanted the OData query support and 
// we wanted some help parsing the JSON save bundle 
// from Breeze client which is a convenient way to save 
// a bunch of data in on call
// If you don't want these features, you don't need Breeze.WebApi
namespace NoDb.Controllers {
    using System.Linq;
    using System.Web.Http;
    using Breeze.WebApi;
    using Models;
    using Newtonsoft.Json.Linq;

    [BreezeController]
    public class TodoController : ApiController
    {
        private readonly TodoContextProvider _context;

        public TodoController() {
            _context = new TodoContextProvider();
        }

        // GET ~/api/BreezeTodo/TodoList
        // GET ~/api/breezetodo/todolists/?$expand=todos
        [HttpGet]
        public IQueryable<TodoList> TodoLists()
        {
            return _context.TodoLists
                //.Include("Todos")// do it client-side with Breeze
                .OrderByDescending(t => t.TodoListId);
        }

        // POST ~/api/BreezeTodo/SaveChanges
        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _context.SaveChanges(saveBundle);
        }

    }
}
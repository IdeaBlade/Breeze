// DISCLAIMER:
// This sample includes the Breeze.WebApi assembly.
// You don't "need" it but we are using it because
// we want the OData query support and 
// we want to use the BreezeJS "saveChanges" method
// to save a bunch of data in a single POST
// The Breeze.NET "ContextProvider" and "SaveResult" 
// ease the drudgery but if you don't want these features, 
// you don't need Breeze.WebApi
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
        [HttpGet]
        public IQueryable<TodoList> TodoLists()
        {
            return _context.TodoLists
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
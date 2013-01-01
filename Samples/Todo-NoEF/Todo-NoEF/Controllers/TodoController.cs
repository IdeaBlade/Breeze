namespace ToDoNoEF.Controllers {
    using System.Linq;
    using System.Web.Http;
    using Breeze.WebApi;
    using Models;
    using Newtonsoft.Json.Linq;

    //[Authorize]
    [BreezeController]
    public class ToDoController : ApiController
    {
        private readonly ToDoContextProvider _context;

        public ToDoController() {
            _context = new ToDoContextProvider(User);
        }

        // GET ~/api/BreezeToDo/Metadata 
        [HttpGet]
        public string Metadata() {
            return _context.Metadata();
        }

        // POST ~/api/BreezeToDo/SaveChanges
        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _context.SaveChanges(saveBundle);
        }

        // GET ~/api/BreezeToDo/ToDoList
        // GET ~/api/breezetodo/todolists/?$expand=todos
        [HttpGet]
        public IQueryable<ToDoList> ToDoLists() {
            return _context.ToDoLists
                //.Include("ToDos")// do it client-side
                .OrderByDescending(t => t.ToDoListId);
        }

    }
}
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
        private readonly TodoRepository _repository;

        public TodoController() {
            _repository = new TodoRepository(User);
        }

        // GET ~/api/Todo/Metadata 
        [HttpGet]
        public string Metadata() {
            return _repository.Metadata();
        }

        // POST ~/api/Todo/SaveChanges
        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle) {
            return _repository.SaveChanges(saveBundle);
        }

        // GET ~/api/Todo/TodoList
        [HttpGet]
        public IQueryable<TodoList> TodoLists() {
            return _repository.TodoLists
                //.Include("Todos")// do it client-side
                .OrderByDescending(t => t.TodoListId);
        }
    }
}
namespace Todo.Controllers {
    using System;
    using System.Linq;
    using System.Web.Http;
    using Breeze.WebApi;
    using Models;
    using Newtonsoft.Json.Linq;

    [JsonFormatter, ODataActionFilter]
    public class TodosController : ApiController {

        readonly EFContextProvider<TodosContext> _contextProvider = 
            new EFContextProvider<TodosContext>();

        // ~/api/todos/Metadata 
        [AcceptVerbs("GET")]
        public string Metadata() {
            return _contextProvider.Metadata();
        }

        // ~/api/todos/Todos
        // ~/api/todos/Todos?$filter=IsArchived%20eq%20false&$orderby=CreatedAt 
        [AcceptVerbs("GET")]
        public IQueryable<TodoItem> Todos() {
            return _contextProvider.Context.Todos;
        }

        // ~/api/todos/SaveChanges
        [AcceptVerbs("POST")]
        public SaveResult SaveChanges(JObject saveBundle) {
            return _contextProvider.SaveChanges(saveBundle);
        }

        // ~/api/todos/purge
        [AcceptVerbs("POST")]
        public string Purge()
        {
            TodoDatabaseInitializer.PurgeDatabase(_contextProvider.Context);
            return "purged";
        }

        // ~/api/todos/reset
        [AcceptVerbs("POST")]
        public string Reset()
        {
            Purge();
            TodoDatabaseInitializer.SeedDatabase(_contextProvider.Context);
            return "reset";
        }
    }
}
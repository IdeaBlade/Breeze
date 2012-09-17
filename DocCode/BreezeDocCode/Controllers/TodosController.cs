namespace Todo.Controllers {
    using System;
    using System.Linq;
    using System.Web.Http;
    using Breeze.WebApi;
    using Models;
    using Newtonsoft.Json.Linq;

    public class TodosController : ApiController {

        readonly EFContextProvider<TodosContext> ContextProvider = 
            new EFContextProvider<TodosContext>("TodosContext");

        // ~/api/todos/Metadata 
        [AcceptVerbs("GET")]
        public string Metadata() {
            return ContextProvider.Metadata();
        }

        // ~/api/todos/Todos
        // ~/api/todos/Todos?$filter=IsArchived%20eq%20false&$orderby=CreatedAt 
        [AcceptVerbs("GET")]
        public IQueryable<TodoItem> Todos() {
            return ContextProvider.Context.Todos;
        }

        // ~/api/todos/SaveChanges
        [AcceptVerbs("POST")]
        public SaveResult SaveChanges(JObject saveBundle) {
            return ContextProvider.SaveChanges(saveBundle);
        }

        // ~/api/todos/purge
        [AcceptVerbs("POST")]
        public string Purge()
        {
            TodoDatabaseInitializer.PurgeDatabase(ContextProvider.Context);
            return "purged";
        }

        // ~/api/todos/reset
        [AcceptVerbs("POST")]
        public string Reset()
        {
            Purge();
            TodoDatabaseInitializer.SeedDatabase(ContextProvider.Context);
            return "reset";
        }
    }
}
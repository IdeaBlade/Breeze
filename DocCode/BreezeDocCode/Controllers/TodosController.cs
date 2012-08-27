namespace Todo.Controllers {
    using System;
    using System.Linq;
    using System.Web.Http;
    using Breeze.WebApi;
    using Models;
    using Newtonsoft.Json.Linq;

    public class TodosController : ApiController {

        readonly EFContextProvider<TodosContext> contextProvider = 
            new EFContextProvider<TodosContext>("TodosContext");


        // ~/api/todos/Metadata 
        [AcceptVerbs("GET")]
        public string Metadata() {
            return contextProvider.Metadata();
        }

        // ~/api/todos/Todos
        // ~/api/todos/Todos?$filter=IsArchived%20eq%20false&$orderby=CreatedAt 
        [AcceptVerbs("GET")]
        public IQueryable<TodoItem> Todos() {
            return contextProvider.Context.Todos;
        }

        // ~/api/todos/SaveChanges
        [AcceptVerbs("POST")]
        public SaveResult SaveChanges(JArray saveBundle) {
            return contextProvider.SaveChanges(saveBundle);
        }

        // ~/api/todos/purge
        [AcceptVerbs("POST")]
        public string Purge()
        {
            TodoDatabaseInitializer.PurgeDatabase(contextProvider.Context);
            return "purged";
        }

        // ~/api/todos/reset
        [AcceptVerbs("POST")]
        public string Reset()
        {
            Purge();
            TodoDatabaseInitializer.SeedDatabase(contextProvider.Context);
            return "reset";
        }
    }
}
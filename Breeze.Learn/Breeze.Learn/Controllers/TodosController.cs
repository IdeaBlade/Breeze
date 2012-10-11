namespace Todo.Controllers {
    using System;
    using System.Linq;
    using System.Web;
    using System.Web.Http;
    using Breeze.WebApi;
    using Models;
    using Newtonsoft.Json.Linq;

    public class TodosController : ApiController {

        static readonly TimeSpan RefreshRate = TimeSpan.FromMinutes(20);
        private static readonly object Locker = new object();
        static DateTime _lastRefresh = DateTime.Now; // will first clear db at Now + "RefreshRate" 
        // static DateTime lastRefresh = DateTime.MinValue; // will clear when server starts

        readonly EFContextProvider<TodosContext> _contextProvider =
            new EFContextProvider<TodosContext>();

        public TodosController()
        {
            PeriodicReset();
            //var sessionId = HttpContext.Current.Session.SessionID; //use this to key all requests for data
        }


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

        /// <summary>
        /// Reset the database to it's initial data state after the server has run 
        /// for "RefreshRate" minutes.
        /// </summary>
        private void PeriodicReset()
        {
            if ((DateTime.Now - _lastRefresh) > RefreshRate)
            {
                lock (Locker)
                {
                    if ((DateTime.Now - _lastRefresh) > RefreshRate)
                    {
                        _lastRefresh = DateTime.Now;
                        Reset();
                    }
                }
            }
        }
    }
}
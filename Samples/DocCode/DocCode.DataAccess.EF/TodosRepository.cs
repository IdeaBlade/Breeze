using System.Linq;
using Breeze.WebApi;
using Breeze.WebApi.EF;
using Newtonsoft.Json.Linq;
using Todo.Models;

namespace DocCode.DataAccess
{
    /// <summary>
    /// Repository (a "Unit of Work" really) of Todos models.
    /// </summary>
    public class TodosRepository
    {
        private readonly EFContextProvider<TodosContext>
            _contextProvider = new EFContextProvider<TodosContext>();

        private TodosContext Context { get { return _contextProvider.Context; } }

        public string Metadata
        {
            get { return _contextProvider.Metadata(); }
        }

        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _contextProvider.SaveChanges(saveBundle);
        }

        public IQueryable<TodoItem> Todos
        {
            get { return _contextProvider.Context.Todos; }
        }

        #region Purge/Reset

        public string Purge()
        {
            TodosDbInitializer.PurgeDatabase(Context);
            return "purged";
        }

        public string Reset()
        {
            Purge();
            TodosDbInitializer.ResetDatabase(Context);
            return "reset";
        }

        #endregion

    }
}

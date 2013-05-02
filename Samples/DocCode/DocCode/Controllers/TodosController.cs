using System.Linq;
using System.Web.Http;
using Breeze.WebApi;
using Newtonsoft.Json.Linq;
using DocCode.DataAccess;
using Todo.Models;

namespace DocCode.Controllers 
{
    [BreezeController]
    public class TodosController : ApiController 
    {
        // Todo: inject via an interface rather than "new" the concrete class
        readonly TodosRepository _repository = new TodosRepository();

        // ~/breeze/inheritance/Metadata 
        [HttpGet]
        public string Metadata()
        {
            return _repository.Metadata;
        }

        // ~/breeze/inheritance/SaveChanges
        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _repository.SaveChanges(saveBundle);
        }

        // ~/breeze/todos/Todos
        // ~/breeze/todos/Todos?$filter=IsArchived%20eq%20false&$orderby=CreatedAt 
        [HttpGet]
        public IQueryable<TodoItem> Todos() {
            return _repository.Todos;
        }

        #region Purge/Reset

        // ~/breeze/todos/purge
        [HttpPost]
        public string Purge()
        {
            return _repository.Purge();
        }

        // ~/breeze/todos/reset
        [HttpPost]
        public string Reset()
        {
            return _repository.Reset();
        }
        #endregion
    }
}
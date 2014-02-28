using System.Data.Entity;
using System.Data.Entity.Infrastructure;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using System.Web.Http;
using System.Web.Http.OData;
using ODataBreezejsSample.Models;

namespace ODataBreezejsSample.Controllers
{
    public class TodoListsController : ODataController
    {
        private readonly TodoListContext db = new TodoListContext();

        // GET odata/TodoLists
        [Queryable]
        public IQueryable<TodoList> GetTodoLists()
        {
            return db.TodoLists;
        }

        // GET odata/TodoLists(5)
        [Queryable]
        public SingleResult<TodoList> GetTodoList([FromODataUri] int key)
        {
            return SingleResult.Create(db.TodoLists.Where(todolist => todolist.Id == key));
        }

        // PUT odata/TodoLists(5)
        public async Task<IHttpActionResult> Put([FromODataUri] int key, TodoList todolist)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (key != todolist.Id)
            {
                return BadRequest();
            }

            db.Entry(todolist).State = EntityState.Modified;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TodoListExists(key))
                {
                    return NotFound();
                }
                throw;
            }

            return Updated(todolist);
        }

        // POST odata/TodoLists
        public async Task<IHttpActionResult> Post(TodoList todolist)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            db.TodoLists.Add(todolist);
            await db.SaveChangesAsync();

            return Created(todolist);
        }

        // PATCH odata/TodoLists(5)
        [AcceptVerbs("PATCH", "MERGE")]
        public async Task<IHttpActionResult> Patch([FromODataUri] int key, Delta<TodoList> patch)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            TodoList todolist = await db.TodoLists.FindAsync(key);
            if (todolist == null)
            {
                return NotFound();
            }

            patch.Patch(todolist);

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TodoListExists(key))
                {
                    return NotFound();
                }
                throw;
            }

            return Updated(todolist);
        }

        // DELETE odata/TodoLists(5)
        public async Task<IHttpActionResult> Delete([FromODataUri] int key)
        {
            TodoList todolist = await db.TodoLists.FindAsync(key);
            if (todolist == null)
            {
                return NotFound();
            }

            db.TodoLists.Remove(todolist);
            await db.SaveChangesAsync();

            return StatusCode(HttpStatusCode.NoContent);
        }

        // GET odata/TodoLists(5)/TodoItems
        [Queryable]
        public IQueryable<TodoItem> GetTodoItems([FromODataUri] int key)
        {
            return db.TodoLists.Where(m => m.Id == key).SelectMany(m => m.TodoItems);
        }

        private bool TodoListExists(int key)
        {
            return db.TodoLists.Count(e => e.Id == key) > 0;
        }
    }
}

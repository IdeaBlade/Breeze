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
    public class TodoItemsController : ODataController
    {
        private readonly TodoListContext db = new TodoListContext();

        // GET odata/TodoItems
        [Queryable]
        public IQueryable<TodoItem> GetTodoItems()
        {
            return db.TodoItems;
        }

        // GET odata/TodoItems(5)
        [Queryable]
        public SingleResult<TodoItem> GetTodoItem([FromODataUri] int key)
        {
            return SingleResult.Create(db.TodoItems.Where(todoitem => todoitem.Id == key));
        }

        // PUT odata/TodoItems(5)
        public async Task<IHttpActionResult> Put([FromODataUri] int key, TodoItem todoitem)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (key != todoitem.Id)
            {
                return BadRequest();
            }

            db.Entry(todoitem).State = EntityState.Modified;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TodoItemExists(key))
                {
                    return NotFound();
                }
                throw;
            }

            return Updated(todoitem);
        }

        // POST odata/TodoItems
        public async Task<IHttpActionResult> Post(TodoItem todoitem)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            db.TodoItems.Add(todoitem);
            await db.SaveChangesAsync();

            return Created(todoitem);
        }

        // PATCH odata/TodoItems(5)
        [AcceptVerbs("PATCH", "MERGE")]
        public async Task<IHttpActionResult> Patch([FromODataUri] int key, Delta<TodoItem> patch)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            TodoItem todoitem = await db.TodoItems.FindAsync(key);
            if (todoitem == null)
            {
                return NotFound();
            }

            patch.Patch(todoitem);

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TodoItemExists(key))
                {
                    return NotFound();
                }
                throw;
            }

            return Updated(todoitem);
        }

        // DELETE odata/TodoItems(5)
        public async Task<IHttpActionResult> Delete([FromODataUri] int key)
        {
            TodoItem todoitem = await db.TodoItems.FindAsync(key);
            if (todoitem == null)
            {
                return NotFound();
            }

            db.TodoItems.Remove(todoitem);
            await db.SaveChangesAsync();

            return StatusCode(HttpStatusCode.NoContent);
        }

        // GET odata/TodoItems(5)/TodoList
        [Queryable]
        public SingleResult<TodoList> GetTodoList([FromODataUri] int key)
        {
            return SingleResult.Create(db.TodoItems.Where(m => m.Id == key).Select(m => m.TodoList));
        }

        private bool TodoItemExists(int key)
        {
            return db.TodoItems.Count(e => e.Id == key) > 0;
        }
    }
}

using System;
using System.Data;
using System.Data.Entity.Infrastructure;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using MvcSpaTemplate2012_2.Models;

namespace MvcSpaTemplate2012_2.Controllers
{
    [Authorize]
    public class TodoController : ApiController
    {
        private TodoItemContext db = new TodoItemContext();

        // PUT api/Todo/5
        public HttpResponseMessage PutTodoItem(int id, TodoItemDto todoItemDto)
        {
            if (!ModelState.IsValid)
            {
                return Request.CreateErrorResponse(HttpStatusCode.BadRequest, ModelState);
            }

            if (id != todoItemDto.TodoItemId)
            {
                return Request.CreateResponse(HttpStatusCode.BadRequest);
            }

            TodoItem todoItem = todoItemDto.ToEntity();
            TodoList todoList = db.TodoLists.Find(todoItem.TodoListId);
            if (todoList == null)
            {
                return Request.CreateResponse(HttpStatusCode.NotFound);
            }

            if (todoList.UserId != User.Identity.Name)
            {
                // Trying to modify a record that does not belong to the user
                return Request.CreateResponse(HttpStatusCode.Unauthorized);
            }

            // Need to detach to avoid duplicate primary key exception when SaveChanges is called
            db.Entry(todoList).State = EntityState.Detached;
            db.Entry(todoItem).State = EntityState.Modified;

            try
            {
                db.SaveChanges();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Request.CreateResponse(HttpStatusCode.InternalServerError);
            }

            return Request.CreateResponse(HttpStatusCode.OK);
        }

        // POST api/Todo
        public HttpResponseMessage PostTodoItem(TodoItemDto todoItemDto)
        {
            if (!ModelState.IsValid)
            {
                return Request.CreateErrorResponse(HttpStatusCode.BadRequest, ModelState);
            }

            TodoList todoList = db.TodoLists.Find(todoItemDto.TodoListId);
            if (todoList == null)
            {
                return Request.CreateResponse(HttpStatusCode.NotFound);
            }

            if (todoList.UserId != User.Identity.Name)
            {
                // Trying to add a record that does not belong to the user
                return Request.CreateResponse(HttpStatusCode.Unauthorized);
            }

            TodoItem todoItem = todoItemDto.ToEntity();

            // Need to detach to avoid loop reference exception during JSON serialization
            db.Entry(todoList).State = EntityState.Detached;
            db.TodoItems.Add(todoItem);
            db.SaveChanges();
            todoItemDto.TodoItemId = todoItem.TodoItemId;

            HttpResponseMessage response = Request.CreateResponse(HttpStatusCode.Created, todoItemDto);
            response.Headers.Location = new Uri(Url.Link("DefaultApi", new { id = todoItemDto.TodoItemId }));
            return response;
        }

        // DELETE api/Todo/5
        public HttpResponseMessage DeleteTodoItem(int id)
        {
            TodoItem todoItem = db.TodoItems.Find(id);
            if (todoItem == null)
            {
                return Request.CreateResponse(HttpStatusCode.NotFound);
            }

            if (db.Entry(todoItem.TodoList).Entity.UserId != User.Identity.Name)
            {
                // Trying to delete a record that does not belong to the user
                return Request.CreateResponse(HttpStatusCode.Unauthorized);
            }

            TodoItemDto todoItemDto = new TodoItemDto(todoItem);
            db.TodoItems.Remove(todoItem);

            try
            {
                db.SaveChanges();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Request.CreateResponse(HttpStatusCode.InternalServerError);
            }

            return Request.CreateResponse(HttpStatusCode.OK, todoItemDto);
        }

        protected override void Dispose(bool disposing)
        {
            db.Dispose();
            base.Dispose(disposing);
        }
    }
}
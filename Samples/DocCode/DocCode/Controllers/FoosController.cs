using System.Linq;
using System.Web.Http;
using DocCode.DataAccess;
using FooBar.Models;

namespace DocCode.Controllers 
{
    /// <summary>
    /// A vanilla Web API controller for the type <see cref="Foo"/>.
    /// </summary>
    public class FoosController : ApiController 
    {
       readonly FooBarRepository _repository = new FooBarRepository();

       public IQueryable<Foo> Get()
       {
           return _repository.Foos.AsQueryable();
       }

       public Foo Get(int id)
       {
           return _repository.GetFooById(id);
       }

       public Foo Post(Foo foo) 
       {
           return _repository.Insert(foo);
       }

       public void Put(Foo foo)
       {
           _repository.Update(foo);
       }

       public void Delete(Foo foo)
       {
           _repository.Delete(foo);
       }

    }

}
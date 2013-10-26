using System.Data.Entity;
using System.Linq;
using System.Web.Http;
using Breeze.WebApi2;
using Northwind.Models;

namespace DocCode.Controllers.MultiControllers
{
    /// <summary>
    /// Orders controller of the controller-per-type variety.
    /// </summary>
    [BreezeController]
    public class OrdersController : MultiBaseController
    {
        [HttpGet]
        public IQueryable<Order> Get() { // doesn't matter what you call it
            return Repository.Orders.Include("OrderDetails");
        }

        [HttpGet]
        public Order Get(int id) // doesn't matter what you call it
        {
            return Repository.Orders
                .Include("OrderDetails")
                .FirstOrDefault(o => o.OrderID == id);
        }
    }
}
using System;
using System.Data.Common;
using System.Linq;
using Zza.Interfaces;
using Zza.Model;

namespace Zza.DataAccess.EF
{
    internal class ZzaSaveDataProvider : IZzaSaveDataProvider
    {
        private readonly ZzaContext context;

        public ZzaSaveDataProvider(DbConnection connection)
        {
            //context = new ZzaContext(connection); // not working yet
            context = new ZzaContext();
        }

        public object GetExisting(object o, bool cacheOk=true)
        {
            if (o == null) return null;
            if (o is Customer) return GetCustomerById(((Customer)o).Id, cacheOk);
            if (o is Order) return GetOrderById(((Order)o).Id, cacheOk);
            if (o is OrderItem) return GetOrderItemById(((OrderItem)o).Id, cacheOk);
            if (o is OrderItemOption) return GetOrderItemOptionById(((OrderItemOption)o).Id, cacheOk);
            return null;
        }

        #region GetByIdFns

        public Customer GetCustomerById(Guid id, bool cacheOk = true)
        {
            Customer o = null;
            if (cacheOk)
            {
                o = context.ChangeTracker.Entries<Customer>().Select(e => e.Entity)
                           .SingleOrDefault(e => e.Id == id);
            }
            return o ?? context.Set<Customer>().SingleOrDefault(e => e.Id == id);
        }

        public Order GetOrderById(long id, bool cacheOk = true)
        {
            Order o = null;
            if (cacheOk)
            {
                o = context.ChangeTracker.Entries<Order>().Select(e => e.Entity)
                           .SingleOrDefault(e => e.Id == id);
            }
            return o ?? context.Set<Order>().SingleOrDefault(e => e.Id == id);
        }

        public OrderItem GetOrderItemById(long id, bool cacheOk = true)
        {
            OrderItem o = null;
            if (cacheOk)
            {
                o = context.ChangeTracker.Entries<OrderItem>().Select(e => e.Entity)
                           .SingleOrDefault(e => e.Id == id);
            }
            return o ?? context.Set<OrderItem>().SingleOrDefault(e => e.Id == id);
        }

        public OrderItemOption GetOrderItemOptionById(long id, bool cacheOk = true)
        {
            OrderItemOption o = null;
            if (cacheOk)
            {
                o = context.ChangeTracker.Entries<OrderItemOption>().Select(e => e.Entity)
                           .SingleOrDefault(e => e.Id == id);
            }
            return o ?? context.Set<OrderItemOption>().SingleOrDefault(e => e.Id == id);
        }

        #endregion

    }
}
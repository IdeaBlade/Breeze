using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Breeze.Nhibernate.WebApi;
using Zza.Model;

namespace Zza.DataAccess
{
    public class ZzaContext : NHContext
    {
        public ZzaContext() : base(NHConfig.OpenSession(), NHConfig.Configuration) { }

        public NhQueryableInclude<Customer> Customers
        {
            get { return GetQuery<Customer>(); }
        }
        public NhQueryableInclude<Order> Orders
        {
            get { return GetQuery<Order>(); }
        }
        public NhQueryableInclude<OrderItem> OrderItems
        {
            get { return GetQuery<OrderItem>(); }
        }
        public NhQueryableInclude<OrderItemOption> OrderItemOptions
        {
            get { return GetQuery<OrderItemOption>(); }
        }
        public NhQueryableInclude<OrderStatus> OrderStatii
        {
            get { return GetQuery<OrderStatus>(); }
        }
        public NhQueryableInclude<Product> Products
        {
            get { return GetQuery<Product>(); }
        }
        public NhQueryableInclude<ProductOption> ProductOptions
        {
            get { return GetQuery<ProductOption>(); }
        }
        public NhQueryableInclude<ProductSize> ProductSizes
        {
            get { return GetQuery<ProductSize>(); }
        }

    }
}

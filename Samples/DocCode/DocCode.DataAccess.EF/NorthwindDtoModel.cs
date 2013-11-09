using System;
using System.Collections.Generic;

namespace Northwind.DtoModels
{
    public class Customer
    {
        public Guid CustomerID { get; set; }
        public string CompanyName { get; set; }
        public ICollection<Order> Orders { get; set; }
    }

    public class Order 
    {
        public int OrderID { get; set; }
        public Guid? CustomerID { get; set; }
        public DateTime? OrderDate { get; set; }
        public DateTime? RequiredDate { get; set; }
        public DateTime? ShippedDate { get; set; }
        public decimal? Freight { get; set; }
        public int RowVersion { get; set; }

        public Customer Customer { get; set; }
        public ICollection<OrderDetail> OrderDetails { get; set; }
    }

    public class OrderDetail
    {
        public int OrderID { get; set; }
        public int ProductID { get; set; }
        public decimal UnitPrice { get; set; }
        public short Quantity { get; set; }
        public float Discount { get; set; }
        public int RowVersion { get; set; }

        public Order Order { get; set; }
        public Product Product { get; set; }
    }

    public class Product
    {
        public int ProductID { get; set; }
        public string ProductName { get; set; }
    }
}

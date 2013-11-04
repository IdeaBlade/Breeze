using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace Northwind.DtoModels
{

    #region CustomerDto class
    public class Customer
    {
        public Guid CustomerID { get; set; }

        [Required, MaxLength(40)]
        public string CompanyName { get; set; }

        public ICollection<Order> Orders { get; set; }

    }
    #endregion CustomerDto class

    #region OrderDto class

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

        [JsonIgnore]
        public Guid? UserSessionId { get; set; }

    }
    #endregion OrderDto class

    #region OrderDetail class

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

    #endregion OrderDetailDto class

    #region ProductDto class

    public class Product
    {
        public int ProductID { get; set; }

        [Required, MaxLength(40)]
        public string ProductName { get; set; }
    }
    #endregion ProductDto class

}

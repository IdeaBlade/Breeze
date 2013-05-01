namespace Models.NorthwindIB.NH
{
    using System;
    using System.Collections.Generic;

    public partial class Order
    {
        public Order()
        {
            this.OrderDetails = new HashSet<OrderDetail>();
        }

        public virtual int OrderID { get; set; }
        public virtual Nullable<System.Guid> CustomerID { get; set; }
        public virtual Nullable<int> EmployeeID { get; set; }
        public virtual Nullable<System.DateTime> OrderDate { get; set; }
        public virtual Nullable<System.DateTime> RequiredDate { get; set; }
        public virtual Nullable<System.DateTime> ShippedDate { get; set; }
        public virtual Nullable<decimal> Freight { get; set; }
        public virtual string ShipName { get; set; }
        public virtual string ShipAddress { get; set; }
        public virtual string ShipCity { get; set; }
        public virtual string ShipRegion { get; set; }
        public virtual string ShipPostalCode { get; set; }
        public virtual string ShipCountry { get; set; }
        public virtual int RowVersion { get; set; }

        public virtual Customer Customer { get; set; }
        public virtual Employee Employee { get; set; }
        public virtual InternationalOrder InternationalOrder { get; set; }
        public virtual ICollection<OrderDetail> OrderDetails { get; set; }
    }
}

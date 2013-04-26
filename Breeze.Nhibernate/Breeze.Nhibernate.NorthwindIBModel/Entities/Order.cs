using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Breeze.Nhibernate.NorthwindIBModel
{

    /// <summary>
    /// Class representing Order table
    /// </summary>
    public class Order
    {

        public Order()
        {
            OrderDetailCollection = new List<OrderDetail>();
        }
        
        public virtual int OrderId { get; set; }

        public virtual DateTime? OrderDate { get; set; }

        public virtual DateTime? RequiredDate { get; set; }

        public virtual DateTime? ShippedDate { get; set; }

        [Range(typeof(decimal), "0", "999999999999999")]
        public virtual decimal? Freight { get; set; }

        [StringLength(40)]
        public virtual string ShipName { get; set; }

        [StringLength(60)]
        public virtual string ShipAddress { get; set; }

        [StringLength(15)]
        public virtual string ShipCity { get; set; }

        [StringLength(15)]
        public virtual string ShipRegion { get; set; }

        [StringLength(10)]
        public virtual string ShipPostalCode { get; set; }

        [StringLength(15)]
        public virtual string ShipCountry { get; set; }

        [Required]
        public virtual int RowVersion { get; set; }

        public virtual Customer Customer { get; set; }

        public virtual Employee Employee { get; set; }

        public virtual InternationalOrder InternationalOrder { get; set; }

        public virtual IList<OrderDetail> OrderDetailCollection { get; protected set; }

        #region overrides

        public override string ToString()
        {
            return "[OrderId] = " + OrderId;

        }

        public override int GetHashCode()
        {
            if (OrderId == 0) return base.GetHashCode(); //transient instance
            return OrderId;

        }

        public override bool Equals(object obj)
        {
            var x = obj as Order;
            if (x == null) return false;
            if (OrderId == 0 && x.OrderId == 0) return ReferenceEquals(this, x);
            return (OrderId == x.OrderId);

        }
        #endregion
    }
}

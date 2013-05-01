namespace Models.NorthwindIB.NH
{
    using System;
    using System.Collections.Generic;

    public partial class OrderDetail
    {
        public virtual int OrderID { get; set; }
        public virtual int ProductID { get; set; }
        public virtual decimal UnitPrice { get; set; }
        public virtual short Quantity { get; set; }
        public virtual float Discount { get; set; }
        public virtual int RowVersion { get; set; }

        public virtual Order Order { get; set; }
        public virtual Product Product { get; set; }

        public override int GetHashCode()
        {
            if (OrderID == 0) return base.GetHashCode(); //transient instance
            if (ProductID == 0) return base.GetHashCode(); //transient instance
            return OrderID.GetHashCode() ^ ProductID.GetHashCode();

        }

        public override bool Equals(object obj)
        {
            var x = obj as OrderDetail;
            if (x == null) return false;
            if (OrderID == 0 && x.OrderID == 0) return ReferenceEquals(this, x);
            if (ProductID == 0 && x.ProductID == 0) return ReferenceEquals(this, x);
            return (OrderID == x.OrderID) && (ProductID == x.ProductID);

        }

    }
}

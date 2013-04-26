using System;
using System.ComponentModel.DataAnnotations;

namespace Breeze.Nhibernate.NorthwindIBModel
{

    /// <summary>
    /// Class representing OrderDetail table
    /// </summary>
    public class OrderDetail
    {
        [Required]
        public virtual int OrderId { get; set; }

        [Required]
        public virtual int ProductId { get; set; }

        [Required]
        [Range(typeof(decimal), "0", "999999999999999")]
        public virtual decimal UnitPrice { get; set; }

        [Required]
        public virtual int Quantity { get; set; }

        [Required]
        public virtual float Discount { get; set; }

        [Required]
        public virtual int RowVersion { get; set; }

        public virtual Order Order { get; set; }

        public virtual Product Product { get; set; }


        #region overrides for composite key handling

        public override string ToString()
        {
            return "[OrderId] = " + OrderId + " [ProductId] = " + ProductId;

        }

        public override int GetHashCode()
        {
            if (OrderId == 0) return base.GetHashCode(); //transient instance
            if (ProductId == 0) return base.GetHashCode(); //transient instance
            return OrderId.GetHashCode() ^ ProductId.GetHashCode();

        }

        public override bool Equals(object obj)
        {
            var x = obj as OrderDetail;
            if (x == null) return false;
            if (OrderId == 0 && x.OrderId == 0) return ReferenceEquals(this, x);
            if (ProductId == 0 && x.ProductId == 0) return ReferenceEquals(this, x);
            return (OrderId == x.OrderId) && (ProductId == x.ProductId);

        }
        #endregion
    }
}

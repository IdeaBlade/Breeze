using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Breeze.Nhibernate.NorthwindIBModel
{

    /// <summary>
    /// Class representing Product table
    /// </summary>
    public class Product
    {

        public Product()
        {
            OrderDetailCollection = new List<OrderDetail>();
        }
        
        public virtual int ProductId { get; set; }

        [Required]
        [StringLength(40)]
        public virtual string ProductName { get; set; }

        [StringLength(20)]
        public virtual string QuantityPerUnit { get; set; }

        [Range(typeof(decimal), "0", "999999999999999")]
        public virtual decimal? UnitPrice { get; set; }

        public virtual int? UnitsInStock { get; set; }

        public virtual int? UnitsOnOrder { get; set; }

        public virtual int? ReorderLevel { get; set; }

        [Required]
        public virtual bool Discontinued { get; set; }

        public virtual DateTime? DiscontinuedDate { get; set; }

        [Required]
        public virtual int RowVersion { get; set; }

        public virtual Category Category { get; set; }

        public virtual Supplier Supplier { get; set; }

        public virtual IList<OrderDetail> OrderDetailCollection { get; protected set; }

        #region overrides

        public override string ToString()
        {
            return "[ProductId] = " + ProductId;

        }

        public override int GetHashCode()
        {
            if (ProductId == 0) return base.GetHashCode(); //transient instance
            return ProductId;

        }

        public override bool Equals(object obj)
        {
            var x = obj as Product;
            if (x == null) return false;
            if (ProductId == 0 && x.ProductId == 0) return ReferenceEquals(this, x);
            return (ProductId == x.ProductId);

        }
        #endregion
    }
}

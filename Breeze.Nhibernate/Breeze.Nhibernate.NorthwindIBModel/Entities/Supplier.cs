using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Breeze.Nhibernate.NorthwindIBModel
{

    /// <summary>
    /// Class representing Supplier table
    /// </summary>
    public class Supplier
    {

        public Supplier()
        {
            ProductCollection = new List<Product>();
        }
        
        public virtual int SupplierId { get; set; }

        [Required]
        [StringLength(40)]
        public virtual string CompanyName { get; set; }

        [StringLength(30)]
        public virtual string ContactName { get; set; }

        [StringLength(30)]
        public virtual string ContactTitle { get; set; }

        [StringLength(60)]
        public virtual string Address { get; set; }

        [StringLength(15)]
        public virtual string City { get; set; }

        [StringLength(15)]
        public virtual string Region { get; set; }

        [StringLength(10)]
        public virtual string PostalCode { get; set; }

        [StringLength(15)]
        public virtual string Country { get; set; }

        [StringLength(24)]
        public virtual string Phone { get; set; }

        [StringLength(24)]
        public virtual string Fax { get; set; }

        public virtual string HomePage { get; set; }

        [Required]
        public virtual int RowVersion { get; set; }

        public virtual IList<Product> ProductCollection { get; protected set; }

        #region overrides

        public override string ToString()
        {
            return "[SupplierId] = " + SupplierId;

        }

        public override int GetHashCode()
        {
            if (SupplierId == 0) return base.GetHashCode(); //transient instance
            return SupplierId;

        }

        public override bool Equals(object obj)
        {
            var x = obj as Supplier;
            if (x == null) return false;
            if (SupplierId == 0 && x.SupplierId == 0) return ReferenceEquals(this, x);
            return (SupplierId == x.SupplierId);

        }
        #endregion
    }
}

using System;
using System.ComponentModel.DataAnnotations;

namespace Breeze.Nhibernate.NorthwindIBModel
{

    /// <summary>
    /// Class representing InternationalOrder table
    /// </summary>
    public class InternationalOrder
    {
        public virtual int OrderId { get; set; }

        [Required]
        [StringLength(100)]
        public virtual string CustomsDescription { get; set; }

        [Required]
        [Range(typeof(decimal), "0", "999999999999999")]
        public virtual decimal ExciseTax { get; set; }

        [Required]
        public virtual int RowVersion { get; set; }

        public virtual Order Order { get; set; }

        #region overrides

        public override string ToString()
        {
            return "[OrderId] = " + OrderId;

        }

        public override int GetHashCode()
        {
            if (OrderId == 0) return base.GetHashCode(); //transient instance
            return OrderId.GetHashCode();

        }

        public override bool Equals(object obj)
        {
            if (!(obj is InternationalOrder)) return false;
            var x = obj as InternationalOrder;
            if (x == null) return false;
            if (OrderId == 0 && x.OrderId == 0) return ReferenceEquals(this, x);
            return (OrderId == x.OrderId);

        }
        #endregion
    }
}

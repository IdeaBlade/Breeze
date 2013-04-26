using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Breeze.Nhibernate.NorthwindIBModel
{

    /// <summary>
    /// Class representing Customer table
    /// </summary>
    public class Customer
    {

        public Customer()
        {
            OrderCollection = new List<Order>();
        }
        
        public virtual System.Guid CustomerId { get; set; }

        [StringLength(5)]
        public virtual string CustomeridOLD { get; set; }

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

        public virtual int? RowVersion { get; set; }

        public virtual IList<Order> OrderCollection { get; protected set; }

        #region overrides

        public override string ToString()
        {
            return "[CustomerId] = " + CustomerId;

        }

        public override int GetHashCode()
        {
            return CustomerId.GetHashCode();

        }

        public override bool Equals(object obj)
        {
            var x = obj as Customer;
            if (x == null) return false;
            return (CustomerId == x.CustomerId);

        }
        #endregion
    }
}

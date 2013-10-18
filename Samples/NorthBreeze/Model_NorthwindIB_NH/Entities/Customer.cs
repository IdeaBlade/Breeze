namespace Models.NorthwindIB.NH
{
    using System;
    using System.Collections.Generic;

    public partial class Customer
    {
        public Customer()
        {
            this.Orders = new HashSet<Order>();
        }

        public virtual System.Guid CustomerID { get; set; }
        public virtual string CustomerID_OLD { get; set; }
        public virtual string CompanyName { get; set; }
        public virtual string ContactName { get; set; }
        public virtual string ContactTitle { get; set; }
        public virtual string Address { get; set; }
        public virtual string City { get; set; }
        public virtual string Region { get; set; }
        public virtual string PostalCode { get; set; }
        public virtual string Country { get; set; }
        public virtual string Phone { get; set; }
        public virtual string Fax { get; set; }
        public virtual int RowVersion { get; set; }

        public virtual ICollection<Order> Orders { get; set; }
    }
}

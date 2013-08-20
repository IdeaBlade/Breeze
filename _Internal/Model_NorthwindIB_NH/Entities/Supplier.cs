namespace Models.NorthwindIB.NH
{
    using System;
    using System.Collections.Generic;

    public partial class Supplier
    {
        private Location _location;
        public Supplier()
        {
            this.Products = new HashSet<Product>();
        }

        public virtual int SupplierID { get; set; }
        public virtual string CompanyName { get; set; }
        public virtual string ContactName { get; set; }
        public virtual string ContactTitle { get; set; }
        public virtual string Phone { get; set; }
        public virtual string Fax { get; set; }
        public virtual string HomePage { get; set; }
        public virtual int RowVersion { get; set; }

        public virtual Location Location
        {
            get { return _location ?? (_location = new Location()); }
            set { _location = value; }
        }

        public virtual ICollection<Product> Products { get; set; }
    }
}

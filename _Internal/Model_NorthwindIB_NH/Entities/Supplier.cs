namespace Models.NorthwindIB.NH
{
    using System;
    using System.Collections.Generic;

    public partial class Supplier
    {
        public Supplier()
        {
            this.Products = new HashSet<Product>();
            this.Location = new Location();
        }

        public virtual int SupplierID { get; set; }
        public virtual string CompanyName { get; set; }
        public virtual string ContactName { get; set; }
        public virtual string ContactTitle { get; set; }
        public virtual string Phone { get; set; }
        public virtual string Fax { get; set; }
        public virtual string HomePage { get; set; }
        public virtual int RowVersion { get; set; }

        public virtual Location Location { get; set; }

        public virtual ICollection<Product> Products { get; set; }
    }
}

namespace Models.NorthwindIB.NH
{
    using System;
    using System.Collections.Generic;

    public partial class Category
    {
        public Category()
        {
            this.Products = new HashSet<Product>();
        }

        public virtual int CategoryID { get; set; }
        public virtual string CategoryName { get; set; }
        public virtual string Description { get; set; }
        public virtual byte[] Picture { get; set; }
        public virtual int RowVersion { get; set; }

        public virtual ICollection<Product> Products { get; set; }
    }
}

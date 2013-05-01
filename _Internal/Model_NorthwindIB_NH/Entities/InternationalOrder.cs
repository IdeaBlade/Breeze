namespace Models.NorthwindIB.NH
{
    using System;
    using System.Collections.Generic;

    public partial class InternationalOrder
    {
        public virtual int OrderID { get; set; }
        public virtual string CustomsDescription { get; set; }
        public virtual decimal ExciseTax { get; set; }
        public virtual int RowVersion { get; set; }

        public virtual Order Order { get; set; }
    }
}

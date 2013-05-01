namespace Models.NorthwindIB.NH
{
    using System;
    using System.Collections.Generic;

    public partial class Region
    {
        public Region()
        {
            this.Territories = new HashSet<Territory>();
        }

        public virtual int RegionID { get; set; }
        public virtual string RegionDescription { get; set; }
        public virtual int RowVersion { get; set; }

        public virtual ICollection<Territory> Territories { get; set; }
    }
}

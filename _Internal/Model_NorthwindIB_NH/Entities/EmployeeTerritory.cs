namespace Models.NorthwindIB.NH
{
    using System;
    using System.Collections.Generic;

    public partial class EmployeeTerritory
    {
        public virtual int ID { get; set; }
        public virtual int EmployeeID { get; set; }
        public virtual int TerritoryID { get; set; }
        public virtual int RowVersion { get; set; }

        public virtual Employee Employee { get; set; }
        public virtual Territory Territory { get; set; }
    }
}

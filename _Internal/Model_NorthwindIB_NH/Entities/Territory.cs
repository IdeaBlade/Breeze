namespace Models.NorthwindIB.NH
{
    using System;
    using System.Collections.Generic;

    public partial class Territory
    {
        public Territory()
        {
            this.EmployeeTerritories = new HashSet<EmployeeTerritory>();
            this.Employees = new HashSet<Employee>();
        }

        public virtual int TerritoryID { get; set; }
        public virtual string TerritoryDescription { get; set; }
        public virtual int RegionID { get; set; }
        public virtual int RowVersion { get; set; }

        public virtual ICollection<EmployeeTerritory> EmployeeTerritories { get; set; }
        public virtual Region Region { get; set; }
        public virtual ICollection<Employee> Employees { get; set; }
    }
}

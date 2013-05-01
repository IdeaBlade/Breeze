namespace Models.NorthwindIB.NH
{
    using System;
    using System.Collections.Generic;

    public partial class Employee
    {
        public Employee()
        {
            this.DirectReports = new HashSet<Employee>();
            this.EmployeeTerritories = new HashSet<EmployeeTerritory>();
            this.Orders = new HashSet<Order>();
            this.Territories = new HashSet<Territory>();
        }

        public virtual int EmployeeID { get; set; }
        public virtual string LastName { get; set; }
        public virtual string FirstName { get; set; }
        public virtual string Title { get; set; }
        public virtual string TitleOfCourtesy { get; set; }
        public virtual Nullable<System.DateTime> BirthDate { get; set; }
        public virtual Nullable<System.DateTime> HireDate { get; set; }
        public virtual string Address { get; set; }
        public virtual string City { get; set; }
        public virtual string Region { get; set; }
        public virtual string PostalCode { get; set; }
        public virtual string Country { get; set; }
        public virtual string HomePhone { get; set; }
        public virtual string Extension { get; set; }
        public virtual byte[] Photo { get; set; }
        public virtual string Notes { get; set; }
        public virtual string PhotoPath { get; set; }
        public virtual Nullable<int> ReportsToEmployeeID { get; set; }
        public virtual int RowVersion { get; set; }
        public virtual string FullName { get; set; }

        public virtual ICollection<Employee> DirectReports { get; set; }
        public virtual Employee Manager { get; set; }
        public virtual ICollection<EmployeeTerritory> EmployeeTerritories { get; set; }
        public virtual ICollection<Order> Orders { get; set; }
        public virtual ICollection<Territory> Territories { get; set; }
    }
}

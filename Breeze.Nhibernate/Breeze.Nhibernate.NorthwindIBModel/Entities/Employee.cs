using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Breeze.Nhibernate.NorthwindIBModel
{

    /// <summary>
    /// Class representing Employee table
    /// </summary>
    public class Employee
    {

        public Employee()
        {
            EmployeeCollection = new List<Employee>();
            EmployeeTerritoryCollection = new List<EmployeeTerritory>();
            OrderCollection = new List<Order>();
        }
        
        public virtual int EmployeeId { get; set; }

        [Required]
        [StringLength(30)]
        public virtual string LastName { get; set; }

        [Required]
        [StringLength(30)]
        public virtual string FirstName { get; set; }

        [StringLength(30)]
        public virtual string Title { get; set; }

        [StringLength(25)]
        public virtual string TitleOfCourtesy { get; set; }

        public virtual DateTime? BirthDate { get; set; }

        public virtual DateTime? HireDate { get; set; }

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
        public virtual string HomePhone { get; set; }

        [StringLength(4)]
        public virtual string Extension { get; set; }

        public virtual System.Byte[] Photo { get; set; }

        public virtual string Note { get; set; }

        [StringLength(255)]
        public virtual string PhotoPath { get; set; }

        [Required]
        public virtual int RowVersion { get; set; }

        public virtual Employee ReportsToEmployee { get; set; }

        public virtual IList<Employee> EmployeeCollection { get; protected set; }

        public virtual IList<EmployeeTerritory> EmployeeTerritoryCollection { get; protected set; }

        public virtual IList<Order> OrderCollection { get; protected set; }

        #region overrides

        public override string ToString()
        {
            return "[EmployeeId] = " + EmployeeId;

        }

        public override int GetHashCode()
        {
            if (EmployeeId == 0) return base.GetHashCode(); //transient instance
            return EmployeeId;

        }

        public override bool Equals(object obj)
        {
            var x = obj as Employee;
            if (x == null) return false;
            if (EmployeeId == 0 && x.EmployeeId == 0) return ReferenceEquals(this, x);
            return (EmployeeId == x.EmployeeId);

        }
        #endregion
    }
}

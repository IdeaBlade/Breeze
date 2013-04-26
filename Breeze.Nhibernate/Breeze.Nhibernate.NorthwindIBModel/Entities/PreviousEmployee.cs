using System;
using System.ComponentModel.DataAnnotations;

namespace Breeze.Nhibernate.NorthwindIBModel
{

    /// <summary>
    /// Class representing PreviousEmployee table
    /// </summary>
    public class PreviousEmployee
    {
        public virtual int EmployeeId { get; set; }

        [Required]
        [StringLength(20)]
        public virtual string LastName { get; set; }

        [Required]
        [StringLength(10)]
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
            var x = obj as PreviousEmployee;
            if (x == null) return false;
            if (EmployeeId == 0 && x.EmployeeId == 0) return ReferenceEquals(this, x);
            return (EmployeeId == x.EmployeeId);

        }
        #endregion
    }
}

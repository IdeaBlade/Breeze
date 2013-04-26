using System;
using System.ComponentModel.DataAnnotations;

namespace Breeze.Nhibernate.NorthwindIBModel
{

    /// <summary>
    /// Class representing EmployeeTerritory table
    /// </summary>
    public class EmployeeTerritory
    {
        public virtual int Id { get; set; }

        [Required]
        public virtual int RowVersion { get; set; }

        public virtual Employee Employee { get; set; }

        public virtual Territory Territory { get; set; }

        #region overrides

        public override string ToString()
        {
            return "[Id] = " + Id;

        }

        public override int GetHashCode()
        {
            if (Id == 0) return base.GetHashCode(); //transient instance
            return Id;

        }

        public override bool Equals(object obj)
        {
            var x = obj as EmployeeTerritory;
            if (x == null) return false;
            if (Id == 0 && x.Id == 0) return ReferenceEquals(this, x);
            return (Id == x.Id);

        }
        #endregion
    }
}

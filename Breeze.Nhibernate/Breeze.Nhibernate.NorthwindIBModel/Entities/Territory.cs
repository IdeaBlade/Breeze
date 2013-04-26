using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Breeze.Nhibernate.NorthwindIBModel
{

    /// <summary>
    /// Class representing Territory table
    /// </summary>
    public class Territory
    {

        public Territory()
        {
            EmployeeTerritoryCollection = new List<EmployeeTerritory>();
        }
        
        public virtual int TerritoryId { get; set; }

        [Required]
        [StringLength(50)]
        public virtual string TerritoryDescription { get; set; }

        [Required]
        public virtual int RowVersion { get; set; }

        public virtual Region Region { get; set; }

        public virtual IList<EmployeeTerritory> EmployeeTerritoryCollection { get; protected set; }

        #region overrides

        public override string ToString()
        {
            return "[TerritoryId] = " + TerritoryId;

        }

        public override int GetHashCode()
        {
            if (TerritoryId == 0) return base.GetHashCode(); //transient instance
            return TerritoryId;

        }

        public override bool Equals(object obj)
        {
            var x = obj as Territory;
            if (x == null) return false;
            if (TerritoryId == 0 && x.TerritoryId == 0) return ReferenceEquals(this, x);
            return (TerritoryId == x.TerritoryId);

        }
        #endregion
    }
}

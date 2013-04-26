using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Breeze.Nhibernate.NorthwindIBModel
{

    /// <summary>
    /// Class representing Region table
    /// </summary>
    public class Region
    {

        public Region()
        {
            TerritoryCollection = new List<Territory>();
        }
        
        public virtual int RegionId { get; set; }

        [Required]
        [StringLength(50)]
        public virtual string RegionDescription { get; set; }

        [Required]
        public virtual int RowVersion { get; set; }

        public virtual IList<Territory> TerritoryCollection { get; protected set; }

        #region overrides

        public override string ToString()
        {
            return "[RegionId] = " + RegionId;

        }

        public override int GetHashCode()
        {
            if (RegionId == 0) return base.GetHashCode(); //transient instance
            return RegionId;

        }

        public override bool Equals(object obj)
        {
            var x = obj as Region;
            if (x == null) return false;
            if (RegionId == 0 && x.RegionId == 0) return ReferenceEquals(this, x);
            return (RegionId == x.RegionId);

        }
        #endregion
    }
}

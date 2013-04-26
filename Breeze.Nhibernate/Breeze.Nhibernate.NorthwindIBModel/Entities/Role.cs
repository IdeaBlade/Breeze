using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Breeze.Nhibernate.NorthwindIBModel
{

    /// <summary>
    /// Class representing Role table
    /// </summary>
    public class Role
    {

        public Role()
        {
            UserRoleCollection = new List<UserRole>();
        }
        
        public virtual long Id { get; set; }

        [Required]
        [StringLength(50)]
        public virtual string Name { get; set; }

        [StringLength(2000)]
        public virtual string Description { get; set; }

        public virtual IList<UserRole> UserRoleCollection { get; protected set; }

        #region overrides

        public override string ToString()
        {
            return "[Id] = " + Id;

        }

        public override int GetHashCode()
        {
            if (Id == 0) return base.GetHashCode(); //transient instance
            return Id.GetHashCode();

        }

        public override bool Equals(object obj)
        {
            var x = obj as Role;
            if (x == null) return false;
            if (Id == 0 && x.Id == 0) return ReferenceEquals(this, x);
            return (Id == x.Id);

        }
        #endregion
    }
}

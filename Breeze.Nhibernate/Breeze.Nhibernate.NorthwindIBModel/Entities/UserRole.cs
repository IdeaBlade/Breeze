using System;
using System.ComponentModel.DataAnnotations;

namespace Breeze.Nhibernate.NorthwindIBModel
{

    /// <summary>
    /// Class representing UserRole table
    /// </summary>
    public class UserRole
    {
        public virtual long Id { get; set; }

        public virtual Role Role { get; set; }

        public virtual User User { get; set; }

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
            var x = obj as UserRole;
            if (x == null) return false;
            if (Id == 0 && x.Id == 0) return ReferenceEquals(this, x);
            return (Id == x.Id);

        }
        #endregion
    }
}

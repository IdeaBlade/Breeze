using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Breeze.Nhibernate.NorthwindIBModel
{

    /// <summary>
    /// Class representing User table
    /// </summary>
    public class User
    {

        public User()
        {
            UserRoleCollection = new List<UserRole>();
        }
        
        public virtual long Id { get; set; }

        [Required]
        [StringLength(100)]
        public virtual string UserName { get; set; }

        [StringLength(200)]
        public virtual string UserPassword { get; set; }

        [Required]
        [StringLength(100)]
        public virtual string FirstName { get; set; }

        [Required]
        [StringLength(100)]
        public virtual string LastName { get; set; }

        [Required]
        [StringLength(100)]
        public virtual string Email { get; set; }

        [Required]
        [Range(typeof(decimal), "0", "999999999999999")]
        public virtual decimal RowVersion { get; set; }

        [Required]
        [StringLength(100)]
        public virtual string CreatedBy { get; set; }

        [Required]
        public virtual long CreatedByUserId { get; set; }

        [Required]
        public virtual DateTime CreatedDate { get; set; }

        [Required]
        [StringLength(100)]
        public virtual string ModifiedBy { get; set; }

        [Required]
        public virtual long ModifiedByUserId { get; set; }

        [Required]
        public virtual DateTime ModifiedDate { get; set; }

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
            var x = obj as User;
            if (x == null) return false;
            if (Id == 0 && x.Id == 0) return ReferenceEquals(this, x);
            return (Id == x.Id);

        }
        #endregion
    }
}

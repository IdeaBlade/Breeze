namespace Models.NorthwindIB.NH
{
    using System;
    using System.Collections.Generic;

    public partial class User
    {
        public User()
        {
            this.UserRoles = new HashSet<UserRole>();
        }

        public virtual long Id { get; set; }
        public virtual string UserName { get; set; }
        public virtual string UserPassword { get; set; }
        public virtual string FirstName { get; set; }
        public virtual string LastName { get; set; }
        public virtual string Email { get; set; }
        public virtual decimal RowVersion { get; set; }
        public virtual string CreatedBy { get; set; }
        public virtual long CreatedByUserId { get; set; }
        public virtual System.DateTime CreatedDate { get; set; }
        public virtual string ModifiedBy { get; set; }
        public virtual long ModifiedByUserId { get; set; }
        public virtual System.DateTime ModifiedDate { get; set; }

        public virtual ICollection<UserRole> UserRoles { get; set; }
    }
}

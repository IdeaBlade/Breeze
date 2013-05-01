namespace Models.NorthwindIB.NH
{
    using System;
    using System.Collections.Generic;

    public partial class Role
    {
        public Role()
        {
            this.UserRoles = new HashSet<UserRole>();
        }

        public virtual long Id { get; set; }
        public virtual string Name { get; set; }
        public virtual string Description { get; set; }
        public virtual byte[] Ts { get; set; }
        public virtual Nullable<RoleType> RoleType { get; set; }

        public virtual ICollection<UserRole> UserRoles { get; set; }
    }
}

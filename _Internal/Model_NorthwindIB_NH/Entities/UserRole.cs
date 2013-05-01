namespace Models.NorthwindIB.NH
{
    using System;
    using System.Collections.Generic;

    public partial class UserRole
    {
        public virtual long ID { get; set; }
        public virtual long UserId { get; set; }
        public virtual long RoleId { get; set; }

        public virtual User User { get; set; }
        public virtual Role Role { get; set; }
    }
}

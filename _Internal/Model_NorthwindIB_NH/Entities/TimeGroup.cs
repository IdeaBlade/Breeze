namespace Models.NorthwindIB.NH
{
    using System;
    using System.Collections.Generic;

    public partial class TimeGroup
    {
        public TimeGroup()
        {
            this.TimeLimits = new HashSet<TimeLimit>();
        }

        public virtual int Id { get; set; }
        public virtual string Comment { get; set; }

        public virtual ICollection<TimeLimit> TimeLimits { get; set; }
    }
}

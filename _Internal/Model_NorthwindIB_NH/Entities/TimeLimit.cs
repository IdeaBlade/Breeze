namespace Models.NorthwindIB.NH
{
    using System;
    using System.Collections.Generic;

    public partial class TimeLimit
    {
        public virtual int Id { get; set; }
        public virtual System.TimeSpan MaxTime { get; set; }
        public virtual Nullable<System.TimeSpan> MinTime { get; set; }
        public virtual Nullable<int> TimeGroupId { get; set; }

        public virtual TimeGroup TimeGroup { get; set; }

    }
}

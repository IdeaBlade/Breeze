namespace Models.NorthwindIB.NH
{
    using System;
    using System.Collections.Generic;

    public partial class TimeLimit
    {
        public virtual int Id { get; set; }
        public virtual System.TimeSpan MaxTime { get; set; }
        public virtual Nullable<System.TimeSpan> MinTime { get; set; }
        public virtual Nullable<System.DateTimeOffset> CreationDate { get; set; }
        public virtual Nullable<System.DateTime> ModificationDate { get; set; }
        public virtual byte[] Geometry1 { get; set; }
        public virtual byte[] Geography1 { get; set; }
        // TODO - try using NHibernate.Spatial extensions to support these types
        //public virtual System.Data.Spatial.DbGeometry Geometry1 { get; set; }
        //public virtual System.Data.Spatial.DbGeography Geography1 { get; set; }
        public virtual Nullable<int> TimeGroupId { get; set; }
    }
}

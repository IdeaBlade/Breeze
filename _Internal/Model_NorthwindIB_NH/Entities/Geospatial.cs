
namespace Models.NorthwindIB.NH
{
    public class Geospatial
    {
        public virtual int Id { get; set; }
        public virtual byte[] Geometry1 { get; set; }
        public virtual byte[] Geography1 { get; set; }
        // TODO - try using NHibernate.Spatial extensions to support these types
        //public virtual System.Data.Spatial.DbGeometry Geometry1 { get; set; }
        //public virtual System.Data.Spatial.DbGeography Geography1 { get; set; }
    }
}

namespace Models.NorthwindIB.NH
{
    using System;

    public partial class Location
    {
        public virtual string Address { get; set; }
        public virtual string City { get; set; }
        public virtual string Region { get; set; }
        public virtual string PostalCode { get; set; }
        public virtual string Country { get; set; }
    }
}

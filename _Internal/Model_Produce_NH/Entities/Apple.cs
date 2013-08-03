namespace Models.Produce.NH
{
    using System;
    using System.Collections.Generic;
    
    public partial class Apple : Fruit
    {
        public virtual string Variety { get; set; }
        public virtual string Description { get; set; }
        public virtual byte[] Photo { get; set; }
    }
}

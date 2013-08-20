namespace Models.Produce.NH
{
    using System;
    using System.Collections.Generic;
    
    public partial class Fruit : ItemOfProduce
    {
        public virtual string Name { get; set; }
        public virtual string USDACategory { get; set; }
    }
}

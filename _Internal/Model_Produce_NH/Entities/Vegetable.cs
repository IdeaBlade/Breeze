namespace Models.Produce.NH
{
    using System;
    using System.Collections.Generic;
    
    public partial class Vegetable : ItemOfProduce
    {
        public virtual string Name { get; set; }
        public virtual string USDACategory { get; set; }
        public virtual Nullable<bool> AboveGround { get; set; }
    }
}

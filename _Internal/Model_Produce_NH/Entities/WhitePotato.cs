namespace Models.Produce.NH
{
    using System;
    using System.Collections.Generic;
    
    public partial class WhitePotato : Vegetable
    {
        public virtual string Variety { get; set; }
        public virtual string Description { get; set; }
        public virtual byte[] Photo { get; set; }
        public virtual string Eyes { get; set; }
        public virtual string SkinColor { get; set; }
        public virtual string PrimaryUses { get; set; }
    }
}

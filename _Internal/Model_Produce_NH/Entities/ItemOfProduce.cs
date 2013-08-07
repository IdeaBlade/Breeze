namespace Models.Produce.NH
{
    using System;
    using System.Collections.Generic;
    
    public abstract partial class ItemOfProduce
    {
        public ItemOfProduce()
        {
            this.RowVersion = 0;
        }
    
        public virtual System.Guid Id { get; set; }
        public virtual string ItemNumber { get; set; }
        public virtual Nullable<decimal> UnitPrice { get; set; }
        public virtual string QuantityPerUnit { get; set; }
        public virtual Nullable<short> UnitsInStock { get; set; }
        public virtual short UnitsOnOrder { get; set; }
        public virtual Nullable<int> RowVersion { get; set; }
    }
}

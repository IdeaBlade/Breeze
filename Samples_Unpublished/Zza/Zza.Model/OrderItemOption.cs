using System;
using System.ComponentModel.DataAnnotations;

namespace Zza.Model
{
    public class OrderItemOption
    {
        [Key]
        public virtual Int64 Id { get; set; }
        public virtual Guid? StoreId { get; set; }
        [Required]
        public virtual Int64 OrderItemId { get; set; }
        [Required]
        public virtual Int32 ProductOptionId { get; set; }
        [Required]
        public virtual Int32 Quantity { get; set; }
        [Required]
        public virtual decimal Price { get; set; }

        public virtual OrderItem OrderItem { get; set; }
        public virtual ProductOption ProductOption { get; set; }
    } 
}     
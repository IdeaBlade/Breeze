using System;
using System.ComponentModel.DataAnnotations;

namespace Zza.Model
{
    public class OrderItemOption
    {
        [Key]
        public Int64 Id { get; set; }
        public Guid? StoreId { get; set; }
        [Required]
        public Int64 OrderItemId { get; set; }
        [Required]
        public Int32 ProductOptionId { get; set; }
        [Required]
        public Int32 Quantity { get; set; }
        [Required]
        public decimal Price { get; set; }

        public virtual OrderItem OrderItem { get; set; }
        public virtual ProductOption ProductOption { get; set; }
    } 
}     
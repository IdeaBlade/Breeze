using System;
using System.ComponentModel.DataAnnotations;

namespace Zza.Model
{
    public class OrderItem
    {
        [Key]
        public Int64 Id { get; set; }
        public Guid? StoreId { get; set; }
        [Required]
        public Int64 OrderId { get; set; }
        [Required]
        public Int32 ProductId { get; set; }
        [Required]
        public Int32 ProductSizeId { get; set; }
        [Required]
        public Int32 Quantity { get; set; }
        [Required]
        public decimal UnitPrice { get; set; }
        [Required]
        public decimal TotalPrice { get; set; }
        [MaxLength(255)]
        public string Instructions { get; set; }

        public virtual Order Order { get; set; }
        public virtual Product Product { get; set; }
        public virtual Product ProductSize { get; set; }
    } 
}     
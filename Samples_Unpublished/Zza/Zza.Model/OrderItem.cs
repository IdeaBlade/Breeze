using System;
using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json;

namespace Zza.Model
{
    public class OrderItem : ISaveable
    {
        [Key]
        public virtual Int64 Id { get; set; }
        [JsonIgnore]
        public virtual Guid? StoreId { get; set; }
        [Required]
        public virtual Int64 OrderId { get; set; }
        [Required]
        public virtual Int32 ProductId { get; set; }
        [Required]
        public virtual Int32 ProductSizeId { get; set; }
        [Required]
        public virtual Int32 Quantity { get; set; }
        [Required]
        public virtual decimal UnitPrice { get; set; }
        [Required]
        public virtual decimal TotalPrice { get; set; }
        [MaxLength(255)]
        public virtual string Instructions { get; set; }

        public virtual Order Order { get; set; }
        public virtual Product Product { get; set; }
        public virtual ProductSize ProductSize { get; set; }

        public string CanAdd() { return null; }
    } 
}     
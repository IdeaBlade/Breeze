using System;
using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json;

namespace Zza.Model
{
    public class OrderItem : ISaveable, IHasIntId
    {
        [Key]
        public virtual long Id { get; set; }
        [JsonIgnore]
        public virtual Guid? StoreId { get; set; }
        [Required]
        public virtual long OrderId { get; set; }
        [Required]
        public virtual int ProductId { get; set; }
        [Required]
        public virtual int ProductSizeId { get; set; }
        [Required]
        public virtual int Quantity { get; set; }
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
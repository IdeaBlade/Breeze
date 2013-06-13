using System;
using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json;

namespace Zza.Model
{
    public class OrderItemOption : ISaveable, IHasIntId
    {
        [Key]
        public virtual long Id { get; set; }
        [JsonIgnore]
        public virtual Guid? StoreId { get; set; }

        [Required]
        public virtual long OrderItemId { get; set; }
        [Required]
        public virtual int ProductOptionId { get; set; }
        [Required]
        public virtual int Quantity { get; set; }
        [Required]
        public virtual decimal Price { get; set; }

        public virtual OrderItem OrderItem { get; set; }
        public virtual ProductOption ProductOption { get; set; }

        public string CanAdd() { return null; }
    } 
}     
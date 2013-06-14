using System.ComponentModel.DataAnnotations;

namespace Zza.Model
{
    public class OrderItemOption : Saveable, ISaveableWithIntId
    {
        [Key]
        public virtual long Id { get; set; }
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

    } 
}     
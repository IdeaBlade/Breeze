using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Zza.Model
{
    public class Order : Saveable, ISaveableWithIntId
    {
        public Order()
        {
            OrderItems = new List<OrderItem>();

            DeliveryCharge = 0;
            ItemsTotal = 0;
        }
        [Key]
        public virtual long Id { get; set; }
        [Required]
        public virtual Guid CustomerId { get; set; }
        [Required]
        public virtual int OrderStatusId { get; set; }
        [Required]
        public virtual DateTime OrderDate { get; set; }
        [MaxLength(100)]
        public virtual string Phone { get; set; }
        [Required]
        public virtual DateTime DeliveryDate { get; set; }
        [Required]
        public virtual decimal DeliveryCharge { get; set; }
        [MaxLength(100)]
        public virtual string DeliveryStreet { get; set; }
        [MaxLength(100)]
        public virtual string DeliveryCity { get; set; }
        [MaxLength(2)]
        public virtual string DeliveryState { get; set; }
        [MaxLength(10)]
        public virtual string DeliveryZip { get; set; }
        [Required]
        public virtual decimal ItemsTotal { get; set; }

        public virtual Customer Customer { get; set; }
        public virtual OrderStatus Status { get; set; }
        public virtual ICollection<OrderItem> OrderItems { get; set; }
    } 
}     
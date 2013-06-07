using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Zza.Model
{
    public class Order
    {
        public Order()
        {
            OrderItems = new List<OrderItem>();

            DeliveryCharge = 0;
            ItemsTotal = 0;
        }
        [Key]
        public Int64 Id { get; set; }
        public Guid? StoreId { get; set; }
        [Required]
        public Guid CustomerId { get; set; }
        [Required]
        public Int32 OrderStatusId { get; set; }
        [Required]
        public DateTime OrderDate { get; set; }
        [MaxLength(100)]
        public string Phone { get; set; }
        [Required]
        public DateTime DeliveryDate { get; set; }
        [Required]
        public decimal DeliveryCharge { get; set; }
        [MaxLength(100)]
        public string DeliveryStreet { get; set; }
        [MaxLength(100)]
        public string DeliveryCity { get; set; }
        [MaxLength(2)]
        public string DeliveryState { get; set; }
        [MaxLength(10)]
        public string DeliveryZip { get; set; }
        [Required]
        public decimal ItemsTotal { get; set; }

        public virtual Customer Customer { get; set; }
        public virtual OrderStatus Status { get; set; }
        public virtual ICollection<OrderItem> OrderItems { get; set; }
    } 
}     
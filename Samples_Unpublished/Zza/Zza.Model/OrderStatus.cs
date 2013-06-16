using System;
using System.ComponentModel.DataAnnotations;

namespace Zza.Model
{
    public class OrderStatus
    {
        [Key]
        public virtual Int32 Id { get; set; }
        [Required, MaxLength(50)]
        public virtual string Name { get; set; }
    }
}

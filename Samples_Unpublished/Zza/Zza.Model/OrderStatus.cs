using System;
using System.ComponentModel.DataAnnotations;

namespace Zza.Model
{
    public class OrderStatus
    {
        [Key]
        public Int32 Id { get; set; }
        [Required, MaxLength(50)]
        public string Name { get; set; }
    }
}

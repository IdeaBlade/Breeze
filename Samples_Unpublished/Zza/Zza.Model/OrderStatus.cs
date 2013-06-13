using System;
using System.ComponentModel.DataAnnotations;

namespace Zza.Model
{
    public class OrderStatus : IHasIntId
    {
        [Key]
        public virtual Int32 Id { get; set; }
        [Required, MaxLength(50)]
        public virtual string Name { get; set; }

        long IHasIntId.Id {get { return Id; }}

    }
}

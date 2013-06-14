using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Zza.Model
{
    public class Customer : Saveable, ISaveableWithGuidId
    {
        public Customer()
        {
            Orders = new List<Order>();
        }
        [Key]
        public virtual Guid Id { get; set; }
        [MaxLength(50)]
        public virtual string FirstName { get; set; }
        [MaxLength(50)]
        public virtual string LastName { get; set; }
        [MaxLength(100)]
        public virtual string Phone { get; set; }
        [MaxLength(255)]
        [RegularExpression(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$",
            ErrorMessage = "Email address is not valid")]
        public virtual string Email { get; set; }
        [MaxLength(100)]
        public virtual string Street { get; set; }
        [MaxLength(100)]
        public virtual string City { get; set; }
        [MaxLength(2)]
        public virtual string State { get; set; }
        [MaxLength(10)]
        public virtual string Zip { get; set; }

        public virtual ICollection<Order> Orders { get; set; }

    }
}

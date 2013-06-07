using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json;

namespace Zza.Model
{
    public class Customer : ISaveable
    {
        public Customer()
        {
            Orders = new List<Order>();
        }
        [Key]
        public virtual Guid Id { get; set; }
        [JsonIgnore]
        public virtual Guid? StoreId { get; set; }
        [MaxLength(50)]
        public virtual string FirstName { get; set; }
        [MaxLength(50)]
        public virtual string LastName { get; set; }
        [MaxLength(100)]
        public virtual string Phone { get; set; }
        [MaxLength(255)]
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

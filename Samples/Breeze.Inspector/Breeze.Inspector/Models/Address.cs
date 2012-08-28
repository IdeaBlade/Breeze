using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace Breeze.Inspector.Models {
    public class Address {
        [Key]
        public int Id { get; set; }

        public string Street1 { get; set; }
        public string Street2 { get; set; }
        public string City { get; set; }
        public string State { get; set; }
        public string Zip { get; set; }
        
        public List<Job> Jobs { get; set; }

        public Address() {
            Jobs = new List<Job>();
        }
    }
}
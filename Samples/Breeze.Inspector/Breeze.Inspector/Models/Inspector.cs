namespace Breeze.Inspector.Models {
    using System.Collections.Generic;
    using System.ComponentModel.DataAnnotations;

    public class Inspector {
        [Key]
        public int Id { get; set; }

        public string Username { get; set; }
        public string Password { get; set; }

        public List<Job> Jobs { get; set; }

        public Inspector() {
            Jobs = new List<Job>();
        }
    }
}
namespace Breeze.Inspector.Models {
    using System.Collections.Generic;
    using System.ComponentModel.DataAnnotations;

    public class Inspector {
        [Key]
        public int Id { get; set; }

        public string Name { get; set; }
        public List<Job> Jobs { get; set; }

        public Inspector() {
            Jobs = new List<Job>();
        }
    }
}
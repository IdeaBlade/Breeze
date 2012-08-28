namespace Breeze.Inspector.Models {
    using System;
    using System.Collections.Generic;
    using System.ComponentModel.DataAnnotations;

    public class Job {
        [Key]
        public int Id { get; set; }
        public DateTime CreatedAt { get; set; }

        [ForeignKey("Location")]
        public int LocationId { get; set; }
        public Address Location { get; set; }

        [ForeignKey("Inspector")]
        public int InspectorId { get; set; }
        public Inspector Inspector { get; set; }

        public List<Inspection> Inspections { get; set; }

        public Job() {
            Inspections = new List<Inspection>();
        }
    }
}
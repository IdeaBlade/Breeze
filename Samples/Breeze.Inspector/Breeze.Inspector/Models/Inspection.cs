namespace Breeze.Inspector.Models {
    using System.Collections.Generic;
    using System.ComponentModel.DataAnnotations;
    using System.ComponentModel.DataAnnotations.Schema;

    public class Inspection {
        [Key]
        public int Id { get; set; }
        
        public List<Answer> Answers { get; set; }

        [ForeignKey("Form")]
        public int FormId { get; set; }
        public InspectionForm Form { get; set; }

        [ForeignKey("Job")]
        public int JobId { get; set; }
        public Job Job { get; set; }

        public Inspection() {
            Answers = new List<Answer>();
        }
    }
}
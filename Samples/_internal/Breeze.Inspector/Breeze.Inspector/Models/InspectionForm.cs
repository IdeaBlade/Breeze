using System.ComponentModel.DataAnnotations;

namespace Breeze.Inspector.Models {
    using System.Collections.Generic;

    public class InspectionForm {
        [Key]
        public int Id { get; set; }
        public string Type { get; set; }
        public List<Question> Questions { get; set; }

        public List<Inspection> Inspections { get; set; }

        public InspectionForm() {
            Questions = new List<Question>();
            Inspections = new List<Inspection>();
        }
    }
}
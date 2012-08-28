namespace Breeze.Inspector.Models {
    using System.Collections.Generic;
    using System.ComponentModel.DataAnnotations;

    public class Question {
        [Key]
        public int Id { get; set; }

        public string Type { get; set; }
        public string Text { get; set; }
        public string Options { get; set; }

        public bool IsRequired { get; set; }
        public string ResponsePattern { get; set; }

        [ForeignKey("Form")]
        public int? FormId { get; set; }
        public InspectionForm Form { get; set; }

        public List<Answer> Answers { get; set; }

        public Question() {
            Answers = new List<Answer>();
        }
    }
}
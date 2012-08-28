using System.ComponentModel.DataAnnotations;
namespace Breeze.Inspector.Models {
    public class Answer {
        [Key]
        public int Id { get; set; }

        [ForeignKey("Question")]
        public int QuestionId { get; set; }
        public Question Question { get; set; }

        [ForeignKey("Inspection")]
        public int InspectionId { get; set; }
        public Inspection Inspection { get; set; }
        
        public string Response { get; set; }
    }
}
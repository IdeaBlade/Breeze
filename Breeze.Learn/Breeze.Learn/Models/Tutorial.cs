namespace Breeze.Learn.Models {
    using System.Collections.Generic;

    public class Tutorial {
        public string Title { get; set; }
        public string Description { get; set; }
        public List<TutorialStep> Steps { get; set; }

        public Tutorial() {
            Steps = new List<TutorialStep>();
        }
    }
}
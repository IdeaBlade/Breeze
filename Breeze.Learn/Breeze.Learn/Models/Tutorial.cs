namespace Breeze.Learn.Models {
    using System.Collections.Generic;

    public class Tutorial {
        public int Order { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        
        public string StartingHtml { get; set; }
        public string StartingJavascript { get; set; }

        public string EndingHtml { get; set; }
        public string EndingJavascript { get; set; }

        public List<TutorialStep> Steps { get; set; }

        public Tutorial() {
            Steps = new List<TutorialStep>();
        }
    }
}
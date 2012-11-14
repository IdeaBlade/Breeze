using System.Collections.Generic;

namespace Breeze.Learn.Models {

  public class Tutorial {
    public int Order { get; set; }
    public string Title { get; set; }
    public string Moniker { get; set; }
    public string Description { get; set; }

    public List<TutorialStep> Steps { get; set; }

    public Tutorial() {
      Steps = new List<TutorialStep>();
    }
  }
}
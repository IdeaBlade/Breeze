using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Xml.Serialization;

namespace Breeze.Learn.Models {

  public static class TutorialCache {
    public static IList<Tutorial> Tutorials;

    static TutorialCache() {
      Tutorials = ReadTutorials().ToList();
    }

    static IEnumerable<Tutorial> ReadTutorials() {
      var serializer = new XmlSerializer(typeof(Tutorial));

      foreach (var filePath in GetTutorialFiles()) {
        if (Path.GetExtension(filePath) != ".xml") {
          continue;
        }

        using (var stream = File.OpenRead(filePath)) {
          yield return (Tutorial)serializer.Deserialize(stream);
        }
      }
    }

    static IEnumerable<string> GetTutorialFiles() {
      var dataFolder = Path.Combine(HttpRuntime.AppDomainAppPath, "App_Data");
      return Directory.GetFiles(dataFolder);
    }
  }
}
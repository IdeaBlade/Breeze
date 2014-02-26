
using System;

namespace Breeze.NetClient {
  public class SaveContext {

    public SaveContext(string resourceName, DataService dataService, bool allowConcurrentSaves, String tag) {
      ResourceName = resourceName;
      DataService = dataService;
      AllowConcurrentSaves = allowConcurrentSaves;
      Tag = tag;
    }

    public SaveOptions(SaveOptions saveOptions) {
      ResourceName = saveOptions.ResourceName;
      DataService = saveOptions.DataService;
      AllowConcurrentSaves = saveOptions.AllowConcurrentSaves;
      Tag = saveOptions.Tag;
    }
    
    public SaveOptions(JNode jNode) {
      
      
    }

    JNode IJsonSerializable.ToJNode(object config) {
      var jn = new JNode();
      
      return jn;
    }


    public static SaveOptions Default = new SaveOptions(null, null, false, null);

    public String ResourceName { get; internal set; }
    public bool AllowConcurrentSaves { get; internal set; }
    public DataService DataService { get; internal set; }
    public String Tag { get; set;  }
    
  }

 
}

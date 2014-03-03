
using System;

namespace Breeze.NetClient {
  public class SaveOptions : IJsonSerializable {

    public SaveOptions(string resourceName=null, DataService dataService=null, bool allowConcurrentSaves=false, String tag=null) {
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
    
    //public SaveOptions(JNode jNode) {
      
      
    //}

    JNode IJsonSerializable.ToJNode(object config) {
      var jn = new JNode();
      jn.AddPrimitive("allowConcurrentSaves", AllowConcurrentSaves);
      jn.AddPrimitive("tag", Tag);
      return jn;
    }


    public static SaveOptions Default = new SaveOptions(null, null, false, null);

    public String ResourceName { get; internal set; }
    public bool AllowConcurrentSaves { get; internal set; }
    public DataService DataService { get; internal set; }
    public String Tag { get; set;  }
    
  }

 
}

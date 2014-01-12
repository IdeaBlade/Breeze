using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.Metadata {
  public class MetadataStore {
    public EntityTypeCollection EntityTypes { get; set; }
    public NamingConvention NamingConvention { get; set; }
    public EntityType GetEntityType(String typeName, bool okIfNotFound=false) {
      if (EntityTypes.Contains(typeName)) {
        return EntityTypes[typeName];
      } else if (okIfNotFound) {
        return null;
      } else {
        throw new Exception("Unable to locate an EntityType: " + typeName);
      }
    }
    public static String ANONTYPE_PREFIX = "_IB_";
  }

  

  

  
  
}

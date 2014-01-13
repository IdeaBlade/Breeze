using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.Metadata {
  public class MetadataStore {
    public EntityTypeCollection EntityTypes { get; set; }
    public ComplexTypeCollection ComplexTypes {get; set; }
    
    public NamingConvention NamingConvention { get; set; }
    public EntityType GetEntityType(String typeName, bool okIfNotFound=false) {
      if ( _entityTypes.Contains(typeName)) {
        return _entityTypes[typeName];
      } else if (okIfNotFound) {
        return null;
      } else {
        throw new Exception("Unable to locate an EntityType: " + typeName);
      }
    }
    public ComplexType GetComplexType(String typeName, bool okIfNotFound=false) {
      if (_complexTypes.Contains(typeName)) {
        return _complexTypes[typeName];
      } else if (okIfNotFound) {
        return null;
      } else {
        throw new Exception("Unable to locate an ComplexType: " + typeName);
      }
    }

    public EntityType AddEntityType(EntityType entityType) {
      _entityTypes.Add(entityType);
      return entityType;
    }

    public ComplexType AddComplexType(ComplexType complexType) {
      _complexTypes.Add(complexType);
      return complexType;
    }

    public static String ANONTYPE_PREFIX = "_IB_";

    
    private EntityTypeCollection _entityTypes = new EntityTypeCollection();
    private ComplexTypeCollection _complexTypes = new ComplexTypeCollection();
    
  }

  

  

  
  
}

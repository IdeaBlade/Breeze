using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  public abstract class JsonResultsAdapter {
    public virtual String Name {
      get; protected set;
    }
        
    public JToken ExtractResults(JObject jObject) {
      return jObject["results"];
    }
            
    public abstract NodeMeta VisitNode(JObject node, MappingContext mappingContext, NodeContext nodeContext = null);  
                
  }

  public class NodeContext {
    public String NodeType { get; set; }
    public String PropertyName {get; set;}
  }

  public class NodeMeta {
    public EntityType EntityType {get; set; }
    public String NodeId {get; set;}
    public String NodeRefId { get; set; }
    public bool Ignore {get; set; }
  }

  public class DefaultJsonResultsAdapter : JsonResultsAdapter {
    public override NodeMeta VisitNode(JObject node, MappingContext mappingContext, NodeContext nodeContext = null) {
      var entityType = mappingContext.MetadataStore.NormalizeTypeName(node.$type);
      var propertyName = nodeContext.PropertyName;
      var ignore = propertyName != null && propertyName.Substring(0, 1) == "$";
      return new NodeMeta() { EntityType = entityType, NodeId = node["$id"], NodeRefId = node["$ref"], Ignore=ignore };
    }

  }
}

//
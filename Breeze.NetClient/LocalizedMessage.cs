using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Breeze.Core;
using System.Resources;
using System.Reflection;
using Breeze.NetClient.Core;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using Newtonsoft.Json.Linq;
using System.Globalization;

namespace Breeze.NetClient {

  public class LocalizedMessage {

    public LocalizedMessage(String key, String defaultMessage, Type resourceType = null) {
      Key = key;
      DefaultMessage = defaultMessage;
      ResourceType = resourceType;
    }

    public String Key {
      get;
      private set;
    }

    public String DefaultMessage {
      get;
      private set;
    }

    public Type ResourceType {
      get {
        return _resourceType;
      }
      set {
         _resourceType = value;
        _messageTemplate = null;
      }
    }

    public ResourceManager ResourceManager {
      get {
        return (ResourceType != null) ? GetResourceManager(ResourceType) : __defaultResourceManager;
      }
    }

    [JsonIgnore]
    public String MessageTemplate {
      get {
        if (_messageTemplate == null) {
          _messageTemplate = ResourceManager.GetString(this.Key) ?? DefaultMessage;
        }
        return _messageTemplate;
      }
      private set {
         _messageTemplate = value;
      }
    }

    public String Format(params Object[] parameters) {
      return String.Format(MessageTemplate, parameters);
    }

    private static ResourceManager GetResourceManager(Type resourceType) {
      ResourceManager rm;
      lock (__lock) {
        if (!__resourceManagerMap.TryGetValue(resourceType, out rm)) {
          rm = new ResourceManager(resourceType);
          __resourceManagerMap[resourceType] = rm;
        }
        return rm;
      }
    }

    private Type _resourceType;
    private String _messageTemplate;
    private static Object __lock = new Object();
    private static Dictionary<Type, ResourceManager> __resourceManagerMap = new Dictionary<Type, ResourceManager>();
    private static ResourceManager __defaultResourceManager = new ResourceManager("Breeze.NetClient.LocalizedMessages", typeof(LocalizedMessage).GetTypeInfo().Assembly);
  }


}

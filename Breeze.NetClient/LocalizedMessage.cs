using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Reflection;
using System.Resources;

namespace Breeze.NetClient {

  public class LocalizedMessage {

    public LocalizedMessage(String message) {
      _message = message;
      IsDefault = true;
    }

    public LocalizedMessage(String key, String defaultMessage, Type resourceType = null) {
      Key = key;
      DefaultMessage = defaultMessage;
      ResourceType = resourceType;
      IsDefault = true;
    }

    public String Key {
      get;
      private set;
    }

    [JsonIgnore]
    public String Message {
      get {
        if (_message == null) {
          _message = ResourceManager.GetString(this.Key);
          _wasLocalized = _message != null;
          _message = _message  ?? DefaultMessage;
        }
        return _message;
      }
      private set {
        IsDefault = false;
        _message = value;
      }
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
        IsDefault = false;
         _resourceType = value;
        _message = null;
      }
    }

    public bool WasLocalized {
      get {
        var x = Message;
        return _wasLocalized;
      }
      
    }

    public bool IsDefault {
      get;
      private set;
    }

    public ResourceManager ResourceManager {
      get {
        return (ResourceType != null) ? GetResourceManager(ResourceType) : __defaultResourceManager;
      }
    }

    public String Format(params Object[] parameters) {
      return String.Format(Message, parameters);
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

    private String _message;
    private bool _wasLocalized;
    private Type _resourceType;
    
    private static Object __lock = new Object();
    private static Dictionary<Type, ResourceManager> __resourceManagerMap = new Dictionary<Type, ResourceManager>();
    private static ResourceManager __defaultResourceManager = new ResourceManager("Breeze.NetClient.LocalizedMessages", typeof(LocalizedMessage).GetTypeInfo().Assembly);
  }


}

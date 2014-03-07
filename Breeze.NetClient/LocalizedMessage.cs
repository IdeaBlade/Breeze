using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Reflection;
using System.Resources;

namespace Breeze.NetClient {

  // Immutable object
  public class LocalizedMessage {

    public LocalizedMessage(String message) {
      _message = message;
    }

    public LocalizedMessage(String key, ResourceManager resourceManager) {
      Key = key;
      _resourceManager = resourceManager ?? __defaultResourceManager;
    }

    public LocalizedMessage(String key, Type resourceType) {
      Key = key;
      _resourceManagerFn = () => GetResourceManager(resourceType);
    }

    public LocalizedMessage(String key, String baseName, Assembly assembly) {
      Key = key;
      _resourceManagerFn = () => GetResourceManager(baseName, assembly);
    }

    public LocalizedMessage(LocalizedMessage lm) {
      Key = lm.Key;
      _resourceManager = lm._resourceManager;
      _resourceManagerFn = lm._resourceManagerFn;
      DefaultMessage = lm.DefaultMessage;
    }

    public LocalizedMessage WithDefaultMessage(String defaultMessage) {
      var lm = new LocalizedMessage(this);
      lm.DefaultMessage = defaultMessage;
      return lm;
    }

    public String Key {
      get;
      private set;
    }

    [JsonIgnore]
    public String Message {
      get {
        if (_message == null) {
          try {
            var rm = ResourceManager;
            // if rm isNull _message will have been set
            if (rm != null) {
              _message = rm.GetString(this.Key);
              _isLocalized = _message != null;
            }
          } catch {
            if (DefaultMessage == null) {
              _message = DefaultMessage;
            } else {
              _message = "Unable to resource for " + this.Key;
            }
          }
        }
        return _message;
      }
      private set {
        _message = value;
      }
    }

    public String DefaultMessage {
      get;
      private set;
    }

    //public String BaseName {
    //  get;
    //  private set;
    //}

    //public Assembly Assembly {
    //  get;
    //  private set;
    //}

    //public Type ResourceType {
    //  get;
    //  private set;
    //}

    public bool IsLocalized {
      get {
        var x = Message;
        return _isLocalized;
      }
    }

    public ResourceManager ResourceManager {
      get {
        if (_resourceManager == null) {
          _resourceManager = (_resourceManagerFn != null) ? _resourceManagerFn() : __defaultResourceManager;
        }
        return _resourceManager;
      }
    }

    public String Format(params Object[] parameters) {
      return String.Format(Message, parameters);
    }

    private ResourceManager GetResourceManager(Type resourceType) {
      ResourceManager rm;
      lock (__lock) {
        if (!__resourceManagerTypeMap.TryGetValue(resourceType, out rm)) {
          try {
            rm = new ResourceManager(resourceType);
            __resourceManagerTypeMap[resourceType] = rm;
          } catch (Exception e) {
            throw new Exception("Unable to resolve resourceManager for " + resourceType.ToString(), e);
            return null;
          }
        }
        return rm;
      }
    }

    private ResourceManager GetResourceManager(String baseName, Assembly assembly) {
      ResourceManager rm;
      lock (__lock) {
        var key = Tuple.Create(baseName, assembly);
        if (!__resourceManagerFileMap.TryGetValue(key, out rm)) {
          try {
            rm = new ResourceManager(baseName, assembly);
            __resourceManagerFileMap[key] = rm;
          } catch (Exception e) {
            throw new Exception("Unable to resolve resourceManager for " + baseName + " on assembly " + assembly.FullName, e);
          }
        }
        return rm;
      }
    }

    private ResourceManager _resourceManager;
    private Func<ResourceManager> _resourceManagerFn;
    private String _message;
    private bool _isLocalized;
    
    private static Object __lock = new Object();
    private static Dictionary<Type, ResourceManager> __resourceManagerTypeMap = new Dictionary<Type, ResourceManager>();
    private static Dictionary<Tuple<String, Assembly>, ResourceManager> __resourceManagerFileMap = new Dictionary<Tuple<string, Assembly>, ResourceManager>();
    private static ResourceManager __defaultResourceManager = new ResourceManager("Breeze.NetClient.LocalizedMessages", typeof(LocalizedMessage).GetTypeInfo().Assembly);
  }


}

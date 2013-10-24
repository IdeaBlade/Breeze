using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;

namespace Breeze.ContextProvider {
  /// <summary>
  /// Validates entities using Breeze metadata.
  /// </summary>
  public class BreezeMetadataValidator {
    private ContextProvider _contextProvider;
    private Dictionary<string, StructuralType> _structuralTypeMap;

    /// <summary>
    /// Create a new instance.  
    /// </summary>
    /// <param name="contextProvider">Used for getting entity keys for building EntityError objects.</param>
    /// <param name="structuralTypeList">Contains the validator information for properties of entity and complex types.</param>
    public BreezeMetadataValidator(ContextProvider contextProvider, List<Dictionary<string, object>> structuralTypeList) {
      this._contextProvider = contextProvider;
      this._structuralTypeMap = BuildStructuralTypeMap(structuralTypeList);
    }

    /// <summary>
    /// Create a new instance.  
    /// </summary>
    /// <param name="contextProvider">Used for getting entity keys for building EntityError objects.</param>
    /// <param name="breezeMetadata">Contains breeze metadata. The structuralTypeList is extracted from it.</param>
    public BreezeMetadataValidator(ContextProvider contextProvider, IDictionary<string, object> breezeMetadata) {
      this._contextProvider = contextProvider;
      var structuralTypeList = (List<Dictionary<string, object>>) breezeMetadata["structuralTypes"];
      this._structuralTypeMap = BuildStructuralTypeMap(structuralTypeList);
    }


    /// <summary>
    /// Validate all the entities in the saveMap.
    /// </summary>
    /// <param name="saveMap">Map of type to entities.</param>
    /// <param name="throwIfInvalid">If true, throws an EntityErrorsException if any entity is invalid</param>
    /// <exception cref="EntityErrorsException">Contains all the EntityErrors.  Only thrown if throwIfInvalid is true.</exception>
    /// <returns>List containing an EntityError for each failed validation.</returns>
    public List<EntityError> ValidateEntities(Dictionary<Type, List<EntityInfo>> saveMap, bool throwIfInvalid) {
      var entityErrors = new List<EntityError>();
      foreach (var kvp in saveMap) {

        foreach (var entityInfo in kvp.Value) {
          ValidateEntity(entityInfo, entityErrors);
        }
      }
      if (throwIfInvalid && entityErrors.Any()) {
          throw new EntityErrorsException(entityErrors);
      }
      return entityErrors;
    }

    /// <summary>
    /// Validates a single entity.
    /// Skips validation (returns true) if entity is marked Deleted.
    /// </summary>
    /// <param name="entityInfo">contains the entity to validate</param>
    /// <param name="entityErrors">An EntityError is added to this list for each error found in the entity</param>
    /// <returns>true if entity is valid, false if invalid.</returns>
    public bool ValidateEntity(EntityInfo entityInfo, List<EntityError> entityErrors) {
      if (entityInfo.EntityState == EntityState.Deleted) return true;
      bool isValid = true;
      var entity = entityInfo.Entity;
      var entityType = entity.GetType();
      var entityTypeName = entityType.FullName;
      var sType = _structuralTypeMap[entityTypeName];
      var dataProperties = sType.dataProperties;
      object[] keyValues = null;
      foreach (var dp in sType.dataProperties) {
        if (dp.validators == null) continue;
        if (dp.propertyInfo == null) {
          dp.propertyInfo = entityType.GetProperty(dp.name);  // try converting from camelCase?
          if (dp.propertyInfo == null) continue;
        }
        var value = dp.propertyInfo.GetValue(entity, null);

        foreach (var validator in dp.validators) {
          var errorMessage = validator.Validate(value);
          if (errorMessage != null) {
            if (keyValues == null) keyValues = _contextProvider.GetKeyValues(entityInfo);

            entityErrors.Add(new EntityError() {
              EntityTypeName = entityTypeName,
              ErrorMessage = errorMessage,
              ErrorName = "ValidationError",
              KeyValues = keyValues,
              PropertyName = dp.name
            });
            isValid = false;
          }
        }
      }
      return isValid;
    }

    #region Build the validator structure
    private Dictionary<string, StructuralType> BuildStructuralTypeMap(List<Dictionary<string, object>> structuralTypeList) {
      var map = new Dictionary<string, StructuralType>();
      foreach (var dt in structuralTypeList) {
        var st = new StructuralType();
        st.fullName = (string)dt["namespace"] + '.' + (string)dt["shortName"];
        st.dataProperties = new List<DataProperty>();
        var dpoList = (List<Dictionary<string, object>>)dt["dataProperties"];
        foreach (var dpo in dpoList) {
          st.dataProperties.Add(BuildDataProperty(dpo));
        }
        map.Add(st.fullName, st);
      }
      return map;
    }

    private DataProperty BuildDataProperty(Dictionary<string, object> data) {
      var dp = new DataProperty();
      object temp;
      dp.name = data.TryGetValue("nameOnServer", out temp) ? (string) temp : (string) data["name"];
      dp.dataType = data.TryGetValue("dataType", out temp) ? (string) temp : (string) data["complexTypeName"];
      dp.isNullable = data.ContainsKey("isNullable") ? (bool) data["isNullable"] : true;

      object validators;
      if (data.TryGetValue("validators", out validators)) {
        dp.validators = new List<Validator>();
        var validatorData = (List<Dictionary<string, string>>)validators;
        foreach (var vd in validatorData) {
          dp.validators.Add(BuildValidator(vd));
        }
      }
      return dp;
    }

    private Validator BuildValidator(Dictionary<string, string> data) {
      var name = data["name"];
      Validator v;
      if (name == "required") v = new RequiredValidator();
      else if (name == "maxLength") v = new MaxLengthValidator();
      else v = new Validator();
      v.name = name;
      if (data.Count > 1) {
        v.properties = data;
      }
      return v;
    }
    #endregion
    #region Internal types
    internal class StructuralType {
      internal string fullName;
      internal List<DataProperty> dataProperties;
    }

    internal class DataProperty {
      internal string name;
      internal string dataType;
      internal bool isNullable;
      internal PropertyInfo propertyInfo;
      internal List<Validator> validators;
    }

    internal class Validator {
      internal string name;
      internal Dictionary<string, string> properties;
      internal virtual string Validate(object value) {
        return null;
      }
    }

    internal class RequiredValidator : Validator {
      internal override string Validate(object value) {
        if (value == null) {
          return "A value is required.";
        }
        var s = value as string;
        if (s != null && String.IsNullOrWhiteSpace(s)) {
            return "A value is required.";
        }
        return null;
      }
    }

    internal class MaxLengthValidator : Validator {
      int maxLength = -1;
      internal override string Validate(object value) {
        if (maxLength < 0) {
          maxLength = Convert.ToInt32(properties["maxLength"]);
          if (maxLength < 0) throw new Exception("Validator maxLength must be >= 0");
        }
        var s = value as string;
        if (s == null) return null;
        if (s.Length > maxLength) {
          return "String length must not exceed " + maxLength;
        }
        return null;
      }
    }
  }
    #endregion

}

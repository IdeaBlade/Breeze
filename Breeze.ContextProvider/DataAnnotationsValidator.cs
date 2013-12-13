using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;

namespace Breeze.ContextProvider {
  public class DataAnnotationsValidator {

    private ContextProvider _contextProvider;
    /// <summary>
    /// Create a new instance.  
    /// </summary>
    /// <param name="contextProvider">Used for getting entity keys for building EntityError objects.</param>
    public DataAnnotationsValidator(ContextProvider contextProvider) {
      this._contextProvider = contextProvider;
    }

    public static void AddDescriptor(Type entityType, Type metadataType) {
      TypeDescriptor.AddProviderTransparent(
        new AssociatedMetadataTypeTypeDescriptionProvider(entityType, metadataType), entityType);
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
      // Perform validation on the entity, based on DataAnnotations.  
      var entity = entityInfo.Entity;
      var validationResults = new List<ValidationResult>();
      if (!Validator.TryValidateObject(entity, new ValidationContext(entity, null, null), validationResults, true)) {
        var keyValues = _contextProvider.GetKeyValues(entityInfo);
        var entityTypeName = entity.GetType().FullName;
        foreach (var vr in validationResults) {
          entityErrors.Add(new EntityError() {
            EntityTypeName = entityTypeName,
            ErrorMessage = vr.ErrorMessage,
            ErrorName = "ValidationError",
            KeyValues = keyValues,
            PropertyName = vr.MemberNames.FirstOrDefault()
          });
        }
        return false;
      }
      return true;
    }
  }
}

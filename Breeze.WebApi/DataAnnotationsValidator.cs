using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;

namespace Breeze.WebApi {
  public class DataAnnotationsValidator {

    private ContextProvider contextProvider;
    public DataAnnotationsValidator(ContextProvider contextProvider) {
      this.contextProvider = contextProvider;
    }

    public static void AddDescriptor(Type entityType, Type metadataType) {
      TypeDescriptor.AddProviderTransparent(
        new AssociatedMetadataTypeTypeDescriptionProvider(entityType, metadataType), entityType);
    }

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

    public bool ValidateEntity(EntityInfo entityInfo, List<EntityError> entityErrors) {
      // Perform validation on the entity, based on DataAnnotations.  
      var entity = entityInfo.Entity;
      var validationResults = new List<ValidationResult>();
      if (!Validator.TryValidateObject(entity, new ValidationContext(entity, null, null), validationResults, true)) {
        var keyValues = contextProvider.GetKeyValues(entityInfo);
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

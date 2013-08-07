﻿using Breeze.WebApi;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using NHibernate;
using NHibernate.Cfg;
using NHibernate.Metadata;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Linq;
using System.Text;

namespace Breeze.Nhibernate.WebApi {
  public class NHContext : ContextProvider, IDisposable {
    private ISession session;
    protected Configuration configuration;

    /// <summary>
    /// Create a new context for the given session.  
    /// Each thread should have its own NHContext and Session.
    /// </summary>
    /// <param name="session">Used for queries and updates</param>
    /// <param name="configuration">Used for metadata generation</param>
    public NHContext(ISession session, Configuration configuration) {
      this.session = session;
      this.configuration = configuration;
    }

    /// <summary>
    /// Creates a new context using the session and metadata from the sourceContext
    /// </summary>
    /// <param name="sourceContext">source of the Session and metadata used by this new context.</param>
    public NHContext(NHContext sourceContext) {
      this.session = sourceContext.Session;
      this._metadata = sourceContext.GetMetadata();
    }

    public ISession Session {
      get { return session; }
    }

    public NhQueryableInclude<T> GetQuery<T>() {
      return new NhQueryableInclude<T>(session.GetSessionImplementation());
    }

    public void Close() {
      if (session != null && session.IsOpen) session.Close();
    }

    public void Dispose() {
      Close();
    }

    public override IDbConnection GetDbConnection() {
      return session.Connection;
    }

    protected override void OpenDbConnection() {
      // already open when session is created
    }

    protected override void CloseDbConnection() {
      if (session != null && session.IsOpen) {
        var dbc = session.Close();
        if (dbc != null) dbc.Close();
      }
    }

    protected override IDbTransaction BeginTransaction(System.Data.IsolationLevel isolationLevel) {
      var itran = session.BeginTransaction(isolationLevel);
      var wrapper = new NHTransactionWrapper(itran, session.Connection, isolationLevel);
      return wrapper;
    }



    #region Metadata

    protected override string BuildJsonMetadata() {
      var meta = GetMetadata();
      var serializerSettings = new JsonSerializerSettings() {
        ReferenceLoopHandling = ReferenceLoopHandling.Ignore,
        PreserveReferencesHandling = PreserveReferencesHandling.Objects,
        ContractResolver = new CamelCasePropertyNamesContractResolver()
      };

      var json = JsonConvert.SerializeObject(meta, Formatting.Indented);
      return json;
    }

    protected IDictionary<string, object> GetMetadata() {
      if (_metadata == null) {
        var builder = new NHBreezeMetadata(session.SessionFactory, configuration);
        _metadata = builder.BuildMetadata();
      }
      return _metadata;
    }

    #endregion
    #region Save Changes

    private Dictionary<EntityInfo, KeyMapping> EntityKeyMapping = new Dictionary<EntityInfo, KeyMapping>();
    private Dictionary<EntityInfo, ICollection<ValidationResult>> ValidationResults = new Dictionary<EntityInfo, ICollection<ValidationResult>>();
    private IDictionary<string, object> _metadata;

    /// <summary>
    /// Persist the changes to the entities in the saveMap.
    /// This implements the abstract method in ContextProvider
    /// </summary>
    /// <param name="saveMap">Map of Type -> List of entities of that type</param>
    /// <returns>List of KeyMappings, which map the temporary keys to their real generated keys</returns>
    protected override void SaveChangesCore(SaveWorkState saveWorkState) {
      var saveMap = saveWorkState.SaveMap;
      var tx = session.Transaction;
      var hasExistingTransaction = (tx != null);
      if (!hasExistingTransaction) tx = session.BeginTransaction();
      try {
        ProcessSaves(saveMap);

        if (ValidationResults.Any()) {
          var msg = CollectValidationErrors();
          throw new ValidationException(msg);
        }

        session.Flush();
        RemoveRelationships(saveMap);
        RefreshFromSession(saveMap);
        if (!hasExistingTransaction) tx.Commit();
      } catch (PropertyValueException pve) {
        // NHibernate can throw this
        if (!hasExistingTransaction && tx.IsActive) tx.Rollback();
        var msg = string.Format("'{0}' validation error: property={1}, message={2}", pve.EntityName, pve.PropertyName, pve.Message);
        throw new ValidationException(msg);
      } catch (Exception) {
        if (!hasExistingTransaction && tx.IsActive) tx.Rollback();
        throw;
      } finally {
        if (!hasExistingTransaction) tx.Dispose();
      }

      saveWorkState.KeyMappings = UpdateAutoGeneratedKeys(saveWorkState.EntitiesWithAutoGeneratedKeys);
    }

    /// <summary>
    /// Concatenate all the validation messages together.
    /// </summary>
    /// <returns></returns>
    protected string CollectValidationErrors() {
      var sb = new StringBuilder();
      foreach (var kvp in ValidationResults) {
        var entityInfo = kvp.Key;
        var entity = entityInfo.Entity;
        var type = entity.GetType();
        var id = GetIdentifier(entity);

        foreach (var r in kvp.Value) {
          sb.AppendFormat("\n'{0}';{1} validation error: {2}",
              type.Name, id, r.ToString());
        }
      }

      return sb.ToString();
    }

    /// <summary>
    /// Persist the changes to the entities in the saveMap.
    /// </summary>
    /// <param name="saveMap"></param>
    private void ProcessSaves(Dictionary<Type, List<EntityInfo>> saveMap) {
      // Get the map of foreign key relationships
      var fkMap = (IDictionary<string, string>)GetMetadata()[NHBreezeMetadata.FK_MAP];
      var fixer = new NHRelationshipFixer(saveMap, fkMap, session);

      // Relate entities in the saveMap to each other
      fixer.FixupRelationships(false);

      foreach (var kvp in saveMap) {
        var entityType = kvp.Key;
        var classMeta = session.SessionFactory.GetClassMetadata(entityType);

        foreach (var entityInfo in kvp.Value) {
          AddKeyMapping(entityInfo, entityType, classMeta);
          ProcessEntity(entityInfo, classMeta);
        }
      }

      // Relate entities in the saveMap to other NH entities, so NH can save the FK values.
      fixer.FixupRelationships(true);

    }


    /// <summary>
    /// Add, update, or delete the entity according to its EntityState.
    /// </summary>
    /// <param name="entityInfo"></param>
    private void ProcessEntity(EntityInfo entityInfo, IClassMetadata classMeta) {
      var entity = entityInfo.Entity;
      var state = entityInfo.EntityState;

      // Perform validation on the entity, based on DataAnnotations.  TODO move this to a pluggable interceptor
      var validationResults = new List<ValidationResult>();
      if (!Validator.TryValidateObject(entity, new ValidationContext(entity), validationResults, true)) {
        ValidationResults.Add(entityInfo, validationResults);
        return;
      }

      // Restore the old value of the concurrency column so Hibernate will be able to save the entity
      if (classMeta.IsVersioned) {
        RestoreOldVersionValue(entityInfo, classMeta);
      }

      if (state == EntityState.Modified) {
        session.Update(entity);
      } else if (state == EntityState.Added) {
        session.Save(entity);
      } else if (state == EntityState.Deleted) {
        session.Delete(entity);
      } else {
        // Just re-associate the entity with the session.  Needed for many to many to get both ends into the session.
        session.Lock(entity, LockMode.None);
      }
    }

    /// <summary>
    /// Restore the old value of the concurrency column so Hibernate will save the entity.
    /// Otherwise it will complain because Breeze has already changed the value.
    /// </summary>
    /// <param name="entityInfo"></param>
    /// <param name="classMeta"></param>
    private void RestoreOldVersionValue(EntityInfo entityInfo, IClassMetadata classMeta) {
      if (entityInfo.OriginalValuesMap == null) return;
      var vcol = classMeta.VersionProperty;
      var vname = classMeta.PropertyNames[vcol];
      object oldVersion;
      if (entityInfo.OriginalValuesMap.TryGetValue(vname, out oldVersion)) {
        var entity = entityInfo.Entity;
        var vtype = classMeta.PropertyTypes[vcol].ReturnedClass;
        oldVersion = Convert.ChangeType(oldVersion, vtype);     // because JsonConvert makes all integers Int64
        classMeta.SetPropertyValue(entity, vname, oldVersion, EntityMode.Poco);
      }
    }

    /// <summary>
    /// Record the value of the temporary key in EntityKeyMapping
    /// </summary>
    /// <param name="entityInfo"></param>
    private void AddKeyMapping(EntityInfo entityInfo, Type type, IClassMetadata meta) {
      var entity = entityInfo.Entity;
      var id = GetIdentifier(entity, meta);
      var km = new KeyMapping() { EntityTypeName = type.FullName, TempValue = id };
      EntityKeyMapping.Add(entityInfo, km);
    }

    /// <summary>
    /// Get the identifier value for the entity.  If the entity does not have an
    /// identifier property, or natural identifiers defined, then the entity itself is returned.
    /// </summary>
    /// <param name="entity"></param>
    /// <param name="meta"></param>
    /// <returns></returns>
    private object GetIdentifier(object entity, IClassMetadata meta = null) {
      var type = entity.GetType();
      meta = meta ?? session.SessionFactory.GetClassMetadata(type);
      if (meta.HasIdentifierProperty) {
        return meta.GetIdentifier(entity, EntityMode.Poco);
      } else if (meta.HasNaturalIdentifier) {
        var idprops = meta.NaturalIdentifierProperties;
        var values = meta.GetPropertyValues(entity, EntityMode.Poco);
        var idvalues = idprops.Select(i => values[i]).ToArray();
        return idvalues;
      }
      return entity;
    }

    /// <summary>
    /// Update the KeyMappings with their real values.
    /// </summary>
    /// <returns></returns>
    private List<KeyMapping> UpdateAutoGeneratedKeys(List<EntityInfo> entitiesWithAutoGeneratedKeys) {
      var list = new List<KeyMapping>();
      foreach (var entityInfo in entitiesWithAutoGeneratedKeys) {
        KeyMapping km;
        if (EntityKeyMapping.TryGetValue(entityInfo, out km)) {
          if (km.TempValue != null) {
            var entity = entityInfo.Entity;
            var id = GetIdentifier(entity);
            km.RealValue = id;
            list.Add(km);
          }
        }
      }
      return list;
    }


    /// <summary>
    /// Remove the navigations between entities in the saveMap.  This flattens the JSON
    /// result so Breeze can handle it.
    /// </summary>
    /// <param name="saveMap">Map of entity types -> entity instances to save</param>
    private void RemoveRelationships(Dictionary<Type, List<EntityInfo>> saveMap) {
      foreach (var kvp in saveMap) {
        var entityType = kvp.Key;
        var classMeta = session.SessionFactory.GetClassMetadata(entityType);

        foreach (var entityInfo in kvp.Value) {
          RemoveRelationships(entityInfo, classMeta);
        }
      }
    }

    /// <summary>
    /// Set the navigation properties to null on the given entity.
    /// </summary>
    /// <param name="entityInfo"></param>
    /// <param name="meta"></param>
    private void RemoveRelationships(EntityInfo entityInfo, IClassMetadata meta) {
      var entity = entityInfo.Entity;
      var propNames = meta.PropertyNames;
      var propTypes = meta.PropertyTypes;

      for (int i = 0; i < propNames.Length; i++) {
        var propType = propTypes[i];
        if (propType.IsAssociationType && propType.IsEntityType) {
          meta.SetPropertyValue(entity, propNames[i], null, EntityMode.Poco);
        }
      }
    }

    /// <summary>
    /// Refresh the entities from the database.  This picks up changes due to triggers, etc.
    /// </summary>
    /// TODO make this faster
    /// TODO make this optional
    /// <param name="saveMap"></param>
    private void RefreshFromSession(Dictionary<Type, List<EntityInfo>> saveMap) {
      //using (var tx = session.BeginTransaction()) {
        foreach (var kvp in saveMap) {
          foreach (var entityInfo in kvp.Value) {
            if (entityInfo.EntityState != EntityState.Deleted)
              session.Refresh(entityInfo.Entity);
          }
        }
        //tx.Commit();
      //}
    }


    #endregion
  }
}
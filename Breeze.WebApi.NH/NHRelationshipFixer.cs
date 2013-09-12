using Breeze.WebApi;
using NHibernate;
using NHibernate.Metadata;
using NHibernate.Type;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Breeze.WebApi.NH
{
    /// <summary>
    /// Utility class for re-establishing the relationships between entities prior to saving them in Nhibernate.
    /// 
    /// Breeze requires many-to-one relationships to have properties both the related entity and its ID, and it 
    /// sends only the ID in the save bundle.  To make it work with NH, we map the <code>many-to-one</code> entity, and map the 
    /// foreign key ID with <code> insert="false" update="false" </code>, so the <code>many-to-one</code> entity must
    /// be populated in order for the foreign key value to be saved in the DB.  To work
    /// around this problem, this class uses the IDs sent by Breeze to re-connect the related entities.
    /// </summary>
    class NHRelationshipFixer
    {
        private Dictionary<Type, List<EntityInfo>> saveMap;
        private IDictionary<string, string> fkMap;
        private ISession session;

        /// <summary>
        /// Create new instance with the given saveMap and fkMap.  Since the saveMap is unique per save, 
        /// this instance will be useful for processing one entire save bundle only.
        /// </summary>
        /// <param name="saveMap">Map of entity types -> entity instances to save.  This is provided by Breeze in the SaveChanges call.</param>
        /// <param name="fkMap">Map of relationship name -> foreign key name.  This is built in the NHBreezeMetadata class.</param>
        /// <param name="session">NHibernate session that will save the entities</param>
        public NHRelationshipFixer(Dictionary<Type, List<EntityInfo>> saveMap, IDictionary<string, string> fkMap, ISession session)
        {
            this.saveMap = saveMap;
            this.fkMap = fkMap;
            this.session = session;
        }

        /// <summary>
        /// Connect the related entities in the saveMap to other entities.
        /// </summary>
        /// <param name="canUseSession">Whether we can load the related entity via the Session.  
        /// If false, we only connect entities that are also in the saveMap</param>
        public void FixupRelationships(bool canUseSession)
        {
            foreach (var kvp in saveMap)
            {
                var entityType = kvp.Key;
                var classMeta = session.SessionFactory.GetClassMetadata(entityType);

                foreach (var entityInfo in kvp.Value)
                {
                    FixupRelationships(entityInfo, classMeta, canUseSession);
                }
            }
        }

        /// <summary>
        /// Connect the related entities based on the foreign key values.
        /// Note that this may cause related entities to be loaded from the DB if they are not already in the session.
        /// </summary>
        /// <param name="entityInfo">Entity that will be saved</param>
        /// <param name="meta">Metadata about the entity type</param>
        /// <param name="canUseSession">Whether we can load the related entity via the Session.  
        /// If false, we only connect entities that are also in the saveMap</param>
        private void FixupRelationships(EntityInfo entityInfo, IClassMetadata meta, bool canUseSession)
        {
            var propNames = meta.PropertyNames;
            var propTypes = meta.PropertyTypes;

            if (meta.IdentifierType != null)
            {
                var propType = meta.IdentifierType;
                if (propType.IsAssociationType && propType.IsEntityType)
                {
                    FixupRelationship(meta.IdentifierPropertyName, meta.IdentifierType, entityInfo, meta, canUseSession);
                }
                else if (propType.IsComponentType)
                {
                    FixupComponentRelationships(meta.IdentifierPropertyName, (ComponentType)propType, entityInfo, meta, canUseSession);
                }
            }

            for (int i = 0; i < propNames.Length; i++)
            {
                var propType = propTypes[i];
                if (propType.IsAssociationType && propType.IsEntityType)
                {
                    FixupRelationship(propNames[i], propTypes[i], entityInfo, meta, canUseSession);
                }
                else if (propType.IsComponentType)
                {
                    FixupComponentRelationships(propNames[i], (ComponentType)propType, entityInfo, meta, canUseSession);
                }
            }
        }

        /// <summary>
        /// Connect the related entities based on the foreign key values found in a component type.
        /// This updates the values of the component's properties.
        /// </summary>
        /// <param name="propName">Name of the (component) property of the entity.  May be null if the property is the entity's identifier.</param>
        /// <param name="compType">Type of the component</param>
        /// <param name="entityInfo">Breeze EntityInfo</param>
        /// <param name="meta">Metadata for the entity class</param>
        /// <param name="canUseSession">Whether we can load the related entity via the Session.  
        /// If false, we only connect entities that are also in the saveMap</param>
        private void FixupComponentRelationships(string propName, ComponentType compType, EntityInfo entityInfo, IClassMetadata meta, bool canUseSession)
        {
            var compPropNames = compType.PropertyNames;
            var compPropTypes = compType.Subtypes;
            object component = null;
            object[] compValues = null;
            bool isChanged = false;
            for (int j = 0; j < compPropNames.Length; j++)
            {
                var compPropType = compPropTypes[j];
                if (compPropType.IsAssociationType && compPropType.IsEntityType)
                {
                    if (compValues == null)
                    {
                        // get the value of the component's subproperties
                        component = GetPropertyValue(meta, entityInfo.Entity, propName);
                        compValues = compType.GetPropertyValues(component, EntityMode.Poco);
                    }
                    if (compValues[j] == null)
                    {
                        // the related entity is null
                        var relatedEntity = GetRelatedEntity(compPropNames[j], compPropType, entityInfo, meta, canUseSession);
                        if (relatedEntity != null)
                        {
                            compValues[j] = relatedEntity;
                            isChanged = true;
                        }
                    }
                }
            }
            if (isChanged)
            {
                compType.SetPropertyValues(component, compValues, EntityMode.Poco);
            }

        }

        /// <summary>
        /// Set an association value based on the value of the foreign key.  This updates the property of the entity.
        /// </summary>
        /// <param name="propName">Name of the navigation/association property of the entity, e.g. "Customer".  May be null if the property is the entity's identifier.</param>
        /// <param name="propType">Type of the property</param>
        /// <param name="entityInfo">Breeze EntityInfo</param>
        /// <param name="meta">Metadata for the entity class</param>
        /// <param name="canUseSession">Whether we can load the related entity via the Session.  
        /// If false, we only connect entities that are also in the saveMap</param>
        private void FixupRelationship(string propName, IType propType, EntityInfo entityInfo, IClassMetadata meta, bool canUseSession)
        {
            var entity = entityInfo.Entity;
            object relatedEntity = GetPropertyValue(meta, entity, propName);
            if (relatedEntity != null) return;    // entities are already connected

            relatedEntity = GetRelatedEntity(propName, propType, entityInfo, meta, canUseSession);

            if (relatedEntity != null)
                meta.SetPropertyValue(entity, propName, relatedEntity, EntityMode.Poco);
        }

        /// <summary>
        /// Get a related entity based on the value of the foreign key.
        /// </summary>
        /// <param name="propName">Name of the navigation/association property of the entity, e.g. "Customer".  May be null if the property is the entity's identifier.</param>
        /// <param name="propType">Type of the property</param>
        /// <param name="entityInfo">Breeze EntityInfo</param>
        /// <param name="meta">Metadata for the entity class</param>
        /// <param name="canUseSession">Whether we can load the related entity via the Session.  
        /// If false, we only connect entities that are also in the saveMap</param>
        /// <returns></returns>
        private object GetRelatedEntity(string propName, IType propType, EntityInfo entityInfo, IClassMetadata meta, bool canUseSession)
        {
            object relatedEntity = null;
            var relKey = meta.EntityName + '.' + propName;
            var foreignKeyName = fkMap[relKey];

            object id = GetForeignKeyValue(entityInfo, meta, foreignKeyName, canUseSession);

            if (id != null)
            {
                relatedEntity = FindInSaveMap(propType.ReturnedClass, id);

                if (relatedEntity == null && canUseSession)
                {
                    var relatedEntityName = propType.Name;
                    relatedEntity = session.Load(relatedEntityName, id);
                }
            }
            return relatedEntity;
        }

        /// <summary>
        /// Get the value of the foreign key property.  This comes from the entity, but if that value is
        /// null, we may try to get it from the originalValuesMap.
        /// </summary>
        /// <param name="entityInfo">Breeze EntityInfo</param>
        /// <param name="meta">Metadata for the entity class</param>
        /// <param name="foreignKeyName">Name of the foreign key property of the entity, e.g. "CustomerID"</param>
        /// <param name="currentValuesOnly">if false, and the entity is deleted, try to get the value from the originalValuesMap 
        /// if we were unable to get it from the entity.</param>
        /// <returns></returns>
        private object GetForeignKeyValue(EntityInfo entityInfo, IClassMetadata meta, string foreignKeyName, bool currentValuesOnly)
        {
            var entity = entityInfo.Entity;
            object id = null;
            if (foreignKeyName == meta.IdentifierPropertyName)
                id = meta.GetIdentifier(entity, EntityMode.Poco);
            else if (meta.PropertyNames.Contains(foreignKeyName))
                id = meta.GetPropertyValue(entity, foreignKeyName, EntityMode.Poco);
            else if (meta.IdentifierType.IsComponentType)
            {
                // compound key
                var compType = meta.IdentifierType as ComponentType;
                var index = Array.IndexOf<string>(compType.PropertyNames, foreignKeyName);
                if (index >= 0)
                {
                    var idComp = meta.GetIdentifier(entity, EntityMode.Poco);
                    id = compType.GetPropertyValue(idComp, index, EntityMode.Poco);
                }
            }

            if (id == null && !currentValuesOnly && entityInfo.EntityState == EntityState.Deleted)
            {
                entityInfo.OriginalValuesMap.TryGetValue(foreignKeyName, out id);
            }
            return id;
        }

        /// <summary>
        /// Return the property value for the given entity.
        /// </summary>
        /// <param name="meta"></param>
        /// <param name="entity"></param>
        /// <param name="propName">If null, the identifier property will be returned.</param>
        /// <returns></returns>
        private object GetPropertyValue(IClassMetadata meta, object entity, string propName)
        {
            if (propName == null || propName == meta.IdentifierPropertyName)
                return meta.GetIdentifier(entity, EntityMode.Poco);
            else
                return meta.GetPropertyValue(entity, propName, EntityMode.Poco);
        }


        /// <summary>
        /// Find the matching entity in the saveMap.  This is for relationship fixup.
        /// </summary>
        /// <param name="entityType">Type of entity, e.g. Order</param>
        /// <param name="entityId">Key value of the entity</param>
        /// <returns>The entity, or null if not found</returns>
        private object FindInSaveMap(Type entityType, object entityId)
        {
            var entityIdString = entityId.ToString();
            List<EntityInfo> entityInfoList;
            if (saveMap.TryGetValue(entityType, out entityInfoList))
            {
                var meta = session.SessionFactory.GetClassMetadata(entityType);
                foreach (var entityInfo in entityInfoList)
                {
                    var entity = entityInfo.Entity;
                    var id = meta.GetIdentifier(entity, EntityMode.Poco);
                    if (id != null && entityIdString.Equals(id.ToString())) return entity;
                }
            }
            return null;
        }


    }
}

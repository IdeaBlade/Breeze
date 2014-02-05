using Breeze.WebApi;
using NHibernate;
using NHibernate.Metadata;
using NHibernate.Persister.Entity;
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
    public class NHRelationshipFixer
    {
        private Dictionary<Type, List<EntityInfo>> saveMap;
        private IDictionary<string, string> fkMap;
        private ISession session;
        private List<EntityInfo> saveOrder;
        private List<EntityInfo> deleteOrder;
        private Dictionary<EntityInfo, List<EntityInfo>> dependencyGraph;
        private bool removeMode;

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
            this.dependencyGraph = new Dictionary<EntityInfo, List<EntityInfo>>();
        }

        /// <summary>
        /// Connect the related entities in the saveMap to other entities.  If the related entities
        /// are not in the saveMap, they are loaded from the session.
        /// </summary>
        /// <returns>The list of entities in the order they should be save, according to their relationships.</returns>
        public List<EntityInfo> FixupRelationships()
        {
            this.removeMode = false;
            ProcessRelationships();
            return SortDependencies();
        }

        /// <summary>
        /// Remove the navigations between entities in the saveMap.  This flattens the JSON
        /// result so Breeze can handle it.
        /// </summary>
        /// <param name="saveMap">Map of entity types -> entity instances to save</param>
        public void RemoveRelationships()
        {
            this.removeMode = true;
            ProcessRelationships();
        }

        /// <summary>
        /// Add the relationship to the dependencyGraph
        /// </summary>
        /// <param name="child">Entity that depends on parent (e.g. has a many-to-one relationship to parent)</param>
        /// <param name="parent">Entity that child depends on (e.g. one parent has one-to-many children)</param>
        /// <param name="removeReverse">True to find and remove the reverse relationship.  Used for handling one-to-ones.</param>
        private void AddToGraph(EntityInfo child, EntityInfo parent, bool removeReverse)
        {
            List<EntityInfo> list;
            if (!dependencyGraph.TryGetValue(child, out list))
            {
                list = new List<EntityInfo>(5);
                dependencyGraph.Add(child, list);
            }
            if (parent != null) list.Add(parent);

            if (removeReverse)
            {
                List<EntityInfo> parentList;
                if (dependencyGraph.TryGetValue(parent, out parentList))
                {
                    parentList.Remove(child);
                }
            }
        }

        /// <summary>
        /// Sort the entries in the dependency graph according to their dependencies.
        /// </summary>
        /// <returns></returns>
        private List<EntityInfo> SortDependencies()
        {
            saveOrder = new List<EntityInfo>();
            deleteOrder = new List<EntityInfo>();
            foreach (var entityInfo in dependencyGraph.Keys)
            {
                AddToSaveOrder(entityInfo, 0);
            }
            deleteOrder.Reverse();
            saveOrder.AddRange(deleteOrder);
            return saveOrder;
        }

        /// <summary>
        /// Recursively add entities to the saveOrder or deleteOrder according to their dependencies
        /// </summary>
        /// <param name="entityInfo">Entity to be added.  Its dependencies will be added depth-first.</param>
        /// <param name="depth">prevents infinite recursion in case of cyclic dependencies</param>
        private void AddToSaveOrder(EntityInfo entityInfo, int depth)
        {
            if (saveOrder.Contains(entityInfo)) return;
            if (deleteOrder.Contains(entityInfo)) return;
            if (depth > 10) return;

            var dependencies = dependencyGraph[entityInfo];
            foreach (var dep in dependencies)
            {
                AddToSaveOrder(dep, depth + 1);
            }

            if (entityInfo.EntityState == EntityState.Deleted)
                deleteOrder.Add(entityInfo);
            else
                saveOrder.Add(entityInfo);
        }

        /// <summary>
        /// Add or remove the entity relationships according to the removeMode.
        /// </summary>
        private void ProcessRelationships()
        {
            foreach (var kvp in saveMap)
            {
                var entityType = kvp.Key;
                var classMeta = session.SessionFactory.GetClassMetadata(entityType);

                foreach (var entityInfo in kvp.Value)
                {
                    AddToGraph(entityInfo, null, false); // make sure every entity is in the graph
                    FixupRelationships(entityInfo, classMeta);
                }
            }
        }

        /// <summary>
        /// Connect the related entities based on the foreign key values.
        /// Note that this may cause related entities to be loaded from the DB if they are not already in the session.
        /// </summary>
        /// <param name="entityInfo">Entity that will be saved</param>
        /// <param name="meta">Metadata about the entity type</param>
        private void FixupRelationships(EntityInfo entityInfo, IClassMetadata meta)
        {
            var propNames = meta.PropertyNames;
            var propTypes = meta.PropertyTypes;


            if (meta.IdentifierType != null)
            {
                var propType = meta.IdentifierType;
                if (propType.IsAssociationType && propType.IsEntityType)
                {
                    FixupRelationship(meta.IdentifierPropertyName, (EntityType)propType, entityInfo, meta);
                }
                else if (propType.IsComponentType)
                {
                    FixupComponentRelationships(meta.IdentifierPropertyName, (ComponentType)propType, entityInfo, meta);
                }
            }

            for (int i = 0; i < propNames.Length; i++)
            {
                var propType = propTypes[i];
                if (propType.IsAssociationType && propType.IsEntityType)
                {
                    FixupRelationship(propNames[i], (EntityType)propTypes[i], entityInfo, meta);
                }
                else if (propType.IsComponentType)
                {
                    FixupComponentRelationships(propNames[i], (ComponentType)propType, entityInfo, meta);
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
        private void FixupComponentRelationships(string propName, ComponentType compType, EntityInfo entityInfo, IClassMetadata meta)
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
                        var relatedEntity = GetRelatedEntity(compPropNames[j], (EntityType)compPropType, entityInfo, meta);
                        if (relatedEntity != null)
                        {
                            compValues[j] = relatedEntity;
                            isChanged = true;
                        }
                    }
                    else if (removeMode)
                    {
                        // remove the relationship
                        compValues[j] = null;
                        isChanged = true;
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
        private void FixupRelationship(string propName, EntityType propType, EntityInfo entityInfo, IClassMetadata meta)
        {
            var entity = entityInfo.Entity;
            if (removeMode)
            {
                meta.SetPropertyValue(entity, propName, null, EntityMode.Poco);
                return;
            }
            object relatedEntity = GetPropertyValue(meta, entity, propName);
            if (relatedEntity != null) return;    // entities are already connected

            relatedEntity = GetRelatedEntity(propName, propType, entityInfo, meta);

            if (relatedEntity != null)
                meta.SetPropertyValue(entity, propName, relatedEntity, EntityMode.Poco);
        }

        /// <summary>
        /// Get a related entity based on the value of the foreign key.  Attempts to find the related entity in the
        /// saveMap; if its not found there, it is loaded via the Session (which should create a proxy, not actually load 
        /// the entity from the database).
        /// Related entities are Promoted in the saveOrder according to their state.
        /// </summary>
        /// <param name="propName">Name of the navigation/association property of the entity, e.g. "Customer".  May be null if the property is the entity's identifier.</param>
        /// <param name="propType">Type of the property</param>
        /// <param name="entityInfo">Breeze EntityInfo</param>
        /// <param name="meta">Metadata for the entity class</param>
        /// <returns></returns>
        private object GetRelatedEntity(string propName, EntityType propType, EntityInfo entityInfo, IClassMetadata meta)
        {
            object relatedEntity = null;
            string foreignKeyName = FindForeignKey(propName, meta);
            object id = GetForeignKeyValue(entityInfo, meta, foreignKeyName);

            if (id != null)
            {
                EntityInfo relatedEntityInfo = FindInSaveMap(propType.ReturnedClass, id);

                if (relatedEntityInfo == null)
                {
                    var state = entityInfo.EntityState;
                    if (state != EntityState.Deleted || !propType.IsNullable)
                    {
                        var relatedEntityName = propType.Name;
                        relatedEntity = session.Load(relatedEntityName, id, LockMode.None);
                    }
                }
                else
                {
                    bool removeReverseRelationship = propType.UseLHSPrimaryKey;
                    AddToGraph(entityInfo, relatedEntityInfo, removeReverseRelationship);
                    relatedEntity = relatedEntityInfo.Entity;
                }
            }
            return relatedEntity;
        }

        /// <summary>
        /// Find a foreign key matching the given property, by looking in the fkMap.
        /// The property may be defined on the class or a superclass, so this function calls itself recursively.
        /// </summary>
        /// <param name="propName">Name of the property e.g. "Product"</param>
        /// <param name="meta">Class metadata, for traversing the class hierarchy</param>
        /// <returns>The name of the foreign key, e.g. "ProductID"</returns>
        private string FindForeignKey(string propName, IClassMetadata meta)
        {
            var relKey = meta.EntityName + '.' + propName;
            if (fkMap.ContainsKey(relKey))
            {
                return fkMap[relKey];
            }
            else if (meta.IsInherited && meta is AbstractEntityPersister)
            {
                var superEntityName = ((AbstractEntityPersister)meta).MappedSuperclass;
                var superMeta = session.SessionFactory.GetClassMetadata(superEntityName);
                return FindForeignKey(propName, superMeta);
            }
            else
            {
                throw new ArgumentException("Foreign Key '" + relKey + "' could not be found.");
            }
        }

        /// <summary>
        /// Get the value of the foreign key property.  This comes from the entity, but if that value is
        /// null, and the entity is deleted, we try to get it from the originalValuesMap.
        /// </summary>
        /// <param name="entityInfo">Breeze EntityInfo</param>
        /// <param name="meta">Metadata for the entity class</param>
        /// <param name="foreignKeyName">Name of the foreign key property of the entity, e.g. "CustomerID"</param>
        /// <returns></returns>
        private object GetForeignKeyValue(EntityInfo entityInfo, IClassMetadata meta, string foreignKeyName)
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

            if (id == null && entityInfo.EntityState == EntityState.Deleted)
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
        private EntityInfo FindInSaveMap(Type entityType, object entityId)
        {
            List<EntityInfo> entityInfoList = saveMap.Where(p => entityType.IsAssignableFrom(p.Key)).SelectMany(p => p.Value).ToList();
            if (entityInfoList != null && entityInfoList.Count != 0)
            {
                var entityIdString = entityId.ToString();
                var meta = session.SessionFactory.GetClassMetadata(entityType);
                foreach (var entityInfo in entityInfoList)
                {
                    var entity = entityInfo.Entity;
                    var id = meta.GetIdentifier(entity, EntityMode.Poco);
                    if (id != null && entityIdString.Equals(id.ToString()))
                        return entityInfo;
                }
            }
            return null;
        }


    }
}

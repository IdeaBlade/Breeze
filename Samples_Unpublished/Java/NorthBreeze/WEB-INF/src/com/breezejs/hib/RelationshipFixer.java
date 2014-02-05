package com.breezejs.hib;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import org.hibernate.EntityMode;
import org.hibernate.LockOptions;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.metadata.ClassMetadata;
import org.hibernate.persister.entity.AbstractEntityPersister;
import org.hibernate.type.ComponentType;
import org.hibernate.type.EntityType;
import org.hibernate.type.ForeignKeyDirection;
import org.hibernate.type.Type;

import com.breezejs.save.EntityInfo;
import com.breezejs.save.EntityState;


/**
 * Utility class for re-establishing the relationships between entities prior to saving them in Hibernate.
 * Breeze requires many-to-one relationships to have properties both the related entity and its ID, and it 
 * sends only the ID in the save bundle.  To make it work with Hibernate, we map the <code>many-to-one</code> entity, and map the 
 * foreign key ID with <code> insert="false" update="false" </code>, so the <code>many-to-one</code> entity must
 * be populated in order for the foreign key value to be saved in the DB.  To work
 * around this problem, this class uses the IDs sent by Breeze to re-connect the related entities.
 * @author Steve
 */
public class RelationshipFixer {
    private Map<Class, List<EntityInfo>> saveMap;
    private Map<String, String> fkMap;
    private Session session;
    private SessionFactory sessionFactory;
    private List<EntityInfo> saveOrder;
    private List<EntityInfo> deleteOrder;
    private Map<EntityInfo, List<EntityInfo>> dependencyGraph;
    private boolean removeMode;
    
    /**
     * Create new instance with the given saveMap and fkMap.  Since the saveMap is unique per save, 
     * this instance will be useful for processing one entire save bundle only.
     * @param saveMap Map of entity types -> entity instances to save.  This is provided by Breeze in the SaveChanges call.
     * @param fkMap Map of relationship name -> foreign key name.  This is built in the MetadataBuilder class.
     * @param session Hibernate session that will save the entities
     */
	public RelationshipFixer(Map<Class, List<EntityInfo>> saveMap, Map<String, String> fkMap, Session session) {
		super();
		this.saveMap = saveMap;
		this.fkMap = fkMap;
		this.session = session;
		this.sessionFactory = session.getSessionFactory();
        this.dependencyGraph = new HashMap<EntityInfo, List<EntityInfo>>();
	}

	
	/**
	 * Connect the related entities in the saveMap to other entities.  If the related entities
	 * are not in the saveMap, they are loaded from the session.
	 * @return The list of entities in the order they should be save, according to their relationships.
	 */
    public List<EntityInfo> fixupRelationships()
    {
        this.removeMode = false;
        processRelationships();
    	return sortDependencies();
    }
    
    /**
     * Remove the navigations between entities in the saveMap.
     * This flattens the JSON result so Breeze can handle it.
     */
    public void removeRelationships()
    {
        this.removeMode = true;
        processRelationships();
    }
    
    /**
     * Add the relationship to the dependencyGraph
     * @param child Entity that depends on parent (e.g. has a many-to-one relationship to parent)
     * @param parent Entity that child depends on (e.g. one parent has one-to-many children)
     * @param removeReverse True to find and remove the reverse relationship.  Used for handling one-to-ones.
     */
    private void addToGraph(EntityInfo child, EntityInfo parent, boolean removeReverse)
    {
        List<EntityInfo> list = dependencyGraph.get(child);
        if (list == null) {
            list = new ArrayList<EntityInfo>(5);
            dependencyGraph.put(child, list);
        }
        if (parent != null) list.add(parent);

        if (removeReverse) {
            List<EntityInfo> parentList = dependencyGraph.get(parent);
            if (parentList != null) {
                parentList.remove(child);
            }
        }
    }

    /**
     * Sort the entries in the dependency graph according to their dependencies.
     * @return the sorted list
     */
    private List<EntityInfo> sortDependencies()
    {
        saveOrder = new ArrayList<EntityInfo>();
        deleteOrder = new ArrayList<EntityInfo>();
        for (EntityInfo entityInfo : dependencyGraph.keySet()) {
            addToSaveOrder(entityInfo, 0);
        }
        Collections.reverse(deleteOrder);
        saveOrder.addAll(deleteOrder);
        return saveOrder;
    }

    /**
     * Recursively add entities to the saveOrder or deleteOrder according to their dependencies
     * @param entityInfo Entity to be added.  Its dependencies will be added depth-first.
     * @param depth prevents infinite recursion in case of cyclic dependencies
     */
    private void addToSaveOrder(EntityInfo entityInfo, int depth)
    {
        if (saveOrder.contains(entityInfo)) return;
        if (deleteOrder.contains(entityInfo)) return;
        if (depth > 10) return;

        List<EntityInfo> dependencies = dependencyGraph.get(entityInfo);
        for (EntityInfo dep : dependencies) {
            addToSaveOrder(dep, depth + 1);
        }

        if (entityInfo.entityState == EntityState.Deleted)
            deleteOrder.add(entityInfo);
        else
            saveOrder.add(entityInfo);
    }
    
    
    /**
     * Add or remove the entity relationships according to the current removeMode.
     */
    private void processRelationships()
    {
    	for (Entry<Class, List<EntityInfo>> entry : saveMap.entrySet()) {
    		
            Class entityType = entry.getKey();
            ClassMetadata classMeta = sessionFactory.getClassMetadata(entityType);

            for (EntityInfo entityInfo : entry.getValue())
            {
                addToGraph(entityInfo, null, false); // make sure every entity is in the graph
                fixupRelationships(entityInfo, classMeta);
            }
        }    	
    }
	
    /**
     * Connect the related entities based on the foreign key values.
     * Note that this may cause related entities to be loaded from the DB if they are not already in the session.
     * @param entityInfo Entity that will be saved
     * @param meta Metadata about the entity type
     */
    private void fixupRelationships(EntityInfo entityInfo, ClassMetadata meta)
    {
        String[] propNames = meta.getPropertyNames();
        Type[] propTypes = meta.getPropertyTypes();
        
        Type propType = meta.getIdentifierType();
        if (propType != null)
        {
            if (propType.isAssociationType() && propType.isEntityType())
            {
                fixupRelationship(meta.getIdentifierPropertyName(), (EntityType)propType, entityInfo, meta);
            }
            else if (propType.isComponentType())
            {
                fixupComponentRelationships(meta.getIdentifierPropertyName(), (ComponentType)propType, entityInfo, meta);
            }
        }

        for (int i = 0; i < propNames.length; i++)
        {
            propType = propTypes[i];
            if (propType.isAssociationType() && propType.isEntityType())
            {
                fixupRelationship(propNames[i], (EntityType)propTypes[i], entityInfo, meta);
            }
            else if (propType.isComponentType())
            {
                fixupComponentRelationships(propNames[i], (ComponentType)propType, entityInfo, meta);
            }
        }
    }
    
    /**
     * Connect the related entities based on the foreign key values found in a component type.
     * This updates the values of the component's properties.
     * @param propName Name of the (component) property of the entity.  May be null if the property is the entity's identifier.
     * @param compType Type of the component
     * @param entityInfo Breeze EntityInfo
     * @param meta Metadata for the entity class
     */
    private void fixupComponentRelationships(String propName, ComponentType compType, EntityInfo entityInfo, ClassMetadata meta)
    {
        String[] compPropNames = compType.getPropertyNames();
        Type[] compPropTypes = compType.getSubtypes();
        Object component = null;
        Object[] compValues = null;
        boolean isChanged = false;
        for (int j = 0; j < compPropNames.length; j++)
        {
            Type compPropType = compPropTypes[j];
            if (compPropType.isAssociationType() && compPropType.isEntityType())
            {
                if (compValues == null)
                {
                    // get the value of the component's subproperties
                    component = getPropertyValue(meta, entityInfo.entity, propName);
                    compValues = compType.getPropertyValues(component, EntityMode.POJO);
                }
                if (compValues[j] == null)
                {
                    // the related entity is null
                    Object relatedEntity = getRelatedEntity(compPropNames[j], (EntityType)compPropType, entityInfo, meta);
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
            compType.setPropertyValues(component, compValues, EntityMode.POJO);
        }

    }
    
    /**
     * Set an association value based on the value of the foreign key.  This updates the property of the entity.
     * @param propName Name of the navigation/association property of the entity, e.g. "Customer".  May be null if the property is the entity's identifier.
     * @param propType Type of the property
     * @param entityInfo Breeze EntityInfo
     * @param meta Metadata for the entity class
     */
    private void fixupRelationship(String propName, EntityType propType, EntityInfo entityInfo, ClassMetadata meta)
    {
        Object entity = entityInfo.entity;
        if (removeMode)
        {
            meta.setPropertyValue(entity, propName, null);
            return;
        }
        Object relatedEntity = getPropertyValue(meta, entity, propName);
        if (relatedEntity != null) return;    // entities are already connected

        relatedEntity = getRelatedEntity(propName, propType, entityInfo, meta);

        if (relatedEntity != null)
            meta.setPropertyValue(entity, propName, relatedEntity);
    }
    
    /**
     * Get a related entity based on the value of the foreign key.  Attempts to find the related entity in the
     * saveMap; if its not found there, it is loaded via the Session (which should create a proxy, not actually load
     * the entity from the database).
     * Related entities are Promoted in the saveOrder according to their state.
     * @param propName Name of the navigation/association property of the entity, e.g. "Customer".  May be null if the property is the entity's identifier.
     * @param propType Type of the property
     * @param entityInfo Breeze EntityInfo
     * @param meta Metadata for the entity class
     * @return
     */
    private Object getRelatedEntity(String propName, EntityType propType, EntityInfo entityInfo, ClassMetadata meta)
    {
    	Object relatedEntity = null;
    	String foreignKeyName = findForeignKey(propName, meta);
        Object id = getForeignKeyValue(entityInfo, meta, foreignKeyName);

        if (id != null)
        {
            EntityInfo relatedEntityInfo = findInSaveMap(propType.getReturnedClass(), id);

            if (relatedEntityInfo == null) {
            	EntityState state = entityInfo.entityState;
//            	if (state == EntityState.Added || state == EntityState.Modified || (state == EntityState.Deleted 
//            			&& propType.getForeignKeyDirection() != ForeignKeyDirection.FOREIGN_KEY_TO_PARENT)) {
            	if (state != EntityState.Deleted || propType.getForeignKeyDirection() != ForeignKeyDirection.FOREIGN_KEY_TO_PARENT) {
                	String relatedEntityName = propType.getName();
                    relatedEntity = session.load(relatedEntityName, (Serializable) id, LockOptions.NONE);
            	}
            } else {
            	boolean removeReverseRelationship = propType.useLHSPrimaryKey();
                addToGraph(entityInfo, relatedEntityInfo, removeReverseRelationship);
                relatedEntity = relatedEntityInfo.entity;
            }
        }
        return relatedEntity;
    }
    
    /**
     * Find a foreign key matching the given property, by looking in the fkMap.
     * The property may be defined on the class or a superclass, so this function calls itself recursively.
     * @param propName Name of the property e.g. "Product"
     * @param meta Class metadata, for traversing the class hierarchy
     * @return The name of the foreign key, e.g. "ProductID"
     */
    private String findForeignKey(String propName, ClassMetadata meta)
    {
        String relKey = meta.getEntityName() + '.' + propName;
        if (fkMap.containsKey(relKey))
        {
            return fkMap.get(relKey);
        }
        else if (meta.isInherited() && meta instanceof AbstractEntityPersister)
        {
            String superEntityName = ((AbstractEntityPersister)meta).getMappedSuperclass();
            ClassMetadata superMeta = sessionFactory.getClassMetadata(superEntityName);
            return findForeignKey(propName, superMeta);
        }
        else
        {
            throw new IllegalArgumentException("Foreign Key '" + relKey + "' could not be found.");
        }
    }
    
    /**
     * Get the value of the foreign key property.  This comes from the entity, but if that value is
     * null, and the entity is deleted, we try to get it from the originalValuesMap.
     * @param entityInfo Breeze EntityInfo
     * @param meta Metadata for the entity class
     * @param foreignKeyName Name of the foreign key property of the entity, e.g. "CustomerID"
     * @return
     */
    private Object getForeignKeyValue(EntityInfo entityInfo, ClassMetadata meta, String foreignKeyName)
    {
        Object entity = entityInfo.entity;
        Object id = null;
        if (foreignKeyName == meta.getIdentifierPropertyName())
            id = meta.getIdentifier(entity, null);
        else if (Arrays.asList(meta.getPropertyNames()).contains(foreignKeyName))
            id = meta.getPropertyValue(entity, foreignKeyName);
        else if (meta.getIdentifierType().isComponentType())
        {
            // compound key
        	ComponentType compType = (ComponentType) meta.getIdentifierType();
        	int index = Arrays.asList(compType.getPropertyNames()).indexOf(foreignKeyName);
            if (index >= 0)
            {
                Object idComp = meta.getIdentifier(entity, null);
                id = compType.getPropertyValue(idComp, index, EntityMode.POJO);
            }
        }

        if (id == null && entityInfo.entityState == EntityState.Deleted)
        {
            id = entityInfo.originalValuesMap.get(foreignKeyName);
        }
        return id;
    }
    
    /**
     * Return the property value for the given entity.
     * @param meta
     * @param entity
     * @param propName If null, the identifier property will be returned.
     * @return
     */
    private Object getPropertyValue(ClassMetadata meta, Object entity, String propName)
    {
        if (propName == null || propName == meta.getIdentifierPropertyName())
            return meta.getIdentifier(entity, null);
        else
            return meta.getPropertyValue(entity, propName);
    }
    
    /**
     * Find the matching entity in the saveMap.  This is for relationship fixup.
     * @param entityType Type of entity, e.g. Order
     * @param entityId Key value of the entity
     * @return The entity, or null if not found
     */
    private EntityInfo findInSaveMap(Class entityType, Object entityId)
    {
        String entityIdString = entityId.toString();
        ArrayList<EntityInfo> entityInfoList = new ArrayList<EntityInfo>();
        for (Class c : saveMap.keySet()) {
        	if (entityType.isAssignableFrom(c)) {
        		entityInfoList.addAll(saveMap.get(c));
        	}
        }
        if (entityInfoList != null && entityInfoList.size() != 0)
        {
            ClassMetadata meta = sessionFactory.getClassMetadata(entityType);
            for (EntityInfo entityInfo : entityInfoList)
            {
                Object entity = entityInfo.entity;
                Object id = meta.getIdentifier(entity, null);
                if (id != null && entityIdString.equals(id.toString())) return entityInfo;
            }
        }
        return null;
    }
    
}

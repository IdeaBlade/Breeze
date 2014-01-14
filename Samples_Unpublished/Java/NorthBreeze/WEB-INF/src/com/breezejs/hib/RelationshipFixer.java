package com.breezejs.hib;

import java.io.Serializable;
import java.util.Arrays;
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
	}

	/**
	 * Connect the related entities in the saveMap to other entities.  If the related entities
	 * are not in the saveMap, they are loaded from the session.
	 */
    public void fixupRelationships()
    {
    	for (Entry<Class, List<EntityInfo>> entry : saveMap.entrySet()) {
    		
            Class entityType = entry.getKey();
            ClassMetadata classMeta = sessionFactory.getClassMetadata(entityType);

            for (EntityInfo entityInfo : entry.getValue())
            {
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
                fixupRelationship(meta.getIdentifierPropertyName(), propType, entityInfo, meta);
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
                fixupRelationship(propNames[i], propTypes[i], entityInfo, meta);
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
                    Object relatedEntity = getRelatedEntity(compPropNames[j], compPropType, entityInfo, meta);
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
    private void fixupRelationship(String propName, Type propType, EntityInfo entityInfo, ClassMetadata meta)
    {
        Object entity = entityInfo.entity;
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
     * @param propName Name of the navigation/association property of the entity, e.g. "Customer".  May be null if the property is the entity's identifier.
     * @param propType Type of the property
     * @param entityInfo Breeze EntityInfo
     * @param meta Metadata for the entity class
     * @return
     */
    private Object getRelatedEntity(String propName, Type propType, EntityInfo entityInfo, ClassMetadata meta)
    {
    	Object relatedEntity = null;
    	String foreignKeyName = findForeignKey(propName, meta);
        Object id = getForeignKeyValue(entityInfo, meta, foreignKeyName);

        if (id != null)
        {
            relatedEntity = findInSaveMap(propType.getReturnedClass(), id);

            if (relatedEntity == null && (entityInfo.entityState == EntityState.Added || entityInfo.entityState == EntityState.Modified))
            {
            	String relatedEntityName = propType.getName();
                relatedEntity = session.load(relatedEntityName, (Serializable) id, LockOptions.NONE);
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
            id = meta.getIdentifier(entity);
        else if (Arrays.asList(meta.getPropertyNames()).contains(foreignKeyName))
            id = meta.getPropertyValue(entity, foreignKeyName);
        else if (meta.getIdentifierType().isComponentType())
        {
            // compound key
        	ComponentType compType = (ComponentType) meta.getIdentifierType();
        	int index = Arrays.asList(compType.getPropertyNames()).indexOf(foreignKeyName);
            if (index >= 0)
            {
                Object idComp = meta.getIdentifier(entity);
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
            return meta.getIdentifier(entity);
        else
            return meta.getPropertyValue(entity, propName);
    }
    
    /**
     * Find the matching entity in the saveMap.  This is for relationship fixup.
     * @param entityType Type of entity, e.g. Order
     * @param entityId Key value of the entity
     * @return The entity, or null if not found
     */
    private Object findInSaveMap(Class entityType, Object entityId)
    {
        String entityIdString = entityId.toString();
        List<EntityInfo> entityInfoList = saveMap.get(entityType);
        if (entityInfoList != null)
        {
            ClassMetadata meta = sessionFactory.getClassMetadata(entityType);
            for (EntityInfo entityInfo : entityInfoList)
            {
                Object entity = entityInfo.entity;
                Object id = meta.getIdentifier(entity);
                if (id != null && entityIdString.equals(id.toString())) return entity;
            }
        }
        return null;
    }
    
}

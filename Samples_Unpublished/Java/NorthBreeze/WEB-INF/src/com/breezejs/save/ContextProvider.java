package com.breezejs.save;

import java.util.List;
import java.util.Map;

import com.breezejs.util.Json;

public class ContextProvider {

	/**
	 * Build the SaveWorkState from the JSON, and use it to save the changes to the data store.
	 * @param entities
	 * @param saveOptions
	 */
	public SaveResult saveChanges(String json) {
		Map saveBundle = Json.fromJson(json);
		SaveOptions saveOptions = new SaveOptions((Map) saveBundle.get("saveOptions"));
		List entityMaps = (List<Map>) saveBundle.get("entities");
		SaveWorkState sw = new SaveWorkState(this, entityMaps);
		
		sw.beforeSave();
		saveChangesCore(sw);
		sw.afterSave();
		
		SaveResult sr = sw.toSaveResult();
		return sr;
	}
	
	/**
	 * Called when each EntityInfo is materialized (before beforeSaveEntities is called).
	 * Base implementation always returns true.
	 * @param entityInfo
	 * @return true if the entity should be included in the saveMap, false if not.  
	 */
	public boolean beforeSaveEntity(EntityInfo entityInfo) {
		return true;
	}
	
	/**
	 * Process the saveMap before the entities are saved.
	 * @param saveMap all entities that will be saved
	 * @return saveMap, which may have entities added, changed, or removed.
	 */
	public Map<Class, List<EntityInfo>> beforeSaveEntities(Map<Class, List<EntityInfo>> saveMap) {
		return saveMap;
	}
	
	/**
	 * Process the saveMap after entities are saved (and temporary keys replaced)
	 * @param saveMap all entities which have been saved
	 * @param keyMappings mapping of temporary keys to real keys
	 */
	public void afterSaveEntities(Map<Class, List<EntityInfo>> saveMap, List<KeyMapping> keyMappings) {
	}
	
	/**
	 * Save the changes to the database.
	 */
	protected void saveChangesCore(SaveWorkState sw) {
		
	}
	
}

package com.breezejs.save;

import java.util.HashMap;
import java.util.List;

/**
 * Result of a save, which may have either Entities & KeyMappings, or EntityErrors
 * @author Steve
 */
public class SaveResult extends HashMap<String, Object> {
	private static final long serialVersionUID = 1L;
	
	public SaveResult(List<Object> entities, List<KeyMapping> keyMappings) {
		super(2);
		super.put("Entities", entities);
		super.put("KeyMappings", keyMappings);
	}

	public SaveResult(List<EntityError> entityErrors) {
		super(1);
		super.put("Errors", entityErrors);
	}
}


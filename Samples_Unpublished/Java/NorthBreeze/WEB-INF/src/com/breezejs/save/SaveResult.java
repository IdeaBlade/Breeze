package com.breezejs.save;

import java.util.List;

/**
 * Result of a save, which may have either Entities & KeyMappings, or EntityErrors
 * @author Steve
 */
public class SaveResult {
	private List<Object> entities;
	private List<KeyMapping> keyMappings;
	private List<EntityError> errors;
	
	public SaveResult(List<Object> entities, List<KeyMapping> keyMappings) {
		this.entities = entities;
		this.keyMappings = keyMappings;
	}
	public SaveResult(List<EntityError> errors) {
		this.errors = errors;
	}
	public List<Object> getEntities() {
		return entities;
	}
	public void setEntities(List<Object> entities) {
		this.entities = entities;
	}
	public List<KeyMapping> getKeyMappings() {
		return keyMappings;
	}
	public void setKeyMappings(List<KeyMapping> keyMappings) {
		this.keyMappings = keyMappings;
	}
	public List<EntityError> getErrors() {
		return errors;
	}
	public void setErrors(List<EntityError> errors) {
		this.errors = errors;
	}
	public boolean hasErrors() {
		return errors != null && !errors.isEmpty();
	}
	
}


package com.breezejs.save;

public class EntityError {
    private String errorName;
    private String entityTypeName;
    private Object[] keyValues;
    private String propertyName;
    private String errorMessage;
	public EntityError(String errorName, String entityTypeName,
			Object[] keyValues, String propertyName, String errorMessage) {
		super();
		this.setErrorName(errorName);
		this.setEntityTypeName(entityTypeName);
		this.setKeyValues(keyValues);
		this.setPropertyName(propertyName);
		this.setErrorMessage(errorMessage);
	}
	public String getErrorName() {
		return errorName;
	}
	public void setErrorName(String errorName) {
		this.errorName = errorName;
	}
	public String getEntityTypeName() {
		return entityTypeName;
	}
	public void setEntityTypeName(String entityTypeName) {
		this.entityTypeName = entityTypeName;
	}
	public Object[] getKeyValues() {
		return keyValues;
	}
	public void setKeyValues(Object[] keyValues) {
		this.keyValues = keyValues;
	}
	public String getPropertyName() {
		return propertyName;
	}
	public void setPropertyName(String propertyName) {
		this.propertyName = propertyName;
	}
	public String getErrorMessage() {
		return errorMessage;
	}
	public void setErrorMessage(String errorMessage) {
		this.errorMessage = errorMessage;
	}

}

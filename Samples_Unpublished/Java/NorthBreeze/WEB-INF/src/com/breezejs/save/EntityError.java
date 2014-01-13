package com.breezejs.save;

public class EntityError {
    public String errorName;
    public String entityTypeName;
    public Object[] keyValues;
    public String propertyName;
    public String errorMessage;
	public EntityError(String errorName, String entityTypeName,
			Object[] keyValues, String propertyName, String errorMessage) {
		super();
		this.errorName = errorName;
		this.entityTypeName = entityTypeName;
		this.keyValues = keyValues;
		this.propertyName = propertyName;
		this.errorMessage = errorMessage;
	}

}

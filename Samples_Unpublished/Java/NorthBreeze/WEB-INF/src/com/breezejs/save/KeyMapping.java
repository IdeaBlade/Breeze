package com.breezejs.save;

public class KeyMapping {
	private String entityTypeName;
	private Object tempValue;
	private Object realValue;
	public KeyMapping(String entityTypeName, Object tempValue) {
		super();
		this.setEntityTypeName(entityTypeName);
		this.setTempValue(tempValue);
	}
	public String getEntityTypeName() {
		return entityTypeName;
	}
	public void setEntityTypeName(String entityTypeName) {
		this.entityTypeName = entityTypeName;
	}
	public Object getTempValue() {
		return tempValue;
	}
	public void setTempValue(Object tempValue) {
		this.tempValue = tempValue;
	}
	public Object getRealValue() {
		return realValue;
	}
	public void setRealValue(Object realValue) {
		this.realValue = realValue;
	}
	
}

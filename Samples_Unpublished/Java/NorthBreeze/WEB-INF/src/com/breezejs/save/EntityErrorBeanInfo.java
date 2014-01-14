package com.breezejs.save;

import java.beans.PropertyDescriptor;
import java.beans.SimpleBeanInfo;

import com.breezejs.util.Reflect;

public class EntityErrorBeanInfo extends SimpleBeanInfo {
	@Override
	public PropertyDescriptor[] getPropertyDescriptors() {
		return Reflect.makePropertyDescriptors(EntityError.class, "ErrorName", "ErrorMessage", "EntityTypeName", "KeyValues", "PropertyName");
	}

}

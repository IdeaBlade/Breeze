package com.breezejs.save;

import java.beans.PropertyDescriptor;
import java.beans.SimpleBeanInfo;
import com.breezejs.util.Reflect;

public class SaveResultBeanInfo extends SimpleBeanInfo {
	@Override
	public PropertyDescriptor[] getPropertyDescriptors() {
		return Reflect.makePropertyDescriptors(SaveResult.class, "Entities", "KeyMappings", "Errors");
	}

}

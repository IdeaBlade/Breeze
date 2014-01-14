package com.breezejs.save;

import java.beans.PropertyDescriptor;
import java.beans.SimpleBeanInfo;
import com.breezejs.util.Reflect;

public class KeyMappingBeanInfo extends SimpleBeanInfo {
	@Override
	public PropertyDescriptor[] getPropertyDescriptors() {
		return Reflect.makePropertyDescriptors(KeyMapping.class, "EntityTypeName", "TempValue", "RealValue");
	}

}

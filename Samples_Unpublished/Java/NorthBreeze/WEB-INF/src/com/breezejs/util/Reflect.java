package com.breezejs.util;

import java.beans.BeanInfo;
import java.beans.IntrospectionException;
import java.beans.Introspector;
import java.beans.PropertyDescriptor;

public class Reflect {
	
	/**
	 * Finds a PropertyDescriptor for the given propertyName on the Class
	 * @param clazz
	 * @param propertyName
	 * @return
	 * @throws RuntimeException if property is not found
	 */
	public static PropertyDescriptor findPropertyDescriptor(Class clazz, String propertyName) {
		try {
			BeanInfo binfo = Introspector.getBeanInfo(clazz);
			PropertyDescriptor[] propDescs = binfo.getPropertyDescriptors();
			for (PropertyDescriptor d : propDescs) {
				if (d.getName().equals(propertyName)) {
					return d;
				}
			}
		} catch (IntrospectionException e) {
			throw new RuntimeException("Error finding property " + propertyName + " on " + clazz, e);
		}
		throw new RuntimeException("Property " + propertyName + " not found on " + clazz);
		
	}
	
	/**
	 * Given a name in the form "Customer:#northwind.model", returns Class northwind.model.Customer.
	 * @param entityTypeName
	 * @return
	 */
	public static Class lookupEntityType(String entityTypeName) {
		String[] parts = entityTypeName.split(":#", 2);
		String className = parts[1] + '.' + parts[0];
		
		try {
			Class clazz = Class.forName(className);
			return clazz;
		} catch (ClassNotFoundException e) {
			throw new RuntimeException("No class found for " + entityTypeName, e);
		}
	}
	
	/**
	 * Make PropertyDescriptors for the given names.  This is used in BeanInfo classes
	 * to create proper-case names for properties, which Breeze prefers.
	 * @param beanClass Class which has the properties
	 * @param names property names
	 * @return
	 */
	public static PropertyDescriptor[] makePropertyDescriptors(Class<?> beanClass, String... names) {

		PropertyDescriptor[] props = new PropertyDescriptor[names.length];
		try {
			for (int i = 0; i < names.length; i++) {
				props[i] = new PropertyDescriptor(names[i], beanClass);
			}
			return props;
		} catch (IntrospectionException e) {
			throw new RuntimeException(e);
		}
	}
	
}

package com.breezejs.util;

import java.util.Map;

import com.sun.json.JSONDeserializer;
import com.sun.json.JSONSerializer;

public class Json {

	/**
	 * Convert the object tree to JSON, including the $id and $type properties
	 * @param obj
	 * @return
	 */
	public static String toJson(Object obj) {
		return toJson(obj, true, true);
	}
	
	/**
	 * Convert the object tree to JSON
	 * @param obj - root object
	 * @param withId - whether to add the $id and $idref properties with each object
	 * @param withClass - whether to include the $type property with each object
	 * @return
	 */
	public static String toJson(Object obj, boolean withId, boolean withClass) {
		try {
			return JSONSerializer.toString(obj, withId, withClass, false);
		} catch (Exception e) {
			throw new RuntimeException("Exception serializing " + obj, e);
		}
	}
	
	/**
	 * Convert the JSON string to a Map of Lists of Maps...
	 * @param source
	 * @return
	 */
	public static Map fromJson(String source) {
		try {
			return (Map) JSONDeserializer.read(source);
		} catch (Exception e) {
			throw new RuntimeException("Exception deserializing " + source, e);
		}
	}
	
	/**
	 * Convert the Map into an instance of the given class
	 * @param clazz
	 * @param map
	 * @return
	 */
	public static Object fromMap(Class clazz, Map map) {
        try {
        	Object bean = JSONDeserializer.read(clazz, map);
        	return bean;
        } catch (Exception e) {
            throw new RuntimeException("Unable to populate " + clazz.getName() + " from " + map, e);
        }
		
	}
	
}

package com.breezejs.hib;

import java.beans.PropertyDescriptor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Iterator;
import java.util.List;
import java.util.regex.Pattern;

import org.hibernate.Hibernate;
import org.hibernate.proxy.HibernateProxy;

import com.breezejs.util.Reflect;

/**
 * Initializes Hibernate proxies and collections prior to serialization.
 * This is used to implement the OData $expand operation.
 * @author Steve
 *
 */
public class HibernateExpander {

	/**
	 * Cause initialization of properties on the objects in the collection.
	 * The properties to initialize are specified in the expandPaths.  For example, if
	 * roots is a collection of Orders, expandPaths might be 
	 * [ "Customer", "OrderDetails/Product" ]
	 * @param roots - Collection of Hibernate-mapped objects
	 * @param expandPaths - properties relative to the roots
	 */
	public static void initializeList(Collection roots, String[] expandPaths) {
		try {
			List<String[]> paths = splitPaths(expandPaths);
			for (Object root : roots) {
				for (String[] path : paths) {
					initializeObjectPath(root, path, 0);
				}
			}
		} catch (Exception e) {
			throw new RuntimeException("Exception expanding with expandPaths=" + Arrays.asList(expandPaths), e); 
		}
	}

	/**
	 * Recursively forces loading of each Hibernate proxy in the tree that matches an entry in the expandPath.
	 * @param parent Top-level object containing the properties
	 * @param expandPath Path of properties to initialize for each type
	 * @param pathIndex Where we are in the path
	 * @throws InvocationTargetException 
	 * @throws IllegalArgumentException 
	 * @throws IllegalAccessException 
	 */
	private static void initializeObjectPath(Object parent, String[] expandPath, int pathIndex)
			throws IllegalAccessException, IllegalArgumentException, InvocationTargetException {

		if (pathIndex >= expandPath.length)
			return;
		String propName = expandPath[pathIndex];
		Class clazz = parent.getClass();
		PropertyDescriptor pd = Reflect.findPropertyDescriptor(clazz, propName);
		Method method = pd.getReadMethod();
		Object child = method.invoke(parent, (Object[]) null);
		pathIndex++;

		if (child instanceof Collection) {
			Collection coll = (Collection) child;
			Iterator iter = coll.iterator();
			while (iter.hasNext()) {
				Object current = iter.next();
				Hibernate.initialize(current);
				if (pathIndex < expandPath.length)
					initializeObjectPath(current, expandPath, pathIndex);
			}
		} else {
			Hibernate.initialize(child);
			if (child instanceof HibernateProxy) {
				child = ((HibernateProxy) child).getHibernateLazyInitializer().getImplementation();
			}

			if (pathIndex < expandPath.length)
				initializeObjectPath(child, expandPath, pathIndex);
		}

	}

	/**
	 * Split the strings into their path components.
	 * E.g. "OrderDetails/Product" becomes [ "OrderDetails", "Product" ]
	 * @param expandPaths
	 * @return
	 */
	private static List<String[]> splitPaths(String[] expandPaths) {
		Pattern delims = Pattern.compile("[/.]");
		List<String[]> paths = new ArrayList<String[]>();
		for (String expandPath : expandPaths) {
			// expandPath e.g. "OrderDetails/Product"
			String[] propNames = delims.split(expandPath, 10);
			paths.add(propNames);
		}
		return paths;
	}

}

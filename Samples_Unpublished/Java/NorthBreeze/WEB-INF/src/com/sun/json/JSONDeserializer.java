/*
 * Copyright 2006 Sun Microsystems, Inc. All rights reserved. 
 * Use is subject to license terms.
 *
 * Redistribution and use in source and binary forms, with or without modification, are 
 * permitted provided that the following conditions are met: Redistributions of source code 
 * must retain the above copyright notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list of 
 * conditions and the following disclaimer in the documentation and/or other materials 
 * provided with the distribution. Neither the name of the Sun Microsystems nor the names of 
 * is contributors may be used to endorse or promote products derived from this software 
 * without specific prior written permission. 

 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
 * OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY 
 * AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER 
 * OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON 
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
 * OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

package com.sun.json;

import java.beans.BeanInfo;
import java.beans.Introspector;
import java.beans.IntrospectionException;
import java.beans.PropertyDescriptor;
import java.io.IOException;
import java.io.Reader;
import java.lang.reflect.Array;
import java.lang.reflect.Method;
import java.lang.reflect.Constructor;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Iterator;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import java.util.IdentityHashMap;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;
import static com.sun.json.JSONConstants.*;

/**
 * Deserializer a JSON reader (or from a String) into a Map
 * or a bean (depending on boolean flag). Unlike most other
 * JSON readers, this handles circular graphs using the special
 * $id and $idref properties. In addition, $class property, if
 * available, is used to map JSON to JavaBeans.
 *
 * @author A. Sundararajan
 */
public class JSONDeserializer {
    // don't create me!
    private JSONDeserializer() {}

    // simple test main
    public static void main(String[] args) throws Exception {
        Reader reader = new java.io.FileReader(args[0]);
        System.out.println(JSONDeserializer.read(reader, true));
    }

    /**
     * Read (deserialize) an object from a JSON reader.          
     */
    public static Object read(Reader in) 
                     throws IOException, JSONException {
        return read(in, false);
    }

    /**
     * Read (deserialize) an object from a JSON reader.
     * Specify whether to map to JavaBeans using $class property
     * or not. 
     */
    public static Object read(Reader in, 
                     boolean useClass) 
                     throws IOException, JSONException {
        String str = readFully(in);
        return read(str, useClass);        
    }

    /**
     * Read (deserialize) an object from a JSON string.  
     */
    public static Object read(String str) 
                     throws IOException, JSONException {
        return read(str, false);
    }

    /**
     * Read (deserialize) an object from a JSON string.
     * Specify whether to map to JavaBeans using $class property
     * or not. 
     */
    public static Object read(String str, 
                     boolean useClass) 
                     throws IOException, JSONException {
        Deserializer deserializer = new Deserializer(str, useClass);       
        return deserializer.read();
    }

    // reads all contents from a Reader and returns a string
    private static String readFully(Reader reader)
                      throws IOException { 
        char[] arr = new char[8*1024]; // 8K at a time
        StringBuffer buf = new StringBuffer();
        int numChars;
        while ((numChars = reader.read(arr, 0, arr.length)) > 0) {
            buf.append(arr, 0, numChars);
        }
        return buf.toString();
    }

    // private class to manage the deserialization process
    private static class Deserializer {
        // JSON string we are reading
        private String str;
        // to use $class property or not?
        private boolean useClass;
        // map $id value to the corresponding Object
        private Map<String, Object> idToObj;

        // used to resolve (circular) references from
        // $idref properties.
        private interface PropertySetter {
            void set() throws Exception;
        }
        // list of "places" to resolve forward/backward
        // reference
        private List<PropertySetter> idRefSetters;

        Deserializer(String str, boolean useClass) {
            this.str = str;
            this.useClass = useClass;
        }

        // create $id-to-Object map on demand
        private Map<String, Object> idToObj() {
            if (idToObj == null) {
                idToObj = new HashMap<String, Object>();
            }
            return idToObj;
        }

        // create property setters list on demand
        private List<PropertySetter> idRefSetters() {
            if (idRefSetters == null) {
                idRefSetters = new ArrayList<PropertySetter>();
            }
            return idRefSetters;
        }


        public Object read() throws JSONException {
            return read(null);
        }          

        public Object read(Class target) 
                     throws JSONException {
            JSONTokener tokener = new JSONTokener(str);
            JSONObject jobj = new JSONObject(tokener);
            Object obj = convert(jobj, target);
            fixIdReferences();
            return obj;
        }

        private void fixIdReferences() throws JSONException {
            if (idRefSetters != null) {
                for (PropertySetter setter : idRefSetters) {
                    try {
                        setter.set();
                    } catch (Exception exp) {
                        throw makeJSONException(exp);
                    }
                }
            }
        }
  
        private Object convert(Object obj, Class target) 
                     throws JSONException {
            if (obj == null || obj.equals(JSONObject.NULL)) {
                return null;
            }

            if (obj instanceof JSONObject) {
                JSONObject jobj = (JSONObject)obj;
                boolean hasId = jobj.has(ID);
                if (useClass) {
                    boolean hasClass = jobj.has(CLASS);
                    if (hasClass) {                
                        target = getClassFrom((JSONObject)obj);
                        jobj.remove(CLASS);
                    }
                }
                String id = null;
                if (hasId) {
                    id = jobj.get(ID).toString();
                    jobj.remove(ID);
                    if (jobj.has(ARRAYDATA)) {
                        Object value = convert(jobj.get(ARRAYDATA), target);
                        idToObj().put(id, value);
                        return value;           
                    }
                }
                Object bean = createBean(jobj, target);
                if (id != null) { idToObj().put(id, bean); }
                setProperties(bean, jobj);
                return bean;
            } else if (obj instanceof JSONArray) {
                JSONArray jarr = (JSONArray)obj;
                int len = jarr.length();
                Object bean = createBean(jarr, target);
                setProperties(bean, jarr);
                return bean;
            } else {
                if (target != null && 
                    !target.isAssignableFrom(obj.getClass())) {
                    if (target.isPrimitive() || 
                        isPrimitiveWrapper(target)) {
                        return toPrimitive(obj, target);
                    } else if (target == String.class) {
                        return obj.toString();
                    } else if (obj instanceof String) {
                        return fromString((String)obj, target);
                    } else {
                        throw new JSONException("cannot convert " +
                            obj.getClass() + " to " + target);
                    }
                } else {
                    return obj;
                }
            }
        }

        private Class getClassFrom(JSONObject jobj)
                                   throws JSONException {
            String className = jobj.get(CLASS).toString();
            try {
                return Class.forName(className);
            } catch (Exception exp) {
                throw makeJSONException(exp);
            }
        }

        private Object createBean(JSONObject jobj, Class clazz) 
                                  throws JSONException {
            if (clazz != null) {
                try {
                    return clazz.newInstance();
                } catch (Exception exp) {
                    throw makeJSONException(exp);
                }
            } else {
                return new HashMap();
            }
        }

        private Object createBean(JSONArray jarr, Class clazz)
                                  throws JSONException {
            if (clazz != null) {                
                try {
                    if (clazz.isArray()) {
                        return Array.newInstance(
                            clazz.getComponentType(),
                            jarr.length());
                    } else {
                        return clazz.newInstance();
                    }
                } catch (Exception exp) {
                    throw makeJSONException(exp);
                }
            } else {
                return new ArrayList(jarr.length());
            }
        }

        private void setProperties(final Object bean, JSONObject jobj)
                                   throws JSONException {            
            Iterator props = jobj.keys();
            if (bean instanceof Map) {
                final Map map = (Map)bean;
                while (props.hasNext()) {
                    final String name = props.next().toString();                    
                    Object value = jobj.get(name);
                    final String idRef; 
                    if ((idRef = getIdRef(value)) != null) {
                        idRefSetters().add(new PropertySetter() {
                                public void set() throws Exception {
                                    map.put(name, idToObj().get(idRef));
                                }
                            });
                    } else {
                        map.put(name, convert(value, null));
                    }
                }
            } else {
                try {
                    BeanInfo binfo = Introspector.getBeanInfo(bean.getClass());
                    PropertyDescriptor[] propDescs = binfo.getPropertyDescriptors();
                    while (props.hasNext()) {
                        String name = props.next().toString();
                        Object value = jobj.get(name);
                        final String idRef = getIdRef(value);
                        // FIXME: store it in a Map and cache..
                        for (PropertyDescriptor pd : propDescs) {
                            if (name.equals(pd.getName())) {
                                final Method m = pd.getWriteMethod();
                                Class type = pd.getPropertyType();
                                if (m != null) {                                    
                                    if (idRef != null) {
                                        idRefSetters().add(new PropertySetter() {
                                            public void set() throws Exception {
                                                m.invoke(bean, idToObj().get(idRef));
                                            }
                                        });
                                    } else {
                                        m.invoke(bean, convert(value, type));
                                    }
                                }
                                break;                 
                            }
                        }
                    }
                } catch (Exception exp) {
                    throw makeJSONException(exp);
                }
            }
        }

        private void setProperties(final Object bean, JSONArray jarr)
                                   throws JSONException {
            if (bean instanceof List) {
                final List list  = (List)bean;
                int len = jarr.length();           
                for (int index = 0; index < len; index++) {
                    Object value = jarr.get(index);
                    final String idRef = getIdRef(value);
                    final int curIndex = index;
                    if (idRef != null) {                        
                        idRefSetters().add(new PropertySetter() {
                                public void set() throws Exception {                                    
                                    list.set(curIndex, idToObj().get(idRef));
                                }
                            });
                        list.add(null);
                    } else {
                        list.add(convert(value, null));
                    }
                }
            } else {
                int len = jarr.length();
                Class compType = bean.getClass().getComponentType();
                for (int index = 0; index < len; index++) {
                    Object value =  jarr.get(index);
                    final String idRef = getIdRef(value);
                    final int curIndex = index;
                    if (idRef != null) {
                        idRefSetters().add(new PropertySetter() {
                                public void set() throws Exception {
                                    Array.set(bean, curIndex, idToObj().get(idRef));
                                }
                            });
                    } else {
                        try {
                            Array.set(bean, index, 
                                convert(value, compType));
                        } catch (Exception exp) {
                            throw makeJSONException(exp);
                        }
                    }
                }
            }
        }

        private Object toPrimitive(Object obj, Class target) 
                                   throws JSONException {
            if (target == Byte.class || target == Byte.TYPE) {
                if (obj instanceof Number) {
                    return new Byte(((Number)obj).byteValue());
                } else if (obj instanceof String) {
                    return Byte.valueOf((String)obj);
                }
            } else if (target == Short.class || target == Short.TYPE) {
                if (obj instanceof Number) {
                    return new Short(((Number)obj).shortValue());
                } else if (obj instanceof String) {
                    return Short.valueOf((String)obj);
                }
            } else if (target == Integer.class || target == Integer.TYPE) {
                if (obj instanceof Number) {
                    return new Integer(((Number)obj).intValue());
                } else if (obj instanceof String) {
                    return Integer.valueOf((String)obj);
                }
            } else if (target == Long.class || target == Long.TYPE) {
                if (obj instanceof Number) {
                    return new Long(((Number)obj).longValue());
                } else if (obj instanceof String) {
                    return Long.valueOf((String)obj);
                }
            } if (target == Float.class || target == Float.TYPE) {
                if (obj instanceof Number) {
                    return new Float(((Number)obj).floatValue());
                } else if (obj instanceof String) {
                    return Float.valueOf((String)obj);
                }
            } if (target == Double.class || target == Double.TYPE) {
                if (obj instanceof Number) {
                    return new Double(((Number)obj).doubleValue());
                } else if (obj instanceof String) {
                    return Double.valueOf((String)obj);
                }
            } else if (target == Character.class || target == Character.TYPE) {
                if (obj instanceof String &&
                    ((String)obj).length() == 1) {
                    return Character.valueOf(((String)obj).charAt(0));
                }
            } else if (target == Boolean.class || target == Boolean.TYPE) {
                if (obj instanceof String) {
                    return (((String)obj).length() == 0)? 
                           Boolean.FALSE : Boolean.TRUE;
                } else if (obj instanceof Number) {
                    return (((Number)obj).doubleValue() == 0.0)?
                           Boolean.FALSE : Boolean.TRUE;
                } else if (obj instanceof Character) {
                    return ((Character)obj).charValue() == ' ' ?
                           Boolean.FALSE : Boolean.TRUE;
                } else {         
                    return obj == null? Boolean.FALSE : Boolean.TRUE;
                }
            }

            throw new JSONException("cannot convert " +
                        obj.getClass() + " to " + target);
        }

        private String getIdRef(Object obj) throws JSONException {
            if (obj instanceof JSONObject && 
                ((JSONObject)obj).has(IDREF)) {
                return ((JSONObject)obj).get(IDREF).toString();
            } else {
                return null;
            }
        }

        private static Map<Class, Class> primWrappers = new HashMap();
        static {
            primWrappers.put(Character.class, Character.class);
            primWrappers.put(Byte.class, Byte.class);
            primWrappers.put(Short.class, Short.class);
            primWrappers.put(Integer.class, Integer.class);
            primWrappers.put(Long.class, Long.class);
            primWrappers.put(Float.class, Float.class);
            primWrappers.put(Double.class, Double.class);
            primWrappers.put(Boolean.class, Boolean.class);
        }

        private static boolean isPrimitiveWrapper(Class clazz) {
            return primWrappers.get(clazz) != null;
        }

        private Object fromString(String str, Class target) 
                                  throws JSONException {
            if (target == Class.class) {
                try {
                    return Class.forName(str);
                } catch (Exception exp) {
                    throw makeJSONException(exp);
                }
            }

            // try String accepting constructor
            try {
                Constructor ctr = target.getConstructor(
                        new Class[] { String.class });
                return ctr.newInstance(str);
            } catch (Exception exp) {
                throw makeJSONException(exp);
            }
        }

        private JSONException makeJSONException(Exception exp) {
            JSONException jexp = new JSONException(exp.toString());
            jexp.initCause(exp);
            return jexp;
        }
    }
}

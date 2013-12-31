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
import java.io.Writer;
import java.io.StringWriter;
import java.lang.reflect.Array;
import java.lang.reflect.Method;
import java.text.SimpleDateFormat;
import java.util.Collection;
import java.util.Date;
import java.util.Iterator;
import java.util.Map;
import java.util.HashMap;
import java.util.IdentityHashMap;
import java.util.UUID;

import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONWriter;
import static com.sun.json.JSONConstants.*;

/**
 * This class serializes a Map or a JavaBean into
 * a JSON writer or JSON string. Unlike other JSON
 * writers, this class handles circular references
 * by generating $id and $idref properties. Optionally,
 * this class can output $class property to the JSON
 * objects.
 * 
 * @author A. Sundararajan
 */
public class JSONSerializer {
    // do not create me!
    private JSONSerializer() {}

    /**
     * Write an object as JSON to the writer. This does
     * not handle circular references and does not output
     * $class properties nor wrap arrays.
     */     
    public static void write(Object obj, Writer out) 
                  throws IOException, JSONException {
        write(obj, out, true, false, false);
    }

    /**
     * Write an object as JSON to the writer. This can
     * optionally handle circular references and optionally
     * include $class properties.
     */      
    public static void write(Object obj, Writer out,
                             boolean handleCircularity,
                             boolean includeClass,
                             boolean wrapArrays) 
                  throws IOException, JSONException {
        Serializer s = new Serializer(out, 
                            handleCircularity,
                            includeClass,
                            wrapArrays);
        s.write(obj);
        out.flush();
    }

    /**
     * Return JSON string for the given object. This does
     * not handle circular references and does not output
     * $class properties.
     */
    public static String toString(Object obj) 
                  throws IOException, JSONException {
        return toString(obj, true, false, false);
    }

    /**
     * Return JSON string for the given object. This can
     * optionally handle circular references and optionally
     * include $class properties.
     */            
    public static String toString(Object obj,
                                boolean handleCircularity,
                                boolean includeClass,
                                boolean wrapArrays) 
                  throws IOException, JSONException {
        StringWriter sw = new StringWriter();
        write(obj, sw, handleCircularity, includeClass, wrapArrays);
        return sw.toString();
    }

    // simple test main
    public static void main(String[] args) throws Exception {
        Map m = new HashMap();
        int array[] = {2, 3,4 };
        m.put("hello", array);
        m.put("world", new java.util.Date());
        m.put("mymap", m);
        java.util.List list = new java.util.ArrayList();
        list.add("item-1");
        list.add("item-2");
        m.put("mylist", list);        
        String s = JSONSerializer.toString(m, true, true, true);
        System.out.println(s);
        System.out.println(JSONDeserializer.read(s, true));
    }

    // class that handles serialization
    private static class Serializer {  
        // map to maintain objects serialized already    
        private Map<Object, String> objToId;
        // are we outputting $id (and $idref) properties?
        private boolean includeId;
        // are we outputting $class properties?
        private boolean includeClass;
        // should we wrap arrays in an object?  Only works if includeId is true.
        private boolean wrapArrays;
        // writer on which we will write JSON
        private JSONWriter writer;
        // next object id (unique id for objects)
        private long nextId;
        // formatter for Dates
        private SimpleDateFormat dateFormat;
       

        public Serializer(Writer out, 
                          boolean handleCircularity,
                          boolean includeClass,
                          boolean wrapArrays) {
            this.writer = new JSONWriter(out);
            this.includeId = handleCircularity;
            if (includeId) {
                this.objToId = 
                    new IdentityHashMap<Object, String>();
            }
            this.includeClass = includeClass;
            if (includeId || includeClass)
            	this.wrapArrays = wrapArrays;
            
    		this.dateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS");

        }

        private String objectId(Object obj) {
            return Long.toString(nextId++);
        }

        private void writeIdProperty(Object obj)
                throws IOException, JSONException  {
            String id = objectId(obj);
            writer.key(ID);
            writer.value(id);
            objToId.put(obj, id);
        }

        private void writeClassProperty(Object obj)
                throws IOException, JSONException  {
            String name = obj.getClass().getName();
            writer.key(CLASS);
            writer.value(name);
        }

        private boolean hasSeenAlready(Object obj) 
                        throws IOException, JSONException {
            String id = objToId.get(obj);
            if (id != null) {
                writer.object().key(IDREF).value(id);
                writer.endObject();
                return true;
            } else {
                return false;
            }
        }

        private void arrayStart(Object obj) 
                throws IOException, JSONException {
            boolean objectNeeded = 
                wrapArrays; //includeId || includeClass;
            if (objectNeeded) {
                writer.object();
                if (includeId) {
                    writeIdProperty(obj);
                }
                if (includeClass) {
                    writeClassProperty(obj);
                }    
                writer.key(ARRAYDATA);
            }
            writer.array();
        }

        private void arrayEnd(Object obj) 
                throws IOException, JSONException {
            writer.endArray();
            boolean objectNeeded = 
                wrapArrays; //includeId || includeClass;
            if (objectNeeded) {
                writer.endObject();
            }
        }

        private void writeIterable(Iterable itr) 
                throws IOException, JSONException {
        	
        	// If hibernate collection not initialized, write empty array.
        	if (itr instanceof org.hibernate.collection.spi.PersistentCollection && 
    			!((org.hibernate.collection.spi.PersistentCollection) itr).wasInitialized()) {
                arrayStart(itr);
                arrayEnd(itr);
                return;
        	}
        	
            arrayStart(itr);
			for (Object o: itr) {
			    write(o);
			}
            arrayEnd(itr);
        }

        private void writeArray(Object array) 
                throws IOException, JSONException {
        	if (array instanceof byte[]) {
        		writer.value(null);
        		return;
        	}
            arrayStart(array);
            int len = Array.getLength(array);
            for (int index = 0; index < len; index++) {
                write(Array.get(array, index));
            }
            arrayEnd(array);
        }

        private void objectStart(Object obj)
                        throws IOException, JSONException {
            writer.object();
            if (includeId) {
                writeIdProperty(obj);
            }
            if (includeClass) {
                writeClassProperty(obj);
            }
        }

        private void objectEnd(Object obj)
                throws IOException, JSONException {
            writer.endObject();
        }

        private void writeMap(Map map)
                throws IOException, JSONException {
            objectStart(map);
            for (Object prop : map.keySet()) {
                writer.key(prop.toString());
                write(map.get(prop));
            }
            objectEnd(map);
        }

        private JSONException makeJSONException(Exception exp) {
            JSONException jexp = new JSONException(exp.toString());
            jexp.initCause(exp);
            return jexp;
        }

        private void writeBean(Object obj)
                        throws IOException, JSONException {
        	
        	// If hibernate proxy not initialized, write null.
        	if (obj instanceof org.hibernate.proxy.HibernateProxy) {
        		org.hibernate.proxy.HibernateProxy proxy = (org.hibernate.proxy.HibernateProxy) obj;
        		if (proxy.getHibernateLazyInitializer().isUninitialized()) {
	        		writer.value(null);
	        		return;
        		}
        		else {
        			obj = proxy.getHibernateLazyInitializer().getImplementation();
        		}
        	}
        	
            objectStart(obj);
            BeanInfo binfo;
            try {
                binfo = Introspector.getBeanInfo(obj.getClass());
            } catch (IntrospectionException iexp) {
                throw makeJSONException(iexp);
            }

            PropertyDescriptor[] descs = binfo.getPropertyDescriptors();
            for (PropertyDescriptor p : descs) {
                String name = p.getName();
                if (name.equals("class")) {
                    continue;
                }
                writer.key(name);
                Method method = p.getReadMethod();
                if (method != null) {
                    try {
                        write(method.invoke(obj, (Object[])null));
                    } catch (Exception exp) {
                    	//if (!(exp instanceof org.hibernate.LazyInitializationException))
                    	exp.printStackTrace();
                    		throw makeJSONException(exp);
                    }
                }
            }
            objectEnd(obj);
        }

        public void write(Object obj) 
                throws IOException, JSONException {
            // check null
            if (obj == null) {
                writer.value(obj);
                return;
            }

            // check for circularity
            if (includeId) {
                if (hasSeenAlready(obj)) return;
            }

            // check for all primitive wrappers
            if (obj instanceof Number) {               
                writer.value((Number)obj);
            } else if (obj instanceof Boolean) {
                writer.value(((Boolean)obj).booleanValue());
            } else if (obj instanceof Date) {
                writer.value(dateFormat.format(obj));
            } else if (obj instanceof UUID) {
                writer.value(((UUID)obj).toString());
            } else if (obj instanceof Character ||
                       obj instanceof String) {
                writer.value(obj.toString());
            } else // write objects
            if (obj instanceof Map) {
                writeMap((Map)obj);
            } else if (obj instanceof Iterable) {
                writeIterable((Iterable)obj);
            } else {
                Class clazz = obj.getClass();
                // array
                if (clazz.isArray()) {
                    writeArray(obj);
                } else {
                    // write a Java bean
                    writeBean(obj);
                }
            }
        }
    }    
}
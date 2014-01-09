package com.breezejs.hib;

import java.util.HashMap;
import java.util.List;
import org.hibernate.Criteria;
import org.hibernate.Session;

import com.breezejs.OdataParameters;
import com.breezejs.QueryResult;
import com.sun.json.JSONSerializer;

public class DataService {
	
	private static String metadataJson; 

	public String getMetadata() {
		if (metadataJson == null) {
			metadataJson = serializeJson(StaticSessionFactory.getMetadataMap(), false, false);
		}
		return metadataJson;
	}

	public String queryToJson(Class clazz, String queryString) {
    	OdataParameters op = OdataParameters.parse(queryString);
    	return queryToJson(clazz, op);
	}
	
	public String queryToJson(Class clazz, OdataParameters op) {
//    	op = OdataParameters.parse("http://localhost:7149/breeze/DemoNH/Customers?$top=3&$expand=Orders");
//    	op = OdataParameters.parse("$top=3&$select=Country,PostalCode&$inlinecount=allpages");
    	log(op);

		Session session = StaticSessionFactory.openSession();
		try {
			session.beginTransaction();
	    	
	    	Criteria crit = session.createCriteria(clazz);
	    	
	    	// Here, we could apply filtering to criteria based on e.g. user id...
	    	
	    	// Apply OData parameters to the Criteria
	    	OdataCriteria.applyParameters(crit, op);
	    	log(crit);

	    	String json = queryToJson(crit, op.hasInlineCount());
	    	
			session.getTransaction().commit();
			return json;
		}
    	catch (RuntimeException e) {
    		session.getTransaction().rollback();
    	    throw e; // or display error message
    	}
    	finally {
    		session.close();
    	}    	
	}
	
	public String queryToJson(Criteria crit, boolean inlineCount) {
		List result = crit.list();
		log(result.size());
		log(result);
		
		String json;
		if (inlineCount) {

//	    	Criteria countCrit = session.createCriteria(clazz);
//			OdataCriteria.applyInlineCount(countCrit, op);
			OdataCriteria.applyInlineCount(crit);
			long countResult = (long) crit.uniqueResult();
			log(countResult);
			
			HashMap<String, Object> qr = new HashMap<String, Object>();
			qr.put("InlineCount", countResult);
			qr.put("Results", result);
			json = serializeJson(qr);
			
		} else {
			json = serializeJson(result);
		}
		
		log(json);
		return json;
	}
	
	/**
	 * Execute an HQL query and return the results as JSON
	 * @param hqlQuery
	 * @return
	 */
	public String queryToJson(String hqlQuery) {

		Session session = StaticSessionFactory.openSession();
		try {
			session.beginTransaction();
			List result = session.createQuery(hqlQuery).list();
			session.getTransaction().commit();
			return serializeJson(result);
		}
    	catch (RuntimeException e) {
    		session.getTransaction().rollback();
    	    throw e; // or display error message
    	}
    	finally {
    		session.close();
    	}    	
	}

	/**
	 * Convert the object tree to JSON, including the $id and $type properties
	 * @param obj
	 * @return
	 */
	public String serializeJson(Object obj) {
		return serializeJson(obj, true, true);
	}
	
	/**
	 * Convert the object tree to JSON
	 * @param obj - root object
	 * @param withId - whether to add the $id and $idref properties with each object
	 * @param withClass - whether to include the $type property with each object
	 * @return
	 */
	public String serializeJson(Object obj, boolean withId, boolean withClass) {
		try {
			return JSONSerializer.toString(obj, withId, withClass, false);
		} catch (Exception e) {
			e.printStackTrace();
			return e.toString();
		}

	}
	
	void log(Object x) {
    	System.out.println(">>> NorthBreeze: " + x);
	}
	
	/**
	 * For debugging
	 */
    public static void main(String[] args) throws Exception {
    	
    	DataService ds = new DataService();
//    	String meta = nb.getMetadata();
//    	log(meta);
//    	Session session = NorthwindSessionFactory.openSession();
    	
//    	OdataParameters op = OdataParameters.parse("?$top=5&$filter=Country eq 'Brazil'");
//    	op = OdataParameters.parse("http://localhost:7149/breeze/DemoNH/Customers?$top=3&$expand=Orders");
//    	op = OdataParameters.parse("$top=3&$select=Country,PostalCode&$inlinecount=allpages");
//    	log(op);
    	
//    	Criteria crit = session.createCriteria(Customer.class);
//    	OdataCriteria.applyParameters(crit, op);
    	
//    	nb.queryToJson(Customer.class, "?$top=5&$filter=country eq 'Brazil'");
    	ds.queryToJson(northwind.model.Customer.class, "?$top=5&$filter=country eq 'Brazil'&$inlinecount=allpages");
    	System.exit(0);
    }
    
	
}

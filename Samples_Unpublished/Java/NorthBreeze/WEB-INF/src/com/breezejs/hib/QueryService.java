package com.breezejs.hib;

import java.util.List;

import org.hibernate.Criteria;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.jboss.logging.Logger;
import com.breezejs.OdataParameters;
import com.breezejs.QueryResult;
import com.breezejs.util.Json;

/**
 * Class to handle query strings and return JSON results
 * @author Steve
 *
 */
public class QueryService {
	
	public static final Logger log = Logger.getLogger(QueryService.class);
	private SessionFactory sessionFactory;

	public QueryService(SessionFactory sessionFactory) {
		this.sessionFactory = sessionFactory;
	}

	/**
	 * Create and execute a query using the given parameters
	 * @param clazz the entity class, e.g. Customer
	 * @param queryString OData query, e.g. "&$skip=10&$top=5&$inlinecount=allpages"
	 * @return the query results as JSON
	 */
	public String queryToJson(Class clazz, String queryString) {
    	OdataParameters op = OdataParameters.parse(queryString);
    	return queryToJson(clazz, op);
	}

	/**
	 * Create and execute a query using the given parameters
	 * @param clazz the entity class, e.g. Customer
	 * @param op OdataParameters representing the OData operations on the query
	 * @return the query results as JSON
	 */
	public String queryToJson(Class clazz, OdataParameters op) {
		log.debugv("queryToJson: class={0}, odataParameters={1}", clazz, op);

		Session session = sessionFactory.openSession();
		try {
			session.beginTransaction();
	    	
	    	Criteria crit = session.createCriteria(clazz);
	    	
	    	// Here, we could apply filtering to criteria based on e.g. user id...
	    	
	    	// Apply OData parameters to the Criteria
	    	OdataCriteria.applyParameters(crit, op);
			log.debugv("queryToJson: criteria={0}", crit);

	    	String json = queryToJson(crit, op.hasInlineCount(), op.expands());
	    	
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
	
	/**
	 * Execute the Criteria query and return the results as JSON.
	 * If inlinecount is true, the Criteria is re-used (after modification)
	 * to get the count of results.
	 * @param crit the Criteria query to execute
	 * @param inlineCount determines whether the result count is computed also
	 * @param expands if non-empty, each String is a property path that should be loaded prior to serialization
	 * @return If inlineCount is false, returns a List of entities serialized as JSON.  If inlineCount is true,
	 *  returns a QueryResult object serialized as JSON.
	 * @see OdataCriteria
	 * @see HibernateExpander
	 */
	public String queryToJson(Criteria crit, boolean inlineCount, String[] expands) {
		List result = crit.list();
		log.debugv("queryToJson: result size={0}", result.size());
		
		if (expands != null && expands.length > 0) {
			HibernateExpander.initializeList(result, expands);
		}
		
		String json;
		if (inlineCount) {

			OdataCriteria.applyInlineCount(crit);
			long countResult = (long) crit.uniqueResult();
			log.debugv("queryToJson: inline count={0}", countResult);
			
			QueryResult qr = new QueryResult(result, countResult);
			json = Json.toJson(qr);
			
		} else {
			json = Json.toJson(result);
		}
		
		log.debugv("queryToJson: result={0}", json);
		return json;
	}
	
	/**
	 * Execute an HQL query and return the results as JSON
	 * @param hqlQuery an HQL query, e.g. "from Order where orderId in (10248, 10249, 10250)");
	 * @return the query results as JSON
	 */
	public String queryToJson(String hqlQuery) {

		Session session = sessionFactory.openSession();
		try {
			session.beginTransaction();
			List result = session.createQuery(hqlQuery).list();
			session.getTransaction().commit();
			return Json.toJson(result);
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
	 * For debugging
	 */
    public static void main(String[] args) throws Exception {
    	QueryService ds = new QueryService(StaticConfigurator.getSessionFactory());
    	
//    	String meta = ds.getMetadata();
//    	ds.log.info(meta);
//    	Session session = NorthwindSessionFactory.openSession();
    	
//    	OdataParameters op = OdataParameters.parse("?$top=5&$filter=Country eq 'Brazil'");
//    	op = OdataParameters.parse("http://localhost:7149/breeze/DemoNH/Customers?$top=3&$expand=Orders");
//    	op = OdataParameters.parse("$top=3&$select=Country,PostalCode&$inlinecount=allpages");
//    	log(op);
    	
//    	Criteria crit = session.createCriteria(Customer.class);
//    	OdataCriteria.applyParameters(crit, op);
    	
//    	nb.queryToJson(Customer.class, "?$top=5&$filter=country eq 'Brazil'");
    	String json = ds.queryToJson(northwind.model.Customer.class, "?$top=5&$filter=country eq 'Brazil'&$inlinecount=allpages");
    	QueryService.log.info(json);
//    	ds.log.infov(ds.queryToJson(northwind.model.Customer.class, "?$top=5&$filter=country eq 'Brazil'&$expand=orders/orderDetails/product"));
//    	ds.log.infov(ds.queryToJson(northwind.model.Order.class, "?$filter=orderID eq 10258"));
//    	ds.log.infov(ds.queryToJson(northwind.model.Order.class, "?$filter=orderID eq 10258&$expand=orderDetails/product/supplier"));
    	System.exit(0);
    }
    
	
}

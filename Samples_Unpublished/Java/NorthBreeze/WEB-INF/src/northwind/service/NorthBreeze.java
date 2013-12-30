package northwind.service;

import java.util.List;
import java.util.Map;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import org.hibernate.Session;
import com.breezejs.BreezeHibernateMetadata;
import com.sun.json.JSONSerializer;

@Path("northbreeze")
public class NorthBreeze {
	
	public NorthBreeze() {
    	System.out.println("new NorthBreeze");
	}

	@GET
	@Path("Metadata")
	@Produces("application/json; charset=UTF-8")
	public String getMetadata() {
		BreezeHibernateMetadata metaGen = new BreezeHibernateMetadata(NorthwindSessionFactory.getSessionFactory(), NorthwindSessionFactory.getConfiguration());
		Map<String, Object> metaMap = metaGen.buildMetadata();
		String metaJson = serializeJson(metaMap, false, false);
		return metaJson;
	}
	
	@GET
	@Path("Customers")
	@Produces("application/json; charset=UTF-8")
	public String getCustomers() {
		return queryToJson("from Customer where companyName like 'C%'");
	}

	@GET
	@Path("Orders")
	@Produces("application/json; charset=UTF-8")
	public String getOrders() {
		return queryToJson("from Order where orderId in (10248, 10249, 10250)");
	}	  
	  
	  
	protected String queryToJson(String query) {

		Session session = NorthwindSessionFactory.openSession();
		session.beginTransaction();
		List result = session.createQuery(query).list();
		session.getTransaction().commit();
		session.close();
		return serializeJson(result);

	}

	public String serializeJson(Object obj) {
		return serializeJson(obj, true, true);
	}
	
	public String serializeJson(Object obj, boolean withId, boolean withClass) {
		try {
			return JSONSerializer.toString(obj, withId, withClass, false);
		} catch (Exception e) {
			e.printStackTrace();
			return e.toString();
		}

	}
	
	/**
	 * For debugging
	 */
    public static void main(String[] args) throws Exception {
    	
    	NorthBreeze nb = new NorthBreeze();
    	String meta = nb.getMetadata();
    	System.out.println(meta);
    }
    
	
}

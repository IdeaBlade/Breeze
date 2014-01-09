package northwind.service;

import javax.ws.rs.BeanParam;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;

import northwind.model.Customer;

import com.breezejs.OdataParameters;
import com.breezejs.hib.DataService;

/**
 * NorthBreeze service returning JSON.
 * @author Steve
 * @see https://jersey.java.net/documentation/latest/jaxrs-resources.html
 */
@Path("northbreeze")
public class NorthBreeze {
	
	private DataService dataService;
	public NorthBreeze() {
    	dataService = new DataService();
	}

	@GET
	@Path("Metadata")
	@Produces("application/json; charset=UTF-8")
	public String getMetadata() {
		return dataService.getMetadata();
	}
	
	@GET
	@Path("Customers")
	@Produces("application/json; charset=UTF-8")
	public String getCustomers(@BeanParam OdataParameters odataParameters) {
		return dataService.queryToJson(Customer.class, odataParameters);
//		return dataService.queryToJson(Customer.class, "&$skip=10&$top=5&$inlinecount=allpages");
	}

	@GET
	@Path("Orders")
	@Produces("application/json; charset=UTF-8")
	public String getOrders() {
		return dataService.queryToJson("from Order where orderId in (10248, 10249, 10250)");
	}	  
	  
	
}

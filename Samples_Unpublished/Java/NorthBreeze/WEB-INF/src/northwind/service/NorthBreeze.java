package northwind.service;

import javax.ws.rs.BeanParam;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;

import northwind.model.Customer;

import com.breezejs.OdataParameters;
import com.breezejs.hib.DataService;
import com.breezejs.save.SaveOptions;

/**
 * NorthBreeze service returning JSON.
 * @author Steve
 * @see https://jersey.java.net/documentation/latest/jaxrs-resources.html
 */
@Path("northbreeze")
@Consumes("application/json")
@Produces("application/json; charset=UTF-8")
public class NorthBreeze {
	
	private DataService dataService;
	public NorthBreeze() {
    	dataService = new DataService();
	}

	@GET
	@Path("Metadata")
	public String getMetadata() {
		return dataService.getMetadata();
	}
	
	@POST
	@Path("SaveChanges")
	public String saveChanges(String saveBundle) {
		dataService.log(saveBundle);
		return dataService.getMetadata();
	}
	
	@GET
	@Path("Customers")
	public String getCustomers(@BeanParam OdataParameters odataParameters) {
		return dataService.queryToJson(Customer.class, odataParameters);
//		return dataService.queryToJson(Customer.class, "&$skip=10&$top=5&$inlinecount=allpages");
	}

	@GET
	@Path("Orders")
	public String getOrders() {
		return dataService.queryToJson("from Order where orderId in (10248, 10249, 10250)");
	}	  
	  
	
}

package northwind.service;

import javax.ws.rs.BeanParam;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;

import northwind.model.Customer;
import northwind.model.Order;

import com.breezejs.OdataParameters;
import com.breezejs.hib.QueryService;
import com.breezejs.hib.SaveService;
import com.breezejs.hib.StaticConfigurator;
import com.breezejs.util.Json;

/**
 * NorthBreeze service returning JSON.
 * @author Steve
 * @see https://jersey.java.net/documentation/latest/jaxrs-resources.html
 */
@Path("northbreeze")
@Consumes("application/json")
@Produces("application/json; charset=UTF-8")
public class NorthBreeze {
	
	private QueryService queryService;
	private SaveService saveService;
	private static String metadataJson; 
	
	public NorthBreeze() {
    	queryService = new QueryService(StaticConfigurator.getSessionFactory());
    	saveService = new SaveService(StaticConfigurator.getSessionFactory(), StaticConfigurator.getMetadata());
	}

	@GET
	@Path("Metadata")
	public String getMetadata() {
		if (metadataJson == null) {
			metadataJson = Json.toJson(StaticConfigurator.getMetadata(), false, false);
		}
		return metadataJson;
	}
	
	@POST
	@Path("SaveChanges")
	public Response saveChanges(String saveBundle) {
		return saveService.saveChanges(saveBundle);
	}
	
	@GET
	@Path("Customers")
	public String getCustomers(@BeanParam OdataParameters odataParameters) {
		return queryService.queryToJson(Customer.class, odataParameters);
	}

	@GET
	@Path("Orders")
	public String getOrders(@BeanParam OdataParameters odataParameters) {
		return queryService.queryToJson(Order.class, odataParameters);
	}	  
	  
	
}

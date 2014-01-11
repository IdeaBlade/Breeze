package com.breezejs;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import javax.ws.rs.QueryParam;

/**
 * A simple parser for OData URL strings.  Does NOT implement complete OData parsing.
 * @author Steve
 *
 */
public class OdataParameters {

	/**
	 * Split a URL containing OData parameters into usable pieces
	 * @param url e.g. "?$orderby=companyName&$top=10&$inlinecount=allpages"
	 * @return
	 */
	public static OdataParameters parse(String url)
	{
		// remove any initial URL stuff before the ?
		String[] chunks = url.split("\\?", 2);
		String uri = (chunks.length > 1) ? chunks[1] : chunks[0];
		chunks = uri.split("&");
		
		OdataParameters op = new OdataParameters();
		for (String param : chunks) {
			if (param.length() > 1 && param.charAt(0) == '$') {
				// ignore things that don't start with $, because they aren't OData parameters.
				String[] nameValue = param.split("=", 2);
				if (nameValue.length == 2)
					apply(op, nameValue[0], nameValue[1]);
			}
		}
		return op;
	}
	
	/**
	 * @param op
	 * @param name
	 * @param value
	 */
	static void apply(OdataParameters op, String name, String value)
	{
		if ("$skip".equals(name)) {
			op.skip = Integer.parseInt(value);
		}
		else if ("$top".equals(name)) {
			op.top = Integer.parseInt(value);
		}
		else if ("$expand".equals(name)) {
			op.expand = value;
		}
		else if ("$filter".equals(name)) {
			op.filter = value;
		}
		else if ("$orderby".equals(name)) {
			op.orderby = value;
		}
		else if ("$format".equals(name)) {
			op.format = value;
		}
		else if ("$inlinecount".equals(name)) {
			op.inlinecount = value;
		}
		else if ("$select".equals(name)) {
			op.select = value;		
		}
	}
	
	public boolean hasInlineCount()
	{
		return ("allpages".equals(inlinecount));
	}
	
	public String toString()
	{
		StringBuilder sb = new StringBuilder();
		sb.append("OdataParameters ");
		if (skip > 0) sb.append(" $skip=").append(skip);
		if (top > 0) sb.append(" $top=").append(top);
		if (expand != null) sb.append(" $expand=").append(expand);
		if (filter != null) sb.append(" $filter=").append(filter);
		if (orderby != null) sb.append(" $orderby=").append(orderby);
		if (format != null) sb.append(" $format=").append(format);
		if (inlinecount != null) sb.append(" $inlinecount=").append(inlinecount);
		if (select != null) sb.append(" $select=").append(select);
		return sb.toString();
	}
	
	String arr(StringBuilder sb, List<String> arr)
	{
		for(String s: arr) {
			sb.append(s).append(',');
		}
		sb.setLength(sb.length() - 1);
		return "";
	}
	
	String[] toArray(String value) {
		return value == null ? null : value.split(",");
	}
	
	public String[] expands() { return toArray(expand); }
	public String[] orderbys() { return toArray(orderby); }
	public String[] selects() { return toArray(select); }
	
	@QueryParam("$skip")
	public int skip;
	
	@QueryParam("$top")
	public int top;
	
	@QueryParam("$expand")
	public String expand;
	
	@QueryParam("$filter")
	public String filter;
	
	@QueryParam("$orderby")
	public String orderby;
	
	@QueryParam("$format")
	public String format;
	
	@QueryParam("$inlinecount")
	public String inlinecount;
	
	@QueryParam("$select")
	public String select;
	
	
}

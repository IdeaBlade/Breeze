package com.breezejs;

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
			if (param.charAt(0) == '$') {
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
			op.expand = value.split(",");
		}
		else if ("$filter".equals(name)) {
			op.filter = value;
		}
		else if ("$orderby".equals(name)) {
			op.orderby = value.split(",");		
		}
		else if ("$format".equals(name)) {
			op.format = value;
		}
		else if ("$inlinecount".equals(name)) {
			setInlineCount(op, value);
		}
		else if ("$select".equals(name)) {
			op.select = value.split(",");				
		}
	}
	
	static void setInlineCount(OdataParameters op, String value)
	{
		if ("allpages".equals(value)) 
			op.inlinecount = true;
		else if ("none".equals(value))
			op.inlinecount = false;
		else
			throw new IllegalArgumentException("$inlinecount must be 'allpages' or 'none'");
	}
	
	public String toString()
	{
		StringBuilder sb = new StringBuilder();
		sb.append("OdataParameters ");
		if (skip > 0) sb.append("$skip=").append(skip);
		if (top > 0) sb.append("$top=").append(top);
		if (expand != null) sb.append("$expand=").append(arr(sb, expand));
		if (filter != null) sb.append("$filter=").append(filter);
		if (orderby != null) sb.append("$orderby=").append(arr(sb, orderby));
		if (format != null) sb.append("$format=").append(format);
		if (inlinecount) sb.append("$inlinecount=allpages");
		if (select != null) sb.append("$select=").append(arr(sb, select));
		return sb.toString();
	}
	
	String arr(StringBuilder sb, String[] arr)
	{
		for(String s: arr) {
			sb.append(s).append(',');
		}
		sb.setLength(sb.length() - 1);
		return "";
	}
	
	public int skip;
	public int top;
	public String[] expand;
	public String filter;
	public String[] orderby;
	public String format;
	public boolean inlinecount;
	public String[] select;
	
}

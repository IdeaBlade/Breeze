package com.breezejs.hib;

import java.util.HashMap;

import org.hibernate.Criteria;
import org.hibernate.criterion.Order;
import org.hibernate.criterion.Projections;
import com.breezejs.OdataParameters;
import com.breezejs.OperatorExpression;

public class OdataCriteria {
	
	// Maps OData operators to Hibernate criteria operators
	private static final HashMap<String, String> operatorMap = new HashMap<String, String>();
	static {
		operatorMap.put("eq", "=");
		operatorMap.put("ne", "<>");
		operatorMap.put("gt", ">");
		operatorMap.put("ge", ">=");
		operatorMap.put("lt", "<");
		operatorMap.put("le", "<=");
//		operatorMap.put("and", "and");
//		operatorMap.put("or", "or");
//		operatorMap.put("not", "not");
	}
	
	public static final String WHITESPACE = "\\s+";
	
	/**
	 * Apply the OData $top, $skip, $orderby, and (crude) $filter parameters to the Criteria
	 * @param crit
	 * @param op
	 * @return the same Criteria that was passed in, with operations added.
	 */
	public static Criteria applyParameters(Criteria crit, OdataParameters op)
	{
    	if (op.top > 0) crit.setMaxResults(op.top);
    	if (op.skip > 0) crit.setFirstResult(op.skip);
    	if (op.orderby != null) {
    		for(String s: op.orderby) {
    			String[] seg = s.split(WHITESPACE, 2);
    			String field = seg[0].replace('/', '.');
    			if (seg.length == 2 && "desc".equals(seg[1])) {
    				crit.addOrder(Order.desc(field));
    			} else {
    				crit.addOrder(Order.asc(field));
    			}
    		}
    	}
    	if (op.filter != null) {
    		addFilter(crit, op.filter);
    	}
		
		
		return crit;
	}
	
	/**
	 * Apply the OData $inlinecount and (crude) $filter parameters to the Criteria.
	 * This creates a filter with a rowCount projection, so $skip, $top, $orderby, $select, $expand
	 * are meaningless here.
	 * @param crit a Criteria object.  Should be new or contain only filters when passed in.
	 * @param op OdataParameters object - only op.inlineCount and op.filter are used.
	 * @return the same Criteria that was passed in, with operations added.
	 */
	public static Criteria applyInlineCount(Criteria crit, OdataParameters op)
	{
    	if (op.filter != null) {
    		addFilter(crit, op.filter);
    	}
		crit.setProjection( Projections.rowCount());
		return crit;
	}

	/**
	 * Apply the OData $inlinecount to the (already filtered) Criteria.
	 * Removes $skip and $top operations and adds a rowCount projection.
	 * @param crit a Criteria object.  Should already contain only filters that affect the row count.
	 * @return the same Criteria that was passed in, with operations added.
	 */
	public static Criteria applyInlineCount(Criteria crit)
	{
    	crit.setMaxResults(0);
    	crit.setFirstResult(0);
		crit.setProjection( Projections.rowCount());
		return crit;
	}
	
	/**
	 * Add simple filtering to the Criteria.  Handles OData filters of the form
	 * $filter=country eq 'Brazil'
	 * @param crit 
	 * @param filterString OData $filter.  Only filters of the form [field] [op] [value] are supported..
	 */
	static void addFilter(Criteria crit, String filterString)
	{
		String[] filter = filterString.split(WHITESPACE, 3);
		if (filter.length != 3)
			throw new IllegalArgumentException("Filter string not handled: " + filterString);

		String field = filter[0].replace('/', '.');
		String op = filter[1].toLowerCase();
		String value = filter[2];
		
		String restrictionOp = operatorMap.get(op);
		if (restrictionOp == null)
			throw new IllegalArgumentException("Filter string not handled: " + filterString);

		// Remove quotes from string values
		if (value.charAt(0) == '\'') {
			value = value.substring(1, value.length() - 1);
		}
		
		crit.add(new OperatorExpression(field, value, restrictionOp));
		
	}
	
	/*
Eq Equal /Suppliers?$filter=Address/City eq ‘Redmond’ 
Ne Not equal /Suppliers?$filter=Address/City ne ‘London’ 
Gt Greater than /Products?$filter=Price gt 20 
Ge Greater than or equal /Products?$filter=Price ge 10 
Lt Less than /Products?$filter=Price lt 20 
Le Less than or equal /Products?$filter=Price le 100 
And Logical and /Products?$filter=Price le 200 and Price gt 3.5 
Or Logical or /Products?$filter=Price le 3.5 or Price gt 200 
Not 
	 */
}

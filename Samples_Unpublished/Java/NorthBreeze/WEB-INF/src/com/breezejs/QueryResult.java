package com.breezejs;

import java.util.Collection;
import java.util.HashMap;

/**
 * Wrapper for results that have an InlineCount, to support paged result sets.
 * @author Steve
 */
public class QueryResult extends HashMap<String, Object> {
	private static final long serialVersionUID = 1L;
	
	public QueryResult(Collection results, Long inlineCount) {
		super(2);
		super.put("Results", results);
		super.put("InlineCount", inlineCount);
	}
}

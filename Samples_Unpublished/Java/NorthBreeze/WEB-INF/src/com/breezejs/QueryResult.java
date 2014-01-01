package com.breezejs;

import java.util.Collection;

/**
 * Wrapper for results that have an InlineCount, to support paged result sets.
 * @author Steve
 */
public class QueryResult {
	private Collection results;
	private Long inlineCount;
	
	
	public QueryResult(Collection results, Long inlineCount) {
		super();
		this.results = results;
		this.inlineCount = inlineCount;
	}
//	public QueryResult(Collection results, int inlineCount) {
//		super();
//		this.results = results;
//		this.inlineCount = new Long(inlineCount);
//	}
	
	public Collection getResults() {
		return results;
	}
	public void setResults(Collection results) {
		this.results = results;
	}
	public Long getInlineCount() {
		return inlineCount;
	}
	public void setInlineCount(Long inlineCount) {
		this.inlineCount = inlineCount;
	}
}

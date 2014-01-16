package com.breezejs.hib;

import org.hibernate.criterion.SimpleExpression;

/**
 * Extends SimpleExpression just to offer a public constructor
 * @author Steve
 *
 */
public class OperatorExpression extends SimpleExpression {
	private static final long serialVersionUID = 1L;

	public OperatorExpression(String propertyName, Object value, String op) {
		super(propertyName, value, op);
	}

}

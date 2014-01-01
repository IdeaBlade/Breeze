package com.breezejs;

import org.hibernate.criterion.SimpleExpression;

/**
 * Extends SimpleExpression just to offer a public constructor
 * @author Steve
 *
 */
public class OperatorExpression extends SimpleExpression {

	public OperatorExpression(String propertyName, Object value, String op) {
		super(propertyName, value, op);
		// TODO Auto-generated constructor stub
	}

}

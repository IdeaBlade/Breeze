package com.breezejs.save;

import java.util.List;

public class EntityErrorsException extends Exception {
	private static final long serialVersionUID = 1L;
	public int httpStatusCode;
	public List<EntityError> entityErrors;
	public EntityErrorsException(String message, List<EntityError> entityErrors) {
		super(message);
		this.entityErrors = entityErrors;
		this.httpStatusCode = 403;
	}
	
}

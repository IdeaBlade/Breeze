/*
 * Extend breeze with getSaveErrorMessage,   
 * a utility method that can extract validation error messages and 
 * arranges for server validation errors to be removed from an entity 
 * the next time this entity changes in any way.
 * 
 * This extension is not prescriptive! 
 * It is only one approach to save error message handling.
 * Use it for inspiration.
 *
 * Copyright 2013 IdeaBlade, Inc.  All Rights Reserved.  
 * Licensed under the MIT License
 * http://opensource.org/licenses/mit-license.php
 * Author: Ward Bell
 *
 * Install:
 *   1) include this script after breeze script
 *   2) use it in your save failure handler
 *
 * Example:
 *   return manager.saveChanges().then(saveSucceeded, saveFailed);
 *   
 *   function saveFailed(error) {
 *       var msg = 'Save failed: ' + breeze.getSaveErrorMessage(error);
 *       error.message = msg;
 *       logError(msg, error);
 *       throw error;
 *   }
*/
(function() {
	'use strict';

	breeze.getSaveErrorMessage = getSaveErrorMessage;

	function getSaveErrorMessage(error) {
		var msg = error.message;
		var entityErrors = error.entityErrors;
		if (entityErrors && entityErrors.length) {
			return getValidationMessages(entityErrors);
		}
		return msg;
	}

	function getValidationMessages(entityErrors) {
		var isServerError = entityErrors[0].isServerError;

		try {
		    return entityErrors.map(function(entityError) {
		        var name = '';
		        var entity = entityError.entity;
		        if (entity) {
		            clearServerErrorsOnNextChange(isServerError, entity);
		            name = getErrantEntityName(entity);
		        }

				return name + '\'' + entityError.errorMessage + '\'';
			}).join('; <br/>');
		} catch (e) {
			/* eat it for now */
			return (isServerError ? 'server' : 'client') + ' validation error';
		}
	}

	function getErrantEntityName(entity) {
		var key = entity.entityAspect.getKey();
		var name = key.entityType.shortName;
		var id = key.values.join(',');
		return name + ' (' + id + ') - ';
	}

	function clearServerErrorsOnNextChange(isServerError, badEntity) {

		if (!isServerError || 
			badEntity.entityAspect.entityState.isDetached()) { return; }

		// implemented as a one-time, propertyChanged eventhandler that
	    // clears the server validation errors if anything happens to this entity
		(function(entity) {
			var manager = entity.entityAspect.entityManager;
			var subKey = manager.entityChanged.subscribe(function(changeArgs) {
				if (changeArgs.entity === entity) {
					manager.entityChanged.unsubscribe(subKey);
					var aspect = entity.entityAspect;
					aspect.getValidationErrors().forEach(function(err) {
						if (err.isServerError) {
							aspect.removeValidationError(err);
						}
					});
				}
			});
		})(badEntity);
	}
})();
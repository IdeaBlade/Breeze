(function (breeze, Q) {
	var EntityManager = breeze.EntityManager;
	var baseSaveChanges = EntityManager.prototype.saveChanges;

	// intercept and wrap EntityManager's base saveChanges()
	EntityManager.prototype.saveChanges = function () {
		// Add queuingSave if not already added to this EntityManager
		var queuingSave = this.queuingSave || (this.queuingSave = new QueuingSave(this));
	    
		var args = [].slice.call(arguments);
		if (queuingSave.isEnabled) {
			if (queuingSave.isSaving) {
				return queuingSave.queueSaveChanges(args);
			} else {
				queuingSave.isSaving = true;
				return queuingSave.innerSaveChanges(args);
			}
		}
	    // queuing disabled; just call the base save
	    return baseSaveChanges.apply(this, args);

	};

    var QueuingSave = function(entityManager) {
    	this.entityManager = entityManager;
        this.isEnabled = true;
        this.isSaving = false;
        this.saveQueue = [];
        this.successFn = defaultSaveSucceeded;
        this.failFn = defaultSaveFailed;
    };

    QueuingSave.prototype.queueSaveChanges = function (args) {
        var self = this;
        var deferredSave = Q.defer();
        self.saveQueue.push(deferredSave);
        
        var savePromise = deferredSave.promise;
        return savePromise
            .then(function() {return self.innerSaveChanges(args); })
            .fail(function(error) { self.failFn(self, error); });
    };
    
    QueuingSave.prototype.innerSaveChanges = function (args) {
    	var self = this;
    	return baseSaveChanges.apply(self.entityManager, args)
            .then(function () { self.successFn(self); })
            .fail(function (error) { self.failFn(self, error); });
    };
    QueuingSave.defaultQueuedSaveSucceeded = defaultSaveSucceeded;
    QueuingSave.defaultQueuedSaveFailed = defaultSaveFailed;

    
    function defaultSaveSucceeded(queuingSave) {
        var deferredSave = queuingSave.saveQueue.shift();
        if (deferredSave) {
            deferredSave.resolve();
        }
        if (queuingSave.saveQueue.length === 0) {
            queuingSave.isSaving = false;
        }
    };

    function defaultSaveFailed(queuingSave, error) {
    	queuingSave.isSaving = false;
		var	saveQueue = queuingSave.saveQueue;
		var deferredSave;
	    // clear the save queue, calling reject on each deferred save
		while(deferredSave = saveQueue.shift()) {
			deferredSave.reject(new SaveFailedError("", error));
		}
		throw error; // so rest of promise chain can hear error
	}
    
    function SaveFailedError(errObject) {
    	this.name = "SaveFailedError";
        this.message = "Queued save failed";
		this.innerError = errObject;
	}

	SaveFailedError.prototype = new Error();
	SaveFailedError.prototype.constructor = SaveFailedError;

})(breeze, Q);
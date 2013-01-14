(function (breeze, Q) {
	var EntityManager = breeze.EntityManager;
	var baseSaveChanges = EntityManager.prototype.saveChanges;

	// intercept and wrap EntityManager's base saveChanges()
	EntityManager.prototype.saveChanges = function () {
		// Add queuingSave if not already added to this EntityManager instance
		var queuingSave = this.queuingSave || (this.queuingSave = new QueuingSave(this));
	    
		var args = [].slice.call(arguments);
		if (queuingSave.isEnabled) {
			if (queuingSave.isSaving) {
			    // save in progress; queue the save for later
				return queuingSave.queueSaveChanges(args);
			} else {
			    // note that save is in progrees; then save
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
        this.saveSucceeded = defaultSaveSucceeded;
        this.saveFailed = defaultSaveFailed;
        this.QueuedSaveFailedError = QueuedSaveFailedError;
    };

    QueuingSave.prototype.queueSaveChanges = function (args) {
        var self = this;
        var deferredSave = Q.defer();
        self.saveQueue.push(deferredSave);
        
        var savePromise = deferredSave.promise;
        return savePromise
            .then(function() {return self.innerSaveChanges(args); })
            .fail(function(error) { self.saveFailed(self, error); });
    };
    
    QueuingSave.prototype.innerSaveChanges = function (args) {
    	var self = this;
    	return baseSaveChanges.apply(self.entityManager, args)
            .then(function (saveResult) { self.saveSucceeded(self, saveResult); })
            .fail(function (error) { self.saveFailed(self, error); });
    };
    
	// Default methods and Error class for initializing new QueuingSave objects
    QueuingSave.defaultQueuedSaveSucceeded = defaultSaveSucceeded;
    QueuingSave.defaultQueuedSaveFailed = defaultSaveFailed;
    QueuingSave.QueuedSaveFailedError = QueuedSaveFailedError;

    
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
			deferredSave.reject(new queuingSave.QueuedSaveFailedError(error, queuingSave));
		}
		throw error; // so rest of current promise chain can hear error
	}
    
	//#region QueuedSaveFailedError
	// Custom Error sub-class; thrown when rejecting queued saves.
    function QueuedSaveFailedError(errObject) {
    	this.name = "QueuedSaveFailedError";
        this.message = "Queued save failed";
		this.innerError = errObject;
	}

    QueuedSaveFailedError.prototype = new Error();
    QueuedSaveFailedError.prototype.constructor = QueuedSaveFailedError;
    //#endregion

})(breeze, Q);
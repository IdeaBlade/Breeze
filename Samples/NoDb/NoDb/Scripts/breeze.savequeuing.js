/**
Adds "Save Queuing" to new EntityManagers
"Save Queuing" automatically queues and defers an EntityManager.saveChanges call
when another save is in progress for that manager.

Without "Save Queuing", an EntityManager will throw an exception when
saveChanges is called while another save is in progress.

"Save Queuing" is experimental. It may become part of BreezeJS in future
although not necessarily in this form or with this API

** Use with caution! **
"Save Queuing" is recommended only in simple "auto-save" scenarios wherein
users make rapid changes and the UI saves immediately as they do so.
It is usually better (and safer) to disable save in the UI
while waiting for a prior save to complete

All members of EntityManager._saveQueuing are internal; 
touch them at your own risk.
**/
(function (breeze, Q) {
	var EntityManager = breeze.EntityManager;
	var baseSaveChanges = EntityManager.prototype.saveChanges;

    /**
    Enable (default) or disable "Save Queuing" for this manager
    **/
    EntityManager.prototype.enableSaveQueuing = function(enable) {
        // Add saveQueuing if not already added to this EntityManager instance
        var saveQueuing = this._saveQueuing || (this._saveQueuing = new SaveQueuing(this));
        saveQueuing.isEnabled = enable === undefined ? true : enable;
    };
    
    /**
    Default EntityManager.saveChanges extended with "Save Queuing"
    **/
	EntityManager.prototype.saveChanges = function () {
		// Add saveQueuing if not already added to this EntityManager instance
		var saveQueuing = this._saveQueuing || (this._saveQueuing = new SaveQueuing(this));
	    
		var args = [].slice.call(arguments);
		if (saveQueuing.isEnabled) {
			if (saveQueuing.isSaving) {
			    // save in progress; queue the save for later
				return saveQueuing.queueSaveChanges(args);
			} else {
			    // note that save is in progrees; then save
				saveQueuing.isSaving = true;
				return saveQueuing.innerSaveChanges(args);
			}
		}
	    // queuing disabled; just call the base save
	    return baseSaveChanges.apply(this, args);
	};

    var SaveQueuing = function(entityManager) {
    	this.entityManager = entityManager;
        this.isEnabled = true;
        this.isSaving = false;
        this.saveQueue = [];
        this.saveSucceeded = defaultSaveSucceeded;
        this.saveFailed = defaultSaveFailed;
        this.QueuedSaveFailedError = QueuedSaveFailedError;
    };

    SaveQueuing.prototype.queueSaveChanges = function (args) {
        var self = this;
        var deferredSave = Q.defer();
        self.saveQueue.push(deferredSave);
        
        var savePromise = deferredSave.promise;
        return savePromise
            .then(function() {return self.innerSaveChanges(args); })
            .fail(function(error) { self.saveFailed(self, error); });
    };
    
    SaveQueuing.prototype.innerSaveChanges = function (args) {
    	var self = this;
    	return baseSaveChanges.apply(self.entityManager, args)
            .then(function (saveResult) { self.saveSucceeded(self, saveResult); })
            .fail(function (error) { self.saveFailed(self, error); });
    };
    
    // Default methods and Error class for initializing new saveQueuing objects
    SaveQueuing.defaultQueuedSaveSucceeded = defaultSaveSucceeded;
    SaveQueuing.defaultQueuedSaveFailed = defaultSaveFailed;
    SaveQueuing.QueuedSaveFailedError = QueuedSaveFailedError;

    
    function defaultSaveSucceeded(saveQueuing) {
        var deferredSave = saveQueuing.saveQueue.shift();
        if (deferredSave) {
            deferredSave.resolve();
        }
        if (saveQueuing.saveQueue.length === 0) {
            saveQueuing.isSaving = false;
        }
    };

    function defaultSaveFailed(saveQueuing, error) {
    	saveQueuing.isSaving = false;
		var	saveQueue = saveQueuing.saveQueue;
		var deferredSave;
	    // clear the save queue, calling reject on each deferred save
		while(deferredSave = saveQueue.shift()) {
			deferredSave.reject(new saveQueuing.QueuedSaveFailedError(error, saveQueuing));
		}
		throw error; // so rest of current promise chain can hear error
	}
    
    //#region QueuedSaveFailedError
	//Custom Error sub-class; thrown when rejecting queued saves.
    function QueuedSaveFailedError(errObject) {
    	this.name = "QueuedSaveFailedError";
        this.message = "Queued save failed";
		this.innerError = errObject;
	}

    QueuedSaveFailedError.prototype = new Error();
    QueuedSaveFailedError.prototype.constructor = QueuedSaveFailedError;
    //#endregion

})(breeze, Q);
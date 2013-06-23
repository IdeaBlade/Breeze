(function () {

    breeze.config.initializeAdapterInstance("modelLibrary", "backingStore", true);
    breeze.NamingConvention.camelCase.setAsDefault();

    var EntityQuery = breeze.EntityQuery;

    var devServiceName = '../breeze/Dev';
    var serviceName = '../breeze/ZzaEf';

    var logger = getLogger();
    var metadataStore = new breeze.MetadataStore();
    var masterEm, masterEmCache;

    $(doit); // DO IT!

    function doit() {
        logger.log("<h2>Zza Test Data loader begins.</h2>");
        logger.log("<h3>Get metadata</h3>");
        metadataStore.fetchMetadata(serviceName)
            .then(gotMetadata)
            .fail(failed)
            .fin(function () {
                logger.log("<h2>Zza Test Data loader is done.</h2>");
            });
    }

    function gotMetadata() {
        logger.log("Got metadata.");
        return loadMasterManager();
    }

    function loadMasterManager() {
        masterEm = new breeze.EntityManager({
            serviceName: serviceName,
            metadataStore: metadataStore
        });
        logger.log("<h3>Get lookups</h3>");
        return EntityQuery.from("Lookups")
            .using(masterEm).execute()
            .then(loadTestData);
    }

    function loadTestData() {
        logger.log("Got lookups.");
        masterEmCache = masterEm.exportEntities();
        
        return Q.allSettled([writeMaster()]).then(done);
        
        function done(promises) {
            promises.forEach(function(promise) {
                if (promise.state === 'rejected') {
                    var message  = promise.reason.message;
                    logger.error(message);
                }
            });
        }
    }
    
    function writeMaster() {
        return writeScriptFile('master', masterEmCache);
    }
    
    function newEm() {
        var em = masterEm.createEmptyCopy();
        em.importEntities(masterEmCache);
    }
    
    function writeScriptFile(filename, body) {
        var deferred = Q.defer();
        var url = devServiceName + '/TestDataFile/?filename=' + filename;
        $.ajax({
            method: 'POST',
            url: url,
            headers: {
                'Content-Type':'application/json',
                'X-UserSessionId': 'A5844F4B-CAC6-47F3-91B1-A94D53CF6000'
            },
            data: body,
            success: function (data, textStatus, xhr) {
                var msg = 'Wrote "'+filename+'" test data to ' + data;
                logger.log(msg);
                deferred.resolve(msg);
            },
            error: function (xhr, textStatus, errorThrown) {
                var msg = 'Failed to write test data to ' + filename + ': ';
                msg += getjQueryError(xhr, textStatus, errorThrown);
                deferred.reject(new Error(msg));
            }
        });
        return deferred.promise;
    }

    function getjQueryError(xhr, textStatus, errorThrown) {
        if (!xhr) {
            return errorThrown;
        }
        var message = xhr.status + " - " + xhr.statusText;
        try {
            var reason = JSON.parse(xhr.responseText).Message;
            message += "\n" + reason;
        } catch (ex) {
            message += "\n" + xhr.responseText;
        }
        return message;
    }
    
    function getLogger() {
        return {
            log: function (message) {
                $('<p>' + message + '</p>').appendTo($('#log'));
            },
            error: function (error) {
                console.log(error);
                var message = error.message || error;
                $('<p class="error">ERROR: ' + message + '</p>').appendTo($('#log'));
            }
        };
    }

    function failed(error) { logger.error(error); }

})();
app.dataservice = (function (breeze, logger) {
    
    /*** Breeze Configuration ***/

    // configure Breeze for Backbone (config'd for Web API by default)
    breeze.config.initializeAdapterInstances({modelLibrary: "backbone"});

    // Declare the camel case name convention to be the norm
    breeze.NamingConvention.camelCase.setAsDefault();

    // service name is route to the Web API controller
    var serviceName = 'breeze/CarBones';

    /*** dataservice proper ***/
    
    // manager (aka context) is the service gateway and cache holder
    var manager = new breeze.EntityManager(serviceName);
    
    // get all cars from the service
    var getCars = function() {
        return breeze.EntityQuery
            .from("Cars")
            .using(manager)
            .execute()
            .then(querySucceeded)
            .fail(queryFailed);
        
        function querySucceeded(data) {
            logger.success("fetched cars");
            return data.results;
        }
    };

    // load the options for this car 
    // if haven't already done so
    // 'areOptionsLoaded' is not in Car; we just added it.
    // returns a promise to deliver the options
    var loadOptionsIfNotLoaded = function(car) {
        if (car.areOptionsLoaded) {
            // options already loaded
            return Q.fcall(function() {
                return car.getProperty("options");
            });
        }
        // options not yet loaded; go get 'em
        return car.entityAspect
            .loadNavigationProperty("options")
            .then(function() {
                logger.success("loaded options for id=" + car.getProperty("id"));
                car.areOptionsLoaded = true;
                return car.getProperty("options");
            })
            .fail(loadOptionsFailed);
    };

    var saveChanges = function () {
        var msg = manager.hasChanges() ? "changes saved" : "nothing to save";
        return manager.saveChanges()
            .then(function() { logger.success(msg); })
            .fail(saveFailed);
    };
    
    return {
        getCars: getCars,
        loadOptionsIfNotLoaded: loadOptionsIfNotLoaded,
        saveChanges: saveChanges
    };
    
    function queryFailed(error) {
        logger.error("Query failed: " + error.message);
    }

    function loadOptionsFailed(error) {
        logger.error("Load of options failed: " + error.message);
    }

    function saveFailed(error) {
        logger.error("Save failed: " + error.message);
    }
    
})(breeze, app.logger);
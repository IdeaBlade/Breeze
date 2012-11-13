(function (root) {
    var breeze = root.breeze;
    var app = root.app;
    var logger = app.logger;

    // define Breeze namespace
    var entityModel = breeze.entityModel;

    // service name is route to our Web API controller
    var serviceName = 'api/breezydevices';

    // manager is the service gateway and cache holder
    var manager = new entityModel.EntityManager(serviceName);

    // add members to the dataservice
    var dataservice = {
        getAllPersons: getAllPersons,
        saveChanges: saveChanges,
        loadDevices: loadDevicesIfNecessary,
        reset: reset
    };

    // extend the app with this dataservice
    app.dataservice = dataservice;

    /* Private functions */

    // gets all Persons asynchronously
    // returning a promise you can wait for     
    function getAllPersons(peopleArray) {
        
        logger.info("querying for all persons");
        
        var query = new entityModel.EntityQuery()
                .from("People")
                //.where("LastName", "startsWith", "Lerman")
                //.expand("Devices")
                .orderBy("FirstName, LastName");
        
        return manager
            .executeQuery(query)
            .then(function (data) {
                processResults(data, peopleArray);
            })
            .fail(queryFailed);
    };

    // clears observable array and loads the person results 
    function processResults(data, peopleArray) {
        logger.success("queried all persons");
        peopleArray.removeAll();
        var persons = data.results;
        persons.forEach(function (person) {
            peopleArray.push(person);
        });
    }

    function saveChanges() {
        return manager.saveChanges()
            .then(function () { logger.success("changes saved"); })
            .fail(saveFailed);       
    }

    // load the devices for this person 
    // if haven't already done so
    // 'areDevicesLoaded' is not in person; we just added it.
    function loadDevicesIfNecessary(person) {
        if (!person || person.areDevicesLoaded) { return; }
        person.entityAspect.loadNavigationProperty("Devices")
            .then(function () {
                logger.success("loaded devices for " + person.FirstName());
                person.areDevicesLoaded = true;
            })
            .fail(loadDevicesFailed);
    }

    function queryFailed(error) {
        logger.error("Query failed: " + error.message);
    }
    
    function saveFailed(error) {
        logger.error("Save failed: " + error.message);
    }
    
    function loadDevicesFailed(error) {
        logger.error("Load Devices failed: " + error.message);
    }

    // reset the database to original state
    // in case we polluted the data while playing around.
    // Shows we can call the Web API directly 
    // without going through Breeze.
    function reset(callback) {
        manager.clear();
        $.post(serviceName + '/reset', function () {
            logger.success("database reset to original values");
            if (callback) callback();
        });
    }

}(window));

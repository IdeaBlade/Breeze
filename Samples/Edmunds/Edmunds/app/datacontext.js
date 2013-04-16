/* datacontext: data access and model management layer */
app.factory('datacontext', function (logger, model, jsonResultsAdapter) {

    breeze.config.initializeAdapterInstance("modelLibrary", "backingStore", true);

    var serviceName = "http://api.edmunds.com/v1/api/"; // edmunds

    var ds = new breeze.DataService({
        serviceName: serviceName,
        hasServerMetadata: false,
        useJsonp: true,
        jsonResultsAdapter: jsonResultsAdapter
    });

    var manager = new breeze.EntityManager({dataService: ds});

    model.initialize(manager.metadataStore);

    return {
        getMakes: getMakes,
        getModels: getModels
    };

    /*** implementation details ***/

    function getMakes() {
        // vehicle/makerepository/findall
        var parameters = makeParameters();
        var query = breeze.EntityQuery
            .from("vehicle/makerepository/findall")
            .withParameters(parameters);
        return manager.executeQuery(query).then(returnResults);
    }

    function getModels(make) {
        // vehicle/modelrepository/findbymakeid?makeid=xxx
        var parameters = makeParameters({ makeid: make.id });
        var query = breeze.EntityQuery
            .from("vehicle/modelrepository/findbymakeid")
            .withParameters(parameters);
        return manager.executeQuery(query).then(returnResults);
    }

    function makeParameters(addlParameters) {
        var parameters = {
            fmt: "json",
            api_key: "z35zpey2s8sbj4d3g3fxsqdx"
            // Edmund throttles to 4000 requests per API key
            // get your own key: http://developer.edmunds.com/apps/register
        };
        return breeze.core.extend(parameters, addlParameters);
    }

    function returnResults(data){return data.results}

});
/* dataservice: data access and model management layer */
app.dataservice = (function(breeze, logger) {


    breeze.config.initializeAdapterInstance("modelLibrary", "backingStore", true);

    var serviceName = "http://api.edmunds.com/v1/api/"; // edmunds

    var ds = new breeze.DataService({
        serviceName: serviceName,
        hasServerMetadata: false
    });

    var manager = new breeze.EntityManager({
        dataService: ds,
    });

    var metadata = {
        "structuralTypeMap": {
            "Make:#Foo": {
                "shortName": "Make",
                "namespace": "Foo",
                "dataProperties": [
                    { "name": "id", "dataType": "Decimal", "isPartOfKey": true },
                    { "name": "name", "dataType": "String" },
                    { "name": "niceName", "dataType": "String" },
                    { "name": "modelLinks", "dataType": "Undefined" }
                ],
                "navigationProperties": [{
                    "name": "models",
                    "entityTypeName": "Model:#Foo",
                    "isScalar": false,
                    "associationName": "Make_Models"
                }]
            },
            "Model:#Foo": {
                "shortName": "Model",
                "namespace": "Foo",
                "dataProperties": [
                    { "name": "makeId", "dataType": "Decimal" },
                    { "name": "makeName", "dataType": "String" },
                    { "name": "makeNiceName", "dataType": "String" },
                    { "name": "id", "dataType": "String", "isPartOfKey": true},
                    { "name": "name", "dataType": "String" },
                    { "name": "niceName", "dataType": "String" },
                    { "name": "vehicleStyles", "dataType": "String" },
                    { "name": "vehicleSizes", "dataType": "String" }
                ],
                "navigationProperties": [{
                    "name": "make",
                    "entityTypeName": "Make:#Foo",
                    "isScalar": true,
                    "associationName": "Make_Models",
                    "foreignKeyNames": ["makeId"]
                }]
            }
        }
    };
    
    var jsonResultsAdapter = new breeze.JsonResultsAdapter({

        name: "edmunds",
        
        extractResults: function(data) {
            var results = data.results;
            if (!results) throw new Error("Unable to resolve 'results' property");
            return results && (results.makeHolder || results.modelHolder);
        },

        visitNode: function (node, queryContext, nodeContext) {
            var entityType;
            if (node.id && node.models) {
                entityType = queryContext.entityManager.metadataStore.getEntityType("Make", true);
                // rename node.models so that it doesn't get loaded into .models property
                node.modelLinks = node.models;
                node.models = [];
            } else if (node.id && node.makeId) {
                entityType = queryContext.entityManager.metadataStore.getEntityType("Model", true);
                // 
                // rename node.make so that it doesn't get loaded into .make property
                node.makeLink = node.make;
                node.make = null;
                
                var styles  = node.categories && node.categories["Vehicle Style"];
                node.vehicleStyles = styles && styles.join(", ");
                var sizes = node.categories && node.categories["Vehicle Size"];
                node.vehicleSizes = sizes && sizes.join(", ");
            }
            if (entityType) {
                return {
                    entityType: entityType,
                };
            }
        }

    });

    var queryOptions = new breeze.QueryOptions({
        jsonResultsAdapter: jsonResultsAdapter,
        useJsonp: true,
    });
    
    manager.metadataStore.importMetadata(metadata);
    
    var dataservice = {
        getMakes: getMakes,
        getModels: getModels
    };
    

    return dataservice;

    /*** implementation details ***/

    function getMakes() {
        // vehicle/makerepository/findall
        var parameters = makeParameters();
        var query = breeze.EntityQuery.from("vehicle/makerepository/findall")
            .withParameters(parameters)
            .using(queryOptions);
        return manager.executeQuery(query);
    }

    function getModels(make) {
        // vehicle/modelrepository/findbymakeid?makeid=xxx
        var parameters = makeParameters({
            makeid: make.id
        });
        var query = breeze.EntityQuery.from("vehicle/modelrepository/findbymakeid")
            .withParameters(parameters)
            .using(queryOptions);
        return manager.executeQuery(query);
    }
   
    function makeParameters(addlParameters) {
        var parameters = {
            fmt: "json",
            api_key: "z35zpey2s8sbj4d3g3fxsqdx"
        };
        if (addlParameters) {
            breeze.core.extend(parameters, addlParameters);
        }
        return parameters;
    }
    
    

})(breeze, app.logger);
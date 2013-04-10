/* dataservice: data access and model management layer */
app.dataservice = (function(breeze, logger) {


    breeze.config.initializeAdapterInstance("modelLibrary", "backingStore", true);


    var serviceName = "http://api.edmunds.com/v1/api/"; // edmunds
    // http://api.edmunds.com/{version}/api/vehicle/makerepository/findall?api_key=xxxxxxxxxx&fmt=json
    // resource names = 'commits'. 'events'
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
                    { "name": "niceName", "dataType": "String" }
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
            if (results.makeHolder) {
                return results.makeHolder;
            } else if (results.modelHolder) {
                return results.modelHolder;
            }
        },

        visitNode: function (node, queryContext, nodeContext) {
            var entityType;
            if (node.id && node.models) {
                entityType = queryContext.entityManager.metadataStore.getEntityType("Make", true);
                node.modelLinks = node.models;
                node.models = [];
            } else if (node.id && node.makeId) {
                entityType = queryContext.entityManager.metadataStore.getEntityType("Model", true);
                node.makeLink = node.make;
                node.make = null;
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
        var parameters = extendParameters();
        var query = breeze.EntityQuery.from("vehicle/makerepository/findall")
            .withParameters(parameters)
            .using(queryOptions);
        return manager.executeQuery(query);
    }

    function getModels(make) {
        // vehicle/modelrepository/findbymakeid?makeid=xxx
        
        var parameters = extendParameters({
            makeid: make.id
        });
        var query = breeze.EntityQuery.from("vehicle/modelrepository/findbymakeid")
            .withParameters(parameters)
            .using(queryOptions);
        return manager.executeQuery(query);
    }
   
    function extendParameters(addlParameters) {
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
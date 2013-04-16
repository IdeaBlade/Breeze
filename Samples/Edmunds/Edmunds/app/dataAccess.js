/* dataAccess: data access and model management layer */
app.dataAccess = (function(breeze, logger) {

    breeze.config.initializeAdapterInstance("modelLibrary", "backingStore", true);

    var serviceName = "http://api.edmunds.com/v1/api/"; // edmunds

    var jsonResultsAdapter = new breeze.JsonResultsAdapter({

        name: "edmunds",

        extractResults: function (data) {
            var results = data.results;
            if (!results) throw new Error("Unable to resolve 'results' property");
            return results && (results.makeHolder || results.modelHolder);
        },

        visitNode: function (node, queryContext, nodeContext) {
            if (node.id && node.models) {
                // rename node.models so that it doesn't get loaded into .models property
                node.modelLinks = node.models;
                node.models = [];
                return {
                    entityType: "Make"
                }
            } else if (node.id && node.makeId) {
                // rename node.make so that it doesn't get loaded into .make property
                node.makeLink = node.make;
                node.make = null;

                var styles = node.categories && node.categories["Vehicle Style"];
                node.vehicleStyles = styles && styles.join(", ");
                var sizes = node.categories && node.categories["Vehicle Size"];
                node.vehicleSizes = sizes && sizes.join(", ");
                return {
                    entityType: "Model"
                };
            }
        }

    });

    var ds = new breeze.DataService({
        serviceName: serviceName,
        hasServerMetadata: false,
        useJsonp: true,
        jsonResultsAdapter: jsonResultsAdapter
    });

    var manager = new breeze.EntityManager({
        dataService: ds,
    });

    var metadataStore = manager.metadataStore;
    var DataType = breeze.DataType;

    metadataStore.addEntityType({
        shortName: "Make",
        namespace: "Foo",
        dataProperties: {
            id:         { dataType: DataType.Int64, isPartOfKey: true },
            name:       { dataType: DataType.String },
            niceName:   { dataType: DataType.String },
            modelLinks: { dataType: DataType.Undefined }
        },
        navigationProperties: {
            models: { entityTypeName: "Model:#Foo", isScalar: false, associationName: "Make_Models" }
        }
    });

    metadataStore.addEntityType({
        shortName: "Model",
        namespace: "Foo",
        dataProperties: {
            makeId:        { dataType: "Int64" },
            makeName:      { dataType: "String" },
            makeNiceName:  { dataType: "String" },
            id:            { dataType: "String", isPartOfKey: true },
            name:          { dataType: "String" },
            niceName:      { dataType: "String" },
            vehicleStyles: { dataType: "String" },
            vehicleSizes:  { dataType: "String" },
            categories:    { dataType: "Undefined"}
        },
        navigationProperties: {
            make: { entityTypeName: "Make:#Foo", isScalar: true,  associationName: "Make_Models", foreignKeyNames: ["makeId"] }
        }
    });
          
    return {
        getMakes: getMakes,
        getModels: getModels
    };

    /*** implementation details ***/

    function getMakes() {
        // vehicle/makerepository/findall
        var parameters = makeParameters();
        var query = breeze.EntityQuery.from("vehicle/makerepository/findall")
            .withParameters(parameters);
            
        return manager.executeQuery(query);
    }

    function getModels(make) {
        // vehicle/modelrepository/findbymakeid?makeid=xxx
        var parameters = makeParameters({
            makeid: make.id
        });
        var query = breeze.EntityQuery.from("vehicle/modelrepository/findbymakeid")
            .withParameters(parameters);
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
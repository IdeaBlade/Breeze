/* model: entity definitions */
app.factory('model', function () {
    var DT = breeze.DataType; // alias
    return {
        initialize: initialize
    }

    function initialize(metadataStore) {
        metadataStore.addEntityType({
            shortName: "Make",
            namespace: "Edmunds",
            dataProperties: {
                id:         { dataType: DT.Int64, isPartOfKey: true },
                name:       { dataType: DT.String },
                niceName:   { dataType: DT.String },
                modelLinks: { dataType: DT.Undefined }
            },
            navigationProperties: {
                models: {
                    entityTypeName:  "Model:#Edmunds", isScalar: false,
                    associationName: "Make_Models"
                }
            }
        });

        metadataStore.addEntityType({
            shortName: "Model",
            namespace: "Edmunds",
            dataProperties: {
                id:            { dataType: "String", isPartOfKey: true },
                makeId:        { dataType: "Int64" },
                makeName:      { dataType: "String" },
                makeNiceName:  { dataType: "String" },
                name:          { dataType: "String" },
                niceName:      { dataType: "String" },
                vehicleStyles: { dataType: "String" },
                vehicleSizes:  { dataType: "String" },
                categories:    { dataType: "Undefined" }
            },
            navigationProperties: {
                make: {
                    entityTypeName:  "Make:#Edmunds", isScalar: true,
                    associationName: "Make_Models",  foreignKeyNames: ["makeId"]
                }
            }
        });
    }
})
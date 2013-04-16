/* model: entity definitions */
app.factory('model', function () {
    var DataType = breeze.DataType;
    return {
        initialize: initialize
    }

    function initialize(metadataStore) {
        metadataStore.addEntityType({
            shortName: "Make",
            namespace: "Edmunds",
            dataProperties: {
                id: { dataType: DataType.Int64, isPartOfKey: true },
                name: { dataType: DataType.String },
                niceName: { dataType: DataType.String },
                modelLinks: { dataType: DataType.Undefined }
            },
            navigationProperties: {
                models: { entityTypeName: "Model:#Edmunds", isScalar: false, associationName: "Make_Models" }
            }
        });

        metadataStore.addEntityType({
            shortName: "Model",
            namespace: "Edmunds",
            dataProperties: {
                makeId: { dataType: "Int64" },
                makeName: { dataType: "String" },
                makeNiceName: { dataType: "String" },
                id: { dataType: "String", isPartOfKey: true },
                name: { dataType: "String" },
                niceName: { dataType: "String" },
                vehicleStyles: { dataType: "String" },
                vehicleSizes: { dataType: "String" },
                categories: { dataType: "Undefined" }
            },
            navigationProperties: {
                make: {
                    entityTypeName: "Make:#Edmunds", isScalar: true, associationName: "Make_Models",
                    foreignKeyNames: ["makeId"]
                }
            }
        });
    }
})
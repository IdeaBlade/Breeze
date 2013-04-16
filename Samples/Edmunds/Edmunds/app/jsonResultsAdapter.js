/* jsonResultsAdapter: parses Edmunds data into entities */
app.value('jsonResultsAdapter', 
    new breeze.JsonResultsAdapter({

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

    }));

/* jsonResultsAdapter: parses Edmunds data into entities */
app.value('jsonResultsAdapter', 
    new breeze.JsonResultsAdapter({

        name: "edmunds",

        extractResults: function (data) {
            var results = data.results;
            if (!results) throw new Error("Unable to resolve 'results' property");
            // Parse only the make and model types
            return results && (results.makeHolder || results.modelHolder);
        },

        visitNode: function (node, parseContext, nodeContext) {
            // Make parser
            if (node.id && node.models) {
                // move 'node.models' links so 'models' can be empty array
                node.modelLinks = node.models;
                node.models = [];
                return { entityType: "Make"  }
            }

            // Model parser
            else if (node.id && node.makeId) {
                // move 'node.make' link so 'make' can be null reference
                node.makeLink = node.make;
                node.make = null;

                // flatten styles and sizes as comma-separated strings
                var styles = node.categories && node.categories["Vehicle Style"];
                node.vehicleStyles = styles && styles.join(", ");
                var sizes = node.categories && node.categories["Vehicle Size"];
                node.vehicleSizes = sizes && sizes.join(", ");

                return { entityType: "Model" };
            }
        }

    }));

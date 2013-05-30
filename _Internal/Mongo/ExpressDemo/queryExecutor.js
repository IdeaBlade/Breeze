exports.executeQuery = executeQuery;

function executeQuery(db, collectionName, query, fn) {
    db.collection(collectionName, {strict: true} , function (err, collection) {
        if (err) {
            err = { status: 404, message: "Unable to locate: " + collectionName, error: err };
            fn(err, null);
            return;
        }
        var src;

        if (query.inlineCount) {
            collection.count(query.query, function(err, count) {
                src = collection.find(query.query, query.select, query.options);
                src.toArray(function (err, items) {
                    var results =  { Results: items || [], InlineCount: count };
                    fn(null, results);
                });
            });
        } else {
            src = collection.find(query.query, query.select, query.options);
            src.toArray(function (err, results) {
                fn(null, results || []);
            });
        }
    });

}



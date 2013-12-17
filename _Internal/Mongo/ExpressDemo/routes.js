var mongodb = require('mongodb');
var fs = require('fs');
var breezeMongo = require('breeze-mongodb');

//var MongoQuery = breezeMongo.MongoQuery;
//var MongoSaveHandler = breezeMongo.MongoSaveHandler;

var host = 'localhost';
var port = 27017;
var dbName = 'NorthwindIB';
var dbServer = new mongodb.Server(host, port, { auto_reconnect: true});
var db = new mongodb.Db(dbName, dbServer, { strict:true, w: 1});
db.open(function () {

});

exports.getMetadata = function(req, res, next) {
    var filename = "metadata.json";
    if (!fs.existsSync(filename)) {
        next(new Error("Unable to locate file: " + filename));
    }
    var metadata = fs.readFileSync(filename, 'utf8');
    res.sendfile(filename);
}

exports.get = function (req, res, next) {

    var slug = req.params.slug;
    if (namedQuery[slug]) {
        namedQuery[slug](req, res, next);
    } else {
        var query = new breezeMongo.MongoQuery(req.query);
        query.execute(db, slug, processResults(res, next));
    }
};

exports.getProducts = function(req, res, next) {
    var query = new breezeMongo.MongoQuery(req.query);
    // add your own filters here
    query.execute(db, "Products", processResults(res, next));
}

exports.saveChanges = function(req, res, next) {
    var saveHandler = new breezeMongo.MongoSaveHandler(db, req.body, processResults(res, next));
    saveHandler.beforeSaveEntity = beforeSaveEntity;
    saveHandler.beforeSaveEntities = beforeSaveEntities;
    saveHandler.save();
};

function beforeSaveEntity(entity) {
    if ( entity.entityAspect.entityTypeName.indexOf("Region") >= 0 && entity.entityAspect.entityState == "Added") {
        if (entity.RegionDescription.toLowerCase().indexOf("error") === 0) return false;
    }
    return true;
}

function beforeSaveEntities(callback) {
    var tag = this.saveOptions.tag;
    if (tag === "increaseProductPrice") {
        this.registerEntityType("Product", "Products", "Identity");
    }
    var categories = this.saveMap["Category"] || [];
    categories.forEach(function(cat) {
       // NOT YET IMPLEMENTED

    });
    callback();
}

// C# version
//protected override Dictionary<Type, List<EntityInfo>> BeforeSaveEntities(Dictionary<Type, List<EntityInfo>> saveMap) {
//    if ((string)SaveOptions.Tag == "increaseProductPrice") {
//        Dictionary<Type, List<EntityInfo>> saveMapAdditions = new Dictionary<Type, List<EntityInfo>>();
//        foreach (var type in saveMap.Keys) {
//            if (type == typeof(Category)) {
//                foreach (var entityInfo in saveMap[type]) {
//                    if (entityInfo.EntityState == EntityState.Modified) {
//                        Category category = (entityInfo.Entity as Category);
//                        var products = this.Context.Products.Where(p => p.CategoryID == category.CategoryID);
//                        foreach (var product in products) {
//                            if (!saveMapAdditions.ContainsKey(typeof(Product)))
//                                saveMapAdditions[typeof(Product)] = new List<EntityInfo>();
//
//                            var ei = this.CreateEntityInfo(product, EntityState.Modified);
//                            ei.ForceUpdate = true;
//                            var incr = (Convert.ToInt64(product.UnitPrice) % 2) == 0 ? 1 : -1;
//                            product.UnitPrice += incr;
//                            saveMapAdditions[typeof(Product)].Add(ei);
//                        }
//                    }
//                }
//            }
//        }
//        foreach (var type in saveMapAdditions.Keys) {
//            if (!saveMap.ContainsKey(type)) {
//                saveMap[type] = new List<EntityInfo>();
//            }
//            foreach (var enInfo in saveMapAdditions[type]) {
//                saveMap[type].Add(enInfo);
//            }
//        }
//        return saveMap;
//    }
//
//    return base.BeforeSaveEntities(saveMap);




exports.saveWithFreight = function(req, res, next) {
    var saveHandler = new breezeMongo.MongoSaveHandler(db, req.body, processResults(res, next));
    saveHandler.beforeSaveEntity = checkFreightOnOrder;
    saveHandler.save(db, req.body, processResults(res,next));
}

exports.saveWithFreight2 = function(req, res, next) {
    var saveHandler = new breezeMongo.MongoSaveHandler(db, req.body, processResults(res, next));
    saveHandler.beforeSaveEntities = checkFreightOnOrders;
    saveHandler.save(db, req.body, processResults(res,next));
}

exports.saveWithExit = function(req, res, next) {
    res.setHeader("Content-Type:", "application/json");
    results = {
        insertedKeys: [],
        deletedKeys: [],
        updatedKeys: [],
        keyMappings: [],
        entitiesCreatedOnServer: []
    }
    res.send(results);
}


function checkFreightOnOrder(order) {
    if (this.saveOptions.tag === "freight update") {
        order.Freight = order.Freight + 1;
    } else if (this.saveOptions.tag === "freight update-ov") {
        order.Freight = order.Freight + 1;
        order.entityAspect.originalValuesMap["Freight"] = null;
    } else if (this.saveOptions.tag === "freight update-force") {
        order.Freight = order.Freight + 1;
        order.entityAspect.forceUpdate = true;
    }
    return true;
}

function checkFreightOnOrders(callback) {
    var orderTypeName = this.qualifyTypeName("Order");
    var orders = this.saveMap[orderTypeName] || [];
    var fn = checkFreightOnOrder.bind(this);
    orders.forEach(function(order) {
        fn(order);
    });
    callback();
}

exports.saveWithComment = function(req, res, next) {
    var saveHandler = new breezeMongo.MongoSaveHandler(db, req.body, processResults(res, next));
    var dataProperties = [ {
        name: "_id",
        dataType: "MongoObjectId"
    }];

    saveHandler.registerEntityType("Comment", "Comments", "Identity", dataProperties);
    saveHandler.beforeSaveEntities = function(callback) {
        var tag = this.saveOptions.tag;
        var entity = {
            Comment1: (tag == null) ? "Generic comment" : tag,
            CreatedOn: new Date(),
            SeqNum: 1
        };
        this.addToSaveMap(entity, "Comment");
        callback();
    }
    saveHandler.save(db, req.body, processResults(res,next));

}



var namedQuery = {};

namedQuery.EmployeesMultipleParams = function(req, res, next) {
    var query = new breezeMongo.MongoQuery(req.query);
    var empId = req.query.employeeId;
    var city = req.query.city;
    query.filter = { "$or": [{ "_id": empId }, { "city": city }] };
    query.execute(db, "Employees", processResults(res, next));
};

namedQuery.CompanyNames = function(req, res, next) {
    executeQuery(db, "Customers", { select: { "CompanyName": 1, "_id": 0 }}, processResults(res, next));
};

namedQuery.CompanyNamesAndIds = function(req, res, next) {
    var query = new breezeMongo.MongoQuery(req.query);
    query.select = { "CompanyName": 1, "_id": 1 };
    query.execute(db, "Customers", processResults(res, next));
};

namedQuery.CustomersStartingWithA = function(req, res, next) {
    var query = new breezeMongo.MongoQuery(req.query);
    query.filter["CompanyName"] = new RegExp("^A",'i' ) ;
    query.execute(db, "Customers", processResults(res, next));
};

namedQuery.CustomersStartingWith = function(req, res, next) {
    // start with client query and add an additional filter.
    var query = new breezeMongo.MongoQuery(req.query);
    var companyName = req.query.companyName;
    if (companyName === undefined) {
       next(new Error("Unable to find 'companyName' parameter"));
       return;
    }
    query.filter["CompanyName"] =  new RegExp("^"+companyName,'i' );
    query.execute(db, "Customers", processResults(res, next));
};


namedQuery.CustomerWithScalarResult = function(req, res, next) {
    var query = new breezeMongo.MongoQuery(req.query);
    query.options.limit = 1;
    query.resultEntityType = "Customer";
    query.execute(db, "Customers", processResults(res, next));
};


namedQuery.CustomersWithHttpError = function(req, res, next) {
    var err = { statusCode: 404, message: "Unable to do something"  };
    next(err);
};

namedQuery.EmployeesFilteredByCountryAndBirthdate= function(req, res, next) {
    var query = new breezeMongo.MongoQuery(req.query);
    var birthDate = new Date(Date.parse(req.query.birthDate));
    var country = req.query.country;
    query.filter["BirthDate"] = { "$gte": birthDate };
    query.filter["Country"] = country ;
    query.execute(db, "Employees", processResults(res, next));
};

// not yet implemented
//public Object CustomerCountsByCountry() {
//    return ContextProvider.Context.Customers.GroupBy(c => c.Country).Select(g => new { g.Key, Count = g.Count() });

// need expand support for these.
//public IQueryable<Object> CustomersWithBigOrders() {
//    var stuff = ContextProvider.Context.Customers.Select(c => new { Customer = c, BigOrders = c.Orders.Where(o => o.Freight > 100) });

//public IQueryable<Object> CompanyInfoAndOrders() {
//    var stuff = ContextProvider.Context.Customers.Select(c => new { c.CompanyName, c.CustomerID, c.Orders });

//public Object CustomersAndProducts() {
//    var stuff = new { Customers = ContextProvider.Context.Customers.ToList(), Products = ContextProvider.Context.Products.ToList() };

//public IQueryable<Customer> CustomersAndOrders() {
//    var custs = ContextProvider.Context.Customers.Include("Orders");

//public IQueryable<Order> OrdersAndCustomers() {
//    var orders = ContextProvider.Context.Orders.Include("Customer");

// if you don't want to use a Mongo query
function executeQuery(db, collectionName, query, fn) {
    var that = this;
    db.collection(collectionName, {strict: true} , function (err, collection) {
        if (err) {
            err = { statusCode: 404, message: "Unable to locate: " + collectionName, error: err };
            fn(err, null);
            return;
        }

        // Mongo doesn't handle limit = 0 as a real limit.
        if (query.options && query.options.limit && query.options.limit === 0) {
            fn(err, []);
            return;
        }

        var src = collection.find(query.filter || {}, query.select || {}, query.options || {});
        src.toArray(function (err, results) {
            results == results || [];
            if (query.resultEntityType) {
                results.forEach(function(r) { r.$type = query.resultEntityType} )
            }
            fn(err, results || []);
        });

    });

};


function processResults(res, next) {

    return function(err, results) {
        if (err) {
            next(err);
        } else {
            res.setHeader("Content-Type:", "application/json");
            res.send(results);
        }
    }
}



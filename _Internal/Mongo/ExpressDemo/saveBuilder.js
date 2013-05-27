var mongodb = require('mongodb');
var ObjectId = require('mongodb').ObjectID;



exports.saveChanges = function(db, req, res) {
    var body = req.body;
    var saveHandler = new SaveHandler(db, body.entities, body.saveOptions, function(saveResult) {
        res.send(saveResult);
    });

}

var SaveHandler = function(db, entities, saveOptions, saveCompletedCallback) {
    this.db = db;
    this.entities = entities;
    this.saveOptions = saveOptions;
    this.saveCountPending = 0;
    this.allCallsCompleted = false;
    this.saveCompletedCallback = saveCompletedCallback;
    this.savedEntities = [];
    this.keyMappings = [];
    this._save();
}

SaveHandler.prototype._save = function(saveCompletedCallback) {
    var groupedEntities = groupBy(this.entities, function(e) {
        return e.entityAspect.defaultResourceName;
    });
    var that = this;
    objectForEach(groupedEntities, that._saveToCollection.bind(that));
    this.allCallsCompleted = true;
}

SaveHandler.prototype._saveToCollection = function(resourceName, entities) {
    var insertDocs = [];
    var updateDocs = [];
    entities.forEach(function(e) {
        var entityAspect = e.entityAspect;
        var entityState = entityAspect.entityState;
        if (entityState === "Added") {
            delete e.entityAspect;
            insertDocs.push(e);
        } else if (entityState === "Modified") {
            var crit = { "_id": e._id };
            setMap = {};
            Object.keys(entityAspect.originalValuesMap).forEach(function(k) {
                setMap[k] = e[k];
            });
            var updateDoc = { criteria: crit, setOps: { $set: setMap }};
            updateDocs.push(updateDoc);
        }
    });
    this.saveCountPending += (insertDocs.length > 0 ? 1 : 0) + updateDocs.length;
    var that = this;
    this.db.collection(resourceName, {strict: true} , function (err, collection) {
        collection.insert(insertDocs, that._handleSave.bind(that));
        updateDocs.forEach(function (ud) {
            collection.update( ud.criteria, ud.setOps, that._handleSave.bind(that))
        });
    });
}

SaveHandler.prototype._handleSave = function (err, objects) {
    if (err) {
        this.saveCompletedCallback(err);
        return;
    }
    Array.prototype.push.apply(this.savedEntities, objects);
    this.saveCountPending -= 1;
    if (this.saveCountPending <= 0 && this.allCallsCompleted) {
        this.saveCompletedCallback( { Entities: this.saved, KeyMappings: this.keyMappings });
    }
}

function objectForEach(obj, kvFn) {
    for (var key in obj) {
        if ( obj.hasOwnProperty(key)) {
            kvFn(key, obj[key]);
        }
    }
}

function groupBy(arr, keyFn) {
    var groups = {};
    arr.forEach(function (v) {
        var key = keyFn(v);
        var group = groups[key];
        if (!group) {
            group = [];
            groups[key] = group;
        }
        group.push(v);
    })
    return groups;
}

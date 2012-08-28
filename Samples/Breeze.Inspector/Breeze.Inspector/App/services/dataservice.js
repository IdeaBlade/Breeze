define(function(require) {
    var breeze = require('breeze'),
        core = breeze.core,
        entityModel = breeze.entityModel;

    core.config.trackingImplementation = entityModel.entityTracking_ko;
    core.config.remoteAccessImplementation = entityModel.remoteAccess_webApi;

    var op = entityModel.FilterQueryOp,
        EntityAction = entityModel.EntityAction,
        manager = new entityModel.EntityManager('api/inspector'),
        answerType,
        canSave,
        data;

    manager.entityChanged.subscribe(function(args) {
        if (args.entityAction === EntityAction.Clear) {
            canSave(false);
        } else if (args.entity.entityAspect.entityState.isAddedModifiedOrDeleted()) {
            canSave(true);
        }
    });

    function executeQuery(query) {
        if (data.isOffline()) {
            return {
                then: function(callback) {
                    callback({ results: manager.executeQueryLocally(query) });
                }
            };
        } else {
            return manager.executeQuery(query);
        }
    }

    data = {
        ready: function() {
            if (this.isOffline()) {
                answerType = manager.metadataStore.getEntityType("Answer");
                return {
                    then: function(callback) {
                        callback();
                    }
                };
            }

            return manager.fetchMetadata().then(function() {
                answerType = manager.metadataStore.getEntityType("Answer");
            });
        },
        login: function(username, password) {
            //NOTE: This is not the appropriate way to handle login...
            var query = new entityModel.EntityQuery()
                .from("Inspectors")
                .where("Username", op.Equals, username)
                .where("Password", op.Equals, password)
                .take(1);

            return executeQuery(query);
        },
        getJobsFor: function(inspectorId) {
            var query = new entityModel.EntityQuery()
                .from("Jobs")
                .expand("Location, Inspections.Form.Questions, Inspections.Answers")
              //.expand("Location, Inspections, Inspections.Form, Inspections.Form.Questions, Inspections.Answers")
                .where("Inspector.Id", op.Equals, inspectorId)
                .orderBy("CreatedAt");

            return executeQuery(query);
        },
        createAnswer: function(inspection, question) {
            var answer = manager.addEntity(answerType.createEntity());
            answer.Inspection(inspection);
            answer.Question(question);
            return answer;
        },
        onCanSaveChanges: function(callback) {
            canSave = callback;
        },
        saveChanges: function() {
            if (this.isOffline()) {
                localStorage.setItem("manager", manager.export());
                return {
                    then: function(callback) {
                        callback();
                    }
                };
            }

            return manager.saveChanges().then(function(saveResult) {
                canSave(false);
            });
        },
        isOffline: function() {
            return localStorage.getItem("offline") == "true";
        },
        hasChanges: function() {
            return manager.getChanges().length > 0;
        },
        toggleConnection: function() {
            if (!this.isOffline()) {
                localStorage.setItem("manager", manager.export());
                localStorage.setItem("offline", "true");
            } else {
                localStorage.removeItem("offline");
            }
        }
    };

    if (data.isOffline()) {
        manager.import(localStorage.getItem("manager"));
    }

    return data;
});
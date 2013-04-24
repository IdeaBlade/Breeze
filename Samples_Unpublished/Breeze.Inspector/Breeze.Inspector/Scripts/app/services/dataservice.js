define(function(require) {
    var breeze = require('breeze');

    var op = breeze.FilterQueryOp,
        manager = new breeze.EntityManager('breeze/inspector'),
        answerType, jobType, addressType, inspectionType,
        data,
        forms;

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

    function preloadData(def) {
        var query = new breeze.EntityQuery()
            .from("Forms")
            .expand("Questions");

        answerType = manager.metadataStore.getEntityType("Answer");
        jobType = manager.metadataStore.getEntityType("Job");
        addressType = manager.metadataStore.getEntityType("Address");
        inspectionType = manager.metadataStore.getEntityType("Inspection");

        executeQuery(query).then(function(response) {
            forms = response.results;
            def.resolve();
        });
    }

    data = {
        ready: function() {
            return $.Deferred(function(def) {
                if (data.isOffline()) {
                    preloadData(def);
                } else {
                    manager.fetchMetadata().then(function() {
                        preloadData(def);
                    });
                }
            }).promise();
        },
        getForms: function() {
            return forms;
        },
        getInspectors: function() {
            var query = new breeze.EntityQuery()
                .from("Inspectors");

            return executeQuery(query);
        },
        getJobsFor: function(inspectorId) {
            var query = new breeze.EntityQuery()
                .from("Jobs")
                .expand("Location, Inspections.Answers")
                .where("Inspector.Id", op.Equals, inspectorId)
                .orderBy("CreatedAt");

            return executeQuery(query);
        },
        createAnswer: function(inspection, question) {
            var answer = answerType.createEntity();
            answer.Inspection(inspection);
            answer.Question(question);
            return answer;
        },
        createJob: function(inspector) {
            var job = jobType.createEntity();
            job.Inspector(inspector);
            job.CreatedAt(new Date());
            job.Location(addressType.createEntity());
            return job;
        },
        saveJob: function(job) {
            manager.addEntity(job);
            return this.saveChanges().then(function(result) {
                if (result.error) {
                    toastr.error("There was a problem saving the job!");
                } else {
                    toastr.success("Job succesfully saved.");
                }
            });
        },
        createInspection: function(inspectionForm) {
            var inspection = inspectionType.createEntity();
            inspection.Form(inspectionForm);
            inspection.Status("New");
            return inspection;
        },
        saveInspection: function(inspection) {
            manager.addEntity(inspection);
            return this.saveChanges().then(function(result) {
                if (result.error) {
                    toastr.error("There was a problem saving the inspection!");
                } else {
                    toastr.success("Inspection succesfully saved.");
                }
            });
        },
        saveChanges: function() {
            if (this.isOffline()) {
                localStorage.setItem("manager", manager.exportEntities());
                return {
                    then: function(callback) {
                        toastr.info("Changes saved to local storage during offline mode.");
                        callback({});
                    }
                };
            }

            return manager.saveChanges();
        },
        isOffline: function() {
            return localStorage.getItem("offline") == "true";
        },
        toggleConnection: function() {
            if (!this.isOffline()) {
                localStorage.setItem("manager", manager.exportEntities());
                localStorage.setItem("offline", "true");
                toastr.warning("Switching to offline mode.");
            } else {
                localStorage.removeItem("offline");
                manager.saveChanges().then(function(result) {
                    if (result.error) {
                        toastr.error("Unable to sync with server!");
                    } else {
                        toastr.success("Switched to online mode and synced with server.");
                    }
                });
            }
        }
    };

    if (data.isOffline()) {
        manager.importEntities(localStorage.getItem("manager"));
        toastr.warning("Starting up in offline mode.");
    }

    return data;
});
define(function(require) {
    var breeze = require('breeze'),
        entityModel = breeze.entityModel;

    var manager = new entityModel.EntityManager('api/inspector'),
        op = entityModel.FilterQueryOp,
        entityAction = entityModel.EntityAction,
        answerType,
        inspectors,
        jobs = {};

    module("Change notification should not happen");

    manager.entityChanged.subscribe(function(args) {
        ok(true, args.entityAction);

        if (args.entityAction === EntityAction.Clear) {

        } else if (args.entity.entityAspect.entityState.isAddedModifiedOrDeleted()) {
            ok(false, "entityChanged fired and isAddedModifiedOrDeleted returned true only by navigating");
        }
    });

    function fetchMetadata() {
        var deferred = Q.defer();

        if (manager.metadataStore.isEmpty()) {
            manager.fetchMetadata().then(function() {
                deferred.resolve();
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise;
    }

    function arrange() {
        return fetchMetadata()
            .then(function() {
                answerType = manager.metadataStore.getEntityType("Answer");
            }).then(function() {
                var query = new entityModel.EntityQuery()
                    .from("Forms")
                    .expand("Questions");

                return manager.executeQuery(query);
            }).then(function() {
                var query = new entityModel.EntityQuery()
                    .from("Inspectors");

                return manager.executeQuery(query).then(function(data) {
                    inspectors = data.results;
                });
            });
    }

    var getJobsFor = function(inspectorId, jobs) {
        var query = new entityModel.EntityQuery()
            .from("Jobs")
            .expand("Location, Inspections.Answers")
            .where("Inspector.Id", op.Equals, inspectorId)
            .orderBy("CreatedAt");

        return manager.executeQuery(query).then(function(data) {
            jobs[inspectorId.toString()] = data.results;
        });
    };

    function act() {
        var tasks = [];

        for (var i = 0; i < inspectors.length; i++) {
            var id = inspectors[i].Id();
            var promise = getJobsFor(id, jobs);
            tasks.push(promise);
        }

        return Q.all(tasks);
    }

    function makeAssertions() {
        for (var i = 0; i < inspectors.length; i++) {
            var id = inspectors[i].Id().toString();
            var work = jobs[id];

            ok(work.length > 0, "Inspector " + id + " has " + work.length + " jobs.");

            for (var j = 0; j < work.length; j++) {
                var job = work[j];
                var inspections = job.Inspections();

                ok(inspections.length > 0, "Job " + job.Id() + " has " + inspections.length + " inspections.");

                for (var k = 0; k < inspections.length; k++) {
                    var inspection = inspections[k];
                }
            }
        }
    }

    function handleFail(e) {
        ok(false, "Exception: " + e);
    }

    test("after enumerating the jobs and inspections of an inspector.", function() {
        stop();
        arrange().then(act).then(makeAssertions).fail(handleFail).fin(start);
    });
});
define(function(require) {
    var breeze = require('breeze');

    var manager = new breeze.EntityManager('api/inspector'),
        op = breeze.FilterQueryOp,
        entityAction = breeze.EntityAction,
        inspectors,
        jobs = {};

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

    module("Jobs should not have duplicate inspections");

    function arrange() {
        return fetchMetadata()
            .then(function() {
                var query = new breeze.EntityQuery()
                    .from("Forms")
                    .expand("Questions");

                return manager.executeQuery(query);
            }).then(function() {
                var query = new breeze.EntityQuery()
                    .from("Inspectors");

                return manager.executeQuery(query).then(function(data) {
                    inspectors = data.results;
                });
            });
    }

    var getJobsFor = function(inspectorId, jobs) {
        var query = new breeze.EntityQuery()
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
        equal(inspectors.length, 5, "Inspectors loaded.");

        for (var i = 0; i < inspectors.length; i++) {
            var id = inspectors[i].Id().toString();
            var work = jobs[id];

            ok(work.length > 0, "Inspector " + id + " has " + work.length + " jobs.");

            for (var j = 0; j < work.length; j++) {
                var job = work[j];
                var inspections = job.Inspections();
                var inspectionIds = [];

                ok(inspections.length > 0, "Job " + job.Id() + " has " + inspections.length + " inspections.");

                for (var k = 0; k < inspections.length; k++) {
                    var inspection = inspections[k];

                    ok(inspectionIds.indexOf(inspection.Id()) == -1, "Not a duplication inspection.");
                    inspectionIds.push(inspection.Id());
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
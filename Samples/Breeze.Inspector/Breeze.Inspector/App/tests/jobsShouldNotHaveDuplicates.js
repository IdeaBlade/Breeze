define(function(require) {
    var breeze = require('breeze'),
        core = breeze.core,
        entityModel = breeze.entityModel;

    var manager = new entityModel.EntityManager('api/inspector'),
        op = entityModel.FilterQueryOp,
        entityAction = entityModel.EntityAction,
        answerType,
        inspectors,
        jobs = {};

    // Configure for Knockout binding and Web API persistence services
    core.config.setProperties({
        trackingImplementation: entityModel.entityTracking_ko,
        remoteAccessImplementation: entityModel.remoteAccess_webApi
    });

    module("Jobs should not have duplicates");

    function arrange() {
        return manager.fetchMetadata()
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
        
        // old code
//        for (var i = 0; i < inspectors.length; i++) {
//            var id = inspectors[i].Id();
//            var promise = getJobsFor(id).then(function(data) {
//                jobs[id.toString()] = data.results;
//            });
//            tasks.push(promise);
//        }
        
        for (var i = 0; i < inspectors.length; i++) {
            var id = inspectors[i].Id();
            var promise = getJobsFor(id, jobs);
            tasks.push(promise);
        }

        return Q.all(tasks);
    }

    function makeAssertions() {
        ok(answerType, "Answer type defined.");
        equal(inspectors.length, 5, "Inspectors loaded.");

        for (var i = 0; i < inspectors.length; i++) {
            var id = inspectors[i].Id().toString();
            var work = jobs[id];
            ok(work, "work not defined for jobs item: " + id);
            ok(work.length > 0, "Inspector " + id + " has " + work.length + " jobs.");
        }
        
    }
    
    function handleFail(e) {
        ok(false, "Exception: " + e);
    }

    test("after navigating to different inspectors.", function() {
        stop();
        arrange().then(act).then(makeAssertions).fail(handleFail).fin(start);
    });
});
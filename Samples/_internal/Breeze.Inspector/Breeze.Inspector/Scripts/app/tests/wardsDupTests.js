define(function(require) {
    var breeze = require('breeze');

    var manager = new breeze.EntityManager('api/inspector');
    var op = breeze.FilterQueryOp;

    function handleFail(e) {
        ok(false, "Exception: " + e);
    }

    module("Ward's Dup Tests");    
    
    test("getting jobs of inspectors does not change entityState", 1,
        function () {
            
            manager.clear();
            var subscriptionToken = manager.entityChanged.subscribe(entityChangedDuringQueryHandler);

            stop();
            getMetadata()
                .then(getInspectors)
                .then(getJobsForEachInspectorIndividually)
                .then(lookForAnyChangedEntities)
                .fail(handleFail)
                .fin(function () {
                    manager.entityChanged.unsubscribe(subscriptionToken);
                    start();
                });
        });
    
    function lookForAnyChangedEntities() {
        ok(manager.hasChanges(), "Manager does not have changes");
    }
    
    function entityChangedDuringQueryHandler(args) {
        if (args.entityAction === EntityAction.PropertyChange &&
            args.entity.entityAspect.entityState.isAddedModifiedOrDeleted()) {
            ok(false, "entity is in changed state during/after query");
        }
    }
    
    // This test fails if getFormsAndQuestions; passes if commented out
    test("v1 - no duplicate inspection entities for a job", 1,
        function () {
            manager.clear();
            stop();
            getMetadata()
                .then(getFormsAndQuestions) // comment out and it passes; leave it and it fails
                .then(getInspectors)
                .then(getJobsForEachInspectorIndividually)
                .then(lookForDupInspectionsByInspectorsJobs)
                .fail(handleFail)
                .fin(start);
        });
    

    // this test passes even when getFormsAndQuestions
    // apparently must get inspectors jobs individually to trigger the problem
    test("v2 - no duplicate inspection entities for a job", 1,
       function () {
           manager.clear();
           stop();
           getMetadata()
               .then(getFormsAndQuestions) // harmless either way
               .then(getJobs)
               .then(lookForDupInspectionsByJobs)
               .fail(handleFail)
               .fin(start);
       });
   
    /****************  HELPERS *****************/
    
    function getMetadata() {
        if (manager.metadataStore.isEmpty()) {
            return manager.fetchMetadata();
        } else {
            return Q.fcall(function () { });
        }
    }

    // Should be completely irrelevant
    function getFormsAndQuestions() {
        var query = new breeze.EntityQuery()
             .from("Forms")
             .expand("Questions");

        return manager.executeQuery(query);
    }

    function getInspectors() {
        var query = new breeze.EntityQuery()
            .from("Inspectors");

        return manager.executeQuery(query);
    };
    
    function getJobsForEachInspectorIndividually(data) {

        var inspectors = data.results;
        
        // Rob's query in the dataservice is in this comment. 
        // He should have written "InspectorId" instead of "Inspector.Id" but it shouldn't matter
        
        //var query = new breeze.EntityQuery()
        //   .from("Jobs")
        //   .expand("Location, Inspections.Answers")
        //   .where("Inspector.Id", op.Equals, inspectorId)
        //   .orderBy("CreatedAt");
        
        // a faithful reproduction albeit unnecessarily faithful
        var queryPromises = inspectors.map(function(inspector) {
            return new breeze.EntityQuery()
                .from("Jobs")
                .expand("Location, Inspections.Answers")
                .where("Inspector.Id", op.Equals, inspector.Id())
                .orderBy("CreatedAt")
                .using(manager)
                .execute();
        });

       return Q.all(queryPromises);
    };
    
    function getJobs() {
        var query = new breeze.EntityQuery()
            .from("Jobs")
            .expand("Inspector");

        return manager.executeQuery(query);
    };
    
    function lookForDupInspectionsByInspectorsJobs(data) {
        var dupCount = 0;
        var inspectorJobs = data.map(function (promiseData) { return promiseData.results;});
        
        inspectorJobs.forEach(function (jobs) {
            lookForDupInspectionsInJobsArray(jobs, function (count) { dupCount += count; });
        });

       equal(dupCount,0 , "Expected no duplicate inspections");
    };

    function lookForDupInspectionsByJobs(data) {
        var dupCount = 0;
        var jobs = data.results;
        lookForDupInspectionsInJobsArray(jobs, function (count) { dupCount += count;});
        equal(dupCount, 0, "Expected no duplicate inspections");
    }
    
    function lookForDupInspectionsInJobsArray(jobs, dupCountInc) {
        jobs.forEach(function (job) {
            var inspections = job.Inspections();
            var uniqueInspections = [];
            var duplicateInspections = [];
            inspections.forEach(function (inspection) {
                if (uniqueInspections.indexOf(inspection) === -1) {
                    uniqueInspections.push(inspection);
                } else {
                    duplicateInspections.push(inspection);
                }
            });
            var dups = duplicateInspections.length;
            if (dups > 0) {
                var inspector = job.Inspector();
                ok(false,
                    "Found " + dups +
                    " duplicate inspection(s) for job=" + job.Id() +
                    " of inspector " + inspector.Id() +
                    " " + inspector.Name());
                dupCountInc(dups);
            }
        });
    } 

});
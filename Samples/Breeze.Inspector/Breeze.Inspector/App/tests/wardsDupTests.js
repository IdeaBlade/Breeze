define(function(require) {
    var breeze = require('breeze'),
        core = breeze.core,
        entityModel = breeze.entityModel;

    var manager = new entityModel.EntityManager('api/inspector');

    // Configure for Knockout binding and Web API persistence services
    core.config.setProperties({
        trackingImplementation: entityModel.entityTracking_ko,
        remoteAccessImplementation: entityModel.remoteAccess_webApi
    });

    function handleFail(e) {
        ok(false, "Exception: " + e);
    }

    module("Ward's Dup Tests");
    
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
    test("v2 - no duplicate inspection entities for a job", 1, function () {
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
        var query = new entityModel.EntityQuery()
             .from("Forms")
             .expand("Questions");

        return manager.executeQuery(query);
    }

    function getInspectors() {
        var query = new entityModel.EntityQuery()
            .from("Inspectors");

        return manager.executeQuery(query);
    };
    
    function getJobsForEachInspectorIndividually(data) {

        var inspectors = data.results;
 
        var queryPromises = inspectors.map(function(inspector) {
            return new entityModel.EntityQuery("Inspectors")
                .where("Id", "==", inspector.Id())
                .expand("Jobs.Inspections")
                .using(manager)
                .execute();
        });

       return Q.all(queryPromises);
    };
    
    function getJobs() {
        var query = new entityModel.EntityQuery()
            .from("Jobs")
            .expand("Inspector");

        return manager.executeQuery(query);
    };
    
    function lookForDupInspectionsByInspectorsJobs(data) {
        var dupCount = 0;
        var inspectors = data.map(function (promiseData) { return promiseData.results[0];});
        
        inspectors.forEach(function(inspector) {
            var jobs = inspector.Jobs();
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
    
//    function lookForDupInspectionsInJobsArray(jobs, dupCountInc) {
//        jobs.forEach(function (job) {
//            var inspections = job.Inspections();
//            var uniqueInspections = [];
//            var duplicateInspections = [];
//            inspections.forEach(function (inspection) {
//                if (uniqueInspections.indexOf(inspection) === -1) {
//                    uniqueInspections.push(inspection);
//                } else {
//                    duplicateInspections.push(inspection);
//                }
//            });
//            var dups = duplicateInspections.length;
//            if (dups > 0) {
//                var inspector = job.Inspector();
//                ok(false,
//                    "Found " + dups +
//                    " duplicate inspection(s) for job=" + job.Id() +
//                    " of inspector " + inspector.Id() +
//                    " " + inspector.Name());
//                dupCountInc(dups);
//            }
//        });
//    } 
    
    function lookForDupInspectionsInJobsArray(jobs, dupCountInc) {
        jobs.forEach(function (job) {
            var inspections = job.Inspections();
            var uniqueInspections = [];
            var duplicateInspections = [];
            var dups = getDups(inspections);
            if (dups.length > 0) {
                var inspector = job.Inspector();
                ok(false,
                    "Found " + dups.length +
                    " duplicate inspection(s) for job=" + job.Id() +
                    " of inspector " + inspector.Id() +
                    " " + inspector.Name());
                dupCountInc(dups);
            }
        });
    } 
    
    function unique(items) {
        var uniqueItems = [];
        items.forEach(function(item) {
            if (uniqueItems.indexOf(item) === -1) {
                uniqueItems.push(item);
            }
        });
        return uniqueItems;
    }

    function getDups(items) {
        var uniqueItems = [];
        var dups = [];
        items.forEach(function(item) {
            if (uniqueItems.indexOf(item) === -1) {
                uniqueItems.push(item);
            } else {
                dups.push(item);
            }
        });
        return dups;
    }
    

});
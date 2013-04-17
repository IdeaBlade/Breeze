app = angular.module('app', [])

/* Defines the "Edmunds" controller 
 * Constructor function relies on Ng injector to provide:
 *     $scope - context variable for the view to which the view binds
 *     datacontext - the apps data access facility
 *     logger - logs controller activities during development
 */
app.controller('EdmundsCtrl', function ($scope, datacontext, logger) { 

    $scope.searchText = "";
    $scope.makes = [];
    $scope.getMakes = getMakes;
    $scope.getModels = getModels;
    $scope.makeFilter = makeFilter; // Beware: called a lot!

    $scope.getMakes();

    //#region private functions

    function getMakes() {
        datacontext.getMakes().then(succeeded).fail(queryFailed);

        function succeeded(results) {
            $scope.makes = results;
            $scope.$apply();
            logger.info("Fetched " + results.length + " Makes");
        }
    };

    function getModels(make) {

        if (!make.showModels) {
            return; // don't bother if not showing
        } else if (make.models.length > 0) {
            // already in cache; no need to get them
            logGetModelResults(true /*from cache*/);
        } else {
            getModelsFromEdmunds()
        }

        function getModelsFromEdmunds() {
            make.isLoading = true;
            datacontext.getModels(make)
                .then(succeeded).fail(queryFailed).fin(done);

            function succeeded(data) {
                // models automatically link up with makes via fk              
                logGetModelResults(false /*from web*/);
            }

            function done() {
                make.isLoading = false;
                $scope.$apply();
            }
        }

        function logGetModelResults(fromCache) {
            var src = fromCache ? 'from cache' : 'via web service call';
            logger.info("Fetched "+src+": " + make.models.length + " models for " + make.name);
        }
    };

    function makeFilter(make) {
        var searchText = $scope.searchText;
        return searchText ?
            // if there is search text, look for it in the 'niceName'
            // the property Edmunds intends for filtering; else return true
            make.niceName.indexOf(searchText.toLowerCase()) >= 0 : true;
    };

    function queryFailed(error) {
        logger.error(error.message, "Query failed; please try it again.");
    }
   
    //#endregion
});
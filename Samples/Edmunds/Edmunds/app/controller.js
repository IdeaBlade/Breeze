/* Defines the "Edmunds" controller 
 * Constructor function relies on Ng injector to provide:
 *     $scope - context variable for the view to which the view binds
 *     $timeout - Angular equivalent of `setTimeout`
 */
app.main.controller('EdmundsCtrl', function ($scope, $timeout) {

    var dataAccess = window.app.dataAccess;
    dataAccess.$timeout = $timeout; // inject into dataAccess
    var logger = window.app.logger;
    

    $scope.searchText = "";
    
    // Beware: this is called a lot!
    $scope.makeFilter = function (make) {
        var searchText = $scope.searchText;
        return searchText ? 
            // if there is search text, look for it in the description; else return true
            make.name.toLowerCase().indexOf(searchText.toLowerCase()) >= 0 : true;
    };
    
    $scope.modelOrder = function (model) {
        return model.name;
    };

    
    $scope.makes = [];

    $scope.getMakes = function () {
        dataAccess.getMakes().then(function(data) {
            $scope.makes = [];
            data.results.forEach(function(item) {
                $scope.makes.push(item);
                item.shouldShowModels = false;
            });
            $scope.$apply();

            logger.info("Fetched " + data.results.length + " Makes");
        }).fail(queryFailed);
    };
    
    $scope.showModels = function (make) {
        if (!make.shouldShowModels) return;
        if (make.models.length > 0) {
            logger.info("Retrieved from cache: " + make.models.length + " models for " + make.name);
            return;
        }
        make.isLoading = true;
        dataAccess.getModels(make).then(function(data) {
            // models will automatically link up with makes via fk    
            make.isLoading = false;
            $scope.$apply();
            logger.info("Fetched via web service call: " + make.models.length + " models for " + make.name);
        }).fail(queryFailed);
    };

    $scope.getMakes();

    //#region private functions
    

    function queryFailed(error) {
        logger.error(error.message, "Query failed");
    }

   
    //#endregion
});
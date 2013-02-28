define(['services/unitofwork', 'services/logger', 'durandal/system', 'durandal/viewModel', 'viewmodels/details', 'durandal/plugins/router', 'durandal/app'],
    function (unitofwork, logger, system, viewModel, details, router, app) {

        return (function () {

            var ctor = function () {
                var self = this;
                var uow = unitofwork.create();

                this.title = "Resource Management";
                this.staffingResources = ko.observableArray();
                this.activeDetail = viewModel.activator();
                this.activate = activate;
                this.deactivate = deactivate;
                this.canDeactivate = canDeactivate;
                this.viewAttached = viewAttached;

                function activate(splat) {
                    app.on('saved', function(entities) {
                        loadList().fail(handleError);
                    }, this);

                    return Q.when(self.activeDetail.activate())
                        .then(function() {
                            return loadList()
                                .then(querySucceeded)
                                .fail(handleError);
                        });

                    function querySucceeded() {
                        if (splat.id) {
                            activateDetail(splat.id);
                        }

                        return true;
                    }
                }
                
                function activateDetail(id) {
                    var detail = details.create(id);
                    return Q.when(self.activeDetail.activateItem(detail));
                }
                
                function loadList() {
                    return uow.staffingResourceListItems.all()
                        .then(function(data) {
                            self.staffingResources(data);
                            log("StaffingResourceListItems loaded", true);
                        });
                }

                function deactivate(close) {
                    app.off(null, null, this);

                    return self.activeDetail.deactivate(close);
                }
                
                function canDeactivate(close) {
                    return self.activeDetail.canDeactivate(close);
                }

                function viewAttached(view) {
                    $(view).on('click', '.selectable-row', function () {
                        var staffingResource = ko.dataFor(this);

                        //router.navigateTo('#/resourcemgt/' + staffingResource.id);
                        activateDetail(staffingResource.id);

                        return false;
                    });
                }

                function handleError(error) {
                    logger.log(error.message, null, system.getModuleId(self), true);
                    throw error;
                }

                function log(message, showToast) {
                    logger.log(message, null, system.getModuleId(self), showToast);
                }
            };

            return ctor;
        })();
    });
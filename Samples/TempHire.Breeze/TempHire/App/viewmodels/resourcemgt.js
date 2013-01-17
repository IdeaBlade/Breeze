define(['services/unitofwork', 'logger', 'durandal/system', 'durandal/viewModel', 'viewmodels/details', 'durandal/plugins/router'],
    function (unitofwork, logger, system, viewModel, details, router) {

        return (function () {

            var ctor = function () {
                var vm = this;
                var uow = unitofwork.create();

                this.title = "Resource Management";
                this.staffingResources = ko.observableArray();
                this.activeDetail = viewModel.activator();
                this.activate = activate;
                this.deactivate = deactivate;
                this.canDeactivate = canDeactivate;
                this.viewAttached = viewAttached;

                function activate(splat) {
                    return Q.when(vm.activeDetail.activate())
                        .then(function() {
                            return uow.staffingResourceListItems.all()
                                .then(querySucceeded)
                                .fail(handleError);
                        });

                    function querySucceeded(data) {
                        vm.staffingResources(data);
                        log("StaffingResourceListItems loaded", true);

                        if (splat.id) {
                            var detail = new details(splat.id);
                            return Q.when(vm.activeDetail.activateItem(detail));
                        }

                        return true;
                    }
                }

                function deactivate(close) {
                    return vm.activeDetail.deactivate(close);
                }
                
                function canDeactivate(close) {
                    return vm.activeDetail.canDeactivate(close);
                }

                function viewAttached(view) {
                    $(view).on('click', '.selectable-row', function () {
                        var staffingResource = ko.dataFor(this);

                        router.navigateTo('#/resourcemgt/' + staffingResource.id);

                        return false;
                    });
                }

                function handleError(error) {
                    logger.log(error.message, null, system.getModuleId(vm), true);
                    throw error;
                }

                function log(message, showToast) {
                    logger.log(message, null, system.getModuleId(vm), showToast);
                }
            };

            return ctor;
        })();
    });
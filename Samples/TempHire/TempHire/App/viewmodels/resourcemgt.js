define(['services/unitofwork', 'services/logger', 'durandal/system', 'durandal/viewModel', 'viewmodels/details', 'durandal/plugins/router', 'durandal/app', 'services/errorhandler'],
    function (unitofwork, logger, system, viewModel, details, router, app, errorhandler) {

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

                errorhandler.includeIn(this);

                function activate(splat) {
                    app.on('saved', function(entities) {
                        loadList().fail(self.handleError);
                    }, this);

                    return self.activeDetail.activate()
                        .then(function() {
                            return loadList()
                                .then(querySucceeded)
                                .fail(self.handleError);
                        });

                    function querySucceeded() {
                        if (splat.id) {
                            return activateDetail(splat.id);
                        }

                        return true;
                    }
                }
                
                function activateDetail(id) {
                    var detail = details.create(id);
                    return self.activeDetail.activateItem(detail);
                }
                
                function loadList() {
                    return uow.staffingResourceListItems.all()
                        .then(function(data) {
                            self.staffingResources(data);
                            self.log("StaffingResourceListItems loaded", true);
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
            };

            return ctor;
        })();
    });
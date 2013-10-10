define(['services/unitofwork', 'services/logger', 'durandal/system', 'durandal/activator', 'viewmodels/details', 'plugins/router', 'durandal/app', 'services/errorhandler'],
    function (unitofwork, logger, system, activator, details, router, app, errorhandler) {

        return (function () {

            var ctor = function () {
                var self = this;
                var uow = unitofwork.create();

                this.title = "Resource Management";
                this.staffingResources = ko.observableArray();
                this.activeDetail = activator.create();
                this.activate = activate;
                this.deactivate = deactivate;
                this.canDeactivate = canDeactivate;
                this.attached = attached;

                errorhandler.includeIn(this);

                function activate(id) {
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
                        if (id) {
                            return activateDetail(id);
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

                function attached(view) {
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
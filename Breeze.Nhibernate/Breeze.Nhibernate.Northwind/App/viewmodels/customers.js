define(['services/unitofwork', 'services/logger', 'durandal/system', 'durandal/viewModel', 'durandal/plugins/router', 'durandal/app', 'services/errorhandler'],
    function (unitofwork, logger, system, viewModel, router, app, errorhandler) {

        return (function () {

            var ctor = function () {
                var self = this;
                var uow = unitofwork.create();

                this.title = "Customers";
                this.customers = ko.observableArray();
                //this.activeDetail = viewModel.activator();
                this.activate = activate;
                this.deactivate = deactivate;
                //this.canDeactivate = canDeactivate;
                //this.viewAttached = viewAttached;

                errorhandler.includeIn(this);

                function activate(splat) {
                    app.on('saved', function (entities) {
                        loadList().fail(self.handleError);
                    }, this);

                    return loadList();
                    //return self.activeDetail.activate()
                    //    .then(function () {
                    //        return loadList()
                    //            .then(querySucceeded)
                    //            .fail(self.handleError);
                    //    });

                    //function querySucceeded() {
                    //    if (splat.id) {
                    //        return activateDetail(splat.id);
                    //    }

                    //    return true;
                    //}
                }

                //function activateDetail(id) {
                //    var detail = details.create(id);
                //    return self.activeDetail.activateItem(detail);
                //}

                function loadList() {
                    return uow.customers.query()
                        .where('Country', '==', 'Germany')
                        //.expand('OrderCollection.Employee')
                        //.select('CompanyName, Country')
                        .execute()
                        .then(function (data) {
                            self.customers(data.results);
                            self.log("Customers loaded", true);

                            // test modify
                            //var cust1 = self.customers()[2];
                            //cust1.ContactTitle('this title is way to long and will not pass validation, so we will get an error message');

                            // test add
                            //var cust2 = uow.customers.createEntity({CompanyName:'Acme', ContactName:'Steve', Country:'Germany'});

                            //uow.commit();
                        });
                }

                function deactivate(close) {
                    app.off(null, null, this);
                    return true;
                    //return self.activeDetail.deactivate(close);
                }

                //function canDeactivate(close) {
                //    return self.activeDetail.canDeactivate(close);
                //}

                //function viewAttached(view) {
                //    $(view).on('click', '.selectable-row', function () {
                //        var staffingResource = ko.dataFor(this);

                //        //router.navigateTo('#/resourcemgt/' + staffingResource.id);
                //        activateDetail(staffingResource.id);

                //        return false;
                //    });
                //}
            };

            return ctor;
        })();
    });
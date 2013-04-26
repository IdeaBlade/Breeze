define(['services/entitymanagerprovider', 'services/repository', 'durandal/app'],
    function (entityManagerProvider, repository, app) {

        var refs = {};
        var prefix = ''; // 'northwind/'

        var UnitOfWork = (function () {

            var unitofwork = function () {
                var provider = entityManagerProvider.create();

                this.hasChanges = function () {
                    return provider.manager().hasChanges();
                };

                this.commit = function () {
                    var saveOptions = new breeze.SaveOptions({ resourceName: prefix + 'savechanges' });

                    return provider.manager().saveChanges(null, saveOptions)
                        .then(function (saveResult) {
                            app.trigger('saved', saveResult.entities);
                        });
                };

                this.rollback = function () {
                    provider.manager().rejectChanges();
                };

                this.customers = repository.create(provider, 'Customer', prefix + 'customers');
                this.orders = repository.create(provider, 'Order', prefix + 'orders');
                this.products = repository.create(provider, 'Product', prefix + 'products');
                this.employees = repository.create(provider, 'Employee', prefix + 'employees');
                this.suppliers = repository.create(provider, 'Supplier', prefix + 'suppliers');
                // lookups
                this.categories = repository.create(provider, 'Category', prefix + 'categories', breeze.FetchStrategy.FromLocalCache);
                this.regions = repository.create(provider, 'Region', prefix + 'regions', breeze.FetchStrategy.FromLocalCache);
                this.roles = repository.create(provider, 'Role', prefix + 'roles', breeze.FetchStrategy.FromLocalCache);
            };

            return unitofwork;
        })();

        return {
            create: create
        };

        function create() {
            return new UnitOfWork();
        }

    });
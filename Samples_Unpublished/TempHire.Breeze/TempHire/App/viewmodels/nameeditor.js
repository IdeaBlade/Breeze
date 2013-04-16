define(['durandal/system', 'services/unitofwork', 'services/logger', 'services/errorhandler'],
    function(system, unitofwork, logger, errorhandler) {

        var NameEditor = (function() {

            var ctor = function (id) {
                this.staffingResourceId = id;
                this.firstName = ko.observable();
                this.middleName = ko.observable();
                this.lastName = ko.observable();

                errorhandler.includeIn(this);
            };

            system.setModuleId(ctor, 'viewmodels/nameeditor');

            ctor.prototype.activate = function () {
                var ref = unitofwork.get(this.staffingResourceId);
                var uow = ref.value();

                var self = this;
                return uow.staffingResources.withId(this.staffingResourceId)
                    .then(function(data) {
                        self.firstName(data.firstName());
                        self.middleName(data.middleName());
                        self.lastName(data.lastName());
                    })
                    .fail(self.handleError)
                    .finally(function() { ref.release(); });
            };

            ctor.prototype.canDeactivate = function (close) {
                if (this.dialogResult === 'Cancel') return true;

                if (close) {
                    return this.firstName() !== '' && this.lastName() !== '';
                }

                return true;
            };

            return ctor;
        })();

        return {
            create: create
        };
        
        function create(id) {
            return new NameEditor(id);
        }
    });
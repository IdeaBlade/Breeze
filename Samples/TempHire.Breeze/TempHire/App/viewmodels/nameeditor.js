define(['durandal/system', 'services/unitofwork', 'logger'],
    function(system, unitofwork, logger) {

        var NameEditor = (function() {

            var ctor = function (id) {
                this.staffingResourceId = id;
                this.firstName = ko.observable();
                this.middleName = ko.observable();
                this.lastName = ko.observable();
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
                    .fail(handleError)
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
            
            function handleError(error) {
                logger.log(error.message, null, system.getModuleId(ctor), true);
                throw error;
            }
        })();

        return {
            create: create
        };
        
        function create(id) {
            return new NameEditor(id);
        }
    });
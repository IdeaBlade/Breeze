define(['durandal/system'],
    function(system) {
        var OptionSelector = (function() {

            var ctor = function (label, options, optionsText, optionsValue) {
                this.label = ko.observable(label);
                this.options = ko.observableArray(options);
                this.optionsText = optionsText;
                this.optionsValue = optionsValue;
                this.selectedValue = ko.observable();
            };

            system.setModuleId(ctor, 'viewmodels/optionselector');

            return ctor;
        })();


        return {
            create: create
        };

        function create(label, options, optionsText, optionsValue) {
            return new OptionSelector(label, options, optionsText, optionsValue);
        }
    });
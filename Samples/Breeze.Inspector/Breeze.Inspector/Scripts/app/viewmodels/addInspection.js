define(function(require) {
    var data = require('services/dataservice');

    return {
        forms: ko.observableArray([]),
        selectForm: function(selection) {
            this.dfd.resolve(selection);
        },
        show: function(job) {
            var that = this;
            var forms = data.getForms();
            var inspections = job.Inspections();

            for (var i = 0; i < inspections.length; i++) {
                var current = inspections[i];
                var form = current.Form();
                var index = forms.indexOf(form);

                if (index != -1) {
                    forms.splice(index, 1);
                }
            }

            that.forms(forms);

            return $.Deferred(function(dfd) {
                that.dfd = dfd;
                require(['text!views/addInspection.html'], function(html) {
                    var view = $(html);
                    ko.applyBindings(that, view.get(0));
                    view.modal();
                });
            }).promise();
        }
    };
});
define(function(require) {
    var data = require('services/dataservice');

    return {
        forms: ko.observableArray([]),
        selectForm: function(selection) {
            this.dfd.resolve(selection);
        },
        show: function() {
            var that = this;
            that.forms(data.getForms());
            
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
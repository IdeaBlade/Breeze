define(function(require) {
    var data = require('services/dataservice');

    return {
        forms: ko.observableArray([]),
        selectForm: function(selection) {
            this.dfd.resolve(selection);
        },
        show: function() {
            var that = this;
            return $.Deferred(function(dfd) {
                that.dfd = dfd;
                require(['text!views/addInspection.html'], function(html) {
                    setTimeout(function() {
                        var view = $(html);
                        ko.applyBindings(that, view.get(0));
                        view.modal();
                        $("#simplemodal-container").css("height", "auto");
                        
                        if (that.forms().length == 0) {
                            data.getForms().then(function(response) {
                                that.forms(response.results);
                            });
                        } 
                    }, 1);
                });
            }).promise();
        }
    };
});
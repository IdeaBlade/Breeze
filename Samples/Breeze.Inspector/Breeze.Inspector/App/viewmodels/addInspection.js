define(function(require) {

    return {
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
                    }, 1);
                });
            }).promise();
        }
    };
});
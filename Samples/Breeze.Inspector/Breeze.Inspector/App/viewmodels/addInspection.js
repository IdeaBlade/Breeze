define(function(require) {

    return {
        selectForm: function(selection) {
            this.dfd.resolve(selection);
        },
        show: function() {
            var that = this;
            return jQuery.Deferred(function(dfd) {
                that.dfd = dfd;
                require(['text!addInspection.html'], function(html) {
                    setTimeout(function() {
                        var view = jQuery(html);
                        ko.applyBindings(this, view.get(0));
                        view.modal();
                    }, 1);
                });
            }).promise();
        }
    };
});
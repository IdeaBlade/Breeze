// ReSharper disable InconsistentNaming

(function ($, Backbone, dataservice) {

    // Get templates
    var content = $("#content");
    var carTemplateSource = $("#car-template").html();
    var optionTemplateSource = $("#option-template").html();

    // Car BB View (extended by stickit)
    var CarView = Backbone.View.extend({
        bindings: {
            '#make-input': 'make',
            '#model-input': 'model',
            '#make-desc': 'make',
            '#model-desc': 'model',
        },
        events: {
            "click #options": "showOptions"
        },
        render: function() {
            this.$el.html(carTemplateSource);
            this.stickit();
            return this;
        },
        renderOptions: function() {
            var optionsHost = $("#optionsList", this.$el).empty();
            var options = this.model.get("options");
            if (options.length) {
                options.forEach(
                    function(option) {
                        var view = new OptionView({ model: option });
                        optionsHost.append(view.render().el);
                    });
                optionsHost.removeClass("hidden");
            } else {
                optionsHost.addClass("hidden");
            }
        },
        // A toggle to hide/show options
        // will load options from db if not already loaded
        showOptions: function () {
            var self = this;
            var optionsHost = $("#optionsList", self.$el);
            if (optionsHost.hasClass("hidden")) {
                dataservice.loadOptionsIfNecessary(self.model)
                    .then(function () {
                        self.renderOptions();
                    });
            } else {
                optionsHost.addClass("hidden");
            }
        }
    });

    // Option BB View (extended by stickit)
    var OptionView = Backbone.View.extend({
        bindings: {
            '#name-input': 'name',
            '#name-desc': 'name'
        },
        render: function () {
            this.$el.html(optionTemplateSource);
            this.stickit();
            return this;
        }
    });

    var getCars = function() {
        content.empty();
        dataservice.getCars()
            .then(gotCars);

        function gotCars(cars) {
            cars.forEach(// show cars
                function(car) {
                    var view = new CarView({ model: car });
                    content.append(view.render().el);
                });
            enableSave();
        } 
    };

    var enableSave = function() {
        var saveElements = $(".save");
        saveElements.removeClass("hidden");
        // only add the click handler once
        if (enableSave.initialized) { return; }
        saveElements.click(function() {
            dataservice.saveChanges();
        });
        enableSave.initialized = true;
    };

    getCars(); 
    
})(jQuery, Backbone, app.dataservice);
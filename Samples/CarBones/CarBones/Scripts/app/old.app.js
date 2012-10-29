// ReSharper disable InconsistentNaming

var app = app || {};

(function() {

    var Car = Backbone.Model.extend({
        // instance properties
        defaults: {
            make: "",
            model: ""
        },

        initialize: function() {
            console.log('car created');
            if (!this.has('options')) {
                this.set('options', new OptionCollection());
            }
        }
    });

    // Backbone model classes
    var Option = Backbone.Model.extend({
        // instance properties
        defaults: {
            name: ""
        },
    });

    var OptionCollection = Backbone.Collection.extend({
        model: Option
    });

    // make some cars
    var carCollection = new Backbone.Collection([
        new Car({
            make: "Ford",
            model: "Mustang"
        }),
        new Car({
            make: "Chevy",
            model: "Volt",
            options: new OptionCollection([
                new Option({ name: "Sunroof" }),
                new Option({ name: "Whitewalls" }),
                new Option({ name: "All leather interior" })
            ])
        }),
        new Car({
            make: "Tesla",
            model: "S"
        })
    ]);

    // Get the templates
    var carTemplateSource = $("#car-template").html();
    var optionTemplateSource = $("#option-template").html();

    // Option BB View (extended by stickit)
    var OptionView = Backbone.View.extend({
        bindings: {
            '#name-input': 'name',
            '#name-desc': 'name'
        },
        render: function() {
            this.$el.html(optionTemplateSource);
            this.stickit();
            return this;
        }
    });

    // Car BB View (extended by stickit)
    var CarView = Backbone.View.extend({
        bindings: {
            '#make-input': {
                modelAttr: 'make'
            },
            // use the simpler syntax
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
            this._renderOptions(this.$el);
            return this;
        },
        _renderOptions: function() {
            var optionsHost = $("#optionsList", this.$el).empty();
            var options = this.model.get("options");
            if (options.length) {
                options.forEach(
                    function(p) {
                        var pv = new OptionView({ model: p });
                        optionsHost.append(pv.render().el);
                    });
                optionsHost.removeClass("hidden");
            } else {
                optionsHost.addClass("hidden");
            }
        },
        showOptions: function() {
            var self = this;
            // simulate async retrieval of options from server
            setTimeout(function() {
                self.model.get("options").add([
                    { name: "Cup holder " + (optionCounter += 1) },
                    { name: "Lottery ticket " + (optionCounter += 1) }
                ]);
                self._renderOptions();
            }, 500);
        }
    });

    var optionCounter = 0;

    // Show the cars
    var content = $("#content").empty();
    carCollection.forEach(
        function(vm) {
            var vv = new CarView({ model: vm });
            content.append(vv.render().el);
        }
    );

})();
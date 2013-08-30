define(['durandal/app', 'services/datacontext', 'durandal/plugins/router'],
    function (app, datacontext, router) {
        var isSaving = ko.observable(false),
            rooms = ko.observableArray(),
            session = ko.observable(),
            speakers = ko.observableArray(),
            timeSlots = ko.observableArray(),
            tracks = ko.observableArray(),

            activate = function () {
                initLookups();
                session(datacontext.createSession());
            },
            initLookups = function () {
                rooms(datacontext.lookups.rooms);
                timeSlots(datacontext.lookups.timeslots);
                tracks(datacontext.lookups.tracks);
                speakers(datacontext.lookups.speakers);
            },
            cancel = function (complete) {
                router.navigateBack();
            },
            hasChanges = ko.computed(function () {
                return datacontext.hasChanges();
            }),
            canSave = ko.computed(function () {
                return hasChanges() && !isSaving();
            }),
            save = function () {
                isSaving(true);
                datacontext.saveChanges()
                    .then(goToEditView).fail(failed).fin(complete);

                function failed(error) {
                    //Covered this in datacontext
                    //toastr.error('Save failed to add a session. <br/>' + error.message);
                }

                function goToEditView(result) {
                    router.replaceLocation('#/sessiondetail/' + session().id());
                }

                function complete() {
                    isSaving(false);
                }
            },
            canDeactivate = function () {
                if (hasChanges()) {
                    var msg = 'Do you want to leave and cancel?';
                    return app.showMessage(msg, 'Navigate Away', ['Yes', 'No'])
                        .then(function (selectedOption) {
                            if (selectedOption === 'Yes') {
                                datacontext.cancelChanges();
                            }
                            return selectedOption;
                        });
                }
                return true;
            };

        var vm = {
            activate: activate,
            canDeactivate: canDeactivate,
            canSave: canSave,
            cancel: cancel,
            hasChanges: hasChanges,
            rooms: rooms,
            save: save,
            session: session,
            speakers: speakers,
            timeSlots: timeSlots,
            title: 'Add a New Session',
            tracks: tracks
        };

        return vm;
    });
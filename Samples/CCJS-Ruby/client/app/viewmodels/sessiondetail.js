define(['durandal/app', 'durandal/system', 'services/datacontext', 'durandal/plugins/router', 'config', 'services/logger'],
    function (app, system, datacontext, router, config, logger) {
        var isDeleting = ko.observable(false),
            isSaving = ko.observable(false),
            session = ko.observable(),
            rooms = ko.observableArray(),
            timeSlots = ko.observableArray(),
            tracks = ko.observableArray(),
            activate = function (routeData) {
                var id = parseInt(routeData.id);
                initLookups();
                return datacontext.getSessionById(id, session);
            },
            initLookups = function () {
                rooms(datacontext.lookups.rooms);
                timeSlots(datacontext.lookups.timeslots);
                tracks(datacontext.lookups.tracks);
            },
            cancel = function () {
                datacontext.cancelChanges();
            },
            goBack = function (complete) {
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
                return datacontext.saveChanges().fin(complete);
                function complete() {
                    isSaving(false);
                }
            },
            deleteSession = function () {
                isDeleting(true); // prevent leaving during delete workflow
                var msg = 'Delete session "' + session().title() + '" ?';
                return app.showMessage(msg, 'Confirm Delete', ['Yes', 'No'])
                    .then(confirmDelete);
                
                function confirmDelete(selectedOption) {
                    if (selectedOption === 'Yes') {
                        // mark for deletion, then save
                        session().entityAspect.setDeleted();
                        save().then(success).fail(failed);
                    } else {
                        isDeleting(false);
                    }

                    function success() {
                        isDeleting(false); // to navigate away now
                        router.navigateTo('#/sessions');
                    }

                    function failed(error) {
                        isDeleting(false);
                        cancel();
                        var errorMsg = 'Error: ' + error.message;
                        logger.logError(errorMsg, error, system.getModuleId(vm), true);
                    }
                }
            },
            canDeactivate = function () {
                if (isDeleting()) { return false; } // Prevent leaving

                if (hasChanges()) {
                    var title = 'Do you want to leave "' + session().title() + '" ?';
                    var msg = 'Navigate away and cancel your changes?';
                    return app.showMessage(title, msg, ['Yes', 'No'])
                        .then(confirm);
                };
                return true;

                function confirm(selectedOption) {
                    if (selectedOption === 'Yes') {
                        cancel();
                    }
                    return selectedOption;
                }
            };

        var vm = {
            activate: activate,
            cancel: cancel,
            canSave: canSave,
            canDeactivate: canDeactivate,
            deleteSession: deleteSession,
            goBack: goBack,
            hasChanges: hasChanges,
            rooms: rooms,
            session: session,
            save: save,
            timeSlots: timeSlots,
            title: 'Edit a Session',
            tracks: tracks
        };

        return vm;
    });
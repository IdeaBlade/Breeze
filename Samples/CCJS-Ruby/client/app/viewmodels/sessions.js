define(['services/datacontext', 'durandal/plugins/router', 'services/model', 'config'],
    function (datacontext, router, model, config) {
        var sessions = ko.observableArray();
        var activate = function () {
            // try local 1st, then try remote
            return datacontext.getSessionPartials(sessions);
        };
        var deactivate = function () {
            // Clear the observableArray in case someone deletes a session.
            // Useful when cacheViews: true.
            sessions([]);
        };
        var refresh = function () {
            datacontext.getSessionPartials(sessions, true);
        };
        var gotoDetails = function(selectedSession) {
            if (selectedSession && selectedSession.id()) {
                var url = '#/sessiondetail/' + selectedSession.id();
                router.navigateTo(url);
            }
        };
        var viewAttached = function (view) {
            // Runs when Durandal says the view is ready (DOM).
            bindEventToList(view, '.session-brief', gotoDetails);
        };
        var bindEventToList = function (rootSelector, selector, callback, eventName) {
            var eName = eventName || 'click';
            $(rootSelector).on(eName, selector, function () {
                var session = ko.dataFor(this);
                callback(session);
                return false;
            });
        };

        var vm = {
            activate: activate,
            deactivate: deactivate,
            refresh: refresh,
            sessions: sessions,
            title: 'Sessions',
            viewAttached: viewAttached
        };

        return vm;
    });

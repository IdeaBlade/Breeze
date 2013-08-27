define(['services/datacontext'], function (datacontext) {
    var speakers = ko.observableArray();
    var activate = function () {
        // try local 1st, then try remote
        return datacontext.getSpeakerPartials(speakers);
    };
    var refresh = function () {
        datacontext.getSpeakerPartials(speakers, true);
    };

    var vm = {
        activate: activate,
        refresh: refresh,
        speakers: speakers,
        title: 'Speakers'
    };

    return vm;
});
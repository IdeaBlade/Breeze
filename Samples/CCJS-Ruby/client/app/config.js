define(function () {
    toastr.options.timeOut = 4000;
    toastr.options.positionClass = 'toast-bottom-right';

    var imageSettings = {
        imageBasePath: '../content/images/photos/',
        unknownPersonImageSource: 'unknown_person.jpg'
    };
    
    var remoteServiceName = 'http://localhost:3000/breeze';
    
    var storage = {
        enabled: true, //TODO: toggle this to use Local Storage
        key: 'CCJSHotTowel'
    };
    var routes = [{
        url: 'sessions',
        moduleId: 'viewmodels/sessions',
        name: 'Sessions',
        visible: true,
        caption: '<i class="icon-book"></i> Sessions'
    },{
        url: 'speakers',
        moduleId: 'viewmodels/speakers',
        name: 'Speakers',
        visible: true,
        caption: '<i class="icon-user"></i> Speakers'
    },{
        url: 'sessiondetail/:id',
        moduleId: 'viewmodels/sessiondetail',
        name: 'Edit Session',
        visible: false
    },{
        url: 'sessionadd',
        moduleId: 'viewmodels/sessionadd',
        name: 'Add Session',
        visible: false,
        caption: '<i class="icon-plus"></i> Add Session',
        settings: { admin: true }
    }];
    //{ url: 'sessionadd', moduleId: 'viewmodels/sessionadd', name: 'Add Session', visible: true, caption: '<i class="icon-plus"></i> Add Session' }
    
    var startModule = 'sessions';

    return {
        version: '1.1.0',
        appSubtitle: "[Ruby Jumpstart - Hot Towel]",
        debugEnabled: ko.observable(true),
        imageSettings: imageSettings,
        remoteServiceName: remoteServiceName,
        routes: routes,
        startModule: startModule,
        storage: storage
    };
});

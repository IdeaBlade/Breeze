(function (definition) {

    // CommonJS
    if (typeof exports === "object") {
        module.exports = definition();
        // RequireJS
    } else if (typeof define === "function") {
        define(definition);
        // <script>
    } else {
        zzaTestFns = definition();
    }

})(function()  {
    'use strict';

    extendString();

    var userSessionId = newGuid();
    configureBreeze();

    var zzaServiceName = 'http://localhost:5452/breeze/ZzaEf' ;
    var zzaMetadataStore = new breeze.MetadataStore();

    //TODO: Add server ping test because a common cause of failure is that
    //      I forgot to start the server first.

    var fns = {
        fetchMetadata: fetchMetadata,
        userSessionId: userSessionId,
        serviceName: zzaServiceName,
        metadataStore: zzaMetadataStore,
        newEm: newEm,
        getNextIntId: getNextIntId,
        newGuid:newGuid,
        newGuidComb:newGuid,
        zzaReset: zzaReset
    }

    var _nextIntId = 10000; // seed for getNextIntId()

    return fns;

    /*** ALL FUNCTION DECLARATIONS FROM HERE DOWN; NO MORE REACHABLE CODE ***/
    function fetchMetadata(){
        if (fns.metadataStore.hasMetadataFor(fns.serviceName)) {
            console.log("already has metadata for "+fns.serviceName);
            return Q(true);
        }

        return fns.metadataStore.fetchMetadata(fns.serviceName)
            .then(function(){
                console.log("got metadata for "+fns.serviceName);
                return true;
            }).fail(function(error){
                console.log("failed to get "+fns.serviceName+" metadata: "+error.message) ;
                console.log("*** CONFIRM THAT ZZA SERVER IS RUNNING ON EXPECTED PORT ***");
                throw error;
            });
    }

    /*********************************************************
     * EntityManager factory
     *********************************************************/
    function newEm() {
        return new breeze.EntityManager({
            serviceName: zzaServiceName,
            metadataStore: zzaMetadataStore
        });
    }

    /*********************************************************
     * Generate the next new integer Id
     *********************************************************/
    function getNextIntId() {
        return _nextIntId++;
    }

    /*********************************************************
     * Generate a new Guid Id
     *********************************************************/
    function newGuid() {
        return breeze.core.getUuid();
    }

    /*********************************************************
     * Generate a new GuidCOMB Id (for MS SQL Server byte order)
     * @method newGuidComb {String}
     * @param [n] {Number} Optional integer value for a particular time value
     * if not supplied (and usually isn't), n = new Date.getTime()
     *********************************************************/
    function newGuidComb(n) {
        var timePart = ('00' + (n || (new Date().getTime())).toString(16)).slice(-12);
        return 'xxxxxxxx-xxxx-4xxx-yxxx-'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        }) + timePart;
    }

    /*********************************************************
     * Zza database reset - full by default, optionally just this session
     *********************************************************/
    function zzaReset(fullReset) {
        var fullReset = (fullReset === undefined)||fullReset;
        var options = fullReset ? "/?options=fullreset" : "";
        var deferred = Q.defer();

        $.post(zzaServiceName + '/reset'+options,
            function (data, textStatus, xhr) {
                deferred.resolve(
                    "Reset svc returned '" + xhr.status + "' with message: " + data);
            })
            .error(function(xhr, textStatus, errorThrown) {
                deferred.reject(getjQueryError(xhr, textStatus, errorThrown));
            });

        return deferred.promise;
    }

    /*********************************************************
     * Make a good error message from jQuery Ajax failure
     *********************************************************/
    function getjQueryError(xhr, textStatus, errorThrown) {
        if (!xhr) {
            return errorThrown;
        }
        var message = xhr.status + "-" + xhr.statusText;
        try {
            var reason = JSON.parse(xhr.responseText).Message;
            message += "\n" + reason;
        } catch(ex) {
            message += "\n" + xhr.responseText;
        }
        return message;
    }

    /*********************************************************
     * Configure Breeze
     *********************************************************/
    function configureBreeze() {
        breeze.config.initializeAdapterInstance("modelLibrary", "backingStore", true);
        breeze.NamingConvention.camelCase.setAsDefault();
        initAjaxAdapter();
    }

    function initAjaxAdapter() {
        // get the current default Breeze AJAX adapter
        var ajaxAdapter = breeze.config.getAdapterInstance("ajax");
        ajaxAdapter.defaultSettings = {
            headers: {
                "X-UserSessionId": userSessionId
            }
        };
    }

    /*******************************************************
     * String extensions
     * Monkey punching JavaScript native String class
     * w/ format, startsWith, endsWith
     * go ahead and shoot me but it's convenient
     ********************************************************/
    function extendString() {
        var stringFn = String.prototype;

        // Ex: "{0} returned {1} item(s)".format(queryName, count));
        stringFn.format = stringFn.format || function () {
            var s = this;
            for (var i = 0, len = arguments.length; i < len; i++) {
                var reg = new RegExp("\\{" + i + "\\}", "gm");
                s = s.replace(reg, arguments[i]);
            }

            return s;
        };

        stringFn.endsWith = stringFn.endsWith || function (suffix) {
            return (this.substr(this.length - suffix.length) === suffix);
        };

        stringFn.startsWith = stringFn.startsWith || function (prefix) {
            return (this.substr(0, prefix.length) === prefix);
        };

        stringFn.contains = stringFn.contains || function (value) {
            return (this.indexOf(value) !== -1);
        };
    }

});

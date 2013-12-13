(function (definition) {

    // CommonJS
    if (typeof exports === "object") {
        module.exports = definition();
        // RequireJS
    } else if (typeof define === "function") {
        define(definition);
        // <script>
    } else {
        testFns = definition();
    }

})(function () {
    'use strict';

    extendString();
    var serviceRoot = window.location.protocol + '//' + window.location.host + '/';

    var metadataStore = new breeze.MetadataStore();

    //TODO: Add server ping test because a common cause of failure is that
    //      I forgot to start the server first.

    var fns = {
        newTestManager: newTestManager,
        setManagerToFetchFromCache: setManagerToFetchFromCache,
        addLookupsToManager: addLookupsToManager,
        fetchMetadata: fetchMetadata,
        serviceRoot: serviceRoot,
        serviceName: null,
        devServiceName: 'breeze/dev',
        metadataStore: metadataStore,
        newEm: newEm,
        getNextIntId: getNextIntId,
        newGuid: newGuid,
        newGuidComb: newGuidComb,
        zzaReset: zzaReset,
        FakeLogger: FakeLogger
    };

    var _nextIntId = 10000; // seed for getNextIntId()

    return fns;

    /*** ALL FUNCTION DECLARATIONS FROM HERE DOWN; NO MORE REACHABLE CODE ***/
    function noop() { }

    function getServiceName() {
        if (!fns.serviceName) { throw "Need a serviceName; serviceName = " + fns.serviceName; }
        return fns.serviceRoot + fns.serviceName;
    }
    /*********************************************************
    * new instance of a test EntityManager, synchronously primed with metadata 
    *********************************************************/
    function newTestManager() {
        var em = newEm();
        var store = em.metadataStore;
        if (!store.hasMetadataFor(getServiceName())) {
            // Import metadata that were downloaded as a script file
            store.importMetadata(zza.metadata);
        }
        return em;
    }
    function setManagerToFetchFromCache(manager) {
        manager.setProperties({
            queryOptions: new breeze.QueryOptions({
                // query the cache by default
                fetchStrategy: breeze.FetchStrategy.FromLocalCache
            })
        });
    }
    function addLookupsToManager(manager) {
        manager.importEntities(zza.lookups);
    }
    function fetchMetadata() {
        var serviceName = getServiceName();
        if (fns.metadataStore.hasMetadataFor(serviceName)) {
            console.log("already has metadata for " + serviceName);
            return Q(true);
        }

        return fns.metadataStore.fetchMetadata(serviceName)
            .then(function () {
                console.log("got metadata for " + serviceName);
                return true;
            }).fail(function (error) {
                console.log("failed to get " + serviceName + " metadata: " + error.message);
                console.log("*** CONFIRM THAT ZZA SERVER IS RUNNING ON EXPECTED PORT ***");
                throw error;
            });
    }

    /*********************************************************
     * EntityManager factory
     *********************************************************/
    function newEm() {
        return new breeze.EntityManager({
            serviceName: getServiceName(),
            metadataStore: metadataStore
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
        var devServiceName = fns.serviceRoot + fns.devServiceName;

        fullReset = (fullReset === undefined) || fullReset;
        var options = fullReset ? "/?options=fullreset" : "";
        var deferred = Q.defer();

        $.post(devServiceName + '/reset' + options,
            function (data, textStatus, xhr) {
                deferred.resolve(
                    "Reset svc returned '" + xhr.status + "' with message: " + data);
            })
            .error(function (xhr, textStatus, errorThrown) {
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
        } catch (ex) {
            message += "\n" + xhr.responseText;
        }
        return message;
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
    /*******************************************************
     * Constructor for a null Logger. Matches logger.js API
     ********************************************************/
    function FakeLogger() {
        this.error = noop;
        this.info = noop;
        this.success = noop;
        this.warning = noop;
        this.log = noop;
    }
});

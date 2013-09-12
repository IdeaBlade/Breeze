define([
    'durandal/system',
    'services/model',
    'services/datacontext.storage',
    'config',
    'services/logger',
    'services/breeze.jsonResultsAdapter',
    'services/breeze.ajaxrestinterceptor',
    'services/breeze.ccjsActiveRecordDataServiceAdapter'],
    function (system, model, DataContextStorage, config, logger, jsonResultAdapter) {

        var manager = configureBreezeManager();

        jsonResultAdapter.initialize(manager);

        var ajaxInterceptor = new breeze.AjaxRestInterceptor();
        ajaxInterceptor.enable();

        breeze.config.initializeAdapterInstance("dataService", "ccjs_active_record", true);

        var EntityQuery = breeze.EntityQuery;
        var entityNames = model.entityNames;
        var orderBy = model.orderBy;
        var storage = new DataContextStorage(manager);

        breeze.saveErrorMessageService.getEntityName = function(){}; // don't show entity name in error message

        var getSpeakerPartials = function (speakersObservable, forceRemote) {
            if (!forceRemote) {
                var p = getLocal('Persons', orderBy.speaker);
                if (p.length > 0) {
                    speakersObservable(p);
                    return Q.resolve();
                }
            }

            var query = EntityQuery
                .from('Speakers')
                .select('id, firstName, lastName, imageSource')
                .orderBy(orderBy.speaker)
                .toType('Person');

            return manager.executeQuery(query)
                .then(querySucceeded)
                .fail(queryFailed);

            function querySucceeded(data) {
                var list = data.results;
                if (speakersObservable) {
                    speakersObservable(list);
                }
                storage.save(entityNames.speaker);
                log('Retrieved [Speaker Partials] from remote data source', list, true);
            }
        };

        var getSessionPartials = function (sessionsObservable, forceRemote) {
            if (!forceRemote) {
                var s = getLocal('Sessions', orderBy.session);
                if (s.length > 3) {
                    // Edge case
                    // We need this check because we may have 1 entity already.
                    // If we start on a specific person, this may happen. So we check for > 2, really
                    sessionsObservable(s);
                    return Q.resolve();
                }
            }

            var query = EntityQuery
                .from('Sessions')
                .select('id, title, code, speakerId, trackId, timeSlotId, roomId, level, tags')
                .orderBy(orderBy.session)
                .toType('Session');

            return manager.executeQuery(query)
                .then(querySucceeded)
                .fail(queryFailed);

            function querySucceeded(data) {
                var list = data.results;
                if (sessionsObservable) {
                    sessionsObservable(list);
                }
                storage.save(entityNames.session);
                log('Retrieved [Session Partials] from remote data source', list, true);
            }
        };

        var getSessionById = function (sessionId, sessionObservable) {
            // 1st - fetchEntityByKey will look in local cache 
            // first (because 3rd parm is true) 
            // if not there then it will go remote
            return manager.fetchEntityByKey(entityNames.session, sessionId, true)
                .then(fetchSucceeded).fail(queryFailed);

            // 2nd - Refresh the entity from remote store (if needed)
            function fetchSucceeded(data) {
                var s = data.entity;
                // if the entity we got is partial, we need to go get remote
                if (s.isPartial()) {
                    return refreshSession(s);
                } else {
                    var src = data.fromCache ? ' from cache.' : ' from remote data source.';
                    log('Retrieved [Session] id:' + s.id() + src, s, true);
                    if (!data.fromCache) {
                        storage.save('[Session] id:' + s.id());
                    }
                    return sessionObservable(s);
                }
            }

            function refreshSession(session) {
                return EntityQuery.fromEntities(session)
                    .using(manager).execute()
                    .then(querySucceeded).fail(queryFailed);
            }

            function querySucceeded(data) {
                var s = data.results[0];
                log('Retrieved [Session] id:' + s.id() + ' from remote data source', s, true);
                storage.save('fresh [Session] w/ id:' + s.id());
                return sessionObservable(s);
            }
        };

        var createSession = function () {
            return manager.createEntity(entityNames.session, {isPartial: false});
        };

        var hasChanges = ko.observable(false);

        var cancelChanges = function () {
            manager.rejectChanges();
            log('Canceled changes', null, true);
        };

        var saveChanges = function () {
            return manager.saveChanges()
                .then(saveSucceeded)
                .fail(saveFailed);

            function saveSucceeded(saveResult) {
                log('Saved data successfully', saveResult, true);
                storage.save('saved result');
            }

            function saveFailed(error) {
                var msg = 'Save failed: ' + breeze.saveErrorMessageService.getErrorMessage(error);
                error.message = msg;
                logError(msg, error);
                throw error;
           }
        };

        var primeData = function () {
            // look in local storage, if data is here, 
            // grab it. otherwise get from 'resources'
            var hasData = storage.load(manager);
            var promise = hasData ?
                Q.resolve(log('Validators already applied')) :
                // get lookups and speakers from remote data source, in parallel
                Q.all([getLookups(), getSpeakerPartials(null, true)])
                    .then(applyValidators); // apply validators needs metadata
            // We don't apply validators when we pull from
            // storage because they are already in the metadata

            return promise.then(success);

            function success() {
                datacontext.lookups = { // Export it
                    rooms: getLocal('Rooms', 'name', true),
                    tracks: getLocal('Tracks', 'name', true),
                    timeslots: getLocal('TimeSlots', 'start', true),
                    speakers: getLocal('Persons', orderBy.speaker, true)
                };
                log('Primed data', datacontext.lookups);
            }

            function applyValidators() {
                model.applyValidators(manager.metadataStore);
            }
        };

        manager.hasChangesChanged.subscribe(function (eventArgs) {
            // update the datacontext observable 'hasChanges' 
            // based on the manager's latest 'hasChangesChanged' event state.
            // hasChanges() is the method
            // hasChangesChanged is the event
            hasChanges(eventArgs.hasChanges);
        });

        var datacontext = {
            cancelChanges: cancelChanges,
            clearStorage: storage.clear,
            createSession: createSession,
            getLocal: getLocal,
            getSessionPartials: getSessionPartials,
            getSpeakerPartials: getSpeakerPartials,
            getSessionById: getSessionById,
            hasChanges: hasChanges,
            primeData: primeData,
            saveChanges: saveChanges
        };
        return datacontext;

        //#region Internal methods        
        function queryFailed(error) {
            var msg = 'Error retreiving data. ' + error.message;
            logError(msg, error);
            throw error;
        }

        function getLocal(resource, ordering, includeNullos) {
            var query = EntityQuery
                .from(resource)
                .orderBy(ordering);
            if (!includeNullos) { query = query.where('id', '!=', 0); }
            return manager.executeQueryLocally(query);
        }

        function getErrorMessages(error) {
            var msg = error.message;
            if (msg.match(/validation error/i)) {
                return getValidationMessages(error);
            }
            return msg;
        }

        function getValidationMessages(error) {
            try {
                return error.entitiesWithErrors.map(function (entity) {
                    return entity.entityAspect.getValidationErrors().map(function (valError) {
                        return valError.errorMessage;
                    }).join(', <br/>');
                }).join('; <br/>');
            }
            catch (e) { /* eat it for now */ }
            return 'validation error';
        }

        function getLookups() {
            return EntityQuery.from('Lookups')
                .using(manager)
                .execute()
                .then(processLookups)
                .fail(queryFailed);
        }

        function processLookups(data) {
            model.createNullos(manager);
            storage.save('Lookups: {Rooms, TimeSlots, Tracks}');
            log('Retrieved Lookup Data', data, false);
        }

        function configureBreezeManager() {
            var rubyNamingConvention = new breeze.NamingConvention({
                name: "rubyNamingConvention",
                serverPropertyNameToClient: function (serverPropertyName) {
                    var serverPropertyNameArray = serverPropertyName.split('_')
                    clientPropertyName = serverPropertyNameArray.shift();
                    $.each(serverPropertyNameArray, function(i, v) { clientPropertyName += v.charAt(0).toUpperCase() + v.slice(1) });
                    return clientPropertyName;
                },
                clientPropertyNameToServer: function (clientPropertyName) {
                    var serverPropertyName = clientPropertyName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
                    return serverPropertyName;
                }
            });

            rubyNamingConvention.setAsDefault();

            var mgr = new breeze.EntityManager(config.remoteServiceName);
            model.configureMetadataStore(mgr.metadataStore);
            return mgr;
        }

        function log(msg, data, showToast) {
            logger.log(msg, data, system.getModuleId(datacontext), showToast);
        }

        function logError(msg, error) {
            logger.logError(msg, error, system.getModuleId(datacontext), true);
        }

        //#endregion
    });

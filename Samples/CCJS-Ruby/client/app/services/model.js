define(['durandal/system', 'services/logger', 'config'], function (system, logger, config) {
    var Validator = breeze.Validator,
        referenceCheckValidator,
        nulloDate = new Date(1900, 0, 1);
    
    var imageSettings = config.imageSettings;

    var orderBy = {
        speaker: 'firstName, lastName',
        session: 'timeSlotId, level, speaker.firstName'
    };

    var entityNames = {
        speaker: 'Person',
        session: 'Session',
        room: 'Room',
        track: 'Track',
        timeslot: 'TimeSlot'
    };

    var model = {
        applyValidators: applyValidators,
        configureMetadataStore: configureMetadataStore,
        createNullos: createNullos,
        entityNames: entityNames,
        orderBy: orderBy
    };

    return model;

    //#region internal methods
    function configureMetadataStore(metadataStore) {
        // Pass the Type, Ctor (breeze tracks properties created here), and initializer 
        // Assume a Session or Person is partial by default
        metadataStore.registerEntityTypeCtor(
            'Session', function () { this.isPartial = true; }, sessionInitializer);
        metadataStore.registerEntityTypeCtor(
            'Person', function () { this.isPartial = true; }, personInitializer);
        metadataStore.registerEntityTypeCtor(
            'TimeSlot', null, timeSlotInitializer);

        referenceCheckValidator = createReferenceCheckValidator();
        Validator.register(referenceCheckValidator);
        log('Validators registered');
    }

    function createNullos(manager) {
        var unchanged = breeze.EntityState.Unchanged;
        
        createNullo(entityNames.timeslot, { start: nulloDate, isSessionSlot: true });
        createNullo(entityNames.room);
        createNullo(entityNames.speaker, { firstName: '[Select a person]' });
        createNullo(entityNames.track);

        function createNullo(entityName, values) {
            var initialValues = values || { name: ' [Select a ' + entityName.toLowerCase() + ']' };
            return manager.createEntity(entityName, initialValues, unchanged);
        }
    }

    function createReferenceCheckValidator() {
        var name = 'realReferenceObject';
        var ctx = { messageTemplate: 'Missing %displayName%' };
        var val = new Validator(name, valFunction, ctx);
        log('Validators created', val);
        return val;

        function valFunction(value, context) {
            return value ? value.id() !== 0 : true;
        }
    }

    function applyValidators(metadataStore) {
        var types = ['room', 'track', 'timeSlot', 'speaker'];
        types.forEach(addValidator);
        log('Validators applied', types, types);

        function addValidator(propertyName) {
            var sessionType = metadataStore.getEntityType('Session');
            sessionType.getProperty(propertyName).validators.push(referenceCheckValidator);
        }
    }

    function sessionInitializer(session) {
        if (session.id() === 0) {
            session.isPartial(false); // created sessions are never partial
        }
        session.tagsFormatted = ko.computed({
            read: function () {
                var text = session.tags();
                return text ? text.replace(/\|/g, ', ') : text;
            },
            write: function (value) {
                session.tags(value.replace(/\, /g, '|'));
            }
        });
    }

    function personInitializer(person) {
        if (person.id() === 0) {
            person.isPartial(false); // created persons are never partial
        }
        person.fullName = ko.computed(function () {
            var fn = person.firstName();
            var ln = person.lastName();
            return ln ? fn + ' ' + ln : fn;
        });
        person.imageName = ko.computed(function () {
            return makeImageName(person.imageSource());
        });
    };

    function timeSlotInitializer(timeSlot) {
        timeSlot.name = ko.computed(function () {
            var start = timeSlot.start();
            var value = ((start - nulloDate) === 0) ?
                '[Select a timeslot]' :
                (start && moment.utc(start).isValid()) ?
                    moment.utc(start).format('ddd hh:mm a') : '[Unknown]';
            return value;
        });
    }

    function makeImageName (source) {
        return imageSettings.imageBasePath +
            (source || imageSettings.unknownPersonImageSource);
    }

    function log(msg, data, showToast) {
        logger.log(msg, data, system.getModuleId(model), showToast);
    }
    //#endregion
});
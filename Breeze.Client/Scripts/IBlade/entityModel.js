define(["core", "entityAspect", "entityMetadata", "entityManager", "entityQuery", "validate", "keyGenerator",
        "ajax_jQuery",
        "remoteAccess_webApi", "remoteAccess_odata",
        "entityTracking_backingStore", "entityTracking_ko", "entityTracking_backbone"],
function (core, m_entityAspect, m_entityMetadata, m_entityManager, m_entityQuery, m_validate, KeyGenerator,
          m_ajax_jQuery,
          m_remoteAccess_webApi, m_remoteAccess_odata,
          m_entityTracking_backingStore, m_entityTracking_ko, m_entityTracking_backbone) {
    "use strict";
    

    var entityModel = { };

    core.extend(entityModel, m_entityAspect);
    core.extend(entityModel, m_entityMetadata);
    core.extend(entityModel, m_entityManager);
    core.extend(entityModel, m_entityQuery);
    core.extend(entityModel, m_validate);

    entityModel.KeyGenerator = KeyGenerator;

    entityModel.ajax_jQuery = m_ajax_jQuery;
    core.config.setProperties({ ajaxImplementation: m_ajax_jQuery });

    entityModel.entityTracking_backingStore = m_entityTracking_backingStore;
    entityModel.entityTracking_ko = m_entityTracking_ko;
    entityModel.entityTracking_backbone = m_entityTracking_backbone;

    entityModel.remoteAccess_odata = m_remoteAccess_odata;
    entityModel.remoteAccess_webApi = m_remoteAccess_webApi;
    
    /**
    The entityModel namespace.
    @module entityModel
    @main entityModel
    **/
    

    // set defaults
    core.config.setProperties({
        trackingImplementation: entityModel.entityTracking_backingStore,
        remoteAccessImplementation: entityModel.remoteAccess_webApi
    });

    return entityModel;

})

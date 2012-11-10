define(["core", "entityAspect", "entityMetadata", "entityManager", "entityQuery", "validate", "relationArray", "keyGenerator"],
function (core, m_entityAspect, m_entityMetadata, m_entityManager, m_entityQuery, m_validate, makeRelationArray, KeyGenerator) {
          
    "use strict";

    var entityModel = { };

    core.extend(entityModel, m_entityAspect);
    core.extend(entityModel, m_entityMetadata);
    core.extend(entityModel, m_entityManager);
    core.extend(entityModel, m_entityQuery);
    core.extend(entityModel, m_validate);

    entityModel.makeRelationArray = makeRelationArray;
    entityModel.KeyGenerator = KeyGenerator;

    // legacy properties - will not be supported after 3/1/2013
    entityModel.entityTracking_backingStore = "backingStore";
    entityModel.entityTracking_ko = "ko";
    entityModel.entityTracking_backbone = "backbone";
    entityModel.remoteAccess_odata = "odata";
    entityModel.remoteAccess_webApi = "webApi";
    
    /**
    The entityModel namespace.
    @module entityModel
    @main entityModel
    **/

    return entityModel;

})

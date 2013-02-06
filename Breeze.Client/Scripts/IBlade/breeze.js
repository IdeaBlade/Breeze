"use strict";

define(["core", "config", "entityAspect", "entityMetadata", "entityManager", "entityQuery", "validate", "relationArray", "keyGenerator"],
function (core, a_config, m_entityAspect, m_entityMetadata, m_entityManager, m_entityQuery, m_validate, makeRelationArray, KeyGenerator) {
          
    var breeze = {
        version: "1.1.0",
        core: core,
        config: a_config
    };
    core.parent = breeze;

    core.extend(breeze, m_entityAspect);
    core.extend(breeze, m_entityMetadata);
    core.extend(breeze, m_entityManager);
    core.extend(breeze, m_entityQuery);
    core.extend(breeze, m_validate);

    breeze.makeRelationArray = makeRelationArray;
    breeze.KeyGenerator = KeyGenerator;

    // legacy properties 
    core.config = a_config;
    breeze.entityModel = breeze;
    // legacy properties - will not be supported after 3/1/2013
    breeze.entityTracking_backingStore = "backingStore";
    breeze.entityTracking_ko = "ko";
    breeze.entityTracking_backbone = "backbone";
    breeze.remoteAccess_odata = "odata";
    breeze.remoteAccess_webApi = "webApi";
    
    return breeze;
});

define(['durandal/system', 'config', 'services/logger'],
    function (system, config, logger) {
        var storeVersion = breeze.version + '|' + config.version;
        
        var DataContextStorage = function(mgr) {
            this.key = config.storage.key;
            this.enabled = config.storage.enabled;
            this.manager = mgr;
        };

        DataContextStorage.prototype.clear = function() {
            window.localStorage.clear();
            var msg = 'Cleared local storage';
            log(msg);
        };

        DataContextStorage.prototype.save = function (msg) {
            if (this.enabled) {
                var exportData = this.manager.exportEntities();
                // add Breeze version to the saved data
                // hack until metadatastore is versioned by Breeze
                window.localStorage.setItem(this.key, storeVersion + exportData);
                log('Stored ' + msg, JSON.parse(exportData));
            }

            // Notes to self
            //var myEntities = manager.getEntities(['Session', 'Speaker']);
            //var rawdata = manager.exportEntities(myEntities);
        };

        DataContextStorage.prototype.load = function () {
            if (this.enabled) {
                var importData = window.localStorage.getItem(this.key);
                importData = checkStoreImportVersion(importData);
                var hasData = !!importData;
                if (hasData) {
                    this.manager.importEntities(importData);
                    log('Loaded from storage', JSON.parse(importData));
                }
                return hasData;
            }
            return false;
        };
        function checkStoreImportVersion(importData) {
            // using CCJS version hack until Breeze puts version in MetadataStore
            if (!importData) {
                return importData;
            }
            var oldVerLen = importData.indexOf("{");
            if (oldVerLen === storeVersion.length) {
                var storeVer = importData.substr(0, oldVerLen);
                if (storeVer !== storeVersion) {
                    log("Did not load from storage because mismatched versions, " +
                        "stored: '" + storeVer + "' vs. current: '" + storeVersion + "'.");
                    return null;
                }
            }
            return importData.substr(oldVerLen);
        }

        function log(msg, data, showToast) {
            logger.log(msg, data, 'services/datacontext.storage', showToast);
        }

        return DataContextStorage;
    });
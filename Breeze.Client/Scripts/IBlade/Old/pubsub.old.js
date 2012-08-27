
define(["core"], function (core) {
    var PubSub = function () {
        // key is topic, value is { unsubKey, callback }
        // unsubKey = { topic, token }
        this._topicMap = {};  
        this.__nextToken = 1;
    };

    function handleExceptionDefault(e) {
        // TODO: maybe log this 
        // for now do nothing;
    }

    PubSub.prototype.defaultExceptionHandler = handleExceptionDefault;

    PubSub.prototype.publish = function (topic, data, publishAsync, handleException) {

        function publishCore() {
            subscribers.forEach(function (s) {
                try {
                    s.callback(data);
                } catch (e) {
                    e.context = "unable to publish on topic: " + topic;
                    if (handleException) {
                        handleException(e);
                    } else if (this.defaultExceptionHandler) {
                        defaultExceptionHandler(e);
                    } else {
                        handleExceptionDefault(e);
                    }
                }
            });
        }

        var subscribers = this._topicMap[topic];
        if (!subscribers) return false;

        if (publishAsync === true) {
            setTimeout(publishCore, 0);
        } else {
            publishCore();
        }
        return true;
    };

    PubSub.prototype.subscribe = function (topic, callback) {
        var subscribers = this._topicMap[topic];
        if (!subscribers) {
            subscribers = [];
            this._topicMap[topic] = subscribers;
        }

        var unsubKey = { topic: topic, token: this._nextToken };
        subscribers.push({ unsubKey: unsubKey, callback: callback });
        ++this._nextToken;
        return unsubKey;
    };


    PubSub.prototype.unsubscribe = function (unsubKey) {
        var subscribers = this._topicMap[unsubKey.topic];
        if (!subscribers) return false;
        var ix = core.arrayIndexOf(subscribers, function (s) {
            return s.token === unsubKey.token;
        });
        if (ix !== -1) {
            subscribers.splice(ix, 1);
            if (subscribers.length === 0) {
                delete this._topicMap[unsubKey.topic];
            }
            return true;
        } else {
            return false;
        }

    };

    return PubSub;
});

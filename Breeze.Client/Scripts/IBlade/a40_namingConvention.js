/**
@module breeze
**/
    
var NamingConvention = (function () {
    /**
    A NamingConvention instance is used to specify the naming conventions under which a MetadataStore 
    will translate property names between the server and the javascript client. 
    
    The default NamingConvention does not perform any translation, it simply passes property names thru unchanged.
    
    @class NamingConvention
    **/
        
    /**
    NamingConvention constructor

    @example
        // A naming convention that converts the first character of every property name to uppercase on the server
        // and lowercase on the client.
        var namingConv = new NamingConvention({
            serverPropertyNameToClient: function(serverPropertyName) {
                return serverPropertyName.substr(0, 1).toLowerCase() + serverPropertyName.substr(1);
            },
            clientPropertyNameToServer: function(clientPropertyName) {
                return clientPropertyName.substr(0, 1).toUpperCase() + clientPropertyName.substr(1);
            }            
        });
    var ms = new MetadataStore({ namingConvention: namingConv });
    var em = new EntityManager( { metadataStore: ms });
    @method <ctor> NamingConvention
    @param config {Object}
    @param config.serverPropertyNameToClient {Function} Function that takes a server property name add converts it into a client side property name.  
    @param config.clientPropertyNameToServer {Function} Function that takes a client property name add converts it into a server side property name.  
    **/
    var ctor = function(config) {
        assertConfig(config || {})
            .whereParam("name").isOptional().isString()
            .whereParam("serverPropertyNameToClient").isFunction()
            .whereParam("clientPropertyNameToServer").isFunction()
            .applyAll(this);
        if (!this.name) {
            this.name = __getUuid();
        }
        __config._storeObject(this, proto._$typeName, this.name);
    };
    var proto = ctor.prototype;
    proto._$typeName = "NamingConvention";
        
    /**
    The function used to convert server side property names to client side property names.

    @method serverPropertyNameToClient
    @param serverPropertyName {String}
    @param [property] {DataProperty|NavigationProperty} The actual DataProperty or NavigationProperty corresponding to the property name.
    @return {String} The client side property name.
    **/

    /**
    The function used to convert client side property names to server side property names.

    @method clientPropertyNameToServer
    @param clientPropertyName {String}
    @param [property] {DataProperty|NavigationProperty} The actual DataProperty or NavigationProperty corresponding to the property name.
    @return {String} The server side property name.
    **/
        
    /**
    A noop naming convention - This is the default unless another is specified.
    @property none {NamingConvention}
    @static
    **/
    ctor.none = new ctor({
        name: "noChange",
        serverPropertyNameToClient: function(serverPropertyName) {
            return serverPropertyName;
        },
        clientPropertyNameToServer: function(clientPropertyName) {
            return clientPropertyName;
        }
    });
        
    /**
    The "camelCase" naming convention - This implementation only lowercases the first character of the server property name
    but leaves the rest of the property name intact.  If a more complicated version is needed then one should be created via the ctor.
    @property camelCase {NamingConvention}
    @static
    **/
    ctor.camelCase = new ctor({
        name: "camelCase",
        serverPropertyNameToClient: function (serverPropertyName) {
            return serverPropertyName.substr(0, 1).toLowerCase() + serverPropertyName.substr(1);
        },
        clientPropertyNameToServer: function (clientPropertyName) {
            return clientPropertyName.substr(0, 1).toUpperCase() + clientPropertyName.substr(1);
        }
    });
        
    /**
    The default value whenever NamingConventions are not specified.
    @property defaultInstance {NamingConvention}
    @static
    **/
    ctor.defaultInstance = new ctor(ctor.none);
        
    /**
    Sets the 'defaultInstance' by creating a copy of the current 'defaultInstance' and then applying all of the properties of the current instance. 
    The current instance is returned unchanged.
    @method setAsDefault
    @example
        var namingConv = new NamingConvention({
            serverPropertyNameToClient: function(serverPropertyName) {
                return serverPropertyName.substr(0, 1).toLowerCase() + serverPropertyName.substr(1);
            },
            clientPropertyNameToServer: function(clientPropertyName) {
                return clientPropertyName.substr(0, 1).toUpperCase() + clientPropertyName.substr(1);
            }            
        });
        namingConv.setAsDefault();
    @chainable
    **/
    proto.setAsDefault = function () {
        return __setAsDefault(this, ctor);
    };
        
    return ctor;
})();
    
breeze.NamingConvention = NamingConvention;



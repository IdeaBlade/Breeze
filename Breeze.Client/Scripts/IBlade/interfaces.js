/**
@module entityModel
**/

/**
This is an interface description. Any class that implements the methods and properties defined here is considered a valid
implementation of this interface.

Each EntityManager can have a single KeyGenerator implementation that it will use to manage the generation of all 'temporary' keys.

A KeyGenerator implementation is assigned to an EntityManager via the {{#crossLink "EntityManager/setProperties"}}{{/crossLink}} 
method with a config parameter of 'keyGeneratorCtor'. 

    MyKeyGenerator = function() { 
        // your code here
    }
    MyKeyGenerator.prototype.generateTempKeyValue = function(entityType) {
        // your implementation here.
    }
    em.setProperties( {keyGeneratorCtor: MyKeyGenerator });
The assigned KeyGenerator is then called whenever the 
EntityManager.generateTempKeyValue method is called.  The EntityManager internally keeps track of all of the generated keys
and handles all of the mapping of these temporary keys to real keys after any save.  

The KeyGenerator implementation only needs to do one thing.  Return a unique key value of the correct datatype for each 
call to the generateTempKeyValue method.  Note, that KeyGeneration is NOT supported for multipart keys.  

If no KeyGenerator is supplied, a default KeyGenerator will be automatically provided.
@class ~KeyGenerator
**/

/**
Returns a unique 'temporary' key for the specified {{#crossLink "EntityType"}}{{/crossLink}}. 
Uniqueness is defined for this purpose as being unique within this KeyGenerator. This is sufficient 
because each EntityManager will have its own instance of a KeyGenerator and any entities imported into
the EntityManager with temporary keys will have them regenerated and remapped on import.

@method generateTempKeyValue
@param entityType {EntityType}
**/

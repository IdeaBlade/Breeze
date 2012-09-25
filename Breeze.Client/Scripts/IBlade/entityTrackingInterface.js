/**
@module entityModel
**/

/**
This is an interface description. Any class that implements the methods and properties defined here is considered a valid
implementation of this interface.

An implementation of this interface is need to support the "observability" of Entities.  Every entity
that is created, imported or queried goes thru this interface to insure its observability.

@class ~entityTracking-interface
**/

/**
Name of this implementation
@property name
**/

/**
Method that is called once when the implementation is first used.  This method is called before any other method.
@method initialize
**/

/**
Provides access to initialize the prototype before any instances of this type are created.
@method initializeEntityPrototype
@param proto {Object} A prototype
**/

/**
Called after and object has been created, queried or imported so that it can be tracked. 
@method startTracking
@param entity {Entity} The entity to start tracking.
@param proto {Object} A prototype
**/
    
/**
Returns whether the specified property is 'trackable'.
@method isTrackableProperty
@param entity {Entity} The entity to start tracking.
@param propertyName {String} A property name
**/

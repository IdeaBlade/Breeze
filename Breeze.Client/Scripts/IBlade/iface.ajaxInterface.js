/**
@module breeze
**/

/**
This is an interface description. Any class that implements the methods and properties defined here is considered a valid
implementation of this interface.

@class ↈ_ajax_interface
**/

/**
Performs an ajax request. This method takes a single argument — a configuration object — that is used to generate an HTTP request. The config object has two callback methods:  
'success' and 'error' in addition to a number of properties that may be used to configure the request itself. Higher level Breeze constructs will wrap calls to the ajax adapter 
into Promises. Individual adapters may add additional properties to the basic config object described below.  

@method ajax
@param config {Object}
@param config.url {String} Absolute or relative URL of the resource that is being requested.
@param config.type {String} HTTP method (e.g. 'GET', 'POST', etc)
@param [config.data] {Object|String} Data to be sent as the request message data
@param [config.params]  Map of strings or objects which will be sent to the server in the query string in a form encoded format - url?key1=value1&key2=value2 
@param [config.crossDomain=false]
@param config.success {Function} Function called on success.
        successFunction(httpResponse)
@param config.error {Function} Function called on failure.
        errorFunction(httpResponse)
**/

/**
A generic wrapper for any Http response returned by a server. 

@class HttpResponse
**/

/**
The response body.
@property data {Object} 
**/

/**
HTTP status code of the response.   		
@property status {Number} 
**/

/**
The configuration object that was used to generate the request.
@property config {Object} 
**/

/**
A function to retrieve headers - a null headerName will return all headers. 
@method getHeader 
@param [headerName] {String}
**/

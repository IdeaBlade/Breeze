define(
    function () {
        var adapters = {
            initialize: initialize
        };
        return adapters;
        
        function initialize(manager) {
            // Extend the manager's DataService with a custom JsonResultsAdapter 
            // based on the default JsonResultsAdapter
            var defaultAdapter = breeze.config.getAdapterInstance('dataService').jsonResultsAdapter;            
            var customAdapter = createCustomAdapter(defaultAdapter);         
            manager.dataService = manager.dataService.using({ 'jsonResultsAdapter': customAdapter });
        }
      
        // Extend the visitNode method of a source JsonResultsAdapter
        // to set Session.isPartial and Person.isPartial to true
        // when a query returns partial entity data.
        function createCustomAdapter(sourceAdapter) {

            var baseVisitNode = sourceAdapter.visitNode;

            var visitNode = function (node, mappingContext, nodeContext) {
                // With .NET server the  projected typename is unpronouncable
                // In Rails version where we control the projected type name.
                // if type name contains 'partial' .. , it's a partial entity
                node.isPartial =  /partial/i.test(node.$type) 
                return baseVisitNode(node, mappingContext, nodeContext);
            };
            
            return new breeze.JsonResultsAdapter({
                name: 'ccjs',
                visitNode: visitNode              
            });         
        }
    });

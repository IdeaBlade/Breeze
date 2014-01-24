///////// Start AJAX POST implementation //////////////////////////
/* Functions for allowing Breeze to use POST for queries when
   special parameters are passed using the .withParameters function.
Special parameters:
•	$method: ‘POST’ or ‘GET’ (the default)
•	$encoding: ‘JSON’ or x-www-form-urlencoded (the default)
•	$data: contains the data to be sent to the server

Example:
   var query = breeze.EntityQuery.from('SimilarCustomersPOST')
            .withParameters({ 
                $method: 'POST',
                $encoding: 'JSON',
                $data: { CompanyName: 'Hilo Hattie', ContactName: 'Donald', City: 'Duck', Country: 'USA', Phone: '808-234-5678' } 
            });


*/
breeze.ajaxpost = (function (ajaxAdapter) {

    divertAjaxImpl(ajaxAdapter);

    return {
        configAjaxAdapter: divertAjaxImpl
    };

    // Add processSettings to ajaxAdapter
    function divertAjaxImpl(ajaxAdapter) {
        if (!ajaxAdapter) {
            ajaxAdapter = breeze.config.getAdapterInstance("ajax");
        }

        var ajaxFunction = ajaxAdapter.ajax;
        if (ajaxFunction) {
            ajaxAdapter.ajax = function (settings) {
                processSettings(settings);
                return ajaxFunction(settings);
            };
        }
    }

    // Handle the POST-specific properties in the settings - $method, $data, $encoding
    function processSettings(settings) {
        if (settings) {
            var parameters = settings.params;
            if (parameters) {
                // wrapped data; handle the special properties
                settings.type = parameters.$method || settings.type; // GET is default method

                var data = parameters.$data;
                if (data) {
                    if (parameters.$encoding === 'JSON') {
                        // JSON encoding 
                        settings.processData = false; // don't let JQuery form-encode it 
                        settings.contentType = "application/json; charset=UTF-8";

                        if (typeof (data) === 'object') {
                            settings.data = JSON.stringify(data); // encode parameters as JSON
                        } else {
                            settings.data = data;
                        }
                    } else {
                        settings.data = data;
                    }
                    settings.params = null;
                }
                settings.url = removeParametersFromQueryString(settings.url, ['$method', '$data', '$encoding']);
            }
        }

        return settings;

        // Remofe the given parameters so they won't be sent to the server
        function removeParametersFromQueryString(queryString, paramsToRemove) {

            if (typeof paramsToRemove === 'string') {
                paramsToRemove = new Array(paramsToRemove);
            }
            var urlAndQuery = queryString.split('?');
            if (!urlAndQuery || urlAndQuery.length != 2)
                return queryString;
            var queryParams = urlAndQuery[1].split('&');
            if (paramsToRemove.indexOf) {
                for (var i = queryParams.length - 1; i >= 0; i--) {
                    var paramName = queryParams[i].split('=')[0];
                    if (paramsToRemove.indexOf(paramName) != -1) {
                        queryParams.splice(i, 1);
                    }
                }
            }
            if (queryParams.length == 0) {
                return urlAndQuery[0];
            }
            else {
                urlAndQuery[1] = queryParams.join('&');
                return urlAndQuery.join('?');
            }
        }
    }

})();

///////// End AJAX POST implementation //////////////////////////


fiddleHelpers = (function() {
    return {
		isCorsCapable: isCorsCapable
	};
	
	function isCorsCapable(viewName) {
		if (XMLHttpRequest) {
			var request = new XMLHttpRequest();
			if (request.withCredentials !== undefined) { return; } // is CORS capable
		}
		// can't make cross-site requests with CORS
		viewName = viewName || 'view';
		var msgHtml = "<p style='border: solid red; padding: 8px; '>Sorry! Older IE browsers (<10) cannot communicate with the server.<br/><br/>Please try IE10, Chrome, Firefox or a <a href='http://en.wikipedia.org/wiki/Cross-origin_resource_sharing#Browser_support' target='_blank'>CORS-ready</a> browser to see jsFiddle results.</p>";

	var view = document.getElementById(viewName);
		if (view) {
			view.insertAdjacentHTML('afterbegin', msgHtml);
		} else { alert("no view named '"+viewName+"'?"); }
	}
})();


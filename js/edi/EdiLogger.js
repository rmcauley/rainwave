/* For log codes, see the default en_CA language file.

 Do NOT use "all" for a facility!  That is a reserved word for the "all" callback.
*/
	
function EdiLogger() {
	var that = {};
	that.content = new Array();
	that.callbacks = new Array();
	that.multicall = new Array();
	that.codes = new Array();
	
	that.callbacks['newfacility'] = new Array();

	that.log = function(facility, code, message, flush) {
		message = message.replace(/\&/g, "&amp;");
		that.log2("All", facility, code, message, flush);
		that.log2(facility, facility, code, message, flush);
	};
	
	that.log2 = function(facility, originalfacility, code, message, flush) {
		// Starting a new facility
		if (typeof(that.content[facility]) == "undefined") that.newFacility(facility);

		// Detecting that we have to flush before proceeding with a new line
		if ((typeof(flush) == "undefined") && (that.multicall[facility] == true)) {
			that.flush(facility);
		}

		// If it's a normal one-call log
		if (typeof(flush) == "undefined") {
			that.codes[facility].push(code);
			that.content[facility].push(message);

			that.trim(facility);
			that.callback(facility, originalfacility, code, message);
		}
		// If we're starting a new multicall
		else if (that.multicall[facility] == false) {
			that.content[facility].push(message);
			that.codes[facility].push(code);
			that.multicall[facility] = true;
		}
		// Continuing a multi-call
		else {
			that.content[facility][that.content[facility].length - 1] += message;
		}
	};
	
	that.newFacility = function(facility) {
		that.codes[facility] = new Array();
		that.content[facility] = new Array();
		that.multicall[facility] = false;
		that.callbacks[facility] = new Array();
		for (var i = 0; i < that.callbacks["newfacility"].length; i++) {
			that.callbacks["newfacility"][i].func.call(that.callbacks["newfacility"][i].object, facility);
		}
	};
	
	that.trim = function(facility) {
		while (that.content[facility].length > 100) that.content[facility].shift();
	};
	
	that.callback = function(facility, originalfacility, code, message) {
		for (var i = 0; i < that.callbacks[facility].length; i++) {
			that.callbacks[facility][i].func.call(that.callbacks[facility][i].object, facility, originalfacility, code, message);
		}
	};
	
	// pass a function that takes (facility, code, message) as arguments.
	that.addCallback = function(obj, method, facility) {
		if (typeof(that.content[facility]) == "undefined") that.newFacility(facility);
		that.callbacks[facility].push({ func: method, object: obj });
	};
	
	that.flush = function(facility) {
		if (typeof(facility) == "undefined") {
			that.flushAll();
		}
		else {
			if (that.multicall[facility] == true) {
				that.trim(facility);
				that.callback(facility, that.codes[facility][that.codes[facility].length - 1], that.content[facility][that.content[facility].length - 1]);
			}
			that.multicall[facility] = false;
		}
	};
	
	that.flushAll = function() {
		//for (var i in multicall) multicall[i] = false;
		for (var i in that.multicall) that.flush(i);
	};
	
	return that;
}
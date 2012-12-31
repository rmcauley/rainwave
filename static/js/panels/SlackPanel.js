// Making Panels 101: Define a unique panel name for the panels object.
panels.SlackPanel = {
	// The (y|x)type variables define how the panel is fitted into the Edi grid.  Here they are listed in priority:
	//   fixed - the panel cannot be shrunken or expanded on the row/column
	//	 max   - take up the maximum amount of space
	//	 fit   - the panel will be fitted to its appropriate size
	//	 slack - the panel will use whatever space is leftover on the row/column
	// e.g. if there are 3 panels in a row and their ytypes are slack, fixed, and max, the row is maxed.
	//      if the types are slack, max, fit, the row is maxed.
	//      if the types are slack, fit, slack, the row is fit.
	// Slack space is divided evenly amongst all slack panels if there is any.
	// If all panels are at their minimum size, all panels will be shrunk equally to fit on the screen
	ytype: "slack",
	// Desired height of the panel.  This is ignored for "slack" type panels.
	height: 100,
	// Minimum height the panel requires
	minheight: 50,
	xtype: "slack",
	width: 100,
	minwidth: 50,
	// What the name of the panel appears in the URL bar if the panel is deep-linked
	cname: "slack",
	
	// Since you're not likely to have translation strings available to you, best put the title here.
	title: "Slack",
	
	// This is the constructor function that will be called when Edi wants a new instance of the panel.
	// Container is the HTML <td> that Edi passes to you to work with.
	constructor: function(container) {
	
		var that = {};
	
		/* Some functional programming tips: Edi/R3 requires no Javascript framework and completely lacks
		any usage of bind() or other such drudgery.  They are not required to write proper Javascript.
		I'd argue they are the antithesis to proper Javascript.
		
		If you wish to use properties of an object or other functions, define them here.  To make it simple,
		any "var variable = 0;" defined here will, in effect, be the equivalent of a private variable.  You may
		also define "private" functions by declaring "var newfunc = function() { };".  Inside functions, as seen
		in the init() function provided here, you DO. NOT. EVER. use the "this" keyword.  For ANYTHING.
		
		It's possible to extend objects by simply doing instance.newfunc2 = function();  However you can run into
		some problems this way, and since I do not use a prototype but instead instance a brand new object each time
		constructor is called, it's very likely you will run into problems if you try to do that.
		
		For this reason, I advise you declare any variables you wish to use across your object in all functions in the
		constructor.  Look at some other R3 panels as examples.
		*/
		
		// It's almost a certainty that the Theme object will need access to the container, so it's a wise idea to make it public.
		that.container = container;
		
		// Edi will call the init() method after construction is complete.  Other panels may not be rendered at this time. 
		// Your panel is expected to function on its own.
		that.init = function() {
			// do your stuff here!
		};
		
		return that;
	}
};
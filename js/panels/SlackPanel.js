// Making Panels 101: Define a unique object name.
panels.SlackPanel = {
	// The (y|x)type variables define how the panel is fitted into the Edi grid.  Here they are listed in priority:
	// 	fixed - the panel cannot be shrunken or expanded on the row/column
	//	max   - the panel will expand to consume as much space as possible on the row/column
	//	fit   - the panel will be fitted to its appropriate size
	//	slack - the panel will use whatever space is leftover on the row/column (while obeying its minimum size)
	// Slack space is divided evenly amongst all slack panels if there is any.
	// Be careful that if you put a slack and max panel type on the same column/row, the slack column will be at its minimum size.
	// When there is no max or slack panel on a row, all panels get the extra space evenly
	// If all panels are at their minimum size, all panels will be shrunk equally to fit on the screen
	// Only max type columns will do *row* spanning.  slack and fit panels will not span rows.
	ytype: "slack",
	// Desired minimum height of the panel.  This is ignored for "slack" type panels.
	height: 100,
	// Minimum height the panel requires
	minheight: 50,
	xtype: "slack",
	width: 100,
	minwidth: 50,
	// Title to report to Edi for tab names and layout editor.
	title: "Slack Space",
	intitle: "SlackPanel",
	
	// This is the constructor function that will be called when Edi wants a new instance.
	// edi is the Edi instance that spawned the panel, and container is the containing <div>
	// that edi has constructed for the panel.
	constructor: function(edi, container) {
	
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
		
		// This variable will be given the "owning" Edi panel
		that.edi = edi;
		// And this is the containing div you'll want to keep on hand.
		that.container = container;
		
		// Edi will call the init() object after populating the container and the edi object.
		that.init = function() {
			//container.style.background = "#000000";
		};
		
		return that;
	}
};
panels.COGBanner = {
	ytype: "fit",
	height: 100,
	minheight: 100,
	xtype: "fixed",
	width: 20,
	minwidth: 20,
	title: "COG",
	intitle: "COGBanner",
	
	constructor: function(edi, container) {
		var width;
		var fxSlide;
		
		var that = {};
		
		that.init = function() {
			width = 40 + (svg.em * 10);
			
			var el = document.createElement("table");
			el.setAttribute("class", "COG_table");
			el.setAttribute("cellspacing", "0");
			el.setAttribute("cellpadding", "0");
			el.style.height =  container.offsetHeight + "px";
			el.style.width = width + "px";
			el.addEventListener('mouseover', that.moveOut, false);
			el.addEventListener('mouseout', that.moveIn, false);
			
			fxSlide = fx.make(fx.CSSNumeric, [ el, 300, "left", "px" ]);
			fxSlide.set(0);
			
			var tr = document.createElement("tr");
			
			var bannertd = document.createElement("td");
			var cogbanner = document.createElement("img");
			cogbanner.setAttribute("src", "images/cog_network.png");
			bannertd.appendChild(cogbanner);
			tr.appendChild(bannertd);
			
			el.appendChild(tr);
			
			container.appendChild(el);
		};
		
		that.moveOut = function() {
			fxSlide.start(-width + container.offsetWidth);
		};
		
		that.moveIn = function() {
			fxSlide.start(0);
		};
		
		return that;
	}
};
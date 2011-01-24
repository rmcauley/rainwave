panels.LogPanel = {
	ytype: "fit",
	height: svg.em * 32,
	minheight: svg.em * 16,
	xtype: "fit",
	width: svg.em * 32,
	minwidth: svg.em * 16,
	title: "Log",
	intitle: "LogPanel",
	
	constructor: function(edi, container) {
		var el;
		var listtd;
		var list;
		var contenttd;
		var fs;
		var fslength;
		var listel;
		var currentfacility;
		var that = {};
		that.container = container;
		
		//theme.Extend.LogPanel(that);
	
		that.init = function() {
			el = document.createElement("table");
			el.setAttribute("id", "LogPanel_bodytable");
			container.appendChild(el);
			el.setAttribute("height", "100%");
			el.setAttribute("border", 0);
			el.setAttribute("cellpadding", 0);
			el.setAttribute("cellspacing", 0);
			
			var tr = document.createElement("tr");
			el.appendChild(tr);
			
			listtd = document.createElement("td");
			listtd.setAttribute("id", "LogPanel_facilitylisttd");
			tr.appendChild(listtd);
			
			list = document.createElement("ul");
			listtd.appendChild(list);
			listel = new Array();
			
			contenttd = document.createElement("td");
			contenttd.setAttribute("id", "LogPanel_contenttd");
			contenttd.style.width = "100%";
			tr.appendChild(contenttd);

			fs = new Array();
			fslength = new Array();
			for (var i in log.content) {
				that.newFacility(i, 0, "New Facility");
			}
			
			contenttd.appendChild(fs["All"]);
			listel["All"].setAttribute("class", "LogPanel_active");
			currentfacility = "All";
			
			log.addCallback(that, that.newFacility, "newfacility");
		};
		
		that.newFacility = function(facility) {
			fs[facility] = document.createElement("div");
			fs[facility].setAttribute("class", "LogPanel_contentdiv");
			fs[facility].setAttribute("style", "width: 100%;"); //	overflow: scroll; height: " + container.innerHeight + "px;");
			fslength[facility] = log.content[facility].length;
			for (var i = log.content[facility].length - 1; i >= 0; i--) {
				that.logCallback(facility, facility, log.codes[facility][i], log.content[facility][i]);
			}
			listel[facility] = document.createElement("li");
			listel[facility].textContent = facility;
			listel[facility].addEventListener("click", that.switchFacility, true);
			list.appendChild(listel[facility]);
			log.addCallback(that, that.logCallback, facility);
		};
		
		that.switchFacility = function(evt) {
			var facility = evt.target.textContent;
			contenttd.removeChild(fs[currentfacility]);
			listel[currentfacility].setAttribute("class", "");
			contenttd.appendChild(fs[facility]);
			listel[facility].setAttribute("class", "LogPanel_active");
			currentfacility = facility;
		};
		
		that.logCallback = function(facility, originalfacility, code, message) {
			while (fslength[facility] >= 100) {
				fs[facility].removeChild(fs[facility].lastElementChild);
				fslength[facility]--;
			}
			var li = createEl("div");
			if (facility == "All") li.innerHTML = "<b>" + originalfacility + "</b>: " + message;
			else li.textContent = message;
			fs[facility].insertBefore(li, fs[facility].firstElementChild);
			fslength[facility]++;
		};
		
		return that;
	}
};

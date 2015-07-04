var AlbumList = function(el) {
	var self = {};

	var template = RWTemplates.searchlist();
	el.appendChild(template._root);

	template.searchbox.addEventListener("input", function() {
		if (template.searchbox.value.length > 0) {
			if (!template.searchbox.classList.contains("active")) {
				template.searchbox.classList.add("active");
			}
		}
		else {
			template.searchbox.classList.remove("active");
		}
	});

	return self;
};
var SearchPanel = function() {
	"use strict";
	var self = {};

	var container;
	var el;
	var scroller;
	var input;

	BOOTSTRAP.on_init.push(function(root_template) {
		container = root_template.search_results_container;
		el = root_template.search_results;
		input = root_template.search;

		root_template.search_container.addEventListener("click", function(e) {
			e.stopPropagation();
		});

		root_template.search_close.addEventListener("click", function() {
			Router.change();
		});

		root_template.search_link.addEventListener("click", function() {
			if (!document.body.classList.contains("search_open")) {
				Router.change("search");
			}
			else {
				Router.change();
			}
		});

		root_template.search_form.addEventListener("submit", do_search);

		input.addEventListener("keypress", function(evt) {
			if (evt.keyCode == 27) {
				input.value = "";
				while (el.hasChildNodes()) {
					el.removeChild(el.lastChild);
				}
			}
		});
	});

	BOOTSTRAP.on_draw.push(function(root_template) {
		scroller = Scrollbar.create(container);
	});

	var do_search = function(e) {
		e.preventDefault();
		e.stopPropagation();
		if (Formatting.make_searchable_string(input.value).trim().length < 3) {
			// fake a server response
			search_error({ "tl_key": "search_string_too_short" });
			return;
		}
		API.async_get("search", { "search": input.value }, search_result, search_error);
	};

	var search_result = function(json) {
		while (el.hasChildNodes()) {
			el.removeChild(el.lastChild);
		}

		RWTemplates.search_results(json, el);
		var div, a, i;

		for (i = 0; i < json.albums.length; i++) {
			Fave.register(json.albums[i], true);
			Rating.register(json.albums[i]);
		}

		for (i = 0; i < json.songs.length; i++) {
			div = document.createElement("div");
			div.className = "album_name";
			a = document.createElement("a");
			a.setAttribute("href", "#!/album/" + json.songs[i].album_id);
			a.textContent = json.songs[i].album_name;
			div.appendChild(a);
			json.songs[i].$t.row.insertBefore(div, json.songs[i].$t.title);

			Fave.register(json.songs[i]);
			Rating.register(json.songs[i]);
			if (json.songs[i].requestable) {
				Requests.make_clickable(json.songs[i].$t.title, json.songs[i].id);
			}
			SongsTableDetail(json.songs[i], (i > json.songs.length - 4));
		}

		scroller.set_height(false);
		scroller.refresh();
	};

	var search_error = function(json) {
		while (el.hasChildNodes()) {
			el.removeChild(el.lastChild);
		}

		var p = document.createElement("p");
		p.textContent = $l(json.tl_key, json);
		el.appendChild(p);

		return true;
	};

	var search_reset_error = function() {
		console.log("unwat");
	};

	return self;
}();

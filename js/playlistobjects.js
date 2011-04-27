var Song = {
	linkify: function(song_id, el) {
		//el.style.cursor = "pointer";
		//el.addEventListener('click', function() { edi.openPanelLink("PlaylistPanel", { type: "song", id: song_id, history: true }); }, true);
	},
	
	linkifyAsOneshot: function(song_id, el) {
		linkify(el, true);
		el.addEventListener('click', function() { lyre.async_get("oneshot_add", { "song_id": song_id }); }, true);
	},
	
	linkifyAsForceCandidate: function(song_id, el) {
		linkify(el, true);
		el.addEventListener('click', function() { lyre.async_get("force_candidate_add", { "song_id": song_id }); }, true);
	}
};

var Album = {
	linkify: function(album_id, el) {
		linkify(el, true);
		el.addEventListener('click', function() { edi.openPanelLink("PlaylistPanel", { type: "album", id: album_id, history: true }) }, true);
	},
	
	open: function(album_id) {
		edi.openPanelLink("PlaylistPanel", { type: "album", id: album_id, history: true });
	}
};

var Username = {
	linkify: function(user_id, el) {
		// TODO: this
	}
};

var Artist = {
	allArtistToHTML: function(artistarray, el) {	
		var a, span;
		for (var i = 0; i < artistarray.length; i++) {
			if (i > 0) {
				span = document.createElement("span");
				span.textContent = ", ";
				el.appendChild(span);
			}
			a = document.createElement("span");
			Artist.linkify(artistarray[i].artist_id, a);
			a.textContent = artistarray[i].artist_name;
			el.appendChild(a);
		}
	},
	
	linkify: function(artist_id, el) {
		linkify(el, true);
		el.addEventListener('click', function() { edi.openPanelLink("PlaylistPanel", { type: "artist", id: artist_id, history: true }); }, true);
	},
	
	open: function(artist_id) {
		edi.openPanelLink("PlaylistPanel", { type: "artist", id: artist_id, history: true });
	}
};

// WARNING: function modifies artists array
function artistsToTSpans(el, artists) {
	el.setAttribute("xml:space", "preserve");
	for (var i = 0; i < artists.length; i++) {
		var tspan = svg.makeEl("tspan");
		tspan.textContent = artists[i].artist_name;
		//Artist.linkify(artists[i].artist_id, tspan);
		el.appendChild(tspan);
		artists[i].el = tspan;
		if (i != (artists.length - 1)) {
			var comma = svg.makeEl("tspan");
			comma.textContent = ", ";
			el.appendChild(comma);
		}
	}
}
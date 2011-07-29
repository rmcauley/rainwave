var Song = {
	linkify: function(song_id, el) {
		//el.style.cursor = "pointer";
		//el.addEventListener('click', function() { edi.openPanelLink(true, "playlist", "song", song_id); }, true);
	},
	
	linkifyAsOneshot: function(song_id, el) {
		linkify(el);
		el.addEventListener('click', function() { lyre.async_get("oneshot_add", { "song_id": song_id }); }, true);
	},
	
	linkifyAsForceCandidate: function(song_id, el) {
		linkify(el);
		el.addEventListener('click', function() { lyre.async_get("force_candidate_add", { "song_id": song_id }); }, true);
	}
};

var Album = {
	linkify: function(album_id, el) {
		linkify(el);
		el.addEventListener('click', function() { edi.openPanelLink(true, "playlist", "album", album_id); }, true);
	},
	
	open: function(album_id) {
		edi.openPanelLink(true, "playlist", "album_id", album_id);
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
		linkify(el);
		el.addEventListener('click', function() { edi.openPanelLink(true, "playlist", "artist", artist_id); }, true);
	},
	
	open: function(artist_id) {
		edi.openPanelLink(true, "playlist", "artist", artist_id);
	}
};

var Username = {
	linkify: function(user_id, el) {
		linkify(el);
		el.addEventListener('click', function() { edi.openPanelLink(true, "listener", "id", user_id); }, true);
	},
	
	open: function(user_id) {
		edi.openPanelLink(true, "listener", "id", user_id);
	}
}
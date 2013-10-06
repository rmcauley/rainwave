var Song = {
	linkify: function(song_id, el) {
		//el.style.cursor = "pointer";
		//el.addEventListener('click', function() { edi.openPanelLink(true, "playlist", "song", song_id); }, true);
	},

	linkifyAsOneshot: function(song_id, el) {
		linkify(el);
		el.addEventListener('click', function() { lyre.async_get("oneshot_add", { "id": song_id }); }, true);
	},

	linkifyAsForceCandidate: function(song_id, el) {
		linkify(el);
		el.addEventListener('click', function() { lyre.async_get("force_candidate_add", { "id": song_id }); }, true);
	},

	addChangeMultiplierListener: function(song_id, el) {
		el.addEventListener('change', function() { lyre.async_get("admin_change_song_multiplier", { "id": song_id, "multiplier": el.value }); }, true);
	},

	r4translate: function(json) {
		// R4TRANSLATE
		// song_rating_id is obsolete
		// song_timesplayed is gone
		// song_timesdefeated is gone
		// song_timeswon is gone
		var artists = [];
		for (var i = 0; i < json.artists.length; i++) {
			artists.push({ "artist_name": json.artists[i]['name'], "artist_id": json.artists[i]['id'] });
		}
		var s = {
			"song_timesdefeated": 0,
			"song_timesplayed": 0,
			"song_timeswon": 0,
			"song_rating_id": json['id'],
			"song_rating_sid": json['origin_sid'],

			"song_added_on": json['added_on'],
			"song_available": json['cool'] ? false : true,
			"song_favourite": json['fave'],
			"song_id": json['id'],
			"song_lastplayed": json['played_last'],
			"song_rank": json['rank'],
			"song_rating_avg": json['rating'],
			"song_rating_count": json['rating_count'],
			"song_rating_user": json['rating_user'],
			"song_release_time": json['cool_end'],
			"song_secondslong": json['length'],
			"song_title": json['title'],
			"song_totalvotes": json['vote_total'],
			"song_totalrequests": json['request_count'],
			"song_url": json['link'],
			"song_urltext": json['link_text'],
			"song_oa_multiplier": json['cool_multiply'],
			"song_requestor": json['elec_request_username'],
			"rating_allowed": json['rating_allowed'],

			"elec_entry_id": json['entry_id'],
			"elec_position": json['entry_position'],
			"elec_isrequest": json['entry_type'],
			"elec_votes": json['entry_votes'],

			"artists": artists

			// new to r4
			// "elec_request_user_id": 0,
			// "elec_last": 0,		// last election appearance
			// "elec_blocked": true,
			// "elec_blocked_by": "in_election",
			// "elec_blocked_num": 2,
			// "elec_appearances": 0,
			// "cool_override": null,
		};
		s = Album.r4translate(json['albums'][0], s);
		return s;
	}
};

var Album = {
	linkify: function(album_id, el) {
		linkify(el);
		el.addEventListener('click', function() { edi.openPanelLink(true, "playlist", "album", album_id); }, true);
	},

	open: function(album_id) {
		edi.openPanelLink(true, "playlist", "album", album_id);
	},

	r4translate: function(json, base) {
		if (!base) base = {};
		if (json['album_art']) {
			base['album_art'] = json['album_art'] + "_120.jpg";
		}
		else {
			base['album_art'] = null;
		}
		base['album_favourite'] = json['fave'];
		base['album_rating_user'] = json['rating_user'];
		base['album_id'] = json['id'];
		base['album_lastplayed'] = json['played_last'];
		base['album_lowest_oa'] = json['cool_lowest'];
		base['album_name'] = json['name'];
		base['album_rank'] = json['rank'];
		base['album_rating_avg'] = json['rating'];
		base['album_rating_count'] = json['rating_count'];
		base['album_rating_user'] = json['rating_user'];
		base['album_totalvotes'] = json['vote_total'];
		// obsoleted
		base['album_timesdefeated'] = 0;
		base['album_timesplayed'] = 0;
		base['album_timeswon'] = 0;
		base['album_totalrequests'] = 0;
		// new
		//json['request_count']		// number of active requests for this album
		return base;
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
			if (artistarray[i].artist_id) {
				Artist.linkify(artistarray[i].artist_id, a);
				a.textContent = artistarray[i].artist_name;
			}
			else {
				Artist.linkify(artistarray[i].id, a);
				a.textContent = artistarray[i].name;
			}
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
		el.addEventListener('click', function() { edi.openPanelLink(true, "listeners", "id", user_id); }, true);
	},

	open: function(user_id) {
		edi.openPanelLink(true, "listeners", "id", user_id);
	},

	openFresh: function(user_id) {
		edi.openPanelLink(true, "listeners", "id_refresh", user_id);
	}
};

var Schedule = {
	r4translate: function(json) {
		var type = 0;
		if (json['type'] == "OneUp") type = 4;
		var sd = [];
		for (var i = 0; i < json['songs'].length; i++) {
			sd.push(Song.r4translate(json['songs'][i]));
		}
		return {
			// these don't exist
			"sched_paused": false,
			"sched_notes": null,
			// used to be 0, 1, or 2, now is a boolean
			"sched_used": json['used'] ? 2 : 0,
			// the rest are translations
			"sched_length": json['length'],
			"sched_name": json['name'],
			"sched_actualtime": json['start_actual'],
			"sched_starttime": json['start'],
			"sid": json['sid'],
			"user_id": json['dj_user_id'],
			"sched_id": json['id'],
			"sched_endtime": json['end'],
			"sched_type": type,
			"song_data": sd
		};
	}
};

function TimelineSong(json, parent, x, y, songnum) {
	var that = {};
	that.p = json;
	that.elec_votes = 0;
	that.songnum = songnum;
	that.voteinprogress = false;
	that.votesubmitted = false;
	that.votehighlighted = false;
	that.parent = parent;

	theme.Extend.TimelineSong(that);
	that.draw();
	Album.linkify(json.album_id, that.album_name);
	if (that.vote_hover_el) {
		that.vote_hover_el.addEventListener('mouseover', that.showRequestor, true);
		that.vote_hover_el.addEventListener('mouseout', that.hideRequestor, true);
	}

	that.updateJSON = function(json) {
		that.p = json;
		that.song_rating.updateSiteRating(that.p.song_rating_avg);
		that.album_rating.updateSiteRating(that.p.album_rating_avg);
	};

	that.enableVoting = function() {
		that.vote_hover_el.addEventListener('mouseover', that.voteHoverOn, true);
		that.vote_hover_el.addEventListener('mouseout', that.voteHoverOff, true);
		that.vote_hover_el.addEventListener('click', that.voteAction, true);
		that.vote_hover_el.style.cursor = "pointer";
	};

	that.disableVoting = function() {
		that.vote_hover_el.removeEventListener('mouseover', that.voteHoverOn, true);
		that.vote_hover_el.removeEventListener('mouseout', that.voteHoverOff, true);
		that.vote_hover_el.removeEventListener('click', that.voteAction, true);
		that.vote_hover_el.style.cursor = "default";
		if (!that.votehighlighted) that.voteHoverOff();
	};

	that.voteAction = function() {
		// if (that.voteinprogress) {
		that.voteSubmit();
		// return;
		// }
		// that.parent.cancelVoting();
		// if (parent.timeleft >= 15) {
			// that.voteinprogress = true;
			// that.startVoting();
		// }
		// else {
			// that.voteinprogress = true;
			// that.voteSubmit();
		// }
	};

	that.voteCancel = function() {
		//if (that.voteinprogress && !that.votesubmitted) {
			that.voteinprogress = false;
			that.votehighlighted = false;
			that.votesubmitted = false;
			// that.voteProgressStop();
			// that.voteProgressReset();
			that.voteHoverReset();
		//}
	};

	that.voteSubmit = function() {
		if (that.votesubmitted) return;
		that.votesubmitted = true;
		// that.voteProgressStop();
		that.voteProgressComplete();
		// that.parent.disableVoting();
		// that.parent.changeHeadline(_l("submittingvote"));
		lyre.async_get("vote", { "entry_id": that.p.elec_entry_id });
	};

	that.registerFailedVote = function() {
		that.voteinprogress = false;
		that.votesubmitted = false;
		that.votehighlighted = false;
		that.voteHoverReset();
		// that.voteHoverOff();
	};

	that.registerVote = function() {
		// that.voteinprogress = true;
		that.votesubmitted = true;
		that.votehighlighted = true;
		that.voteProgressComplete();
		that.registerVoteDraw();
		that.parent.changeHeadline(_l("voted"));
	};

	that.enableRating = function() {
		that.song_rating.enable();
		that.album_rating.enable();
	};

	that.disableRating = function() {
		that.song_rating.disable();
		that.album_rating.disable();
	};

	that.getScheduledLength = function() {
		return that.p.song_secondslong;
	};

	return that;
};

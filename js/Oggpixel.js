/**
 * Oggpixel -- a JS library wrapping a SWF that streams OGG.
 *
 * Various callbacks can be defined to react to changes in the player state:
 *     onReady: called after a successful `attach` call
 *     onStart: called after a stream begins playing
 *     onStop: called after a stream ends playing
 */
var Oggpixel = function () {
	var self = {};

	/**
	 * True if a stream is currently playing, false otherwise.
	 */
	self.playing = false;

	/**
	 * Attaches the Oggpixel wrapper to the specified HTML element ID.
	 *
	 * This is automatically called by the SWF when it loads; if you choose
	 * to let Oggpixel bind itself automatically like this, you should probably
	 * set Oggpixel.onReady to a callback function so you can keep track of
	 * the state of the player.
	 *
	 * Args:
	 *     id: the HTML element ID to which to attach the wrapper
	 */
	self.attach = function (id) {
		if (!id) {
			id = 'oggpixel';
		}
		self.player = document.getElementById(id);

		if (self.onReady) {
			self.onReady();
		}
	};

	/**
	 * Play the provided URL.
	 *
	 * This URL can be relative to the containing page or absolute.
	 *
	 * Args:
	 *     url: the url to play.
	 */
	self.play = function (url) {
		self.player.playStream(url);
	};

	/**
	 * Stop the currently playing stream.
	 */
	self.stop = function () {
		self.player.stopStream();
	};

	/**
	 * Set the streamer's playback volume, from 0 (muted) to 1.0 (full volume).
	 *
	 * By default, volume is 1.0. Note that this is unrelated to system volume
	 * or any other volume setting, and applies solely to this particular
	 * stream. Also note that calling `play` with another URL will reset this
	 * to default.
	 *
	 * Args:
	 *     volume: the volume you want.
	 */
	self.setVolume = function (volume) {
		self.player.setVolume(volume);
	};

	/**
	 * Return the playback volume of the current stream.
	 */
	self.getVolume = function (volume) {
		return self.player.getVolume();
	};

	self._onStart = function () {
		self.playing = true;
		if (self.onStart) {
			self.onStart(user.p.radio_tunedin); // LR mod
		}
	};

	self._onStop = function () {
		self.playing = false;
		if (self.onStop) {
			self.onStop(user.p.radio_tunedin); // LR mod
		}
	};
	
	// LR mod
	self.inject = function () {
		//document.getElementById("body").appendChild(createEl("div", { "id": "oggpixel" }));
		var flashvars = {};
		var params = {allowScriptAccess: "always"};
		var attributes = {};
		swfobject.embedSWF("images/oggpixel.swf", "oggpixel", "1", "1", "10.0.0", "images/expressInstall.swf", flashvars, params, attributes);
	};

	return self;
}();

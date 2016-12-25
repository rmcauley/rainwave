/* To test this module against your own server:
liquidsoap '
 set("harbor.timeout", 40.)
 set("log.level", 4)
 def dumbauth(user, pw) =
 true
 end
 output.file(fallible=true, %mp3, "./dj.mp3", audio_to_stereo(input.harbor("dj.mp3", port=8303, auth=dumbauth)))
'
*/

BOOTSTRAP.on_init.push(function DJPanel(root_template) {
	"use strict";

	var panel = document.createElement("div");
	panel.className = "dj_panel panel";
	root_template.sizeable_area.insertBefore(panel, root_template.search_container);
	var t = RWTemplates.dj(null, panel);

	var menu_li = document.createElement("li");
	menu_li.className = "dj_link";
	var menu_a = document.createElement("a");
	menu_a.textContent = $l("dj_panel");
	menu_li.appendChild(menu_a);
	root_template.main_menu_ul.appendChild(menu_li);

	panel.addEventListener("click", function(e) {
		e.stopPropagation();
	});

	Sizing.dj_area = panel;

	t.dj_close.addEventListener("click", function() {
		if (!Sizing.simple) {
			Router.open_last_id();
		}
		else {
			Router.change();
		}
	});

	menu_a.addEventListener("click", function() {
		if (!document.body.classList.contains("dj_open")) {
			Router.change("dj");
		}
		else if (!Sizing.simple) {
			Router.open_last_id();
		}
		else {
			Router.change();
		}
	});

	t.btn_pause.addEventListener("click", function() {
		API.async_get("admin/dj/pause");
	});
	t.btn_pause_cancel.addEventListener("click", function() {
		API.async_get("admin/dj/unpause");
	});
	t.btn_resume.addEventListener("click", function() {
		API.async_get("admin/dj/unpause", false, function() {
			t.btn_resume.disabled = true;
		});
	});

	t.save_stream_name.addEventListener("click", function() {
		API.async_get("admin/dj/pause_title", { "title": t.stream_name.value }, function() {
			t.save_stream_name.textContent = "OK!";
			setTimeout(function() {
				t.save_stream_name.textContent = $l("dj_save_name");
			}, 2000);
		});
	});

	t.change_bkey.addEventListener("click", function() {
		API.async_get("admin/dj/change_pw");
	});

	var dj_api_status = {};

	Clock.pageclock_function2 = function(page_title_end, now) {
		var live_for = now - page_title_end;
		if (dj_api_status.pause_active) {
			t.dji_ready.classList.add("active");
		}
		else {
			t.dji_ready.classList.remove("active");
		}
		t.dji_ready.textContent = $l("dj_live_for", { "livetime": Formatting.minute_clock(live_for) });

		var eta = Math.max(0, page_title_end - 5 - now);
		if (dj_api_status.pause_requested) {
			if (!eta) {
				t.btn_pause_cancel.disabled = true;
				t.dji_will_pause.textContent = $l("dj_go");
			}
			else {
				t.dji_will_pause.textContent = $l("dj_will_pause", { "timeleft": Formatting.minute_clock(eta) });
			}
		}
		else {
			if ((eta - 5) <= 0) {
				t.btn_pause.disabled = true;
				t.dji_will_pause.textContent = $l("dj_late");
			}
			else {
				t.dji_will_pause.textContent = $l("dj_window", { "timeleft": Formatting.minute_clock(eta - 5) });
			}
		}

		if (socket && (socket.readyState == WebSocket.OPEN) && on_air_start) {
			var diff = Math.floor(Date.now() / 1000) - on_air_start;
			t.dji_on_air.textContent = $l("dj_on_air", { "mictime": Formatting.minute_clock(diff) });
			if (now % 2 === 0) {
				API.async_get("admin/dj/heartbeat");
			}
		}
	};

	var update_status = function() {
		if (dj_api_status.pause_active) {
			t.dji_music.classList.add("active");
			t.dji_music.textContent = $l("dj_music_paused");
			t.dji_will_pause.classList.add("active");
			t.dji_ready.classList.add("active");
			t.btn_pause.disabled = true;
			t.btn_pause_cancel.disabled = true;
			t.btn_resume.disabled = false;
		}
		else if (dj_api_status.pause_requested) {
			t.dji_music.classList.remove("active");
			t.dji_music.textContent = $l("dj_music_playing");
			t.dji_will_pause.classList.add("active");
			t.dji_ready.classList.remove("active");
			t.btn_pause.disabled = true;
			t.btn_pause_cancel.disabled = false;
			t.btn_resume.disabled = true;
		}
		else {
			t.dji_music.classList.remove("active");
			t.dji_music.textContent = $l("dj_music_playing");
			t.dji_will_pause.classList.remove("active");
			t.dji_ready.classList.remove("active");
			t.btn_pause.disabled = false;
			t.btn_pause_cancel.disabled = true;
			t.btn_resume.disabled = true;
			t.dji_ready.textContent = $l("dj_live_for", { "livetime": "0:00" });
		}

		t.stream_name.value = dj_api_status.pause_title;
	};

	API.add_callback("dj_info", function(json) {
		dj_api_status = json;
		update_status();
	});

	// code from:
	// Mozilla's Voice Change-o-Matic
	// http://www.smartjava.org/content/exploring-html5-web-audio-visualizing-sound
	// https://github.com/cwilso/volume-meter/blob/master/volume-meter.js

	var audioCtx = new (window.AudioContext || window.webkitAudioContext)(); // jshint ignore:line

	// putting the source out here prevents the source from being prematurely garbage collected
	// by firefox and halting audio from working
	var stream;
	var source;

	var gainNode = audioCtx.createGain();
	gainNode.gain.value = 1;
	t.gain.addEventListener("input", function() {
		gainNode.gain.value = parseFloat(t.gain.value);
		t.gain_display.textContent = parseFloat(t.gain.value).toFixed(1);
	});

	var analyser = audioCtx.createAnalyser();
	analyser.minDecibels = -60.0;
	analyser.maxDecibels = -15.0;
	analyser.decibelRange = analyser.maxDecibels + Math.abs(analyser.minDecibels);
	// analyser.smoothingTimeConstant = 0.8;
	analyser.fftSize = 256;

	var javascriptNode = audioCtx.createScriptProcessor(2048);
	// Firefox's levels are quite arbitrary compared to other applications
	// These values have seemed to work well
	javascriptNode.quietLevel = -35;
	javascriptNode.clipLevel = -25;
	javascriptNode.clipping = false;
	javascriptNode.lastClip = 0;
	javascriptNode.rms = analyser.minDecibels;
	javascriptNode.peak = analyser.minDecibels;
	javascriptNode.longPeak = analyser.minDecibels;
	javascriptNode.lastLongPeak = 0;
	javascriptNode.averaging = 0.90;
	javascriptNode.clipLag = 750;

	var quietwidth = (javascriptNode.quietLevel - analyser.minDecibels) / analyser.decibelRange * 100;
	var goodwidth = ((javascriptNode.clipLevel - javascriptNode.quietLevel) / analyser.decibelRange) * 100;
	t.quiet_range.style.width = quietwidth + "%";
	t.good_range.style.left = quietwidth + "%";
	t.good_range.style.width = goodwidth + "%";
	t.clip_range.style.left = (quietwidth + goodwidth) + "%";
	t.clip_range.style.width = (100 - quietwidth - goodwidth) + "%";

	javascriptNode.onaudioprocess = function(evt) {
		var array = new Float32Array(analyser.frequencyBinCount);
		analyser.getFloatFrequencyData(array);
		var bufLength = array.length;
		var sum = 0;
		var peak = analyser.minDecibels;

		for (var i = 0; i < bufLength; i++) {
			sum += (array[i] * array[i]);
			peak = Math.max(array[i], peak);
		}

		var now = window.performance.now();

		if (peak > javascriptNode.clipLevel) {
			javascriptNode.clipping = true;
			javascriptNode.lastClip = now;
		}
		else if ((javascriptNode.lastClip + javascriptNode.clipLag) < now) {
			javascriptNode.clipping = false;
		}

		if (peak > javascriptNode.longPeak) {
			javascriptNode.longPeak = peak;
			javascriptNode.lastLongPeak = now;
		}
		else if ((javascriptNode.lastLongPeak + javascriptNode.clipLag) < now) {
			javascriptNode.longPeak = Math.max(analyser.minDecibels, javascriptNode.longPeak - ((1 - javascriptNode.averaging) * Math.abs(javascriptNode.longPeak)));
		}

		var rms = Math.sqrt(sum / bufLength);
		javascriptNode.rms = Math.max(rms, Math.min(analyser.minDecibels, (javascriptNode.rms * javascriptNode.averaging)));
		javascriptNode.peak = peak;
	};

	var drawMicVolume = function(timestamp) {
		var dbtoscale = (javascriptNode.peak - analyser.minDecibels) / analyser.decibelRange;
		t.vu_meter.style.transform = "scaleX(" + (dbtoscale) + ")";
		// t.vu_meter.textContent = javascriptNode.dbVolume + "dB";
		var peaktoscale = (javascriptNode.longPeak - analyser.minDecibels) / analyser.decibelRange;
		t.peak.style.transform = "translateX(" + (Math.max(peaktoscale, dbtoscale) * 100) + "%)";
		if (!javascriptNode.clipping && t.clip_range.classList.contains("clipping")) {
			t.clip_range.classList.remove("clipping");
			t.clip_warning_text.classList.remove("clipping");
		}
		else if (javascriptNode.clipping && !t.clip_range.classList.contains("clipping")) {
			t.clip_range.classList.add("clipping");
			t.clip_warning_text.classList.add("clipping");
		}
		requestAnimationFrame(drawMicVolume);
	};

	gainNode.connect(analyser);
	gainNode.connect(javascriptNode);
	// gainNode.connect(audioCtx.destination);

	t.mic_enable.addEventListener("click", function() {
		if (source) return;
		if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
			navigator.mediaDevices.getUserMedia({ audio: true}).then(function(new_stream) {
				stream = new_stream;
				source = audioCtx.createMediaStreamSource(stream);
				source.connect(gainNode);
				requestAnimationFrame(drawMicVolume);
				t.mic_enable.disabled = true;
				t.btn_on_air.disabled = false;
			}).catch(function(err) {
				console.error("The following getUserMedia error occured: " + err);
				ErrorHandler.nonpermanent_error(ErrorHandler.make_error("dj_audio_fail", 400));
			});
		} else {
			console.error("navigator.mediaDevices.getUserMedia does not exist.");
			ErrorHandler.nonpermanent_error(ErrorHandler.make_error("dj_audio_fail", 400));
		}
	});

	// doesn't actually stop the mic from being recorded!
	// t.mic_disable.addEventListener("click", function() {
	// 	if (!source) return;
	// 	source.disconnect();
	// 	source = null;
	// 	t.mic_enable.disabled = false;
	// 	t.mic_disable.disabled = true;
	//	t.btn_on_air.disabled = true;
	// });

	var on_air_start, socket;
	var webcast;

	var webcast_init = function() {
		webcast = audioCtx.createWebcastSource(4096, 2);
		gainNode.connect(webcast);
	};

	var webcast_on_close = function() {
		gainNode.disconnect(webcast);
		on_air_start = null;
		t.dji_on_air.classList.remove("active");
		t.dji_on_air.textContent = $l("dj_on_air", { "mictime": "0:00" });
		t.btn_cut.disabled = true;
		t.btn_on_air.disabled = false;
		webcast = null;
	};

	var socket_on_error = function() {
		on_air_start = null;
		t.btn_cut.disabled = true;
		t.btn_on_air.disabled = false;
		t.dji_on_air.textContent = $l("dj_net_error");
		t.dji_on_air.classList.remove("active");
		t.dji_on_air.classList.add("djerror");
	};

	var socket_on_open = function() {
		on_air_start = Math.floor(Date.now() / 1000);
		t.dji_on_air.classList.add("active");
		t.dji_on_air.classList.remove("djerror");
		t.dji_on_air.textContent = $l("dj_on_air", { "mictime": "0:00" });
	};

	t.btn_on_air.addEventListener("click", function() {
		webcast_init();

		var encoder = new Webcast.Encoder.Mp3({
			channels: 2,
			samplerate: audioCtx.sampleRate,
			bitrate: 128
		});

		var a = document.createElement("a");
		a.href = window.location.href;
		var js_href_prefix = a.protocol + "//" + a.hostname;
		if (a.port) {
			js_href_prefix += ":" + a.port;
		}
		js_href_prefix += "/";
		encoder = new Webcast.Encoder.Asynchronous({
			encoder: encoder,
			scripts: [
				js_href_prefix + "static/js_dj/libsamplerate.js",
				js_href_prefix + "static/js_dj/libshine.js",
				js_href_prefix + "static/js_dj/webcast.js"
			]
		});

		var ws_url = "ws://rwdj:" + dj_api_status.dj_password + "@" + dj_api_status.mount_host + ":" + dj_api_status.mount_port + "/" + dj_api_status.mount_url;
		socket = webcast.connectSocket(encoder, ws_url);
		socket.onerror = socket_on_error;
		socket.onopen = socket_on_open;

		t.btn_cut.disabled = false;
		t.btn_on_air.disabled = true;
		t.dji_on_air.textContent = $l("dj_connecting");
		t.dji_on_air.classList.remove("djerror");
	});

	t.btn_cut.addEventListener("click", function() {
		if (!webcast) {
			return;
		}
		webcast.close(webcast_on_close);
	});
});
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
		API.async_get("admin/dj/unpause");
	});

	t.save_stream_name.addEventListener("click", function() {
		API.async_get("admin/dj/pause_title", { "title": t.stream_name.value }, function() {
			t.save_stream_name.textContent = "OK!";
			setTimeout(function() {
				t.save_stream_name.textContent = $l("dj_save_name");
			}, 2000);
		});
	});

	var dj_api_status = {};

	var update_status = function() {
		if (dj_api_status.pause_active) {
			t.dji_music.classList.remove("active");
			t.dji_will_pause.classList.remove("active");
			t.dji_paused.classList.add("active");
			t.btn_pause.disabled = true;
			t.btn_pause_cancel.disabled = true;
			t.btn_resume.disabled = false;
			t.btn_cut_resume.disabled = false;
		}
		else if (dj_api_status.pause_requested) {
			t.dji_music.classList.add("active");
			t.dji_will_pause.classList.add("active");
			t.dji_paused.classList.remove("active");
			t.btn_pause.disabled = true;
			t.btn_pause_cancel.disabled = false;
			t.btn_resume.disabled = true;
			t.btn_cut_resume.disabled = true;
		}
		else {
			t.dji_music.classList.add("active");
			t.dji_will_pause.classList.remove("active");
			t.dji_paused.classList.remove("active");
			t.btn_pause.disabled = false;
			t.btn_pause_cancel.disabled = true;
			t.btn_resume.disabled = true;
			t.btn_cut_resume.disabled = true;
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
				// t.mic_disable.disabled = false;
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
});
var DJPanel = function DJPanel(root_template) {
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

	Sizing.trigger_resize();

	Router.change("dj");

	// code from:
	// Mozilla's Voice Change-o-Matic
	// http://www.smartjava.org/content/exploring-html5-web-audio-visualizing-sound
	// https://github.com/cwilso/volume-meter/blob/master/volume-meter.js

	var audioCtx = new (window.AudioContext || window.webkitAudioContext)(); // jshint ignore:line

	// putting the source out here prevents the source from being prematurely garbage collected
	// by firefox and halting audio from working
	var source;

	var gainNode = audioCtx.createGain();
	gainNode.gain.value = 10;

	var analyser = audioCtx.createAnalyser();
	analyser.minDecibels = -70.0;
	analyser.maxDecibels = -20.0;
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
	javascriptNode.shutdown = function() {
		javascriptNode.disconnect();
		javascriptNode.onaudioprocess = null;
	};

	var quietwidth = (javascriptNode.quietLevel - analyser.minDecibels) / analyser.decibelRange * 100;
	var goodwidth = ((javascriptNode.clipLevel - javascriptNode.quietLevel) / analyser.decibelRange) * 100;
	console.log(analyser.decibelRange, quietwidth, goodwidth);
	// t.quietrange.style.width = quietwidth + "%";
	t.goodrange.style.left = quietwidth + "%";
	t.goodrange.style.width = goodwidth + "%";
	t.cliprange.style.left = (quietwidth + goodwidth) + "%";
	t.cliprange.style.width = (100 - quietwidth - goodwidth) + "%";

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
		if (!javascriptNode.clipping && t.cliprange.classList.contains("clipping")) {
			t.cliprange.classList.remove("clipping");
		}
		else if (javascriptNode.clipping && !t.cliprange.classList.contains("clipping")) {
			t.cliprange.classList.add("clipping");
		}
		requestAnimationFrame(drawMicVolume);
	};

	if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
		navigator.mediaDevices.getUserMedia({ audio: true}).then(function(stream) {
			source = audioCtx.createMediaStreamSource(stream);
			source.connect(gainNode);
			gainNode.connect(analyser);
			gainNode.connect(javascriptNode);
			// analyser.connect(audioCtx.destination);
			requestAnimationFrame(drawMicVolume);
		}).catch(function(err) {
			console.error("The following getUserMedia error occured: " + err);
			ErrorHandler.nonpermanent_error(ErrorHandler.make_error("dj_audio_fail", 400));
		});
	} else {
		console.error("navigator.mediaDevices.getUserMedia does not exist.");
		ErrorHandler.nonpermanent_error(ErrorHandler.make_error("dj_audio_fail", 400));
	}
};
var DJPanel = function DJPanel(root_template) {
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

	// code from Mozilla's Voice Change-o-Matic and
	// http://www.smartjava.org/content/exploring-html5-web-audio-visualizing-sound

	var userMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

	var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

	// putting the source out here prevents the source from being prematurely garbage collected
	// by firefox and halting audio from working
	var source;

	var gainNode = audioCtx.createGain();
	gainNode.gain.value = 5;

	var analyser = audioCtx.createAnalyser();
	analyser.minDecibels = -90;
	analyser.maxDecibels = 0;
	analyser.smoothingTimeConstant = 0.3;
	analyser.fftSize = 2048;

	var max_value = 40;

	javascriptNode = audioCtx.createScriptProcessor(2048, 1, 1);
	javascriptNode.onaudioprocess = function() {
		var array =  new Uint8Array(analyser.frequencyBinCount);
		analyser.getByteFrequencyData(array);

		var values = 0;
		for (var i = 0; i < array.length; i++) {
			values += array[i];
		}

		var scale = ((values / array.length) / max_value);
		scale = Math.max(0, Math.min(1, scale));
		t.vu_meter.style.transform = "scaleX(" + scale + ")";
	};

	if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
		navigator.mediaDevices.getUserMedia({ audio: true}).then(function(stream) {
			source = audioCtx.createMediaStreamSource(stream);
			source.connect(gainNode);
			gainNode.connect(analyser);
			analyser.connect(javascriptNode);
			analyser.connect(audioCtx.destination);
		}).catch(function(err) {
			console.error("The following getUserMedia error occured: " + err);
			ErrorHandler.nonpermanent_error(ErrorHandler.make_error("dj_audio_fail", 400));
		});
	} else {
		console.error("navigator.mediaDevices.getUserMedia does not exist.");
		ErrorHandler.nonpermanent_error(ErrorHandler.make_error("dj_audio_fail", 400));
	}
};
var Modal = function() {
	"use strict";
	var active_modal;

	var close_modal = function(e, chaining) {
		if (!chaining) {
			document.body.classList.remove("modal_active");
		}
		active_modal.classList.remove("modal_open");
		active_modal.classList.add("modal_closing");
		Fx.chain_transition(active_modal, function() {
			active_modal.parentNode.removeChild(active_modal);
		});
		if (!chaining) {
			document.body.removeEventListener("click", close_modal);
		}
	};

	var modal_class = function(title, template_name, template_object) {
		if (active_modal) {
			close_modal(null, true);
		}
		else {
			document.body.classList.add("modal_active");
			document.body.addEventListener("click", close_modal);
		}

		var mt = RWTemplates.modal();
		var ct = RWTemplates[template_name](template_object);
		mt.contents.appendChild(ct._root);
		requestAnimationFrame(function() {
			mt.container.classList.add("modal_open");
		});
		active_modal = mt.container;

		return ct;
	};

	return modal_class;
}();
function DoDefaults(options) {
	"use strict";

	options.anim_in = options.anim_in || "to_bottom";
	options.anim_out = options.anim_out || "to_left";
	options.text_stroke_color = options.text_stroke_color || "black";
	options.text_stroke_size = options.text_stroke_size || "2px";
	options.text_shadow = options.text_shadow || "3px 3px 3px black";
	options.font_size = options.font_size || "18pt";
	options.font_family = options.font_family || "'Roboto Condensed', sans-serif";
	options.ad_message = options.ad_message || "Music by:";
	options.padding = options.padding || "8px";
	options.color = options.color || "white";
	return options;
};

function StyleGenerator(options) {
	"use strict";

	var s = "";
	s += "color: " + options.color + "; ";
	s += "font-family: " + options.font_family + "; ";
	var shadow = "";
	if (options.text_stroke_size && options.text_stroke_color) {
		shadow += "-" + options.text_stroke_size + " -" + options.text_stroke_size + " " + (Math.ceil(parseInt(options.text_stroke_size)) / 2) + "px " + options.text_stroke_color + ",";
		shadow +=       options.text_stroke_size + " -" + options.text_stroke_size + " " + (Math.ceil(parseInt(options.text_stroke_size)) / 2) + "px " + options.text_stroke_color + ",";
		shadow += "-" + options.text_stroke_size + "  " + options.text_stroke_size + " " + (Math.ceil(parseInt(options.text_stroke_size)) / 2) + "px " + options.text_stroke_color + ",";
		shadow +=       options.text_stroke_size + "  " + options.text_stroke_size + " " + (Math.ceil(parseInt(options.text_stroke_size)) / 2) + "px " + options.text_stroke_color;
	}
	if (options.text_shadow) {
		if (shadow) {
			shadow += ",";
		}
		shadow += options.text_shadow;
	}
	if (shadow) {
		s += "text-shadow: " + shadow + ";";
		s += "-webkit-text-shadow: " + shadow + ";";
	}
	if (options.background_color && (options.background_color !== "transparent")) {
		s += "background-color: " + options.background_color + " !important; ";
		// document.getElementById("threed").style.backgroundColor = options.background_color;
	}
	if (options.box_shadow) {
		s += "-webkit-box-shadow: " + options.box_shadow + "; ";
		s += "box-shadow: " + options.box_shadow + "; ";
	}
	if (options.margin) {
		s += "margin-left: " + options.margin + "; margin-top: " + options.margin + "; ";
	}
	s += "width: " + options.max_width + "; ";

	if (options.np_header == "yes") {
		document.getElementById("header").setAttribute("style", s);
		document.getElementById("header").style.fontSize = (parseFloat(options.font_size) * 0.7) + "pt";
		document.getElementById("header").style.padding = "0 " + options.padding;
		document.getElementById("header").style.textTransform = "uppercase";
		document.getElementById("header").style.color = options.np_color || "#FFC96A";
		document.getElementById("header").style.zIndex = "2";
		document.getElementById("header").style.position = "relative";
		document.getElementById("header").style.textAlign = options.text_align;
		document.getElementById("header").textContent = options.np_message || "Current Song";
	}
	else {
		document.getElementById("header").style.display = "none";
	}

	s += "font-size: " + options.font_size + "; ";
	var p = options.padding;
	// if (options.layout == "art_left") {
	// 	s += "padding: " + p + " " + p + " " + p + " 0; ";
	// 	s += "margin-left: " + p + "; ";
	// }
	// else if (options.layout == "art_right") {
	// 	s += "padding: " + p + " 0 " + p + " " + p + "; ";
	// 	s += "margin-right: " + p + "; ";
	// }
	// else {
		s += "padding: " + p + "; ";
	// }

	if (options.np_header == "yes") {
		s += "padding-top: " + (parseInt(options.padding) / 2) + "px; ";
	}

	if ((options.layout == "art_left") || (options.layout == "art_right")) {
		s += "height: " + options.art_size + "; ";
		// document.getElementById("threed").style.height = options.art_size;
	}
	return s;
};
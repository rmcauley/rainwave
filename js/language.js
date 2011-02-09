// Pass just "line" to receive a straight string back from the language file
// Pass "line" and "object" to receive a translated string with variables filled in
// Pass an element and the el will be filled with <span>s of each chunk of string
//    Variables will be given class "lang_[line]_[variablename]" when filling in variables
function _l(line, object, el, keep) {
	if (!object) {
		if (lang[line]) {
			if (el) {
				if (!keep) while (el.hasChildNodes()) el.removeChild(el.firstChild);
				createEl("span", { "textContent": lang[line] }, el);
			}
			return lang[line];
		}
		else return "|*" + line + "*|";
	}
	if ((typeof(lang[line]) != "undefined")) {
		if (!object) object = {};
		if (el && !keep) {
			while (el.hasChildNodes()) el.removeChild(el.firstChild);
		}
		var keystart = 0;
		var keyend = lang[line].indexOf("|");
		var key = false;
		var key2 = false;
		var word = false;
		var span;
		var str;
		var wholestr = "";
		var classname;
		while (keyend != -1) {
			str = false;
			classname = "lang_" + line;
			key = lang[line].substr(keystart, (keyend - keystart));
			if (key == "br" && el) {
				createEl("br", false, el);
				createEl("br", false, el);
			}
			else if (key.substr(0, 2) == "S:") {
				if (typeof(object[key.substr(2)]) != "undefined") {
					classname += " lang_" + line + "_" + key.substr(2);
					str = _lSuffixNumber(object[key.substr(2)])
				}
				else {
					str = "|*" + key.substr(2) + "*|";
				}
			}
			else if (key.substr(0, 2) == "P:") {
				key2 = key.substr(2, key.indexOf(",") - 2);
				word = key.substr(key.indexOf(",") + 1);
				if (typeof(object[key2]) != "undefined") {
					classname += " lang_" + line + "_" + word;
					str = _lPlural(object[key2], word);
				}
				else {
					str = "|*" + key2 + "*|";
				}
			}
			else if (typeof(object[key]) != "undefined") {
				classname += " lang_" + line + "_" + key;
				str = object[key];
			}
			else {
				str = key;
			}
			if (str) {
				if (el) createEl("span", { "textContent": str, "class": classname }, el);
				wholestr += str;
			}
			keystart = keyend + 1;
			keyend = lang[line].indexOf("|", keystart);
		}
		if (keystart == 0) {
			classname = "lang_" + line;
			if (el) createEl("span", { "textContent": lang[line], "class": classname }, el);
			wholestr = lang[line];
		}
		else {
			classname = "lang_" + line;
			str = lang[line].substr(keystart);
			if (str > "") {
				if (el) createEl("span", { "textContent": str, "class": classname }, el);
				wholestr += str;
			}
		}
		return wholestr;
	}
	else return "[*" + line + "*]";
}

function _lSuffixNumber(number) {
	var key = "suffix_" + (number % 10);
	if (typeof(lang[key]) != "undefined") return number + lang[key];
	else return number + "[*" + key + "*]";
}

function _lPlural(number, word) {
	if ((number > 1) && (number != 0)) word += "_p";
	if (typeof(lang[word]) != "undefined") return lang[word];
	else return "[*" + word + "*]";
}
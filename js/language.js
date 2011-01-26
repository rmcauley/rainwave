function _l(line, object) {
	if ((typeof(lang[line]) != "undefined")) {
		if (!object) object = {};
		var str = "";
		var keystart = lang[line].indexOf("|");
		var keyend = -1;
		var lastkey = false;
		var key = false;
		var key2 = false;
		var word = false;
		while (keystart != -1) {
			str += lang[line].substr(keyend + 1, (keystart - keyend - 1));
			keyend = lang[line].indexOf("|", keystart + 1);
			key = lang[line].substr(keystart + 1, (keyend - keystart - 1));
			if (key.substr(0, 2) == "S:") {
				if (object[key.substr(2)]) {
					str += _lSuffixNumber(object[key.substr(2)])
				}
				else {
					str += "|*" + key.substr(2) + "*|";
				}
			}
			else if (key.substr(0, 2) == "P:") {
				key2 = key.substr(2, key.indexOf(",") - 2);
				word = key.substr(key.indexOf(",") + 1);
				if (object[key2]) {
					str += _lPlural(object[key2], word);
				}
				else {
					str += "|*" + key2 + "*|";
				}
			}
			else if (object[key]) {
				str += object[key];
			}
			else {
				str += "|*" + key + "*|";
			}
			keystart = lang[line].indexOf("|", keyend + 1);
		}
		if (keyend == 0) str = lang[line];
		else str += lang[line].substr(keyend + 1);
		return str;
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
	if (lang[word]) return lang[word];
	else return "[*" + word + "*]";
}
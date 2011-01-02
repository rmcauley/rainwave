function _l(key) {
	if ((typeof(lang) == "object") && (typeof(lang[key]) != "undefined")) return lang[key];
	else return "[[" + key + "]]";
}

function _lSuffixNumber(number) {
	return number + _l("suffix_" + (number % 10));
}

function _lPlural(number, word) {
	if (number == 1) return _l(word);
	else return _l(word + "_p");
}
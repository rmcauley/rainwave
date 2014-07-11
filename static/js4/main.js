/*  REWRITE BRAIN DUMP
- All scrollbar instances need to be rewritten
- All resizer instances need to be rewritten
- Search list needs to be rewritten as elements already exist on the page
- All files need to be checked for forced paints
- CSS3 rating bars need to be tested
- Timeline progress bar needs to be rewritten
- Small screen layout fails with current timeline CSS
- New requests HTML completely untested
- Scrollbar CSS completely not updated

*/

var User;
var SmallScreen = false;
var SCREEN_HEIGHT;
var SCREEN_WIDTH;
var INIT_HEIGHT_USED = false;

function _size_calculate() {
	"use strict";
	SCREEN_HEIGHT = document.documentElement.clientHeight;
	SCREEN_WIDTH = document.documentElement.clienWidth;
	if ((SCREEN_WIDTH <= 1400) && !SmallScreen) {
		Fx.delay_reflow(function() { $add_class(document.body, "small_screen") });
		SmallScreen = true;
		RatingControl.change_padding_top(1);
	}
	else if ((SCREEN_WIDTH > 1400) && SmallScreen) {
		Fx.delay_reflow(function() { $remove_class(document.body, "small_screen") });
		SmallScreen = false;
		RatingControl.change_padding_top(3);
	}
}

function _on_resize() {
	// this function causes a 2-paint reflow but the development cost of
	// getting this down to a single reflow would be astronomical in code complexity
	"use strict";
	if (INIT_HEIGHT_USED) _size_calculate();
	INIT_HEIGHT_USED = true;
	var new_height = SCREEN_HEIGHT - 56;
	Fx.flush_reflow();

	$id('sizable_body').style.height = new_height + "px";
	Scrollbar.recalculate();
	PlaylistLists.on_resize(new_height);
}

function initialize() {
	"use strict";

	// ****************** DATA HANDLING
	User = BOOTSTRAP.json.user;
	API.add_callback(function(json) { User = json; }, "user");

	RatingControl.initialize();
	ErrorHandler.initialize();
	Clock.initialize();
	Schedule.initialize();
	DetailView.initialize();
	PlaylistLists.initialize();
	Requests.initialize();

	// ****************** PAGE LAYOUT
	// PREP: Applies the small_screen class if necessary
	Fx.flush_reflow();

	// PAINT 1: Measure scrollbar width, setup scrollbar variables
	Scrollbar.calculate_scrollbar_width();
	Schedule.scroll_init();
	Requests.scroll_init();
	PlaylistLists.scroll_init();
	Scrollbar.resizer_calculate();

	// DIRTY THE LAYOUT
	Scrollbar.resizer_refresh();
	DetailView.draw();
	PlaylistLists.draw();
	Menu.draw(BOOTSTRAP.station_list);
	R4Audio.draw(BOOTSTRAP.stream_filename, BOOTSTRAP.relays);
	API.initialize(BOOTSTRAP.sid, BOOTSTRAP.api_url, BOOTSTRAP.json.user.id, BOOTSTRAP.json.user.api_key, BOOTSTRAP.json);
	$remove_class(document.body, "loading");
	Fx.flush_reflow();
	Scrollbar.refresh();

	// Leave the final paint to the browser

	// ****************** DATA CLEANUP
	delete(BOOTSTRAP.json);
	DeepLinker.detect_url_change();
	window.addEventListener("resize", _on_resize, false);
};

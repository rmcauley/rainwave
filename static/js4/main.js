/*  REWRITE BRAIN DUMP
- Search list needs to be rewritten as elements already exist on the page
- Requests needs to be rewritten

- Timeline progress bar needs to be rewritten
- Small screen layout fails with current timeline CSS
- Scrollbar CSS completely not updated

- CSS3 rating bars need to be tested
*/

var User;
var SmallScreen = false;
var SCREEN_HEIGHT;
var SCREEN_WIDTH;

function _size_calculate() {
	"use strict";
	SCREEN_HEIGHT = document.documentElement.clientHeight;
	SCREEN_WIDTH = document.documentElement.clientWidth;
	if ((SCREEN_WIDTH <= 1400) && !SmallScreen) {
		SmallScreen = true;
		Fx.delay_draw(function() { $add_class(document.body, "small_screen") });
		Fx.delay_draw(function() { RatingControl.change_padding_top(1); });
	}
	else if ((SCREEN_WIDTH > 1400) && SmallScreen) {
		SmallScreen = false;
		Fx.delay_draw(function() { $remove_class(document.body, "small_screen") });
		Fx.delay_draw(function() { RatingControl.change_padding_top(3); });
	}
}

function _on_resize() {
	// this function causes a 2-paint reflow but the development cost of
	// getting this down to a single reflow would be astronomical in code complexity
	"use strict";
	_size_calculate();
	var new_height = SCREEN_HEIGHT - 56;
	
	Fx.flush_draws();
	$id('sizable_body').style.height = new_height + "px";
	PlaylistLists.on_resize(new_height);

	Scrollbar.recalculate();
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
	// PREP: Applies the small_screen class if necessary and sizes everything
	Fx.flush_draws();
	$id('sizable_body').style.height = (SCREEN_HEIGHT - 56) + "px";

	// PAINT 1: Measure scrollbar width, setup scrollbars
	Scrollbar.calculate_scrollbar_width();
	Schedule.scroll_init();
	Requests.scroll_init();
	PlaylistLists.scroll_init();
	DetailView.scroll_init();
	Scrollbar.resizer_calculate();

	// DIRTY THE LAYOUT

	Scrollbar.resizer_refresh();
	DetailView.draw();
	PlaylistLists.draw();
	Menu.draw(BOOTSTRAP.station_list);
	R4Audio.draw(BOOTSTRAP.stream_filename, BOOTSTRAP.relays);
	API.initialize(BOOTSTRAP.sid, BOOTSTRAP.api_url, BOOTSTRAP.json.user.id, BOOTSTRAP.json.user.api_key, BOOTSTRAP.json);
	$remove_class(document.body, "loading");
	Fx.flush_draws();

	// FINAL PAINT
	Scrollbar.recalculate();

	// ****************** DATA CLEANUP
	delete(BOOTSTRAP.json);
	DeepLinker.detect_url_change();
	// window.addEventListener("resize", _on_resize, false);
	setTimeout(function() { $remove_class(document.body, "unselectable"); }, 1500);
};

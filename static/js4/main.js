var User;
var SmallScreen = false;
var SCREEN_HEIGHT;
var SCREEN_WIDTH;
var MAIN_HEIGHT;

function _size_calculate() {
	"use strict";
	var old_height = SCREEN_HEIGHT;
	SCREEN_HEIGHT = document.documentElement.clientHeight;
	SCREEN_WIDTH = document.documentElement.clientWidth;
	MAIN_HEIGHT = SCREEN_HEIGHT - 56;
	if ((SCREEN_WIDTH <= 1400) && !SmallScreen) {
		SmallScreen = true;
		Fx.delay_draw(function() { $add_class(document.body, "small_screen") });
		Fx.delay_draw(function() { RatingControl.change_padding_top(1); });
		return true;
	}
	else if ((SCREEN_WIDTH > 1400) && SmallScreen) {
		SmallScreen = false;
		Fx.delay_draw(function() { $remove_class(document.body, "small_screen") });
		Fx.delay_draw(function() { RatingControl.change_padding_top(3); });
		return true;
	}
	return old_height != SCREEN_HEIGHT;
}

function _on_resize() {
	// this function causes a 2-paint reflow but the development cost of
	// getting this down to a single reflow would be astronomical in code complexity
	"use strict";
	// paint 1 :(
	if (!_size_calculate()) return;
	
	// draw 1 :(
	Fx.flush_draws();
	$id('sizable_body').style.height = MAIN_HEIGHT + "px";

	// paint 2 :(
	Schedule.scrollbar_recalculate();
	Scrollbar.recalculate();
	DetailView.on_resize_calculate();
	// scrollbar recalculation has to come before PlaylistLists.on_resize
	PlaylistLists.on_resize();

	// draw 2 :(
	DetailView.on_resize_draw();
	Scrollbar.refresh();

	// hacks, argh, the np size calculate needs to be done after any and all animation
	// has finished, which means we need to introduce this delay.
	setTimeout(function() { Schedule.now_playing_size_calculate(); }, 1500);
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
	R4Audio.initialize(BOOTSTRAP.stream_filename, BOOTSTRAP.relays);

	// ****************** PAGE LAYOUT
	// PREP: Applies the small_screen class if necessary and sizes everything
	Fx.flush_draws();
	$id('sizable_body').style.height = MAIN_HEIGHT + "px";
	PlaylistLists.on_resize();

	// PAINT 1: Measure scrollbar width, setup scrollbars
	Scrollbar.calculate_scrollbar_width();
	Schedule.scroll_init();
	Requests.scroll_init();
	PlaylistLists.scroll_init();
	Scrollbar.resizer_calculate();
	Scrollbar.recalculate();
	DetailView.scroll_init();

	// DIRTY THE LAYOUT

	Scrollbar.hold_all_recalculations = true;
	R4Audio.draw();
	Requests.draw();
	Scrollbar.resizer_refresh();
	DetailView.draw();
	PlaylistLists.draw();
	Menu.draw(BOOTSTRAP.station_list);
	API.initialize(BOOTSTRAP.sid, BOOTSTRAP.api_url, BOOTSTRAP.json.user.id, BOOTSTRAP.json.user.api_key, BOOTSTRAP.json);
	$remove_class(document.body, "loading");
	Fx.flush_draws();

	// PAINT 2: Scrollbar bullshit
	Scrollbar.hold_all_recalculations = false;
	Schedule.now_playing_size_calculate();
	Scrollbar.recalculate();

	// FINAL DIRTY: Move/size the scrollbars
	Scrollbar.refresh();

	// ****************** DATA CLEANUP
	delete(BOOTSTRAP.json);
	DeepLinker.detect_url_change();
	window.addEventListener("resize", _on_resize, false);
	setTimeout(function() { $remove_class(document.body, "unselectable"); }, 1500);
};

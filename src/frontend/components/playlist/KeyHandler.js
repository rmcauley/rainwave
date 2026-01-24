var keymaps = {
  QWER: {
    activate: ["`", "<", "'", "\\"],
    play: [" "],
    rate10: ["1"],
    rate15: ["q"],
    rate20: ["2"],
    rate25: ["w"],
    rate30: ["3"],
    rate35: ["e"],
    rate40: ["4"],
    rate45: ["r"],
    rate50: ["5"],
    vote0_0: ["a"],
    vote0_1: ["s"],
    vote0_2: ["d"],
    vote1_0: ["z", "y"],
    vote1_1: ["x"],
    vote1_2: ["c"],
    fave: ["f"],
  },
  DVOR: {
    activate: ["`", "W", "-", "\\"],
    play: [" "],
    rate10: ["1"],
    rate15: ["'"],
    rate20: ["2"],
    rate25: [","],
    rate30: ["3"],
    rate35: ["."],
    rate40: ["4"],
    rate45: ["p"],
    rate50: ["5"],
    vote0_0: ["a"],
    vote0_1: ["o"],
    vote0_2: ["e"],
    vote1_0: [";", "f"],
    vote1_1: ["q"],
    vote1_2: ["j"],
    fave: ["u"],
  },
};
keymaps.AZER = JSON.parse(JSON.stringify(keymaps.QWER));
keymaps.AZER.rate15 = ["a"];
keymaps.AZER.rate25 = ["z"];
keymaps.AZER.vote0_0 = ["q"];
keymaps.AZER.vote1_0 = ["w"];
var keymap = keymaps.QWER;

INIT_TASKS.on_draw.push(function (template) {
  Prefs.define("hkm", ["QWER", "AZER", "DVOR"]);
  if (Prefs.get("pwr")) {
    var mapchange = function (nv) {
      if (!nv || !keymaps[nv]) {
        keymap = keymaps.QWER;
      } else {
        keymap = keymaps[nv];
      }

      if (!template.hotkeys_rate10) {
        return;
      }

      template.hotkeys_rate10.textContent = (
        keymap.rate10[0] + "-" + keymap.rate50[0]
      ).toUpperCase();
      template.hotkeys_rate05.textContent = (
        keymap.rate15[0] + "-" + keymap.rate45[0]
      ).toUpperCase();
      template.hotkeys_vote0.textContent = (
        keymap.vote0_0[0] + "," + keymap.vote0_1[0] + "," + keymap.vote0_2[0]
      ).toUpperCase();
      template.hotkeys_vote1.textContent = (
        keymap.vote1_0[0] + "," + keymap.vote1_1[0] + "," + keymap.vote1_2[0]
      ).toUpperCase();
      template.hotkeys_fave.textContent = keymap.fave[0].toUpperCase();

      if (keymap.play == " ") {
        template.hotkeys_play.textContent = "Space";
      } else {
        template.hotkeys_play.textContent = keymap.play;
      }
    };
    Prefs.add_callback("hkm", mapchange);
    mapchange();
  }
});

var backspaceTrap = false;
var backspaceTimer = false;

// these key codes are handled by on_key_down, as browser's default behaviour
// tend to act on them at that stage rather than on_key_press
// backspace, escape, down, up, page up, page down, home, end, right arrow, left arrow, tab
var keydownHandled = [8, 27, 38, 40, 33, 34, 36, 35, 39, 37, 9];

var preventDefault = function (evt) {
  evt.preventDefault(evt);
};

var enableBackspaceTrap = function () {
  if (backspaceTimer) clearTimeout(backspaceTimer);
  backspaceTimer = setTimeout(disableBackspaceTrap, 3000);
};

var disableBackspaceTrap = function () {
  backspaceTimer = false;
  backspaceTrap = false;
};

var onKeyPress = function (evt) {
  if (isIgnorable(evt)) return true;

  if (keydownHandled.indexOf(evt.keyCode) == -1) {
    return handleEvent(evt);
  }
  // trap backspace so users don't accidentally navigate away from the site
  if (backspaceTrap && evt.keyCode == 8) {
    preventDefault(evt);
    // no need to set enable_backspace_trap - that will already have been handled by key_down
    return false;
  }
};

var onKeyDown = function (evt) {
  if (isIgnorable(evt)) return true;
  // Short-circuit backspace on Webkit - which fires its backspace handler at the end of the keyDown bubble.
  if (evt.keyCode == 8) {
    // if event was handled, don't trap back
    backspaceTrap = !handleEvent(evt) || backspaceTrap;
    if (backspaceTrap) {
      enableBackspaceTrap();
      preventDefault(evt);
    }
    return !backspaceTrap;
  }
  // Code 27 is escape, and this stops esc from cancelling our AJAX requests by cutting it off early
  // Codes 38 and 40 are arrow keys, since Webkit browsers don't fire keyPress events on them and need to be handled here
  // All other codes should be handled by on_key_press
  else if (keydownHandled.indexOf(evt.keyCode) != -1) {
    handleEvent(evt);
    // these keys should always return false and prevent default
    // escape, as mentioned, will cause AJAX requests to stop
    // up/down arrow keys will cause unintended scrolling of the entire page (which we want to stop)
    preventDefault(evt);
    return false;
  }
};

// this exists just to handle the timeout for when the user releases the backspace
// user releases backspace, then X seconds later we release our backspace trap flag.
// this stops the user from accidentally browsing away from the site while using
// type to find, but doesn't stop them from leaving the site otherwise
var onKeyUp = function (evt) {
  if (backspaceTrap && evt.keyCode == 8) {
    enableBackspaceTrap();
    preventDefault(evt);
    return false;
  }
};

var isIgnorable = function (evt) {
  if (evt.ctrlKey || evt.altKey || evt.metaKey) return true;
  // we can't trap anything beyond here for opera without losing important keys
  if (!("charCode" in evt)) return false;
  // F1 to F12 keys
  if (evt.charCode === 0 && evt.keyCode >= 112 && evt.keyCode <= 123)
    return true;
  if (Sizing.simple && evt.keyCode != 27) return true;
  if (
    evt.target &&
    evt.target.classList.contains("search_box") &&
    evt.keyCode != 27
  )
    return true;
  if (document.body.classList.contains("search_open")) return true;
  return false;
};

var handleEvent = function (evt) {
  // thanks Quirksmode, not sure how relevant it is with present browsers though, but keeping it around
  var targ;
  if (!evt) evt = window.event;
  if (evt.target) targ = evt.target;
  else if (evt.srcElement) targ = evt.srcElement;
  if (targ.nodeType == 3) targ = targ.parentNode; // defeat Safari bug
  if (targ.tagName.toLowerCase() == "input" && targ.hasAttribute("stop"))
    return true;

  if (isIgnorable(evt)) {
    if (evt.keyCode == 27) {
      preventDefault(evt);
    }
    return true;
  }

  var chr = "";
  if (!("charCode" in evt)) {
    chr = String.fromCharCode(evt.keyCode);
  } else if (evt.charCode > 0) {
    chr = String.fromCharCode(evt.charCode);
  }

  // a true return here means subroutines did actually handle the keys, and we need to preventDefault...
  if (routeKey(evt.keyCode, chr, evt.shiftKey)) {
    preventDefault(evt);
    // ... which is unfortunately backwards from browsers, which expect "false" to stop the event bubble
    return false;
  }
  return true;
};

var canRouteToDetail = function () {
  return Router.activeDetail && Router.activeDetail._keyHandle;
};

var routeToLists = function () {
  if (routeToDetailState) {
    if (Router.activeList && Router.activeList.loaded) {
      Router.activeList.keyNavFocus();
    }
    if (canRouteToDetail()) {
      Router.activeDetail.keyNavBlur();
    }
  }
  routeToDetailState = false;
};

var routeToDetail = function () {
  if (!routeToDetailState && canRouteToDetail()) {
    routeToDetailState = true;
    Router.activeList.keyNavBlur();
    Router.activeDetail.keyNavFocus();
  }
};

var routeToDetailState = false;
var hotkeyModeOn = false;
var routeKey = function (keyCode, chr, shift) {
  if (hotkeyModeOn && hotkeyModeHandle(keyCode, chr)) {
    return true;
  } else if (keyCode == 96 || keymap.activate.indexOf(chr) !== -1) {
    return hotkeyModeEnable();
  }

  var routeTo = "activeList";
  if (routeToDetailState && canRouteToDetail()) {
    routeTo = "activeDetail";
  } else {
    routeToDetailState = false;
    if (!Router.activeList) return;
    if (!Router.activeList.loaded) return;
  }

  var toret;
  if (keyCode == 40) {
    // down arrow
    return Router[routeTo].keyNavDown();
  } else if (keyCode == 38) {
    // up arrow
    return Router[routeTo].keyNavUp();
  } else if (keyCode == 13) {
    // enter
    return Router[routeTo].keyNavEnter();
  } else if (/[\d\w\-.&':+~,]+/.test(chr)) {
    return Router[routeTo].keyNavAddCharacter(chr);
  } else if (chr == " ") {
    // spacebar
    return Router[routeTo].keyNavAddCharacter(" ");
  } else if (keyCode == 34) {
    // page down
    return Router[routeTo].keyNavPageDown();
  } else if (keyCode == 33) {
    // page up
    return Router[routeTo].keyNavPageUp();
  } else if (keyCode == 8) {
    // backspace
    return Router[routeTo].keyNavBackspace();
  } else if (keyCode == 36) {
    // home
    return Router[routeTo].keyNavHome();
  } else if (keyCode == 35) {
    // end
    return Router[routeTo].keyNavEnd();
  } else if (keyCode == 37) {
    // left arrow
    toret = Router[routeTo].keyNavLeft();
    if (!toret && routeToDetailState) {
      toret = true;
      routeToLists();
    }
    return toret;
  } else if (keyCode == 39) {
    // right arrow
    toret = Router[routeTo].keyNavRight();
    if (!toret && !routeToDetailState && canRouteToDetail()) {
      toret = true;
      routeToDetail();
    }
    return toret;
  } else if (keyCode == 27) {
    // escape
    Router.activeList.keyNavEscape();
    if (canRouteToDetail()) {
      Router.activeDetail.keyNavEscape();
    }
    routeToDetailState = false;
    return true;
  } else if (keyCode == 9) {
    // tab
    if (shift) {
      Router.tabBackwards();
    } else {
      Router.tabForward();
    }
  }

  return false;
};

var hotkeyModeTimeout;
var hotkeyModeErrorTimeout;

var hotkeyModeDisable = function () {
  if (hotkeyModeTimeout) {
    clearTimeout(hotkeyModeTimeout);
  }
  hotkeyModeOn = false;
  document.body.classList.remove("hotkey_on");
  return true;
};

var hotkeyModeEnable = function () {
  hotkeyModeOn = true;
  if (hotkeyModeTimeout) {
    clearTimeout(hotkeyModeTimeout);
  }
  if (hotkeyModeErrorTimeout) {
    document.body.classList.remove("hotkey_error");
    clearTimeout(hotkeyModeErrorTimeout);
  }
  hotkeyModeTimeout = setTimeout(hotkeyModeDisable, 4000);
  document.body.classList.add("hotkey_on");
  return true;
};

var hotkeyModeError = function (tlKey) {
  hotkeyModeDisable();
  document.body.classList.add("hotkey_error");
  document.getElementById("hotkey_error").textContent = $l(tlKey);
  hotkeyModeErrorTimeout = setTimeout(function () {
    document.body.classList.remove("hotkey_error");
  }, 3000);
};

var hotkeyModeHandle = function (keyCode, character) {
  try {
    if (keymap.rate10.indexOf(character) !== -1)
      Timeline.rateCurrentSong(1.0);
    else if (keymap.rate15.indexOf(character) !== -1)
      Timeline.rateCurrentSong(1.5);
    else if (keymap.rate20.indexOf(character) !== -1)
      Timeline.rateCurrentSong(2.0);
    else if (keymap.rate25.indexOf(character) !== -1)
      Timeline.rateCurrentSong(2.5);
    else if (keymap.rate30.indexOf(character) !== -1)
      Timeline.rateCurrentSong(3.0);
    else if (keymap.rate35.indexOf(character) !== -1)
      Timeline.rateCurrentSong(3.5);
    else if (keymap.rate40.indexOf(character) !== -1)
      Timeline.rateCurrentSong(4.0);
    else if (keymap.rate45.indexOf(character) !== -1)
      Timeline.rateCurrentSong(4.5);
    else if (keymap.rate50.indexOf(character) !== -1)
      Timeline.rateCurrentSong(5.0);
    else if (keymap.play.indexOf(character) !== -1) RWAudio.playToggle();
    else if (keymap.vote0_0.indexOf(character) !== -1) Timeline.vote(0, 0);
    else if (keymap.vote0_1.indexOf(character) !== -1) Timeline.vote(0, 1);
    else if (keymap.vote0_2.indexOf(character) !== -1) Timeline.vote(0, 2);
    else if (keymap.vote1_0.indexOf(character) !== -1) Timeline.vote(1, 0);
    // quertz layout
    else if (keymap.vote1_1.indexOf(character) !== -1) Timeline.vote(1, 1);
    else if (keymap.vote1_2.indexOf(character) !== -1) Timeline.vote(1, 2);
    else if (keymap.fave.indexOf(character) !== -1) Timeline.favCurrent();
    else {
      hotkeyModeError("invalid_hotkey");
      return true;
    }
    hotkeyModeDisable();
    return true;
  } catch (err) {
    if ("is_rw" in err) {
      hotkeyModeError(err.tl_key);
      return true;
    } else {
      throw err;
    }
  }
};

window.addEventListener("keydown", onKeyDown, true);
window.addEventListener("keypress", onKeyPress, true);
window.addEventListener("keyup", onKeyUp, true);

export {
  preventDefault,
  enableBackspaceTrap,
  disableBackspaceTrap,
  onKeyPress,
  onKeyDown,
  onKeyUp,
  isIgnorable,
  handleEvent,
  routeToLists,
  routeToDetail,
  routeKey,
};

import { isSimpleMode } from '../../../src/helpers/isSimpleMode';

let backspaceTrap = false;
let backspaceTimer: ReturnType<typeof setTimeout> | undefined = undefined;

// these key codes are handled by on_key_down, as browser's default behaviour
// tend to act on them at that stage rather than on_key_press
// backspace, escape, down, up, page up, page down, home, end, right arrow, left arrow, tab
const keydownHandled = [8, 27, 38, 40, 33, 34, 36, 35, 39, 37, 9];

function disableBackspaceTrap(): void {
  backspaceTimer = undefined;
  backspaceTrap = false;
}

function enableBackspaceTrap(): void {
  if (backspaceTimer) {
    clearTimeout(backspaceTimer);
  }
  backspaceTimer = setTimeout(disableBackspaceTrap, 3000);
}

const fKeys = /^F\d+$/;
function shouldProcessKeyboardEvent(evt: KeyboardEvent): boolean {
  if (evt.ctrlKey || evt.altKey || evt.metaKey) {
    return false;
  }
  if (fKeys.test(evt.key)) {
    return false;
  }
  const isEscape = evt.key === 'Escape';
  if (isSimpleMode() && isEscape) {
    return false;
  }
  // TODO: validate
  if ((evt.target as HTMLElement)?.classList.contains('search-box') && isEscape) {
    return false;
  }
  // TODO: validate
  if (document.body.classList.contains('search-open')) {
    return false;
  }

  return true;
}

function handleKeyboardEvent(evt: KeyboardEvent): void {
  const target = evt.target as HTMLElement | undefined;
  if (target?.tagName.toLowerCase() === 'input') {
    return;
  }

  if (!shouldProcessKeyboardEvent(evt)) {
    // TODO: validate escape does not break the site
    // if it does, add a check for escape here and prevent default
    return;
  }

  let chr = '';
  if (!('charCode' in evt)) {
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
}

function onKeyPress(evt: KeyboardEvent): void {
  if (shouldProcessKeyboardEvent(evt)) {
    return true;
  }

  if (keydownHandled.indexOf(evt.keyCode) == -1) {
    return handleEvent(evt);
  }
  // trap backspace so users don't accidentally navigate away from the site
  if (backspaceTrap && evt.keyCode == 8) {
    preventDefault(evt);
    // no need to set enable_backspace_trap - that will already have been handled by key_down
    return false;
  }
}

const onKeyDown = function (evt) {
  if (shouldProcessKeyboardEvent(evt)) {
    return true;
  }
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
const onKeyUp = function (evt) {
  if (backspaceTrap && evt.keyCode == 8) {
    enableBackspaceTrap();
    preventDefault(evt);

    return false;
  }
};

const canRouteToDetail = function () {
  return Router.activeDetail?._keyHandle;
};

const routeToLists = function () {
  if (routeToDetailState) {
    if (Router.activeList?.loaded) {
      Router.activeList.keyNavFocus();
    }
    if (canRouteToDetail()) {
      Router.activeDetail.keyNavBlur();
    }
  }
  routeToDetailState = false;
};

const routeToDetail = function () {
  if (!routeToDetailState && canRouteToDetail()) {
    routeToDetailState = true;
    Router.activeList.keyNavBlur();
    Router.activeDetail.keyNavFocus();
  }
};

let routeToDetailState = false;
const hotkeyModeOn = false;
const routeKey = function (keyCode, chr, shift) {
  if (hotkeyModeOn && hotkeyModeHandle(keyCode, chr)) {
    return true;
  } else if (keyCode == 96 || keymap.activate.indexOf(chr) !== -1) {
    return hotkeyModeEnable();
  }

  let routeTo = 'activeList';
  if (routeToDetailState && canRouteToDetail()) {
    routeTo = 'activeDetail';
  } else {
    routeToDetailState = false;
    if (!Router.activeList) {
      return;
    }
    if (!Router.activeList.loaded) {
      return;
    }
  }

  let toret;
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
  } else if (chr == ' ') {
    // spacebar
    return Router[routeTo].keyNavAddCharacter(' ');
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

window.addEventListener('keydown', onKeyDown, true);
window.addEventListener('keypress', onKeyPress, true);
window.addEventListener('keyup', onKeyUp, true);

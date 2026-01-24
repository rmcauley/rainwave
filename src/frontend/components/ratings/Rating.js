var albumCallback = null;

// PREF CALLBACKS

var ratingClearToggle = function (v) {
  if (v) {
    document.body.classList.add("rating_clear_ok");
  } else {
    document.body.classList.remove("rating_clear_ok");
  }
};

var ratingCompleteToggle = function (useComplete) {
  if (useComplete) {
    document.body.classList.add("show_incomplete");
  } else {
    document.body.classList.remove("show_incomplete");
  }
};

var hideGlobalRatingCallback = function (hideGlobals) {
  if (hideGlobals) {
    document.body.classList.add("hide_global_ratings");
  } else {
    document.body.classList.remove("hide_global_ratings");
  }
};

// API CALLBACKS

var ratingApiCallback = function (json) {
  // Errors are handled in the individual rating functions, not globally here.
  if (!json.success) return;

  var ratings, i, a;

  ratings = document.getElementsByName("srate_" + json.song_id);
  for (i = 0; i < ratings.length; i++) {
    if (json.rating_user) {
      ratings[i].classList.add("rating_user");
      ratings[i].classList.remove("rating_global");
      ratings[i].ratingStart(json.rating_user);
      ratings[i]._ratingUser = json.rating_user;
      if (ratings[i].lastChild) {
        ratings[i].lastChild.textContent = Formatting.rating(json.rating_user);
      }
      if (
        ratings[i].previousSibling &&
        ratings[i].previousSibling.classList.contains("rating_clear")
      ) {
        ratings[i].previousSibling.classList.add("capable");
      }
    } else if (json.rating) {
      ratings[i].classList.remove("rating_user");
      ratings[i].classList.add("rating_global");
      ratings[i].ratingStart(json.rating);
      ratings[i]._ratingUser = null;
      if (ratings[i].lastChild) {
        ratings[i].lastChild.textContent = "";
      }
      if (
        ratings[i].previousSibling &&
        ratings[i].previousSibling.classList.contains("rating_clear")
      ) {
        ratings[i].previousSibling.classList.remove("capable");
      }
    } else {
      ratings[i].classList.remove("rating_user");
      ratings[i].classList.add("rating_global");
      ratings[i].ratingStart(0);
      ratings[i]._ratingUser = null;
      if (ratings[i].lastChild) {
        ratings[i].lastChild.textContent = "";
      }
      if (
        ratings[i].previousSibling &&
        ratings[i].previousSibling.classList.contains("rating_clear")
      ) {
        ratings[i].previousSibling.classList.remove("capable");
      }
    }
  }

  for (i = 0; i < json.updated_album_ratings.length; i++) {
    if (json.updated_album_ratings[i]) {
      a = json.updated_album_ratings[i];
      ratings = document.getElementsByName("arate_" + a.id);
      for (i = 0; i < ratings.length; i++) {
        if (a.rating_user) {
          ratings[i].classList.add("rating_user");
          ratings[i].classList.remove("rating_global");
          ratings[i].ratingStart(a.rating_user);
          if (ratings[i].lastChild) {
            ratings[i].lastChild.textContent = Formatting.rating(a.rating_user);
          }
        } else if (a.rating) {
          ratings[i].classList.remove("rating_user");
          ratings[i].classList.add("rating_global");
          ratings[i].ratingStart(a.rating);
          if (ratings[i].lastChild) {
            ratings[i].lastChild.textContent = "";
          }
        } else {
          ratings[i].classList.remove("rating_user");
          ratings[i].classList.add("rating_global");
          ratings[i].ratingStart(0);
          if (ratings[i].lastChild) {
            ratings[i].lastChild.textContent = "";
          }
        }
        if (!a.rating_complete) {
          ratings[i].classList.add("rating_incomplete");
        } else {
          ratings[i].classList.remove("rating_incomplete");
        }
      }
      if (albumCallback) {
        albumCallback(json.updated_album_ratings);
      }
    }
  }
};

// RATING EFFECTS

var ratingStep = function (steptime) {
  if (steptime < this.rating_started + 300 && this.rating_now != this.rating_to) {
    var timeoverduration = (steptime - this.rating_started) / 300;
    this.rating_now =
      -(this.rating_to - this.rating_from) *
        timeoverduration *
        (timeoverduration - 2) +
      this.rating_from;
    this.rating_anim_id = requestAnimationFrame(this.ratingStep);
  } else {
    this.rating_now = this.rating_to;
    this.rating_anim_id = null;
  }
  // R4 bar image calculation
  // this.style.backgroundPosition = "0px " + (-(Math.round((Math.round(this.rating_now * 10) / 2)) * 30) + 3) + "px";
  // R5 images
  this.style.backgroundPosition =
    "0px " + (-(Math.round(Math.round(this.rating_now * 10) / 2) * 28) + 3) + "px";
};

var ratingSet = function (pos) {
  this.rating_now = pos;
  this.rating_to = pos;
  if (!this.rating_anim_id) {
    this.ratingStep(this.rating_started);
  }
};

var ratingStart = function (stopat) {
  if (this.rating_to == stopat) return;
  this.rating_started = performance.now();
  this.rating_to = stopat;
  this.rating_from = this.rating_now;
  if (!this.rating_anim_id) {
    this.ratingStep(this.rating_started);
  }
};

var addEffect = function (el) {
  el.rating_to = 0;
  el.rating_from = 0;
  el.rating_now = 0;
  el.rating_started = 0;
  el.rating_anim_id = null;
  // I have tested this and found it to not cause any memory leaks!
  // I still feel dirty though.
  el.ratingSet = ratingSet.bind(el);
  el.ratingStart = ratingStart.bind(el);
  el.ratingStep = ratingStep.bind(el);
};

var getRatingFromMouse = function (evt) {
  var x, y;
  if (typeof evt.offsetX != "undefined" && typeof evt.offsetY != "undefined") {
    x = evt.offsetX;
    y = evt.offsetY;
  } else {
    x = evt.layerX || evt.x;
    y = evt.layerY || evt.y;
  }

  if (x < 0 || y < 0) return 1;
  var result = Math.round(((x - 4 + (18 - y) * 0.5) / 10) * 2) / 2;
  if (result <= 1) return 1;
  else if (result >= 5) return 5;
  return result;
};

var isTouching = false;
var touchTimer;
var startTouchTimer;
var touchingSong;
var lastTouch;
var clearTouch = function () {
  touchTimer = false;
  isTouching = false;
};

var holdToRates = [];

var touchend = function () {
  for (var i = 0; i < holdToRates.length; i++) {
    holdToRates[i].parentNode.removeChild(holdToRates[i]);
  }
  holdToRates = [];
  if (touchTimer) {
    clearTimeout(touchTimer);
  }
  if (startTouchTimer) {
    clearTimeout(startTouchTimer);
  }
  touchTimer = setTimeout(clearTouch, 30);
  if (touchingSong) {
    touchingSong.$t.rating.classList.remove("starting_touch");
  }
  document.body.removeEventListener("touchend", touchend);
  document.body.removeEventListener("touchcancel", touchend);
  document.body.removeEventListener("touchmove", scrollCheck);
};

var scrollCheckMin;
var scrollCheckMax;
var scrollCheck = function (e) {
  if (
    e.touches[0].pageY < scrollCheckMin ||
    e.touches[0].pageY > scrollCheckMax
  ) {
    touchend(e);
  }
  lastTouch = e;
};

var triggerTouchRating = function (e) {
  e.preventDefault();

  document.body.addEventListener("touchend", touchend);
  document.body.addEventListener("touchcancel", touchend);

  touchingSong.$t.rating.classList.add("starting_touch");

  var holdToRate = document.createElement("div");
  holdToRate.textContent = $l("hold_to_rate");
  holdToRate.className = "hold_to_rate";
  touchingSong.$t.rating.appendChild(holdToRate);
  holdToRates.push(holdToRate);

  lastTouch = e;
  scrollCheckMin = e.touches[0].pageY - 15;
  scrollCheckMax = e.touches[0].pageY + 15;
  if (startTouchTimer) {
    clearTimeout(startTouchTimer);
  }
  startTouchTimer = setTimeout(doTouchRating, 500);

  document.body.addEventListener("touchmove", scrollCheck);
};

var ratingWidth = 58;
var sliderWidth = 200;
var doTouchRating = function () {
  // document.body.addEventListener("touchend", touchend);
  // document.body.addEventListener("touchcancel", touchend);
  document.body.removeEventListener("touchmove", scrollCheck);

  for (var i = 0; i < holdToRates.length; i++) {
    holdToRates[i].parentNode.removeChild(holdToRates[i]);
  }
  holdToRates = [];

  var zeroX =
    touchingSong.$t.rating.offsetLeft + ratingWidth - sliderWidth - 10;
  var zeroY = lastTouch.touches[0].pageY;
  touchingSong.$t.rating.classList.remove("starting_touch");
  var t = RWTemplates.rating_mobile();
  var cancelling = false;
  var nowNumber = 5;
  var remove = function (e) {
    if (!cancelling && touchingSong && touchingSong.$t && e.target == touchingSong.$t.rating) {
      doRating(nowNumber, touchingSong);
    } else if (touchingSong) {
      doRating(null, touchingSong);
    }
    Fx.removeElement(t.el);
    if (touchingSong && touchingSong.el) {
      touchingSong.el.classList.remove("on_top");
    }
    touchingSong = false;
    document.body.removeEventListener("touchmove", touchmove);
    document.body.removeEventListener("touchend", remove);
    document.body.removeEventListener("touchcancel", remove);
  };
  var highlight = function (rating, width) {
    t.number.style[Fx.transform] =
      "translateX(" + Math.max(15, width - 15) + "px)";
    t.slider.style.backgroundPosition =
      "0px " +
      -(Math.max(5, Math.min(25, Math.floor(width / ((sliderWidth - 25) / 24)))) * 96) +
      "px";
    if (rating === nowNumber) return;
    nowNumber = rating;
    t.number.textContent = Formatting.rating(rating);
  };
  var touchmove = function (e) {
    e.preventDefault();
    if (e.touches[0].pageY < zeroY - 40 || e.touches[0].pageY > zeroY + 40) {
      if (!cancelling) {
        t.number.textContent = $l("Cancel");
        t.slider.style.backgroundPosition = "0px -20px";
        cancelling = true;
        nowNumber = false;
      }
      return;
    }
    cancelling = false;
    var rating =
      Math.floor((e.touches[0].pageX - (zeroX + 25)) / ((sliderWidth - 25) / 9)) /
        2 +
      1;
    rating = Math.min(Math.max(1, rating), 5);
    highlight(rating, Math.min(sliderWidth, Math.max(0, e.touches[0].pageX - zeroX)));
  };
  document.body.addEventListener("touchend", remove);
  document.body.addEventListener("touchcancel", remove);
  document.body.addEventListener("touchmove", touchmove);
  touchingSong.$t.rating.appendChild(t.el);
  touchmove(lastTouch);
  requestAnimationFrame(function () {
    if (touchingSong.el) {
      touchingSong.el.classList.add("on_top");
    }
    t.el.classList.add("show");
  });
};

var doRating = function (newRating, json) {
  var confirm = document.createElement("div");
  confirm.className = "rating_number rating_confirm";
  confirm.textContent = Formatting.rating(newRating);
  confirm.style[Fx.transform] =
    "translateX(" + Math.round((newRating / 5.0) * 50 - 15) + "px) scaleX(0.2)";
  json.$t.rating.insertBefore(confirm, json.$t.rating.firstChild);
  requestNextAnimationFrame(function () {
    confirm.classList.add("confirming");
  });
  var ratingErr = function () {
    if (newRating === null) {
      confirm.textContent = "x";
    } else {
      confirm.textContent = "!";
    }
    confirm.classList.add("bad_rating");
    setTimeout(function () {
      confirm.style.opacity = "0";
      setTimeout(function () {
        confirm.parentNode.removeChild(confirm);
      }, 250);
    }, 1500);
  };
  if (newRating === null) {
    ratingErr();
    return;
  }
  API.async_get(
    "rate",
    { rating: newRating, song_id: json.id },
    function (newjson) {
      requestNextAnimationFrame(function () {
        confirm.classList.add("confirmed");
      });
      json.rating_user = newjson.rate_result.rating_user;
      if (json.$t.rating_clear) {
        json.$t.rating_clear.parentNode.classList.add("capable");
      }
      setTimeout(function () {
        if (!confirm.previousSibling) {
          confirm.classList.add("fading");
        }
        confirm.style.opacity = "0";
        setTimeout(function () {
          confirm.parentNode.removeChild(confirm);
        }, 250);
      }, 1500);
    },
    ratingErr,
  );
};

var fakeEffect = function (json, rating) {
  json.$t.rating.rating_to = rating;
  ratingStep.call(json.$t.rating, 0);
  json.$t.rating_hover_number.textContent = Formatting.rating(rating);
};

// INDIVIDUAL RATING BAR CODE

var register = function (json) {
  if (!json || !json.$t.rating || !json.id || isNaN(json.id)) {
    return;
  }
  if (json.rating_user && (json.rating_user < 1 || json.rating_user > 5)) {
    json.rating_user = null;
  }
  if (json.rating && (json.rating < 1 || json.rating > 5)) {
    json.rating = null;
  }

  addEffect(json.$t.rating);

  if (User.id > 1) {
    var isSong =
      json.title ||
      json.albums ||
      json.album_id ||
      json.album_rating ||
      json.artist_parseable
        ? true
        : false;
    if (isSong) registerSong(json);
    else registerAlbum(json);

    if (json.rating_user) {
      json.$t.rating.classList.add("rating_user");
      json.$t.rating.classList.remove("rating_global");
      if (json.$t.rating_clear) {
        json.$t.rating_clear.parentNode.classList.add("capable");
      }
    } else {
      json.$t.rating.classList.add("rating_global");
    }
  } else {
    json.$t.rating.classList.remove("rating_global");
  }
  json.$t.rating.ratingSet(json.rating_user || json.rating);

  if (!Sizing.simple && json.rating_user) {
    json.$t.rating_hover_number.textContent = Formatting.rating(json.rating_user);
  }

  // DO NOT RETURN ANYTHING HERE
  // You run an almost 100% certain risk of memory leaks due to
  // circular references if you return a function or object
  // that refers to or uses "json" in any way.
};

var registerAlbum = function (json) {
  json.$t.rating.setAttribute("name", "arate_" + json.id);
  json.$t.rating.classList.add("album_rating");

  if (!json.rating_complete) {
    json.$t.rating.classList.add("rating_incomplete");
  } else {
    json.$t.rating.classList.remove("rating_incomplete");
  }
};

var registerSong = function (json) {
  json.$t.rating.classList.add("song_rating");
  json.$t.rating.setAttribute("name", "srate_" + json.id);

  if (json.$t.rating_clear) {
    json.$t.rating_clear.addEventListener("click", function () {
      API.async_get("clear_rating", { song_id: json.id }, function () {
        json.rating_user = null;
        json.$t.rating_clear.parentNode.classList.remove("capable");
      });
    });
  }

  var onMouseMove = function (evt) {
    if (!json.rating_allowed && !User.rate_anything) return;
    if (evt.target !== this) {
      if (Prefs.get("r_noglbl")) {
        json.$t.rating.ratingSet(0);
      }
      return;
    }
    var tr = getRatingFromMouse(evt);
    if (tr) {
      json.$t.rating.ratingSet(tr);
      json.$t.rating_hover_number.textContent = Formatting.rating(tr);
    }
  };

  var onMouseOver = function (evt) {
    if (json.$t.rating._ratingUser) {
      json.rating_user = json.$t.rating._ratingUser;
      json.$t.rating._ratingUser = null;
    }
    if (!json.rating_allowed && !User.rate_anything) {
      if (json.$t.rating.classList.contains("ratable")) {
        json.$t.rating.classList.remove("ratable");
      }
      return;
    }
    if (!json.$t.rating.classList.contains("ratable")) {
      json.$t.rating.classList.add("ratable");
    }
    onMouseMove(evt);
  };

  var onMouseOut = function () {
    this.ratingStart(json.rating_user || json.rating);
    if (!Sizing.simple) {
      if (json.rating_user) {
        json.$t.rating_hover_number.textContent = Formatting.rating(json.rating_user);
      } else {
        json.$t.rating_hover_number.textContent = "";
      }
    }
  };

  var click = function (evt) {
    evt.stopPropagation();
    if (isTouching) return;
    if (!json.rating_allowed && !User.rate_anything) return;
    if (evt.target !== this) return;
    doRating(getRatingFromMouse(evt), json);
  };

  if (User.id > 1) {
    // this is for requests, if a request is not available
    // on this station do not allow rating it
    if ("good" in json && !json.good) {
      // remove the srate attribute so this will
      // never pick up any ratings update
      // it should be super isolated
      json.$t.rating.setAttribute("name", "");
    } else {
      json.$t.rating._json = json;
      json.$t.rating.addEventListener("mouseover", onMouseOver);
      json.$t.rating.addEventListener("mousemove", onMouseMove);
      json.$t.rating.addEventListener("mouseleave", onMouseOut);
      json.$t.rating.addEventListener("click", click);
      json.$t.rating.addEventListener("touchstart", function (e) {
        isTouching = true;
        touchingSong = json;
        triggerTouchRating(e);
      });
    }
  }
};

INIT_TASKS.on_init.push(function () {
  API.add_callback("rate_result", ratingApiCallback);

  Prefs.define("r_incmplt", [false, true], true);
  Prefs.add_callback("r_incmplt", ratingCompleteToggle);
  Prefs.define("r_noglbl", [false, true], true);
  Prefs.add_callback("r_noglbl", hideGlobalRatingCallback);
  Prefs.define("r_clear", [false, true], true);
  Prefs.add_callback("r_clear", ratingClearToggle);

  ratingCompleteToggle(Prefs.get("r_incmplt"));
  hideGlobalRatingCallback(Prefs.get("r_noglbl"));
  ratingClearToggle(Prefs.get("r_clear"));
});

export { albumCallback, doRating, fakeEffect, register };

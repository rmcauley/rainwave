

let isTouching = false;
let touchTimer;
let startTouchTimer;
let touchingSong;
let lastTouch;
const clearTouch = function () {
  touchTimer = false;
  isTouching = false;
};

let holdToRates = [];

const touchend = function () {
  for (let i = 0; i < holdToRates.length; i++) {
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
    touchingSong.$t.rating.classList.remove('starting-touch');
  }
  document.body.removeEventListener('touchend', touchend);
  document.body.removeEventListener('touchcancel', touchend);
  document.body.removeEventListener('touchmove', scrollCheck);
};

let scrollCheckMin;
let scrollCheckMax;
const scrollCheck = function (e) {
  if (e.touches[0].pageY < scrollCheckMin || e.touches[0].pageY > scrollCheckMax) {
    touchend(e);
  }
  lastTouch = e;
};

const triggerTouchRating = function (e) {
  e.preventDefault();

  document.body.addEventListener('touchend', touchend);
  document.body.addEventListener('touchcancel', touchend);

  touchingSong.$t.rating.classList.add('starting-touch');

  const holdToRate = document.createElement('div');
  holdToRate.textContent = $l('hold_to_rate');
  holdToRate.className = 'hold-to-rate';
  touchingSong.$t.rating.appendChild(holdToRate);
  holdToRates.push(holdToRate);

  lastTouch = e;
  scrollCheckMin = e.touches[0].pageY - 15;
  scrollCheckMax = e.touches[0].pageY + 15;
  if (startTouchTimer) {
    clearTimeout(startTouchTimer);
  }
  startTouchTimer = setTimeout(doTouchRating, 500);

  document.body.addEventListener('touchmove', scrollCheck);
};

const ratingWidth = 58;
const sliderWidth = 200;
const doTouchRating = function () {
  // document.body.addEventListener("touchend", touchend);
  // document.body.addEventListener("touchcancel", touchend);
  document.body.removeEventListener('touchmove', scrollCheck);

  for (let i = 0; i < holdToRates.length; i++) {
    holdToRates[i].parentNode.removeChild(holdToRates[i]);
  }
  holdToRates = [];

  const zeroX = touchingSong.$t.rating.offsetLeft + ratingWidth - sliderWidth - 10;
  const zeroY = lastTouch.touches[0].pageY;
  touchingSong.$t.rating.classList.remove('starting-touch');
  const t = RWTemplates.rating_mobile();
  let cancelling = false;
  let nowNumber = 5;
  const remove = function (e) {
    if (!cancelling && touchingSong?.$t && e.target == touchingSong.$t.rating) {
      doRating(nowNumber, touchingSong);
    } else if (touchingSong) {
      doRating(null, touchingSong);
    }
    Fx.removeElement(t.el);
    if (touchingSong?.el) {
      touchingSong.el.classList.remove('on-top');
    }
    touchingSong = false;
    document.body.removeEventListener('touchmove', touchmove);
    document.body.removeEventListener('touchend', remove);
    document.body.removeEventListener('touchcancel', remove);
  };
  const highlight = function (rating, width) {
    t.number.style[Fx.transform] = `translateX(${  Math.max(15, width - 15)  }px)`;
    t.slider.style.backgroundPosition =
      `0px ${ 
      -(Math.max(5, Math.min(25, Math.floor(width / ((sliderWidth - 25) / 24)))) * 96) 
      }px`;
    if (rating === nowNumber) {return;}
    nowNumber = rating;
    t.number.textContent = Formatting.rating(rating);
  };
  var touchmove = function (e) {
    e.preventDefault();
    if (e.touches[0].pageY < zeroY - 40 || e.touches[0].pageY > zeroY + 40) {
      if (!cancelling) {
        t.number.textContent = $l('Cancel');
        t.slider.style.backgroundPosition = '0px -20px';
        cancelling = true;
        nowNumber = false;
      }
      
return;
    }
    cancelling = false;
    let rating = Math.floor((e.touches[0].pageX - (zeroX + 25)) / ((sliderWidth - 25) / 9)) / 2 + 1;
    rating = Math.min(Math.max(1, rating), 5);
    highlight(rating, Math.min(sliderWidth, Math.max(0, e.touches[0].pageX - zeroX)));
  };
  document.body.addEventListener('touchend', remove);
  document.body.addEventListener('touchcancel', remove);
  document.body.addEventListener('touchmove', touchmove);
  touchingSong.$t.rating.appendChild(t.el);
  touchmove(lastTouch);
  requestAnimationFrame(function () {
    if (touchingSong.el) {
      touchingSong.el.classList.add('on-top');
    }
    t.el.classList.add('show');
  });
};

const fakeEffect = function (json, rating) {
  json.$t.rating.rating_to = rating;
  ratingStep.call(json.$t.rating, 0);
  json.$t.rating_hover_number.textContent = Formatting.rating(rating);
};

// INDIVIDUAL RATING BAR CODE

const register = function (json) {
  if (!json?.$t.rating || !json.id || isNaN(json.id)) {
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
    const isSong =
      json.title || json.albums || json.album_id || json.album_rating || json.artist_parseable
        ? true
        : false;
    if (isSong) {registerSong(json);}
    else {registerAlbum(json);}

    if (json.rating_user) {
      json.$t.rating.classList.add('rating-user');
      json.$t.rating.classList.remove('rating-global');
      if (json.$t.rating_clear) {
        json.$t.rating_clear.parentNode.classList.add('capable');
      }
    } else {
      json.$t.rating.classList.add('rating-global');
    }
  } else {
    json.$t.rating.classList.remove('rating-global');
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

const registerAlbum = function (json) {
  json.$t.rating.setAttribute('name', `arate_${  json.id}`);
  json.$t.rating.classList.add('album-rating');

  if (!json.rating_complete) {
    json.$t.rating.classList.add('rating-incomplete');
  } else {
    json.$t.rating.classList.remove('rating-incomplete');
  }
};

const registerSong = function (json) {
  json.$t.rating.classList.add('song-rating');
  json.$t.rating.setAttribute('name', `srate_${  json.id}`);

  if (json.$t.rating_clear) {
    json.$t.rating_clear.addEventListener('click', function () {
      API.async_get('clear_rating', { song_id: json.id }, function () {
        json.rating_user = null;
        json.$t.rating_clear.parentNode.classList.remove('capable');
      });
    });
  }

  const onMouseMove = function (evt) {
    if (!json.rating_allowed && !User.rate_anything) {return;}
    if (evt.target !== this) {
      if (Prefs.get('r_noglbl')) {
        json.$t.rating.ratingSet(0);
      }
      
return;
    }
    const tr = getRatingFromMouse(evt);
    if (tr) {
      json.$t.rating.ratingSet(tr);
      json.$t.rating_hover_number.textContent = Formatting.rating(tr);
    }
  };

  const onMouseOver = function (evt) {
    if (json.$t.rating._ratingUser) {
      json.rating_user = json.$t.rating._ratingUser;
      json.$t.rating._ratingUser = null;
    }
    if (!json.rating_allowed && !User.rate_anything) {
      if (json.$t.rating.classList.contains('ratable')) {
        json.$t.rating.classList.remove('ratable');
      }
      
return;
    }
    if (!json.$t.rating.classList.contains('ratable')) {
      json.$t.rating.classList.add('ratable');
    }
    onMouseMove(evt);
  };

  const onMouseOut = function () {
    this.ratingStart(json.rating_user || json.rating);
    if (!Sizing.simple) {
      if (json.rating_user) {
        json.$t.rating_hover_number.textContent = Formatting.rating(json.rating_user);
      } else {
        json.$t.rating_hover_number.textContent = '';
      }
    }
  };

  const click = function (evt) {
    evt.stopPropagation();
    if (isTouching) {return;}
    if (!json.rating_allowed && !User.rate_anything) {return;}
    if (evt.target !== this) {return;}
    doRating(getRatingFromMouse(evt), json);
  };

  if (User.id > 1) {
    // this is for requests, if a request is not available
    // on this station do not allow rating it
    if ('good' in json && !json.good) {
      // remove the srate attribute so this will
      // never pick up any ratings update
      // it should be super isolated
      json.$t.rating.setAttribute('name', '');
    } else {
      json.$t.rating._json = json;
      json.$t.rating.addEventListener('mouseover', onMouseOver);
      json.$t.rating.addEventListener('mousemove', onMouseMove);
      json.$t.rating.addEventListener('mouseleave', onMouseOut);
      json.$t.rating.addEventListener('click', click);
      json.$t.rating.addEventListener('touchstart', function (e) {
        isTouching = true;
        touchingSong = json;
        triggerTouchRating(e);
      });
    }
  }
};

INIT_TASKS.on_init.push(function () {
  api.addEventListener('rate_result', ratingApiCallback);

  Prefs.define('r_incmplt', [false, true], true);
  Prefs.add_callback('r_incmplt', ratingCompleteToggle);
  Prefs.define('r_noglbl', [false, true], true);
  Prefs.add_callback('r_noglbl', hideGlobalRatingCallback);
  Prefs.define('r_clear', [false, true], true);
  Prefs.add_callback('r_clear', ratingClearToggle);
});

export { albumCallback, doRating, fakeEffect, register };

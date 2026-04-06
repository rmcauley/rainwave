let oldUrl;
const tabs = {};
const lists = {};
const cache = {};
let currentType;
let currentId;
let currentOpenType;
let el;
const views = {};
let scroll;
const scrollPositions = {};
let cachePageStack;
let activeList = null;
let activeDetail = null;
let readyToRender = true;
let renderedType;
let renderedId;
let lastOpen;
let lastOpenId;
let detailHeader;
let resetCacheOnNextRequest = false;
let requestInFlight = false;
const tabOrder = ['album', 'artist', 'group', 'request_line'];
let forceCloseDetail = false;

// if (!Router.detectUrlChange()) {
//   if (!Sizing.simple && docCookies.getItem('r5_list')) {
//     Router.change(docCookies.getItem('r5_list'));
//   } else if (Sizing.simple) {
//     docCookies.removeItem('r5_list', '/', BOOTSTRAP.cookie_domain);
//   }
// }

const resetCache = function () {
  // console.log("Cache reset.");
  cache.album = {};
  cache.artist = {};
  cache.group = {};
  cache.request_line = {};
  cache.listener = {};
  cachePageStack = [];

  if (el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }

    renderedType = null;
    renderedId = null;
  }

  if (detailHeader) {
    detailHeader.textContent = '';
  }
};

INIT_TASKS.on_init.push(function (rootTemplate) {
  tabs.album = true;
  views.album = AlbumView;
  scrollPositions.album = {};

  tabs.artist = true;
  views.artist = ArtistView;
  scrollPositions.artist = {};

  if (!MOBILE) {
    tabs.group = true;
    views.group = GroupView;
    scrollPositions.group = {};

    views.request_line = ListenerView;
    tabs.request_line = true;
    scrollPositions.request_line = {};

    views.listener = ListenerView;
    tabs.listener = false;
    scrollPositions.listener = {};
  }

  resetCache();
  api.addEventListener('wsthrottle', resetCache);

  el = rootTemplate.detail;
  detailHeader = rootTemplate.detail_header;

  rootTemplate.lists.addEventListener('click', function (e) {
    if (
      Sizing.simple &&
      document.body.classList.contains('detail') &&
      !document.body.classList.contains('desktop')
    ) {
      change(currentType);
    }
    e.stopPropagation();
  });

  rootTemplate.detail_container.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  rootTemplate.sizeable_area.addEventListener('click', function (e) {
    if (
      Sizing.simple &&
      (e.target.nodeName.toLowerCase() != 'a' || !e.target.getAttribute('href'))
    ) {
      change();
    }
  });

  rootTemplate.list_close.addEventListener('click', function () {
    // this code broke on Chrome for some reason?!
    // also not even sure if this is a desired effect
    // so, it gets removed.

    // var type_at_close = current_type;
    // if (type_at_close) {
    // 	setTimeout(function() {
    // 		if (!document.body.classList.contains("playlist-" + type_at_close)) {
    // 			lists[type_at_close].clear_search();
    // 		}
    // 	}, 400);
    // }
    if (Sizing.simple) {
      change();
    }
  });

  rootTemplate.detail_close.addEventListener('click', function () {
    if (lists[currentType]) {
      change(currentType);
    } else {
      change();
    }
  });

  api.addEventListener('_SYNC_SCHEDULE_COMPLETE', function () {
    if (requestInFlight) {
      resetCacheOnNextRequest = true;
    } else {
      renderedType = null;
      renderedId = null;
      resetCache();
      if (currentOpenType && currentId && document.body.classList.contains('detail')) {
        openView(currentOpenType, currentId);
      }
    }
  });

  window.onhashchange = detectUrlChange;
});

INIT_TASKS.on_draw.push(function (rootTemplate) {
  lists.album = AlbumList(rootTemplate.album_list);
  lists.artist = ArtistList(rootTemplate.artist_list);
  lists.request_line = RequestLineList(rootTemplate.listener_list);
  lists.group = GroupList(rootTemplate.group_list);
  lists.listener = false;

  scroll = Scrollbar.create(el, false, !Sizing.simple);
  Sizing.detailArea = scroll.scrollblock;
  scroll.reposition_hook = function () {
    if (currentType && currentId) {
      scrollPositions[currentType][currentId] = scroll.scroll_top;
    }
  };
});

const resetEverything = function () {
  resetCache();
  change();
};

const recalculateScroll = function () {
  scroll.set_height(false);
};

const scrollABit = function () {
  scroll.scroll_to(scroll.scroll_top + Sizing.listItemHeight * 2);
};

const getCurrentUrl = function () {
  const deeplinkurl = decodeURI(location.href);
  if (deeplinkurl.indexOf('#!/') >= 0) {
    return deeplinkurl.substring(deeplinkurl.indexOf('#!/') + 3);
  }

  return null;
};

const tabForward = function () {
  let idx = tabOrder.indexOf(currentType);
  if (idx === -1 || idx == tabOrder.length - 1) {
    idx = 0;
  } else {
    idx++;
  }
  change(tabOrder[idx]);
};

const tabBackwards = function () {
  let idx = tabOrder.indexOf(currentType);
  if (idx <= 0) {
    idx = tabOrder.length - 1;
  } else {
    idx--;
  }
  change(tabOrder[idx]);
};

var detectUrlChange = function () {
  if (oldUrl != location.href) {
    oldUrl = location.href;
    let newRoute = getCurrentUrl();
    if (!newRoute) {
      document.body.classList.remove('search-open');
      if (Sizing.simple) {
        document.body.classList.remove('playlist');
        document.body.classList.remove('requests');
        document.body.classList.remove('detail');
        for (const i in tabs) {
          document.body.classList.remove(`playlist-${i}`);
        }
      }
      if (activeList && activeList._keyHandle) {
        activeList.keyNavBlur();
      }
      currentType = null;
      currentId = null;
      currentOpenType = null;

      return false;
    }
    newRoute = newRoute.split('/');
    document.body.classList.remove('requests');
    document.body.classList.remove('search-open');
    if (tabs[newRoute[0]] || views[newRoute[0]]) {
      openRoute(newRoute[0], newRoute[1]);

      return true;
    } else if (newRoute[0] == 'requests') {
      openRoute();
      document.body.classList.add('requests');

      return true;
    } else if (newRoute[0] == 'search') {
      openRoute();
      document.body.classList.add('search-open');
      setTimeout(SearchPanel.focus, 300);

      return true;
    } else {
      // TODO: show error
    }
  }

  return false;
};

const actuallyOpen = function (typ, id) {
  if (!readyToRender) {
    return;
  }

  requestInFlight = false;

  if (!document.body.classList.contains('detail')) {
    // console.log("Sliding out.");
    document.body.classList.add('detail');
  }

  if (renderedType == typ && renderedId == id) {
    return;
  }

  renderedType = typ;
  renderedId = id;

  // console.log("Rendering.");

  for (let i = 0; i < el.childNodes.length; i++) {
    el.childNodes[i].style.display = 'none';
  }
  activeDetail = null;
  removeExcessHeaderContent();

  let t;
  if (!cache[typ][id]) {
    RWTemplates.oops(null, el);
  } else if (cache[typ][id]._root) {
    // console.log(typ + "/" + id + ": Appending existing cache.");
    el.appendChild(cache[typ][id]._root);
    cache[typ][id]._root.style.display = 'block';
    activeDetail = cache[typ][id];
    detailHeader.textContent = cache[typ][id]._headerText;
    detailHeader.setAttribute('title', cache[typ][id]._headerText);
    if (cache[typ][id]._headerFormatting) {
      cache[typ][id]._headerFormatting(detailHeader);
    }
  } else {
    // console.log(typ + "/" + id + ": Rendering detail.");
    t = views[typ](cache[typ][id], el);
    detailHeader.textContent = t._headerText;
    detailHeader.setAttribute('title', t._headerText);
    if (t._headerFormatting) {
      t._headerFormatting(detailHeader);
    }
    if (t._root.parentNode != el) {
      el.appendChild(t._root);
    }
    if (t._root && t._root.tagName && t._root.tagName.toLowerCase() == 'div') {
      cache[typ][id] = t;
      cache[typ][id]._scroll = scroll;
      activeDetail = cache[typ][id];
      cachePageStack.push({ typ: typ, id: id });
      let cps;
      while (cachePageStack.length > 5) {
        cps = cachePageStack.shift();
        if (cache[cps.typ][cps.id]) {
          if (cache[cps.typ][cps.id]._root.parentNode) {
            cache[cps.typ][cps.id]._root.parentNode.removeChild(cache[cps.typ][cps.id]._root);
          }
          delete cache[cps.typ][cps.id];
        }
      }
    }
  }

  const scrollTo = scrollPositions[typ][id] || 0; // do BEFORE scroll.set_height calls reposition_callback!
  scroll.set_height(false);
  scroll.scroll_to(scrollTo);
};

var openView = function (typ, id) {
  if (typ in cache) {
    currentType = typ;
    currentId = id;
    currentOpenType = typ;

    /*

			The way R5 loads things is based on what environment the user is in.
			The operations necessary are:
			- Slide out the window(s)
			- Load the list (if necessary)
			- Render the list (if necessary)
			- Load the content
			- Render the content

			If on mobile, render and load times are going to be slower, so we
			always slide a blank window out first to give immediate user feedback.
			On desktop, sliding out the window first will result in a blank window
			sliding out and then immediately rendering 99% of the time.
			This will give the *impression* that the page is slower than
			loading & rendering first THEN sliding out the complete window.
			(even if, in wall clock time, it takes fewer milliseconds to slide
			the window out blank)

			*/

    if (
      !tabs[typ] ||
      (!document.body.classList.contains('playlist') && !lists[typ].loaded) ||
      API.isSlow
    ) {
      // console.log("Clearing detail.");
      readyToRender = false;
      renderedType = false;
      renderedId = false;
      requestInFlight = true;
      for (let i = 0; i < el.childNodes.length; i++) {
        el.childNodes[i].style.display = 'none';
      }
      activeDetail = null;
      if (!document.body.classList.contains('detail')) {
        setTimeout(function () {
          // console.log("Slide finished.");
          if (currentOpenType === typ && currentId === id) {
            actuallyOpen(typ, id);
            readyToRender = true;
          }
        }, 300);
        document.body.classList.add('detail');
      } else {
        readyToRender = true;
      }
    } else {
      document.body.classList.add('detail');
      readyToRender = true;
    }

    if (resetCacheOnNextRequest) {
      resetCacheOnNextRequest = false;
      resetCache();
    }

    if (!cache[typ][id]) {
      // console.log(typ + "/" + id + ": Loading from server.");
      cache[typ][id] = true;
      const params = { id: id };
      let req = typ;
      if (req == 'request_line') {
        req = 'listener';
      }
      API.async_get(req, params, function (json) {
        cache[typ][id] = json[req];
        if (currentOpenType === typ && currentId === id) {
          // console.log(typ + "/" + id + ": Loaded from server.");
          actuallyOpen(typ, id);
          readyToRender = true;
        }
      });
    } else if (cache[typ][id] !== true) {
      // console.log(typ + "/" + id + ": Rendering from cache.");
      actuallyOpen(typ, id);
      readyToRender = true;
    }
  }
};

var removeExcessHeaderContent = function () {
  detailHeader.parentNode.className = 'open';
  const cs = detailHeader.parentNode.childNodes;
  for (let i = cs.length - 1; i >= 0; i--) {
    if (cs[i] != detailHeader) {
      cs[i].parentNode.removeChild(cs[i]);
    }
  }
};

var openRoute = function (typ, id) {
  if (
    lists[typ] &&
    ((!document.body.classList.contains('playlist') && !lists[typ].loaded) || API.isSlow)
  ) {
    readyToRender = false;
  }

  if (Sizing.simple || lists[typ]) {
    for (const i in tabs) {
      document.body.classList.remove(`playlist-${i}`);
    }
  }
  let closeDetail = true;
  if (typ in lists && lists[typ]) {
    Prefs.set_new_list(typ);
    lastOpen = typ;
    lastOpenId = id;
    document.body.classList.add('playlist');
    document.body.classList.add(`playlist-${typ}`);
    if (activeList && activeList._keyHandle) {
      activeList.keyNavBlur();
    }
    activeList = lists[typ];
    if (typ != currentType && document.body.classList.contains('normal')) {
      closeDetail = false;
    }
    currentType = typ;
    KeyHandler.routeToLists();
  } else if (Sizing.simple) {
    document.body.classList.remove('playlist');
  }

  if (typ in lists && id && !isNaN(id)) {
    id = parseInt(id);
    if (cache[typ][id] && cache[typ][id]._root) {
      // the page is already loaded from cache and ready to go
      readyToRender = true;
    }
    if (!readyToRender) {
      removeExcessHeaderContent();
      detailHeader.textContent =
        (lists[typ] && lists[typ].getTitleFromId ? lists[typ].getTitleFromId(id) : false) ||
        $l('Loading...');
    }
    let scrolled = false;
    if (!readyToRender && lists[typ] && lists[typ].loaded) {
      lists[typ].scrollToId(id);
      scrolled = true;
    }
    openView(typ, id);
    if (lists[typ]) {
      if (lists[typ].setNewOpen(id) && !scrolled) {
        lists[typ].scrollToId(id);
      }
    }
  } else if (Sizing.simple && (closeDetail || forceCloseDetail)) {
    document.body.classList.remove('detail');
    forceCloseDetail = false;
  }

  if (typ in lists && lists[typ]) {
    if (!activeList.loaded) {
      activeList.load();
    }
  } else {
    if (activeList && activeList._keyHandle) {
      activeList.keyNavBlur();
    }
  }
};

var change = function () {
  let r = '';
  for (let i = 0; i < arguments.length; i++) {
    if (r) {
      r += '/';
    }
    r += arguments[i];
  }
  let newUrl = decodeURI(location.href);
  if (newUrl.indexOf('#') >= 0) {
    newUrl = `${newUrl.substring(0, newUrl.indexOf('#'))}#!/${r}`;
  } else {
    newUrl = `${newUrl}#!/${r}`;
  }
  if (oldUrl == newUrl) {
    oldUrl = null;
  } else {
    location.href = newUrl;
  }
  // detectUrlChange();
};

const openLast = function () {
  forceCloseDetail = true;
  change(lastOpen || 'album');
};

const openLastId = function () {
  if (!lastOpenId) {
    openLast();

    return;
  } else {
    change(lastOpen, lastOpenId);
  }
};

export {
  activeList,
  activeDetail,
  resetEverything,
  recalculateScroll,
  scrollABit,
  getCurrentUrl,
  tabForward,
  tabBackwards,
  detectUrlChange,
  openRoute,
  change,
  openLast,
  openLastId,
};

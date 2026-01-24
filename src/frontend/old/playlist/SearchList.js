// REQUIRED EXTERNAL DEFINITIONS FOR USING THIS OBJECT FACTORY:
//	draw_entry(item);				// return a new element (will be using display: block, you SHOULD make a div)
//  update_item_element(item);		// return nothing, just update text/etc in the element you created above
//  open_id(id);					// open what the user has selected

// OPTIONAL FUNCTIONS you can overwrite:
//  sort_function(a, b);			// normal Javascript sort method - return -1, 0, or 1 (default just uses 'id')

var SearchList = function (rootEl, sortKey, searchKey) {
  sortKey = sortKey || "nameSearchable";
  searchKey = searchKey || "nameSearchable";

  var list = {};
  list.autoTrim = false;
  RWTemplates.searchlist(list, rootEl);
  var template = list.$t;

  var stretcher = document.createElement("div");
  stretcher.className = "stretcher";
  template.list.appendChild(stretcher);

  list.el = document.createElement("div");
  list.el.className = "list_contents";
  template.list.appendChild(list.el);

  var searchBox = template.search_box;
  var scroll = Scrollbar.create(template.list, false, true);

  var data = {};
  list.data = data; // keys() are the object IDs (e.g. data[album.id])
  list.loaded = false;

  var visible = []; // list of IDs sorted by the sort_function (visible on screen)
  var hidden = []; // list of IDs unsorted - currently hidden from view during a search

  var searchString = "";
  var currentKeyNavId = false;
  var currentOpenId = false;
  var numItemsToDisplay;
  var originalScrollTop;
  var originalKeyNav;
  var ignoreOriginalScrollTop;
  var scrollToOnLoad;
  var openToOnLoad;
  var scrollMargin = 5;
  var backspaceScrollTop = null;

  var currentScrollIndex = false;
  var currentHeight;
  var drawOnResize = false;
  var itemsToDraw = [];

  // LIST MANAGEMENT ***********************************************

  list.wipeData = function () {
    data = {};
    list.data = data;
    itemsToDraw = [];
    list.loaded = false;
    numItemsToDisplay = undefined;

    while (list.el.firstChild) {
      list.el.removeChild(list.el.lastChild);
    }
  };

  list.update = function (json) {
    var i;
    if (list.autoTrim) {
      for (i in data) {
        data[i]._delete = true;
      }
    }
    for (i in json) {
      list.updateItem(json[i]);
    }

    if (list.updateCool && list.loaded) {
      for (i in data) {
        list.updateCool(data[i]);
      }
    }

    if (searchString.length === 0) {
      if (list.autoTrim) {
        hidden = visible.concat(hidden);
        visible = [];
      }
      list.unhide();
      currentScrollIndex = false;
      // trigger_resize will cause a reflow anyway later in the loading process
      // so don't render ahead of ourselves
      if (!document.body.classList.contains("loading") && list.loaded) {
        list.recalculate();
        list.reposition();
      }
    }

    drawOnResize = true;
  };

  list.getTitleFromId = function (id) {
    if (data && data[id]) {
      return data[id].name;
    }
  };

  list.refreshAllItems = function () {
    for (var i in data) {
      if (data[i]._el) {
        list.updateItemElement(data[i]);
      }
    }
  };

  list.updateItem = function (json) {
    var i;
    json._delete = false;
    if (json.id in data) {
      for (i in json) {
        list.data[json.id][i] = json[i];
      }
      if (list.data[json.id]._el) {
        list.updateItemElement(list.data[json.id]);
      }
    } else {
      data[json.id] = json;
      itemsToDraw.push(json.id);
    }
    list.queueReinsert(json.id);
  };

  list.updateCool = null;

  list.queueReinsert = function (id) {
    var io = visible.indexOf(id);
    if (io >= 0) {
      visible.splice(io, 1);
    }
    if (hidden.indexOf(id) == -1) {
      hidden.push(id);
    }
  };

  var filterUnhide = function (value) {
    if (value !== null && value !== undefined) {
      return true;
    }
    return false;
  };

  list.unhide = function (toReshow) {
    toReshow = toReshow || hidden;
    if (list.autoTrim) {
      for (var i in toReshow) {
        if (data[toReshow[i]] && !data[toReshow[i]]._delete) {
          visible.push(toReshow[i]);
        } else if (data[toReshow[i]]) {
          delete data[toReshow[i]];
        }
      }
    } else if (visible.length === 0) {
      visible = toReshow;
    } else {
      visible = visible.concat(toReshow);
    }
    visible = visible.filter(filterUnhide);
    visible.sort(list.sortFunction);
    if (toReshow == hidden) hidden = [];
  };

  list.recalculate = function () {
    var fullHeight =
      (list.listItemHeight || Sizing.listItemHeight) * visible.length + 7;
    if (fullHeight != currentHeight) {
      stretcher.style.height = fullHeight + "px";
      scroll.set_height(fullHeight);
      currentHeight = fullHeight;
    }
    numItemsToDisplay =
      Math.ceil(
        scroll.offset_height /
          (list.listItemHeight || Sizing.listItemHeight),
      ) + 1;
    if (numItemsToDisplay > 35) {
      scrollMargin = 5;
    } else if (numItemsToDisplay > 25) {
      scrollMargin = 4;
    } else if (numItemsToDisplay > 20) {
      scrollMargin = 3;
    } else {
      scrollMargin = 2;
    }
  };

  list.sortFunctionSearchKey = function (a, b) {
    if (data[a][searchKey] < data[b][searchKey]) return -1;
    else if (data[a][searchKey] > data[b][searchKey]) return 1;
    return 0;
  };

  list.sortFunction = list.sortFunctionSearchKey;

  list.openElement = function (e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    var checkEl = e.target;
    while (
      checkEl &&
      !("_id" in checkEl) &&
      checkEl != list.el &&
      checkEl != document.body
    ) {
      checkEl = checkEl.parentNode;
    }
    if (checkEl && "_id" in checkEl) {
      list.openId(checkEl._id);
    }
  };

  list.el.addEventListener("click", list.openElement);

  // SEARCHING ****************************

  list.removeKeyNavHighlight = function () {
    if (currentKeyNavId) {
      if (
        currentKeyNavId in data &&
        data[currentKeyNavId] &&
        data[currentKeyNavId]._el
      ) {
        data[currentKeyNavId]._el.classList.remove("hover");
      }
      currentKeyNavId = null;
    }
  };

  list.keyNavHighlight = function (id, noScroll) {
    if (!data || !(id in data)) return;
    originalKeyNav = false;
    list.removeKeyNavHighlight();
    currentKeyNavId = id;
    if (!data[currentKeyNavId]._el) {
      list.drawEntry(data[currentKeyNavId]);
    }
    data[currentKeyNavId]._el.classList.add("hover");
    if (!noScroll) list.scrollTo(data[id], true);
  };

  list.keyNavFirstItem = function () {
    list.keyNavHighlight(visible[0]);
  };

  list.keyNavLastItem = function () {
    list.keyNavHighlight(visible[visible.length - 1]);
  };

  var keyNavArrowAction = function (jump) {
    backspaceScrollTop = null;
    if (!currentKeyNavId) {
      list.keyNavFirstItem();
      return;
    }
    var currentIdx = visible.indexOf(currentKeyNavId);
    if (!currentIdx && currentIdx !== 0) {
      list.keyNavFirstItem();
      return;
    }
    var newIndex = Math.max(
      0,
      Math.min(currentIdx + jump, visible.length - 1),
    );
    list.keyNavHighlight(visible[newIndex]);
    return true;
  };

  list.keyNavDown = function () {
    return keyNavArrowAction(1);
  };

  list.keyNavUp = function () {
    return keyNavArrowAction(-1);
  };

  list.keyNavRight = function () {
    return false;
  };

  list.keyNavLeft = function () {
    return false;
  };

  list.keyNavPageDown = function () {
    return keyNavArrowAction(15);
  };

  list.keyNavPageUp = function () {
    return keyNavArrowAction(-15);
  };

  list.keyNavEnd = function () {
    list.keyNavLastItem();
  };

  list.keyNavHome = function () {
    list.keyNavFirstItem();
  };

  list.keyNavEnter = function () {
    if (
      currentKeyNavId &&
      currentKeyNavId &&
      data[currentKeyNavId] &&
      data[currentKeyNavId]._el
    ) {
      list.openElement({
        target: data[currentKeyNavId]._el,
        enter_key: true,
      });
      return true;
    }
    return false;
  };

  list.keyNavEscape = function () {
    if (searchString.length > 0) {
      list.clearSearch();
    }
    return true;
  };

  list.keyNavBlur = function () {
    if (
      currentKeyNavId &&
      data[currentKeyNavId] &&
      data[currentKeyNavId]._el
    ) {
      data[currentKeyNavId]._el.classList.remove("hover");
    }
  };

  list.keyNavFocus = function () {
    if (
      currentKeyNavId &&
      data[currentKeyNavId] &&
      data[currentKeyNavId]
    ) {
      data[currentKeyNavId]._el.classList.add("hover");
    }
  };

  list.keyNavBackspace = function () {
    if (searchString.length == 1) {
      list.clearSearch();
      return true;
    } else if (searchString.length > 1) {
      searchString = searchString.substring(0, searchString.length - 1);

      var useSearchString = Formatting.make_searchable_string(searchString);
      var revisible = [];
      for (var i = hidden.length - 1; i >= 0; i -= 1) {
        if (!data[hidden[i]]) {
          continue;
        }
        if (data[hidden[i]][searchKey].indexOf(useSearchString) != -1) {
          revisible.push(hidden.splice(i, 1)[0]);
        }
      }
      list.unhide(revisible);
      list.doSearchbarStyle();

      currentScrollIndex = false;
      list.recalculate();
      if (
        backspaceScrollTop &&
        revisible.length + visible.length > numItemsToDisplay
      ) {
        list.scrollTo(backspaceScrollTop);
        backspaceScrollTop = null;
      }
      list.reposition();
      return true;
    }
    return false;
  };

  var doSearch = function (newString) {
    var firstTime = searchString.length === 0 ? true : false;
    if (firstTime) {
      originalKeyNav = currentKeyNavId;
      list.removeKeyNavHighlight();
    }
    searchString = newString;
    var useSearchString = Formatting.make_searchable_string(searchString);
    var newVisible = [];
    for (var i = 0; i < visible.length; i += 1) {
      if (!data[visible[i]]) {
        continue;
      }
      if (data[visible[i]][searchKey].indexOf(useSearchString) == -1) {
        hidden.push(visible[i]);
      } else {
        newVisible.push(visible[i]);
      }
    }
    visible = newVisible;
    if (!visible.indexOf(currentKeyNavId)) {
      list.removeKeyNavHighlight();
    }
    currentScrollIndex = false;
    if (firstTime) {
      originalScrollTop = scroll.scroll_top;
      list.recalculate();
      scroll.scroll_to(0);
    } else if (visible.length <= numItemsToDisplay) {
      backspaceScrollTop = scroll.scroll_top;
      list.recalculate();
      scroll.scroll_to(0);
    } else if (visible.length <= currentScrollIndex) {
      backspaceScrollTop = scroll.scroll_top;
      list.recalculate();
      scroll.scroll_to(
        (visible.length - numItemsToDisplay) *
          (list.listItemHeight || Sizing.listItemHeight),
      );
    } else {
      list.recalculate();
    }
    list.reposition();
    list.doSearchbarStyle();
  };

  list.keyNavAddCharacter = function (character) {
    doSearch(searchString + character);
    return true;
  };

  list.clearSearch = function () {
    backspaceScrollTop = null;
    searchString = "";
    searchBox.value = "";
    list.doSearchbarStyle();
    if (hidden.length === 0) return;
    list.unhide();

    currentScrollIndex = false;
    list.recalculate();
    if (originalKeyNav) {
      list.keyNavHighlight(originalKeyNav, true);
      originalKeyNav = false;
    }
    if (originalScrollTop && !ignoreOriginalScrollTop) {
      scroll.scroll_to(originalScrollTop);
      originalScrollTop = false;
    } else {
      list.scrollToDefault();
    }
    ignoreOriginalScrollTop = false;
  };

  template.cancel.addEventListener("click", function () {
    list.clearSearch();
    template.search_box.focus();
  });

  searchBox.addEventListener("input", function () {
    if (!searchBox.value.length) {
      list.clearSearch();
    } else {
      if (searchBox.value.length < searchString.length) {
        list.unhide();
      } else if (
        searchBox.value.substring(0, searchString.length) !== searchString
      ) {
        list.unhide();
      }
      doSearch(searchBox.value);
    }
  });

  list.doSearchbarStyle = function () {
    if (searchString && visible.length === 0) {
      searchBox.classList.add("error");
      template.box_container.classList.add("search_error");
    } else {
      searchBox.classList.remove("error");
      template.box_container.classList.remove("search_error");
    }

    if (searchString.length > 0) {
      if (!Sizing.simple) {
        searchBox.value = searchString;
      }
      searchBox.classList.add("active");
      template.box_container.classList.add("active");
    } else {
      searchBox.classList.remove("active");
      template.box_container.classList.remove("active");
    }

    list.doSearchMessage();
  };

  // SCROLL **************************

  list.scrollToId = function (id) {
    if (id in data) list.scrollTo(data[id]);
    else if (!list.loaded) scrollToOnLoad = id;
  };

  list.scrollAfterLoad = function () {
    searchBox.setAttribute("placeholder", $l("Filter..."));
    searchBox.removeAttribute("disabled");
    list.recalculate();
    if (openToOnLoad) {
      if (!list.setNewOpen(openToOnLoad)) {
        list.reposition();
      }
      openToOnLoad = null;
    } else if (scrollToOnLoad) {
      list.scrollToId(scrollToOnLoad);
      scrollToOnLoad = null;
    } else {
      list.reposition();
    }
  };

  list.scrollTo = function (dataItem) {
    if (dataItem) {
      var newIndex = visible.indexOf(dataItem.id);
      if (newIndex === -1) {
        list.clearSearch();
        newIndex = visible.indexOf(dataItem.id);
      }

      if (
        newIndex > currentScrollIndex + scrollMargin - 1 &&
        newIndex <
          currentScrollIndex + numItemsToDisplay - scrollMargin - 1
      ) {
        if (currentScrollIndex === false) {
          list.redrawCurrentPosition();
        }
      }
      // position at the lower edge
      else if (
        currentScrollIndex !== false &&
        newIndex >=
          currentScrollIndex + numItemsToDisplay - scrollMargin - 1
      ) {
        scroll.scroll_to(
          Math.min(
            scroll.scroll_top_max,
            (newIndex - numItemsToDisplay + scrollMargin + 2) *
              (list.listItemHeight || Sizing.listItemHeight),
          ),
        );
      }
      // position at the higher edge
      else {
        scroll.scroll_to(
          Math.max(
            0,
            (newIndex - scrollMargin + 1) *
              (list.listItemHeight || Sizing.listItemHeight),
          ),
        );
      }
    }
  };

  list.scrollToDefault = function () {
    if (currentKeyNavId && visible.indexOf(currentKeyNavId)) {
      list.scrollTo(data[currentKeyNavId]);
    } else if (currentOpenId && visible.indexOf(currentOpenId)) {
      currentKeyNavId = currentOpenId;
      list.scrollTo(data[currentOpenId]);
    } else {
      list.reposition();
    }
  };

  list.redrawCurrentPosition = function () {
    currentScrollIndex = false;
    list.reposition();
  };

  list.doSearchMessage = function () {
    if (visible.length === 0 && searchString) {
      template._root.classList.add("no_results");

      template._root.classList.add("search_active");
    } else if (visible.length === 0 && itemsToDraw.length === 0) {
      template._root.classList.add("no_results");
      template._root.classList.remove("search_active");
    } else {
      template._root.classList.remove("no_results");
      template._root.classList.remove("search_active");
    }
  };

  list.reposition = function () {
    if (numItemsToDisplay === undefined) return;
    var newIndex = Math.floor(
      scroll.scroll_top / (list.listItemHeight || Sizing.listItemHeight),
    );
    newIndex = Math.max(
      0,
      Math.min(newIndex, visible.length - numItemsToDisplay),
    );

    var newMargin =
      scroll.scroll_top -
      (list.listItemHeight || Sizing.listItemHeight) * newIndex;
    newMargin = newMargin ? -newMargin : 0;
    list.doSearchMessage();
    list.el.style[Fx.transform] =
      "translateY(" + (scroll.scroll_top + newMargin) + "px)";

    if (currentScrollIndex === newIndex) return;
    if (visible.length === 0 && hidden.length === 0) {
      if (list.autoTrim) {
        while (list.el.firstChild) {
          list.el.removeChild(list.el.lastChild);
        }
      }
      return;
    }

    if (currentScrollIndex) {
      if (newIndex < currentScrollIndex - numItemsToDisplay)
        currentScrollIndex = false;
      else if (newIndex > currentScrollIndex + numItemsToDisplay * 2)
        currentScrollIndex = false;
    }

    var i;
    // full reset
    if (currentScrollIndex === false) {
      while (list.el.firstChild) {
        list.el.removeChild(list.el.lastChild);
      }
      for (
        i = newIndex;
        i < newIndex + numItemsToDisplay && i < visible.length;
        i += 1
      ) {
        if (!data[visible[i]]._el) {
          list.drawEntry(data[visible[i]]);
        }
        list.el.appendChild(data[visible[i]]._el);
      }
    }
    // scrolling up
    else if (newIndex < currentScrollIndex) {
      for (i = currentScrollIndex; i >= newIndex; i -= 1) {
        if (!data[visible[i]]._el) {
          list.drawEntry(data[visible[i]]);
        }
        list.el.insertBefore(data[visible[i]]._el, list.el.firstChild);
      }
      while (list.el.childNodes.length > numItemsToDisplay) {
        list.el.removeChild(list.el.lastChild);
      }
    }
    // scrolling down (or starting fresh)
    else if (newIndex > currentScrollIndex) {
      for (
        i = currentScrollIndex + numItemsToDisplay;
        i < newIndex + numItemsToDisplay && i < visible.length;
        i++
      ) {
        if (!data[visible[i]]._el) {
          list.drawEntry(data[visible[i]]);
        }
        list.el.appendChild(data[visible[i]]._el);
      }
      while (
        list.el.childNodes.length >
        Math.min(visible.length - newIndex, numItemsToDisplay)
      ) {
        list.el.removeChild(list.el.firstChild);
      }
    }
    currentScrollIndex = newIndex;
  };

  // NAV *****************************

  list.setNewOpen = function (id) {
    if (!list.loaded) {
      openToOnLoad = id;
      return false;
    }
    if (currentOpenId && data[currentOpenId] && currentOpenId == id) {
      return false;
    }
    if (currentOpenId && data[currentOpenId]) {
      data[currentOpenId]._el.classList.remove("open");
      currentOpenId = null;
    }
    currentOpenId = id;
    if (!id || !(id in data)) return;
    if (!data[id]._el) {
      list.drawEntry(data[id]);
    }
    data[id]._el.classList.add("open");
    list.keyNavHighlight(id);
    if (searchString.length > 0) {
      ignoreOriginalScrollTop = true;
    }
    return true;
  };

  Sizing.addResizeCallback(function () {
    scroll.offset_height = Sizing.listHeight;
    template.list.style.height = scroll.offset_height + "px";
    if (numItemsToDisplay === undefined && !drawOnResize) return;
    if (!list.loaded) return;
    currentScrollIndex = false;
    list.recalculate();
    list.recalculate();
    list.reposition();
  });

  scroll.reposition_hook = list.reposition;

  return list;
};

export { SearchList };

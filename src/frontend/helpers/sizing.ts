const windowCallbacks = [];
let indexT;

let mobile = false;
let simple = false;
let small = false;
let songSizeNp = 0;
let songSize = 0;
let requestSize = 0;
let timelineHeaderSize = 0;
let listItemHeight = 0;
let height = 0;
let width = 0;
let sizeableAreaHeight = 0;
let detailArea = null;
let detailHeaderSize = 0;
let menuHeight = 0;
let timelineMessageSize = 45;
let listHeight = 0;
let requestsAreas = [];
let measureArea = null;

function addResizeCallback(cb, priority) {
  if (!priority) {
    windowCallbacks.push(cb);
  } else {
    windowCallbacks.unshift(cb);
  }
}

function triggerResize() {
  height = document.documentElement.clientHeight;
  width = document.documentElement.clientWidth;
  if (!indexT) {
    return;
  }
  menuHeight = indexT.header.offsetHeight;
  listItemHeight = indexT.list_item.offsetHeight;
  detailHeaderSize = indexT.detail_header_container.offsetHeight;
  var rightOfTimeline =
    indexT.timeline_sizer.offsetLeft + indexT.timeline_sizer.offsetWidth;
  var requestWidth = 90;
  var detailWidth = indexT.detail_container.offsetWidth;
  var listsWidth = indexT.lists.offsetWidth;
  var pwrTimelineWidth = width - requestWidth - detailWidth - listsWidth;
  sizeableAreaHeight = height - indexT.sizeable_area.offsetTop;
  listHeight = sizeableAreaHeight - 80;

  indexT.sizeable_area.style.height = sizeableAreaHeight + "px";
  if (detailArea) {
    detailArea.style.height = sizeableAreaHeight - detailHeaderSize - 20 + "px";
  }

  for (var i = 0; i < requestsAreas.length; i++) {
    requestsAreas[i].style.height =
      sizeableAreaHeight - detailHeaderSize * 2 - 30 + "px";
  }

  indexT.search_results_container.style.height = listHeight + "px";

  for (i = 0; i < indexT.sizeable_area.childNodes.length; i++) {
    indexT.sizeable_area.childNodes[i].style.height = sizeableAreaHeight + "px";
  }

  var isSmall = document.body.classList.contains("small");
  var isNormal = document.body.classList.contains("normal");
  var isSimple = document.body.classList.contains("simple");
  mobile = false;
  if (width < 1050) {
    mobile = true;
    document.body.classList.add("simple");
    document.body.classList.remove("full");
    simple = true;
    indexT.lists.style.left = "100%";
    indexT.requests_container.style.left = "100%";
    indexT.search_container.style.left = "100%";
    indexT.detail_container.style.left = "100%";

    if (width < 600) {
      document.body.classList.add("small");
      document.body.classList.remove("normal");
    } else {
      document.body.classList.remove("small");
      document.body.classList.add("normal");
    }
  } else {
    if (Prefs.get("pwr")) {
      document.body.classList.remove("simple");
      document.body.classList.add("full");
      simple = false;
      indexT.lists.style.left = null;
      indexT.requests_container.style.left = null;
      indexT.search_container.style.left = null;
      indexT.detail_container.style.left = null;
      if (width < 1600) {
        document.body.classList.add("small");
        document.body.classList.remove("normal");
      } else {
        document.body.classList.remove("small");
        document.body.classList.add("normal");
      }
    } else {
      document.body.classList.add("simple");
      document.body.classList.remove("full");
      simple = true;

      if (width < 600) {
        document.body.classList.add("small");
        document.body.classList.remove("normal");
      } else {
        document.body.classList.remove("small");
        document.body.classList.add("normal");
      }
    }
  }

  if (document.body.classList.contains("simple")) {
    indexT.timeline.style.width = null;
    indexT.lists.style.left = rightOfTimeline + "px";
    indexT.requests_container.style.left = rightOfTimeline + "px";
    indexT.search_container.style.left = rightOfTimeline + "px";
    indexT.detail_container.style.left = rightOfTimeline + "px";
  } else {
    indexT.requests_container.style.left = null;
    indexT.search_container.style.left = null;
    indexT.timeline.style.width = pwrTimelineWidth + "px";
    indexT.lists.style.left = pwrTimelineWidth + "px";
    indexT.detail_container.style.left = pwrTimelineWidth + listsWidth + "px";
  }

  var sizeChanged =
    document.body.classList.contains("normal") != isNormal &&
    document.body.classList.contains("small") != isSmall;
  sizeChanged = sizeChanged || simple != isSimple;

  isSmall = document.body.classList.contains("small");

  if (document.body.classList.contains("simple")) {
    songSizeNp = !isSmall ? 140 : 100;
    songSize = !isSmall ? 100 : 70;
    requestSize = 70;
    timelineHeaderSize = 40;
  } else {
    songSizeNp = 90;
    songSize = 70;
    requestSize = 70;
    timelineHeaderSize = 40;
  }

  if (sizeChanged) {
    Timeline.reflow(true);
  }

  for (i = 0; i < windowCallbacks.length; i++) {
    windowCallbacks[i]();
  }
}

function addToMeasure(el) {
  if (el.parentNode != measureArea) {
    measureArea.appendChild(el);
  }
}

function measureEl(el) {
  if (el.parentNode != measureArea) {
    measureArea.appendChild(el);
  }
  var x = el.offsetWidth;
  var y = el.scrollHeight || el.offsetHeight;
  return { width: x, height: y };
}

// Firefox has a bug where we need to wait a frame to resize
// or we get buggy widths from timeline_sizer
// Since we also want to be responsive while resizing the window
// we are pretty much left with no choice here but to wait until resizing is done
// then resize again :(
// to quote ed bighead, I hate my life
var fxWorkaroundTimer;
window.addEventListener("resize", function () {
  triggerResize();
  clearTimeout(fxWorkaroundTimer);
  fxWorkaroundTimer = setTimeout(triggerResize, 100);
});

INIT_TASKS.on_init.push(function (t) {
  indexT = t;
  if (MOBILE) document.body.classList.add("mobile");
  else document.body.classList.add("desktop");
});

export {
  mobile,
  simple,
  small,
  songSizeNp,
  songSize,
  requestSize,
  timelineHeaderSize,
  listItemHeight,
  height,
  width,
  sizeableAreaHeight,
  detailArea,
  detailHeaderSize,
  menuHeight,
  timelineMessageSize,
  listHeight,
  requestsAreas,
  measureArea,
  addResizeCallback,
  triggerResize,
  addToMeasure,
  measureEl,
};

const SettingsWindow = function () {
  const p = Prefs.get_meta();
  p.p_sort.legal_values[0].name = $l("prefs_sort_playlist_by_alpha");
  p.p_sort.legal_values[1].name = $l("prefs_sort_playlist_by_rating_user");
  const ct = Modal($l("Settings"), "settings", p);
  if (Prefs.powertripped) {
    ct._root.classList.add("powertripped");
  }

  const tTlCheck = function () {
    if (Prefs.get("t_tl")) {
      p.t_clk.$t.item_root.style.opacity = 1;
      p.t_rt.$t.item_root.style.opacity = 1;
    } else {
      p.t_clk.$t.item_root.style.opacity = 0.5;
      p.t_rt.$t.item_root.style.opacity = 0.5;
    }
  };

  const incompleteCheck = function (incomplete, nullfirst) {
    if (incomplete) {
      p.r_incmplt.$t.wrap.classList.remove("no");
      p.r_incmplt.$t.wrap.classList.add("yes");
    } else {
      p.r_incmplt.$t.wrap.classList.remove("yes");
      p.r_incmplt.$t.wrap.classList.add("no");
    }
    if (nullfirst) {
      p.r_incmplt.$t.wrap.classList.add("disabled");
    } else {
      p.r_incmplt.$t.wrap.classList.remove("disabled");
    }
  };
  p.r_incmplt.$t.wrap.classList.add("r-incmplt");
  incompleteCheck(Prefs.get("r_incmplt"), Prefs.get("p_null1"));

  const boolSetup = function (key, obj) {
    const check = function () {
      if (Prefs.get(key)) {
        if (obj.$t.wrap.classList.contains("no")) {
          obj.$t.wrap.classList.remove("yes");
          obj.$t.wrap.classList.remove("no");
          obj.$t.wrap.offsetWidth;  
        }
        obj.$t.wrap.classList.add("yes");
      } else if (obj.$t.wrap.classList.contains("yes")) {
        obj.$t.wrap.classList.add("no");
        obj.$t.wrap.classList.remove("yes");
      } else {
        obj.$t.wrap.classList.remove("yes");
      }
      if (key == "pwr") {
        ct._root.parentNode.classList.add("modal-closing");
        window.location.reload();
      }
    };
    obj.$t.item_root.addEventListener("click", function (e) {
      e.stopPropagation();
      const val = !Prefs.get(key);
      Prefs.change(key, val);
      check();
      if (key == "t_tl") {
        tTlCheck();
      }
      if (key == "p_null1") {
        incompleteCheck(Prefs.get("r_incmplt"), val);
      }
    });
    obj.$t.yes.addEventListener("click", function (e) {
      e.stopPropagation();
      Prefs.change(key, true);
      check();
      if (key == "t_tl") {
        tTlCheck();
      }
      if (key == "p_null1") {
        incompleteCheck(Prefs.get("r_incmplt"), true);
      }
    });
    obj.$t.no.addEventListener("click", function (e) {
      e.stopPropagation();
      Prefs.change(key, false);
      check();
      if (key == "t_tl") {
        tTlCheck();
      }
      if (key == "p_null1") {
        incompleteCheck(Prefs.get("r_incmplt"), false);
      }
    });
    if (Prefs.get(key)) {
      obj.$t.wrap.classList.add("yes");
    }
  };

  const multiHighlight = function (el, highlighter) {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const l = el.offsetLeft;
    const t = el.offsetTop;

    for (let i = 0; i < el.parentNode.childNodes.length; i++) {
      el.parentNode.childNodes[i].classList.remove("selected");
    }
    el.classList.add("selected");

    highlighter.style.width = `${w  }px`;
    highlighter.style.height = `${h  }px`;
    highlighter.style[Fx.transform] = `translate(${  l  }px, ${  t  }px)`;
  };

  const multiSetup = function (key, obj, val) {
    if (key == "locales") {
      val.$t.link.addEventListener("click", function () {
        Prefs.change_language(val.value);
      });
    } else {
      val.$t.link.addEventListener("click", function () {
        Prefs.change(key, val.value);
        multiHighlight(val.$t.link, obj.$t.highlight);
      });
    }
  };

  const highlightLater = function (el, highlighter) {
    setTimeout(function () {
      multiHighlight(el, highlighter);
    }, 400);
  };

  let i, j;
  for (i in p) {
    if (!p[i].$t) {
      continue;
    }

    if (p[i].bool) {
      boolSetup(i, p[i]);
    } else {
      for (j in p[i].legal_values) {
        multiSetup(i, p[i], p[i].legal_values[j]);
        if (p[i].value == p[i].legal_values[j].value) {
          p[i].legal_values[j].$t.link.classList.add("selected");
          highlightLater(p[i].legal_values[j].$t.link, p[i].$t.highlight);
        }
      }
    }
  }
};

export { SettingsWindow };

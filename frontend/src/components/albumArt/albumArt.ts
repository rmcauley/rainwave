function expandArt(e) {
  e.stopPropagation();

  const tgt = this;

  if (this._reset_router && Sizing.simple) {
    Router.change();
  }

  const songEl = this.parentNode.parentNode;
  if (songEl && songEl.classList.contains('song')) {
    if (songEl._art_timeout) {
      clearTimeout(songEl._art_timeout);
      songEl._art_timeout = null;
    }
    songEl.style.zIndex = 10;
    if (songEl.classList.contains('song-lost')) {
      songEl.style.opacity = 1;
    }

    const evtEl = songEl.parentNode && songEl.parentNode.parentNode;
    if (evtEl && evtEl.classList.contains('timeline-event')) {
      if (evtEl._art_timeout) {
        clearTimeout(evtEl._art_timeout);
        evtEl._art_timeout = null;
      }
      evtEl.style.zIndex = 10;
    }
  }

  if (!tgt.classList.contains('art-container')) {return;}
  if (tgt.classList.contains('art-expanded')) {
    normalizeArt({ target: this });
    
return;
  }

  const x = e.pageX
    ? e.pageX
    : e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
  const y = e.pageY
    ? e.pageY
    : e.clientY + document.body.scrollTop + document.documentElement.scrollTop;

  tgt.classList.add('art-expanded');
  if (x < Sizing.width - 270) {
    tgt.classList.add('art-expand-right');
  } else {
    tgt.classList.add('art-expand-left');
  }
  if (y < Sizing.height - 270) {
    tgt.classList.add('art-expand-down');
  } else {
    tgt.classList.add('art-expand-up');
  }

  if ('_album_art' in tgt && tgt._album_art) {
    const fullRes = document.createElement('img');
    fullRes.onload = function () {
      const fs = document.createElement('div');
      fs.className = 'art-full-size';
      fs.style.backgroundImage = `url(${  fullRes.getAttribute('src')  })`;
      tgt.appendChild(fs);
      requestNextAnimationFrame(function () {
        fs.classList.add('loaded');
      });
    };
    fullRes.setAttribute('src', `${tgt._album_art  }_320.jpg`);
    tgt._album_art = null;
  }
}

function normalizeArt(e) {
  e.target.style.zIndex = null;
  e.target.classList.remove('art-expanded');
  e.target.classList.remove('art-expand-right');
  e.target.classList.remove('art-expand-left');
  e.target.classList.remove('art-expand-down');
  e.target.classList.remove('art-expand-up');

  const songEl = e.target.parentNode.parentNode;
  if (songEl && songEl.classList.contains('song')) {
    songEl.style.zIndex = 5;
    songEl.style.opacity = null;
    songEl._art_timeout = setTimeout(function () {
      songEl.style.zIndex = songEl._zIndex;
    }, 350);
    const evtEl = songEl.parentNode && songEl.parentNode.parentNode;
    if (evtEl && evtEl.classList.contains('timeline-event')) {
      songEl.style.zIndex = 5;
      evtEl._art_timeout = setTimeout(function () {
        evtEl.style.zIndex = null;
      }, 350);
    }
  }
}

function albumArt(artUrl, element, noExpand) {
  if (!artUrl || artUrl.length === 0) {
    element.style.backgroundImage = 'url(/static/images4/noart_1.jpg)';
  } else {
    element.style.backgroundImage = `url(${  artUrl  }_320.jpg)`;
    element._album_art = artUrl;
    if (!MOBILE && !noExpand) {
      element.classList.add('art-expandable');
      element.addEventListener('click', expandArt);
      element.addEventListener('mouseleave', normalizeArt);
    }
  }
}

export { albumArt, expandArt, normalizeArt };

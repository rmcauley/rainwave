function _svg(icon) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  u.setAttributeNS(
    'http://www.w3.org/1999/xlink',
    'xlink:href',
    '/static/images4/symbols.svg#' + icon,
  );
  s.appendChild(u);
  return s;
}
function fave(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  $binds['fave'] = v2;
  v2.className = 'fave';
  const v3 = document.createElement('img');
  v3.className = 'fave_lined';
  v3.setAttribute('src', '/static/images4/heart_lined.png');
  const v4 = document.createElement('img');
  v4.className = 'fave_solid';
  v4.setAttribute('src', '/static/images4/heart_solid_gold.png');
  v2.appendChild(v1);
  return $binds;
}
function song(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  $binds['root'] = v2;
  v2.className = 'song';
  if (context.request_id) {
    const v4 = document.createElement('div');
    v4.className = 'request_cancel';
    $binds['cancel'] = v4;
    const v5 = document.createElement('span');
    v5.className = 'request_cancel_x';
    v5.appendChild(document.createTextNode('x'));
    v5.appendChild(v4);
    v4.appendChild(v2);
  }
  if (_c.entry_id) {
    const v7 = document.createElement('div');
    v7.className = 'song_highlight song_highlight_left';
    v7.appendChild(v2);
    const v8 = document.createElement('div');
    v8.className = 'song_highlight song_highlight_right';
    v8.appendChild(v2);
    const v9 = document.createElement('div');
    v9.className = 'song_highlight song_highlight_topleft';
    v9.appendChild(v2);
    const v10 = document.createElement('div');
    v10.className = 'song_highlight song_highlight_topright';
    v10.appendChild(v2);
    const v11 = document.createElement('div');
    v11.className = 'song_highlight song_highlight_bottomleft';
    v11.appendChild(v2);
    const v12 = document.createElement('div');
    v12.className = 'song_highlight song_highlight_bottomright';
    v12.appendChild(v2);
  }
  if (_c.entry_id && !MOBILE && Sizing.simple) {
    const v14 = document.createElement('div');
    v14.className = 'vote_button';
    const v15 = document.createElement('span');
    v15.className = 'vote_button_rotate';
    $binds['vote_button_text'] = v15;
    v15.appendChild(document.createTextNode($l('vote')));
    v15.appendChild(v14);
    v14.appendChild(v2);
  }
  const v16 = document.createElement('div');
  v16.className = 'art_anchor';
  if (context.request_id) {
    const v18 = document.createElement('div');
    v18.className = 'request_sort_grab';
    $binds['request_drag'] = v18;
    const v19 = document.createElement('img');
    v19.setAttribute('src', '/static/images4/sort.svg');
    v18.appendChild(v16);
  }
  const v20 = document.createElement('div');
  $binds['art'] = v20;
  v20.className = 'art_container';
  if (_c._is_timeline && User.sid === 5) {
    const v22 = document.createElement('div');
    v22.className =
      'power_only song_station_indicator song_station_indicator_' + context.origin_sid;
    v22.appendChild(v20);
  }
  if (context.elec_request_user_id) {
    if (_c.elec_request_user_id == User.id) {
      const v25 = document.createElement('div');
      v25.className = 'requester your_request';
      if (!MOBILE) {
        const v27 = document.createElement('a');
        v27.href = '#!/listener/' + context.elec_request_user_id;
        v27.appendChild(document.createTextNode(context.elec_request_username));
        v27.appendChild(v25);
      } else {
        v25.appendChild(document.createTextNode(context.elec_request_username));
      }
      v25.appendChild(v20);
      const v28 = document.createElement('div');
      v28.className = 'request_indicator your_request';
      v28.appendChild(document.createTextNode($l('timeline_art__your_request_indicator')));
      v28.appendChild(v20);
    } else {
      const v29 = document.createElement('div');
      v29.className = 'requester';
      if (!MOBILE) {
        const v31 = document.createElement('a');
        v31.href = '#!/listener/' + context.elec_request_user_id;
        v31.appendChild(document.createTextNode(context.elec_request_username));
        v31.appendChild(v29);
      } else {
        v29.appendChild(document.createTextNode(context.elec_request_username));
      }
      v29.appendChild(v20);
      const v32 = document.createElement('div');
      v32.className = 'request_indicator';
      v32.appendChild(document.createTextNode($l('timeline_art__request_indicator')));
      v32.appendChild(v20);
    }
  }
  v20.appendChild(v16);
  v16.appendChild(v2);
  const v33 = document.createElement('div');
  v33.className = 'song_content';
  v33.appendChild(rating(context));
  if (_c.entry_id) {
    const v35 = document.createElement('div');
    v35.className = 'entry_votes';
    const v36 = document.createElement('span');
    $binds['votes'] = v36;
    v36.appendChild(v35);
    v35.appendChild(v33);
  }
  v33.appendChild(fave(context));
  const v37 = document.createElement('div');
  $binds['title'] = v37;
  v37.className = 'title';
  v37.setAttribute('title', context.title);
  v37.appendChild(document.createTextNode(context.title));
  v37.appendChild(v33);
  if (context.request_id) {
    const v39 = document.createElement('div');
    v39.className = 'cooldown_info';
    $binds['cooldown'] = v39;
    v39.appendChild(v33);
  } else {
    const v40 = document.createElement('div');
    v40.className = 'artist';
    function v41Loop(context) {
      const $rootContext = context;
      const v41 = document.createDocumentFragment();
      const $binds = { $root: v41 };
      const v42 = document.createElement('a');
      v42.href = '#!/artist/' + context.id;
      v42.appendChild(document.createTextNode(context.name));
      v42.appendChild(v40);
      const v43 = document.createElement('span');
      v43.appendChild(document.createTextNode(','));
      v43.appendChild(v40);
    }
    $binds.artists = context.artists.map((v41Each) => {
      const $r = v41Loop(v41Each);
      v40.appendChild($r.$root);
      return $binds;
    });
    v40.appendChild(v33);
    if (context.url) {
      const v45 = document.createElement('div');
      v45.className = 'song_link_container';
      const v46 = document.createElement('a');
      v46.className = 'song_link';
      v46.href = context.url;
      v46.setAttribute('target', '_blank');
      v46.appendChild(document.createTextNode(context.link_text));
      v46.appendChild(v45);
      v45.appendChild(v33);
    }
  }
  v33.appendChild(v2);
  v2.appendChild(v1);
  return $binds;
}
function searchlist(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  v2.className = 'searchbox_container';
  $binds['box_container'] = v2;
  const v3 = document.createElement('div');
  v3.className = 'searchlist_loading_bar';
  $binds['loading_bar'] = v3;
  v3.appendChild(v2);
  const v4 = document.createElement('input');
  v4.setAttribute('type', 'text');
  $binds['search_box'] = v4;
  v4.setAttribute('placeholder', $l('Loading...'));
  v4.setAttribute('autocomplete', 'off');
  v4.setAttribute('autocorrect', 'off');
  v4.setAttribute('autocapitalize', 'off');
  v4.setAttribute('spellcheck', 'false');
  v4.className = 'search_box';
  v4.setAttribute('disabled', 'disabled');
  const v5 = document.createElement('img');
  v5.setAttribute('src', '/static/images4/search.png');
  v5.className = 'search';
  const v6 = document.createElement('img');
  v6.setAttribute('src', '/static/images4/search_clear.png');
  v6.className = 'cancel';
  $binds['cancel'] = v6;
  v2.appendChild(v1);
  const v7 = document.createElement('div');
  v7.className = 'no_result_message';
  $binds['no_result_message'] = v7;
  v7.appendChild(document.createTextNode($l('empty_list')));
  v7.appendChild(v1);
  const v8 = document.createElement('div');
  v8.className = 'no_result_message while_search_active';
  $binds['no_result_search_active_message'] = v8;
  v8.appendChild(document.createTextNode($l('no_search_results')));
  v8.appendChild(v1);
  const v9 = document.createElement('div');
  $binds['list'] = v9;
  v9.className = 'list_contents';
  v9.appendChild(v1);
  return $binds;
}
function mobileRating(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  v2.className = 'mobile_rating unselectable ' + context.extraclass;
  $binds['el'] = v2;
  const v3 = document.createElement('div');
  v3.className = 'slide_number';
  $binds['number'] = v3;
  v3.appendChild(v2);
  const v4 = document.createElement('div');
  v4.className = 'slider';
  $binds['slider'] = v4;
  v4.appendChild(v2);
  v2.appendChild(v1);
  return $binds;
}
function index(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  if (!Sizing.simple && !MOBILE) {
    const v3 = document.createElement('div');
    v3.setAttribute('id', 'hotkey_error');
    v3.appendChild(v1);
    const v4 = document.createElement('div');
    v4.setAttribute('id', 'hotkey');
    const v5 = document.createElement('div');
    v5.appendChild(document.createTextNode($l('waiting_for_hotkey')));
    v5.appendChild(v4);
    const v6 = document.createElement('div');
    v6.setAttribute('style', 'float: left;');
    const v7 = document.createElement('span');
    $binds['hotkeys_rate10'] = v7;
    v7.appendChild(document.createTextNode('1-5'));
    v7.appendChild(v6);
    const v8 = document.createElement('span');
    v8.appendChild(document.createTextNode($l('hotkeys_rate10')));
    v8.appendChild(v6);
    v6.appendChild(v4);
    const v9 = document.createElement('div');
    v9.setAttribute('style', 'float: right; margin-left: 10px;');
    const v10 = document.createElement('span');
    $binds['hotkeys_vote0'] = v10;
    v10.appendChild(document.createTextNode('A,S,D'));
    v10.appendChild(v9);
    const v11 = document.createElement('span');
    v11.appendChild(document.createTextNode($l('hotkeys_vote0')));
    v11.appendChild(v9);
    v9.appendChild(v4);
    const v12 = document.createElement('div');
    v12.setAttribute('style', 'float: left; clear: both;');
    const v13 = document.createElement('span');
    $binds['hotkeys_rate05'] = v13;
    v13.appendChild(document.createTextNode('Q-R'));
    v13.appendChild(v12);
    const v14 = document.createElement('span');
    v14.appendChild(document.createTextNode($l('hotkeys_rate05')));
    v14.appendChild(v12);
    v12.appendChild(v4);
    const v15 = document.createElement('div');
    v15.setAttribute('style', 'float: right; margin-left: 10px;');
    const v16 = document.createElement('span');
    $binds['hotkeys_vote1'] = v16;
    v16.appendChild(document.createTextNode('Z,X,C'));
    v16.appendChild(v15);
    const v17 = document.createElement('span');
    v17.appendChild(document.createTextNode($l('hotkeys_vote1')));
    v17.appendChild(v15);
    v15.appendChild(v4);
    const v18 = document.createElement('div');
    v18.setAttribute('style', 'clear: both;');
    const v19 = document.createElement('span');
    $binds['hotkeys_fave'] = v19;
    v19.appendChild(document.createTextNode('F'));
    v19.appendChild(v18);
    const v20 = document.createElement('span');
    v20.appendChild(document.createTextNode($l('hotkeys_fave')));
    v20.appendChild(v18);
    v18.appendChild(v4);
    const v21 = document.createElement('div');
    v21.setAttribute('style', 'clear: both;');
    const v22 = document.createElement('span');
    $binds['hotkeys_play'] = v22;
    v22.appendChild(document.createTextNode('Space'));
    v22.appendChild(v21);
    const v23 = document.createElement('span');
    v23.appendChild(document.createTextNode($l('hotkeys_play')));
    v23.appendChild(v21);
    v21.appendChild(v4);
    v4.appendChild(v1);
  }
  const v24 = document.createElement('div');
  $binds['measure_box'] = v24;
  v24.className = 'measure_box';
  const v25 = document.createElement('div');
  $binds['scroller_size'] = v25;
  v25.setAttribute('style', 'width: 100px; height: 100px; overflow: scroll;');
  v25.appendChild(v24);
  const v26 = document.createElement('div');
  v26.className = 'list measure_list';
  const v27 = document.createElement('div');
  v27.className = 'item';
  $binds['list_item'] = v27;
  v27.appendChild(document.createTextNode('Reference'));
  v27.appendChild(v26);
  v26.appendChild(v24);
  v24.appendChild(v1);
  v1.appendChild(menu(context));
  const v28 = document.createElement('div');
  $binds['sizeable_area'] = v28;
  v28.className = 'sizeable';
  const v29 = document.createElement('div');
  $binds['timeline'] = v29;
  v29.appendChild(v28);
  const v30 = document.createElement('div');
  v30.className = 'requests panel songlist_panel';
  $binds['requests_container'] = v30;
  v30.appendChild(v28);
  const v31 = document.createElement('div');
  v31.className = 'search_panel panel';
  $binds['search_container'] = v31;
  v31.appendChild(search(context));
  v31.appendChild(v28);
  const v32 = document.createElement('div');
  $binds['lists'] = v32;
  v32.className = 'lists panel';
  const v33 = document.createElement('div');
  v33.className = 'close';
  $binds['list_close'] = v33;
  const v34 = document.createElement('img');
  v34.setAttribute('src', '/static/images4/cancel.png');
  v34.setAttribute('alt', 'X');
  v33.appendChild(v32);
  const v35 = document.createElement('ul');
  v35.className = 'panel_header';
  const v36 = document.createElement('a');
  v36.href = '#!/album';
  const v37 = document.createElement('li');
  v37.className = 'album_tab';
  v37.appendChild(document.createTextNode($l('Albums')));
  v37.appendChild(v36);
  v36.appendChild(v35);
  const v38 = document.createElement('a');
  v38.href = '#!/artist';
  const v39 = document.createElement('li');
  v39.className = 'artist_tab';
  v39.appendChild(document.createTextNode($l('Artists')));
  v39.appendChild(v38);
  v38.appendChild(v35);
  const v40 = document.createElement('a');
  v40.href = '#!/group';
  const v41 = document.createElement('li');
  v41.className = 'group_tab';
  v41.appendChild(document.createTextNode($l('groups_tab_title')));
  v41.appendChild(v40);
  v40.appendChild(v35);
  const v42 = document.createElement('a');
  v42.href = '#!/request_line';
  const v43 = document.createElement('li');
  v43.className = 'listener_tab';
  v43.appendChild(document.createTextNode($l('RequestLine')));
  v43.appendChild(v42);
  v42.appendChild(v35);
  v35.appendChild(v32);
  const v44 = document.createElement('div');
  $binds['album_list'] = v44;
  v44.className = 'list album_list';
  v44.appendChild(v32);
  const v45 = document.createElement('div');
  $binds['artist_list'] = v45;
  v45.className = 'list artist_list';
  v45.appendChild(v32);
  const v46 = document.createElement('div');
  $binds['group_list'] = v46;
  v46.className = 'list group_list';
  v46.appendChild(v32);
  const v47 = document.createElement('div');
  $binds['listener_list'] = v47;
  v47.className = 'list listener_list';
  v47.appendChild(v32);
  v32.appendChild(v28);
  const v48 = document.createElement('div');
  $binds['detail_container'] = v48;
  v48.className = 'detail panel';
  const v49 = document.createElement('div');
  v49.className = 'close';
  $binds['detail_close'] = v49;
  const v50 = document.createElement('img');
  v50.setAttribute('src', '/static/images4/cancel.png');
  v50.setAttribute('alt', 'X');
  v49.appendChild(v48);
  const v51 = document.createElement('ul');
  v51.className = 'panel_header selectable';
  $binds['detail_header_container'] = v51;
  const v52 = document.createElement('li');
  v52.className = 'open';
  const v53 = document.createElement('span');
  $binds['detail_header'] = v53;
  v53.appendChild(v52);
  v52.appendChild(v51);
  v51.appendChild(v48);
  const v54 = document.createElement('div');
  $binds['detail'] = v54;
  v54.appendChild(v48);
  v48.appendChild(v28);
  v28.appendChild(v1);
  return $binds;
}
function settingsMultiOption(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  $binds['item_root'] = v2;
  v2.className =
    'setting_group ' +
    (_c.special ? 'setting_group_special' : '') +
    ' ' +
    (_c.power_only ? 'power_only' : '');
  const v3 = document.createElement('div');
  v3.className = 'multi_select unselectable';
  $binds['area'] = v3;
  const v4 = document.createElement('div');
  v4.className = 'floating_highlight';
  $binds['highlight'] = v4;
  v4.appendChild(v3);
  function v5Loop(context) {
    const $rootContext = context;
    const v5 = document.createDocumentFragment();
    const $binds = { $root: v5 };
    const v6 = document.createElement('span');
    v6.className = 'link';
    $binds['link'] = v6;
    v6.appendChild(document.createTextNode(context.name));
    v6.appendChild(v3);
  }
  $binds.legal_values = context.legal_values.map((v5Each) => {
    const $r = v5Loop(v5Each);
    v3.appendChild($r.$root);
    return $binds;
  });
  v3.appendChild(v2);
  const v7 = document.createElement('label');
  v7.appendChild(document.createTextNode(context.name));
  v7.appendChild(v2);
  v2.appendChild(v1);
  return $binds;
}
function oops(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  v2.setAttribute('style', 'margin-left: 5px;');
  const v3 = document.createElement('b');
  v3.appendChild(document.createTextNode($l('oops')));
  v3.appendChild(v2);
  const v4 = document.createElement('p');
  v4.appendChild(document.createTextNode($l('something_went_wrong')));
  v4.appendChild(v2);
  v2.appendChild(v1);
  return $binds;
}
function search(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  v2.className = 'close';
  $binds['search_close'] = v2;
  const v3 = document.createElement('img');
  v3.setAttribute('src', '/static/images4/cancel.png');
  v3.setAttribute('alt', 'X');
  v2.appendChild(v1);
  const v4 = document.createElement('ul');
  v4.className = 'panel_header';
  const v5 = document.createElement('li');
  v5.className = 'open';
  const v6 = document.createElement('a');
  $binds['search_header'] = v6;
  v6.appendChild(document.createTextNode($l('search')));
  v6.appendChild(v5);
  v5.appendChild(v4);
  v4.appendChild(v1);
  const v7 = document.createElement('div');
  v7.className = 'searchbox_container';
  $binds['search_box_container'] = v7;
  const v8 = document.createElement('form');
  $binds['search_form'] = v8;
  const v9 = document.createElement('button');
  v9.className = 'search_button';
  $binds['search_button'] = v9;
  v9.appendChild(document.createTextNode($l('go')));
  v9.appendChild(v8);
  const v10 = document.createElement('div');
  const v11 = document.createElement('input');
  v11.setAttribute('type', 'text');
  $binds['search'] = v11;
  v11.setAttribute('placeholder', $l('search...'));
  v11.setAttribute('autocomplete', 'off');
  v11.setAttribute('autocorrect', 'off');
  v11.setAttribute('autocapitalize', 'off');
  v11.setAttribute('spellcheck', 'false');
  v11.className = 'search_box';
  v10.appendChild(v8);
  v8.appendChild(v7);
  const v12 = document.createElement('img');
  v12.setAttribute('src', '/static/images4/search.png');
  v12.className = 'search';
  const v13 = document.createElement('img');
  v13.setAttribute('src', '/static/images4/search_clear.png');
  v13.className = 'cancel';
  $binds['search_cancel'] = v13;
  v7.appendChild(v1);
  const v14 = document.createElement('div');
  $binds['search_results_container'] = v14;
  v14.className = 'search_results_container';
  const v15 = document.createElement('div');
  $binds['search_results'] = v15;
  v15.className = 'search_results';
  v15.appendChild(v14);
  v14.appendChild(v1);
  return $binds;
}
function eventTooltip(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  v2.className = 'error_tooltip';
  $binds['el'] = v2;
  v2.appendChild(document.createTextNode(context.text));
  v2.appendChild(v1);
  return $binds;
}
function errorModal(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('p');
  $binds['sending_report'] = v2;
  v2.appendChild(document.createTextNode($l('report_sending')));
  v2.appendChild(v1);
  const v3 = document.createElement('p');
  const v4 = document.createElement('a');
  v4.className = 'link obvious';
  v4.setAttribute('onclick', 'window.location.reload();');
  v4.appendChild(document.createTextNode($l('please_refresh')));
  v4.appendChild(v3);
  v3.appendChild(v1);
  return $binds;
}
function settings(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('with');
  v2.setAttribute('context', 'locales');
  v2.appendChild(settings_multi(context));
  v2.appendChild(v1);
  const v3 = document.createElement('div');
  v3.className = 'power_only';
  const v4 = document.createElement('with');
  v4.setAttribute('context', 'hkm');
  v4.appendChild(settings_multi(context));
  v4.appendChild(v3);
  v3.appendChild(v1);
  if (context.notify) {
    const v6 = document.createElement('with');
    v6.setAttribute('context', 'notify');
    v6.appendChild(settings_yesno(context));
    v6.appendChild(v1);
  }
  const v7 = document.createElement('div');
  v7.className = 'setting_subheader';
  v7.appendChild(document.createTextNode($l('site_mode')));
  v7.appendChild(v1);
  const v8 = document.createElement('with');
  v8.setAttribute('context', 'pwr');
  v8.appendChild(settings_yesno(context));
  v8.appendChild(v1);
  const v9 = document.createElement('div');
  v9.className = 'setting_subheader';
  v9.appendChild(document.createTextNode($l('tab_title_preferences')));
  v9.appendChild(v1);
  const v10 = document.createElement('with');
  v10.setAttribute('context', 't_tl');
  v10.appendChild(settings_yesno(context));
  v10.appendChild(v1);
  const v11 = document.createElement('with');
  v11.setAttribute('context', 't_clk');
  v11.appendChild(settings_yesno(context));
  v11.appendChild(v1);
  const v12 = document.createElement('with');
  v12.setAttribute('context', 't_rt');
  v12.appendChild(settings_yesno(context));
  v12.appendChild(v1);
  const v13 = document.createElement('div');
  v13.className = 'setting_subheader';
  v13.appendChild(document.createTextNode($l('font_options')));
  v13.appendChild(v1);
  const v14 = document.createElement('with');
  v14.setAttribute('context', 'roboto');
  v14.appendChild(settings_yesno(context));
  v14.appendChild(v1);
  const v15 = document.createElement('div');
  v15.className = 'power_only';
  const v16 = document.createElement('with');
  v16.setAttribute('context', 'f_norm');
  v16.appendChild(settings_yesno(context));
  v16.appendChild(v15);
  v15.appendChild(v1);
  const v17 = document.createElement('div');
  v17.className = 'setting_subheader';
  v17.appendChild(document.createTextNode($l('timeline_preferences')));
  v17.appendChild(v1);
  const v18 = document.createElement('with');
  v18.setAttribute('context', 'l_displose');
  v18.appendChild(settings_yesno(context));
  v18.appendChild(v1);
  const v19 = document.createElement('div');
  v19.className = 'power_only';
  const v20 = document.createElement('with');
  v20.setAttribute('context', 'l_stksz');
  v20.appendChild(settings_multi(context));
  v20.appendChild(v19);
  const v21 = document.createElement('div');
  v21.className = 'setting_subheader';
  v21.appendChild(document.createTextNode($l('playlist_preferences')));
  v21.appendChild(v19);
  const v22 = document.createElement('with');
  v22.setAttribute('context', 'p_sort');
  v22.appendChild(settings_multi(context));
  v22.appendChild(v19);
  const v23 = document.createElement('with');
  v23.setAttribute('context', 'p_favup');
  v23.appendChild(settings_yesno(context));
  v23.appendChild(v19);
  const v24 = document.createElement('with');
  v24.setAttribute('context', 'p_fav1');
  v24.appendChild(settings_yesno(context));
  v24.appendChild(v19);
  const v25 = document.createElement('with');
  v25.setAttribute('context', 'p_avup');
  v25.appendChild(settings_yesno(context));
  v25.appendChild(v19);
  const v26 = document.createElement('with');
  v26.setAttribute('context', 'p_null1');
  v26.appendChild(settings_yesno(context));
  v26.appendChild(v19);
  const v27 = document.createElement('with');
  v27.setAttribute('context', 'p_songsort');
  v27.appendChild(settings_yesno(context));
  v27.appendChild(v19);
  const v28 = document.createElement('div');
  v28.className = 'setting_subheader';
  v28.appendChild(document.createTextNode($l('rating_preferences')));
  v28.appendChild(v19);
  const v29 = document.createElement('with');
  v29.setAttribute('context', 'r_incmplt');
  v29.appendChild(settings_yesno(context));
  v29.appendChild(v19);
  const v30 = document.createElement('with');
  v30.setAttribute('context', 'r_noglbl');
  v30.appendChild(settings_yesno(context));
  v30.appendChild(v19);
  const v31 = document.createElement('with');
  v31.setAttribute('context', 'r_clear');
  v31.appendChild(settings_yesno(context));
  v31.appendChild(v19);
  v19.appendChild(v1);
  return $binds;
}
function rating(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  v2.className = 'rating';
  $binds['rating'] = v2;
  if (User.id > 1 || _c.rating_user) {
    const v4 = document.createElement('div');
    v4.className = 'rating_number rating_hover';
    $binds['rating_hover_number'] = v4;
    v4.appendChild(v2);
  }
  v2.appendChild(v1);
  return $binds;
}
function searchResults(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  if (_c.artists.length) {
    const v3 = document.createElement('h2');
    v3.appendChild(document.createTextNode($l('Artists')));
    v3.appendChild(v1);
    function v4Loop(context) {
      const $rootContext = context;
      const v4 = document.createDocumentFragment();
      const $binds = { $root: v4 };
      const v5 = document.createElement('div');
      v5.className = 'row row_artist';
      const v6 = document.createElement('div');
      v6.className = 'title';
      const v7 = document.createElement('a');
      v7.href = '#!/artist/' + context.id;
      $binds['title'] = v7;
      v7.appendChild(document.createTextNode(context.name));
      v7.appendChild(v6);
      v6.appendChild(v5);
      v5.appendChild(v1);
    }
    $binds.artists = context.artists.map((v4Each) => {
      const $r = v4Loop(v4Each);
      v1.appendChild($r.$root);
      return $binds;
    });
    if (_c.artists.length >= 50) {
      const v9 = document.createElement('div');
      v9.className = 'row search_oob';
      v9.appendChild(document.createTextNode($l('search_result_limit')));
      v9.appendChild(v1);
    }
  }
  if (_c.albums.length) {
    const v11 = document.createElement('h2');
    v11.appendChild(document.createTextNode($l('Albums')));
    v11.appendChild(v1);
    function v12Loop(context) {
      const $rootContext = context;
      const v12 = document.createDocumentFragment();
      const $binds = { $root: v12 };
      const v13 = document.createElement('div');
      v13.className =
        'row row_album ' + (_c.cool ? 'cool' : '') + ' ' + (_c.fave ? 'song_fave_highlight' : '');
      v13.appendChild(rating(context));
      v13.appendChild(fave(context));
      const v14 = document.createElement('div');
      v14.className = 'title';
      const v15 = document.createElement('a');
      v15.href = '#!/album/' + context.id;
      $binds['title'] = v15;
      v15.appendChild(document.createTextNode(context.name));
      v15.appendChild(v14);
      v14.appendChild(v13);
      v13.appendChild(v1);
    }
    $binds.albums = context.albums.map((v12Each) => {
      const $r = v12Loop(v12Each);
      v1.appendChild($r.$root);
      return $binds;
    });
    if (_c.albums.length >= 50) {
      const v17 = document.createElement('div');
      v17.className = 'row search_oob';
      v17.appendChild(document.createTextNode($l('search_result_limit')));
      v17.appendChild(v1);
    }
  }
  if (_c.songs.length) {
    const v19 = document.createElement('h2');
    v19.appendChild(document.createTextNode($l('Songs')));
    v19.appendChild(v1);
    v1.appendChild(detail.songtable(context));
    if (_c.songs.length >= 100) {
      const v21 = document.createElement('div');
      v21.className = 'row search_oob';
      v21.appendChild(document.createTextNode($l('search_result_limit')));
      v21.appendChild(v1);
    }
  }
  return $binds;
}
function requests(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  v2.className = 'close';
  $binds['panel_close'] = v2;
  const v3 = document.createElement('img');
  v3.setAttribute('src', '/static/images4/cancel.png');
  v3.setAttribute('alt', 'X');
  v2.appendChild(v1);
  const v4 = document.createElement('ul');
  v4.className = 'panel_header';
  const v5 = document.createElement('li');
  v5.className = 'open';
  const v6 = document.createElement('a');
  $binds['request_header'] = v6;
  v6.appendChild(document.createTextNode($l('Requests')));
  v6.appendChild(v5);
  v5.appendChild(v4);
  v4.appendChild(v1);
  if (!Sizing.simple) {
    const v8 = document.createElement('div');
    $binds['request_indicator2'] = v8;
    v8.className = 'plusminus';
    v8.appendChild(v1);
  }
  const v9 = document.createElement('ul');
  v9.className = 'panel_header request_icons unselectable';
  const v10 = document.createElement('li');
  v10.className = 'pause_queue';
  $binds['requests_pause'] = v10;
  v10.className = 'requests_pause';
  const v11 = document.createElement('img');
  v11.setAttribute('src', '/static/images4/request_pause.png');
  const v12 = document.createElement('span');
  v12.appendChild(document.createTextNode($l('Suspend')));
  v12.appendChild(v10);
  v10.appendChild(v9);
  const v13 = document.createElement('li');
  v13.className = 'pause_queue';
  $binds['requests_play'] = v13;
  v13.className = 'requests_play';
  const v14 = document.createElement('img');
  v14.setAttribute('src', '/static/images4/request_play.png');
  const v15 = document.createElement('span');
  v15.appendChild(document.createTextNode($l('Resume')));
  v15.appendChild(v13);
  v13.appendChild(v9);
  const v16 = document.createElement('li');
  $binds['requests_favfill'] = v16;
  const v17 = document.createElement('img');
  v17.setAttribute('src', '/static/images4/request_faves.png');
  const v18 = document.createElement('span');
  v18.appendChild(document.createTextNode($l('Faves')));
  v18.appendChild(v16);
  v16.appendChild(v9);
  const v19 = document.createElement('li');
  $binds['requests_unrated'] = v19;
  const v20 = document.createElement('img');
  v20.setAttribute('src', '/static/images4/request_unrated.png');
  const v21 = document.createElement('span');
  v21.appendChild(document.createTextNode($l('Unrated')));
  v21.appendChild(v19);
  v19.appendChild(v9);
  const v22 = document.createElement('li');
  $binds['requests_clear'] = v22;
  const v23 = document.createElement('img');
  v23.setAttribute('src', '/static/images4/request_clear.png');
  const v24 = document.createElement('span');
  v24.appendChild(document.createTextNode($l('Clear')));
  v24.appendChild(v22);
  v22.appendChild(v9);
  v9.appendChild(v1);
  const v25 = document.createElement('div');
  $binds['song_list'] = v25;
  $binds['song_list_container'] = v25;
  const v26 = document.createElement('div');
  v26.className = 'song';
  v26.setAttribute('style', 'visibility: hidden; z-index: -1; transition: none;');
  $binds['last_song_padder'] = v26;
  v26.appendChild(v25);
  v25.appendChild(v1);
  return $binds;
}
function menu(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  v2.className = 'header unselectable';
  $binds['header'] = v2;
  const v3 = document.createElement('div');
  v3.className = 'menu_wrapper';
  $binds['menu_wrapper'] = v3;
  const v4 = document.createElement('ul');
  v4.className = 'menu hamburger_container';
  $binds['hamburger_container'] = v4;
  const v5 = document.createElement('li');
  v5.className = 'hamburger_icon_li';
  v5.appendChild(menu_hamburger(context));
  const v6 = document.createElement('a');
  v6.className = 'link';
  $binds['burger_button'] = v6;
  const v7 = document.createElement('div');
  v7.className = 'hamburger_icon';
  v7.appendChild(v6);
  v6.appendChild(v5);
  v5.appendChild(v4);
  v4.appendChild(v3);
  const v8 = document.createElement('ul');
  v8.className = 'menu user_status';
  if (User.id > 1) {
    const v10 = document.createElement('li');
    $binds['user_link'] = v10;
    v10.className = 'user_info';
    const v11 = document.createElement('a');
    v11.href = '#!/listener/' + User.id;
    const v12 = document.createElement('span');
    v12.appendChild(document.createTextNode(User.name));
    v12.appendChild(v11);
    const v13 = document.createElement('img');
    v13.className = 'avatar';
    v13.setAttribute('src', User.avatar);
    v11.appendChild(v10);
    v10.appendChild(v8);
  } else {
    const v14 = document.createElement('li');
    v14.className = 'login_link';
    const v15 = document.createElement('a');
    $binds['login'] = v15;
    v15.className = 'link';
    v15.href = '/oauth/login';
    v15.appendChild(document.createTextNode($l('login')));
    v15.appendChild(v14);
    v14.appendChild(v8);
    const v16 = document.createElement('li');
    v16.className = 'signup_link';
    const v17 = document.createElement('a');
    v17.href = '/oauth/discord';
    v17.appendChild(document.createTextNode($l('signup')));
    v17.appendChild(v16);
    v16.appendChild(v8);
  }
  v8.appendChild(v3);
  const v18 = document.createElement('ul');
  v18.className = 'menu main_menu';
  $binds['main_menu_ul'] = v18;
  const v19 = document.createElement('li');
  v19.className = 'requests_link';
  const v20 = document.createElement('div');
  $binds['request_indicator'] = v20;
  v20.className = 'plusminus';
  v20.appendChild(v19);
  const v21 = document.createElement('a');
  $binds['request_link'] = v21;
  const v22 = _svg('requests');
  v22.setAttribute('class', 'menu_icon menu_icon_requests');
  v22.appendChild(v21);
  const v23 = document.createElement('span');
  $binds['request_link_text'] = v23;
  v23.appendChild(document.createTextNode($l('Requests')));
  v23.appendChild(v21);
  v21.appendChild(v19);
  v19.appendChild(v18);
  const v24 = document.createElement('li');
  v24.className = 'playlist_link';
  const v25 = document.createElement('a');
  $binds['playlist_link'] = v25;
  const v26 = _svg('library');
  v26.setAttribute('class', 'menu_icon menu_icon_library');
  v26.appendChild(v25);
  const v27 = document.createElement('span');
  v27.appendChild(document.createTextNode($l('library')));
  v27.appendChild(v25);
  v25.appendChild(v24);
  v24.appendChild(v18);
  const v28 = document.createElement('li');
  v28.className = 'search_link';
  const v29 = document.createElement('a');
  $binds['search_link'] = v29;
  const v30 = document.createElement('img');
  v30.className = 'menu_icon menu_icon_search';
  v30.setAttribute('src', '/static/images4/search.png');
  const v31 = document.createElement('span');
  v31.appendChild(document.createTextNode($l('search')));
  v31.appendChild(v29);
  v29.appendChild(v28);
  v28.appendChild(v18);
  v18.appendChild(v3);
  const v32 = document.createElement('div');
  v32.setAttribute('id', 'station_select');
  $binds['station_select'] = v32;
  v32.className = 'closed';
  const v33 = _svg('pulldown');
  $binds['pulldown'] = v33;
  v33.setAttribute('class', 'pulldown_arrow');
  v33.appendChild(v32);
  const v34 = document.createElement('a');
  v34.setAttribute('id', 'station_select_header');
  $binds['station_select_header'] = v34;
  v34.className = 'station';
  const v35 = document.createElement('div');
  v35.className = 'station_details';
  const v36 = document.createElement('div');
  v36.className = 'station_name';
  v36.appendChild(document.createTextNode($l('station_select_header')));
  v36.appendChild(v35);
  v35.appendChild(v34);
  v34.appendChild(v32);
  function v37Loop(context) {
    const $rootContext = context;
    const v37 = document.createDocumentFragment();
    const $binds = { $root: v37 };
    const v38 = document.createElement('a');
    $binds['menu_link'] = v38;
    v38.className = 'station';
    if (_c.id != User.sid && !MOBILE) {
      const v40 = document.createElement('div');
      $binds['menu_np'] = v40;
      v40.className = 'station_song_container';
      const v41 = document.createElement('div');
      $binds['menu_np_art'] = v41;
      v41.className = 'ss_art';
      v41.appendChild(v40);
      const v42 = document.createElement('div');
      $binds['menu_np_song'] = v42;
      v42.className = 'ss_title';
      v42.appendChild(v40);
      const v43 = document.createElement('div');
      $binds['menu_np_album'] = v43;
      v43.className = 'ss_album';
      v43.appendChild(v40);
      v40.appendChild(v38);
    }
    const v44 = document.createElement('div');
    v44.className = 'station_details';
    const v45 = document.createElement('div');
    v45.className = 'station_name';
    v45.appendChild(document.createTextNode(context.name));
    v45.appendChild(v44);
    const v46 = document.createElement('div');
    v46.className = 'station_description';
    v46.appendChild(document.createTextNode($l('station_menu_description_id_' + _c.id)));
    v46.appendChild(v44);
    v44.appendChild(v38);
    v38.appendChild(v32);
  }
  $binds.stations = context.stations.map((v37Each) => {
    const $r = v37Loop(v37Each);
    v32.appendChild($r.$root);
    return $binds;
  });
  v32.appendChild(v3);
  const v47 = document.createElement('div');
  v47.setAttribute('id', 'r4_audio_player');
  $binds['player'] = v47;
  v47.className = 'unselectable';
  const v48 = document.createElement('div');
  v48.className = 'load_indicator';
  v48.appendChild(v47);
  const v49 = document.createElement('div');
  v49.className = 'tuned_in_indicator';
  v49.appendChild(v47);
  const v50 = document.createElement('div');
  v50.className = 'm3u menu_dropdown menu_hover_dropdown pconly';
  const v51 = document.createElement('a');
  $binds['play2'] = v51;
  v51.className = 'link';
  v51.appendChild(document.createTextNode($l('listen_via_browser')));
  v51.appendChild(v50);
  const v52 = document.createElement('a');
  v52.href = '/tune_in/' + User.sid + '.mp3.m3u';
  v52.setAttribute('target', '_blank');
  v52.appendChild(document.createTextNode($l('listen_via_mp3')));
  v52.appendChild(v50);
  const v53 = document.createElement('a');
  v53.href = '/tune_in/' + User.sid + '.ogg.m3u';
  v53.setAttribute('target', '_blank');
  v53.appendChild(document.createTextNode($l('listen_via_ogg')));
  v53.appendChild(v50);
  v50.appendChild(v47);
  const v54 = document.createElement('div');
  v54.className = 'background';
  const v55 = _svg('play');
  $binds['play'] = v55;
  v55.setAttribute('class', 'audio_icon audio_icon_play');
  v55.appendChild(v54);
  const v56 = _svg('stop');
  $binds['stop'] = v56;
  v56.setAttribute('class', 'audio_icon audio_icon_stop pconly');
  v56.appendChild(v54);
  const v57 = _svg('mute');
  $binds['mute'] = v57;
  v57.setAttribute('class', 'audio_icon audio_icon_mute pconly');
  v57.appendChild(v54);
  v54.appendChild(v47);
  v47.appendChild(v3);
  v3.appendChild(v2);
  v2.appendChild(v1);
  return $binds;
}
function whatIsCooldownModal(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('p');
  v2.appendChild(document.createTextNode($l('cd_blue_bkg_is')));
  v2.appendChild(v1);
  const v3 = document.createElement('p');
  v3.appendChild(document.createTextNode($l('cd_why_use_cooldown')));
  v3.appendChild(v1);
  const v4 = document.createElement('table');
  v4.className = 'cooldown_explain';
  const v5 = document.createElement('tr');
  const v6 = document.createElement('th');
  v6.appendChild(document.createTextNode($l('cd_type_of_cooldown')));
  v6.appendChild(v5);
  const v7 = document.createElement('th');
  v7.appendChild(document.createTextNode($l('cd_example')));
  v7.appendChild(v5);
  const v8 = document.createElement('th');
  v8.appendChild(document.createTextNode($l('cd_cooldown_length')));
  v8.appendChild(v5);
  v5.appendChild(v4);
  const v9 = document.createElement('tr');
  const v10 = document.createElement('td');
  v10.appendChild(document.createTextNode($l('cd_song')));
  v10.appendChild(v9);
  const v11 = document.createElement('td');
  v11.appendChild(document.createTextNode('One Winged Angel'));
  v11.appendChild(v9);
  const v12 = document.createElement('td');
  v12.appendChild(document.createTextNode($l('cd_song_length')));
  v12.appendChild(v9);
  v9.appendChild(v4);
  const v13 = document.createElement('tr');
  const v14 = document.createElement('td');
  v14.appendChild(document.createTextNode($l('cd_album')));
  v14.appendChild(v13);
  const v15 = document.createElement('td');
  v15.appendChild(document.createTextNode('Final Fantasy VII'));
  v15.appendChild(v13);
  const v16 = document.createElement('td');
  v16.appendChild(document.createTextNode($l('cd_album_length')));
  v16.appendChild(v13);
  v13.appendChild(v4);
  const v17 = document.createElement('tr');
  const v18 = document.createElement('td');
  v18.appendChild(document.createTextNode($l('cd_category')));
  v18.appendChild(v17);
  const v19 = document.createElement('td');
  v19.appendChild(document.createTextNode('Final Fantasy'));
  v19.appendChild(v17);
  const v20 = document.createElement('td');
  v20.appendChild(document.createTextNode($l('cd_category_length')));
  v20.appendChild(v17);
  v17.appendChild(v4);
  v4.appendChild(v1);
  const v21 = document.createElement('p');
  v21.appendChild(document.createTextNode($l('cd_cooldowns_depend_on')));
  v21.appendChild(v1);
  const v22 = document.createElement('table');
  v22.className = 'cooldown_explain';
  const v23 = document.createElement('tr');
  const v24 = document.createElement('td');
  v24.appendChild(document.createTextNode($l('cd_album_size')));
  v24.appendChild(v23);
  const v25 = document.createElement('td');
  v25.appendChild(document.createTextNode($l('cd_larger_album')));
  v25.appendChild(v23);
  v23.appendChild(v22);
  const v26 = document.createElement('tr');
  const v27 = document.createElement('td');
  v27.appendChild(document.createTextNode($l('cd_rating')));
  v27.appendChild(v26);
  const v28 = document.createElement('td');
  v28.appendChild(document.createTextNode($l('cd_higher_rating')));
  v28.appendChild(v26);
  v26.appendChild(v22);
  const v29 = document.createElement('tr');
  const v30 = document.createElement('td');
  v30.appendChild(document.createTextNode($l('cd_recently_added')));
  v30.appendChild(v29);
  const v31 = document.createElement('td');
  v31.appendChild(document.createTextNode($l('cd_newer')));
  v31.appendChild(v29);
  v29.appendChild(v22);
  v22.appendChild(v1);
  return $binds;
}
function settingsYesNo(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  $binds['item_root'] = v2;
  v2.className =
    'setting_group yes_no_group' +
    (_c.special ? 'setting_group_special' : '') +
    ' ' +
    (_c.power_only ? 'power_only' : '');
  const v3 = document.createElement('div');
  v3.className = 'yes_no_wrapper unselectable';
  $binds['wrap'] = v3;
  const v4 = document.createElement('span');
  v4.className = 'yes_no_yes';
  $binds['yes'] = v4;
  v4.appendChild(document.createTextNode($l('yes')));
  v4.appendChild(v3);
  const v5 = document.createElement('span');
  v5.className = 'yes_no_bar';
  v5.appendChild(v3);
  const v6 = document.createElement('span');
  v6.className = 'yes_no_dot';
  v6.appendChild(v3);
  const v7 = document.createElement('span');
  v7.className = 'yes_no_no';
  $binds['no'] = v7;
  v7.appendChild(document.createTextNode($l('no')));
  v7.appendChild(v3);
  v3.appendChild(v2);
  const v8 = document.createElement('label');
  $binds['name'] = v8;
  v8.appendChild(document.createTextNode(context.name));
  v8.appendChild(v2);
  v2.appendChild(v1);
  return $binds;
}
function modal(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  v2.className = 'modal_container';
  $binds['container'] = v2;
  const v3 = document.createElement('div');
  v3.className = 'header_wrapper';
  const v4 = document.createElement('div');
  v4.className = 'bkg';
  const v5 = document.createElement('div');
  v5.className = 'content';
  if (context.closeable) {
    const v7 = document.createElement('div');
    v7.className = 'modal_close';
    $binds['close'] = v7;
    const v8 = document.createElement('img');
    v8.setAttribute('src', '/static/images4/cancel.png');
    v8.setAttribute('alt', 'X');
    v7.appendChild(v5);
  }
  if (context.title) {
    const v10 = document.createElement('span');
    v10.appendChild(document.createTextNode(context.title));
    v10.appendChild(v5);
  }
  v5.appendChild(v4);
  v4.appendChild(v3);
  v3.appendChild(v2);
  const v11 = document.createElement('div');
  v11.className = 'content main';
  $binds['content'] = v11;
  v11.appendChild(v2);
  const v12 = document.createElement('div');
  v12.className = 'bottom_border';
  v12.appendChild(v2);
  v2.appendChild(v1);
  return $binds;
}
function authFailureModal(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('p');
  v2.appendChild(document.createTextNode($l('auth_failed_message')));
  v2.appendChild(v1);
  const v3 = document.createElement('p');
  const v4 = document.createElement('a');
  v4.className = 'link obvious';
  v4.href = '/oauth/login';
  v4.appendChild(document.createTextNode('Login Page'));
  v4.appendChild(v3);
  v3.appendChild(v1);
  const v5 = document.createElement('p');
  const v6 = document.createElement('a');
  v6.className = 'link obvious';
  v6.href = '/oauth/logout';
  v6.appendChild(document.createTextNode('Logout'));
  v6.appendChild(v5);
  v5.appendChild(v1);
  const v7 = document.createElement('p');
  const v8 = document.createElement('a');
  v8.className = 'link obvious';
  v8.href = 'https://discord.gg/fdb2cs7puS';
  v8.appendChild(document.createTextNode('Discord'));
  v8.appendChild(v7);
  v7.appendChild(v1);
  return $binds;
}
function pullout(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  v2.setAttribute('id', 'requests_positioner');
  $binds['requests_pullout'] = v2;
  const v3 = document.createElement('div');
  v3.setAttribute('id', 'requests_grab_tag');
  v3.appendChild(v2);
  v2.appendChild(v1);
  return $binds;
}
function hamburgerMenu(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  v2.className = 'hamburgered menu_dropdown';
  const v3 = document.createElement('div');
  const v4 = document.createElement('a');
  v4.href = 'https://discord.gg/fdb2cs7puS';
  v4.setAttribute('target', '_blank');
  v4.appendChild(document.createTextNode('Discord'));
  v4.appendChild(v3);
  if (User.id > 1 && !User.uses_oauth) {
    const v6 = document.createElement('a');
    v6.href = '/oauth/discord';
    v6.appendChild(document.createTextNode($l('link_discord')));
    v6.appendChild(v3);
  }
  if (User.id != 1) {
    const v8 = document.createElement('a');
    v8.href = '/oauth/logout';
    v8.appendChild(document.createTextNode($l('logout')));
    v8.appendChild(v3);
  }
  v3.appendChild(v2);
  const v9 = document.createElement('div');
  v9.className = 'pconly menu_group';
  const v10 = document.createElement('a');
  v10.href = '/pages/playback_history';
  v10.setAttribute('target', '_blank');
  v10.appendChild(document.createTextNode($l('playback_history_link')));
  v10.appendChild(v9);
  v9.appendChild(v2);
  const v11 = document.createElement('div');
  v11.className = 'menu_group';
  const v12 = document.createElement('a');
  v12.href = 'https://www.patreon.com/rainwave';
  v12.setAttribute('target', '_blank');
  v12.appendChild(document.createTextNode($l('Patreon')));
  v12.appendChild(v11);
  const v13 = document.createElement('a');
  v13.href = 'https://paypal.me/Rainwave/5USD';
  v13.setAttribute('target', '_blank');
  v13.className = 'pconly';
  v13.appendChild(document.createTextNode($l('PayPal')));
  v13.appendChild(v11);
  v11.appendChild(v2);
  const v14 = document.createElement('div');
  v14.className = 'menu_group pconly';
  const v15 = document.createElement('a');
  v15.href = 'https://github.com/rmcauley/rainwave/';
  v15.setAttribute('target', '_blank');
  v15.appendChild(document.createTextNode($l('github_repo')));
  v15.appendChild(v14);
  const v16 = document.createElement('a');
  v16.href = '/api4/';
  v16.setAttribute('target', '_blank');
  v16.appendChild(document.createTextNode($l('api_docs')));
  v16.appendChild(v14);
  v14.appendChild(v2);
  if (!MOBILE) {
    const v18 = document.createElement('div');
    v18.className = 'menu_group pconly';
    const v19 = document.createElement('a');
    v19.className = 'link';
    $binds['settings_link'] = v19;
    v19.appendChild(document.createTextNode($l('Settings')));
    v19.appendChild(v18);
    v18.appendChild(v2);
  }
  v2.appendChild(v1);
  return $binds;
}
function modalRating(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  v2.setAttribute('id', 'rating_window_5_0');
  v2.appendChild(document.createTextNode('5.0'));
  v2.appendChild(v1);
  const v3 = document.createElement('div');
  v3.setAttribute('id', 'rating_window_4_5');
  v3.appendChild(document.createTextNode('4.5'));
  v3.appendChild(v1);
  const v4 = document.createElement('div');
  v4.setAttribute('id', 'rating_window_4_0');
  v4.appendChild(document.createTextNode('4.0'));
  v4.appendChild(v1);
  const v5 = document.createElement('div');
  v5.setAttribute('id', 'rating_window_3_5');
  v5.appendChild(document.createTextNode('3.5'));
  v5.appendChild(v1);
  const v6 = document.createElement('div');
  v6.setAttribute('id', 'rating_window_3_0');
  v6.appendChild(document.createTextNode('3.0'));
  v6.appendChild(v1);
  const v7 = document.createElement('div');
  v7.setAttribute('id', 'rating_window_2_5');
  v7.appendChild(document.createTextNode('2.5'));
  v7.appendChild(v1);
  const v8 = document.createElement('div');
  v8.setAttribute('id', 'rating_window_2_0');
  v8.appendChild(document.createTextNode('2.0'));
  v8.appendChild(v1);
  const v9 = document.createElement('div');
  v9.setAttribute('id', 'rating_window_1_5');
  v9.appendChild(document.createTextNode('1.5'));
  v9.appendChild(v1);
  const v10 = document.createElement('div');
  v10.setAttribute('id', 'rating_window_1_0');
  v10.appendChild(document.createTextNode('1.0'));
  v10.appendChild(v1);
  return $binds;
}
function albumRating(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  v2.className = 'rating album_rating';
  $binds['rating'] = v2;
  if (!Sizing.simple) {
    const v4 = document.createElement('div');
    v4.className = 'rating_number rating_hover';
    $binds['rating_hover_number'] = v4;
    v4.appendChild(v2);
  }
  v2.appendChild(v1);
  return $binds;
}
function songDetail(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  v2.className = 'song_detail';
  $binds['details'] = v2;
  if (_c.artists) {
    const v4 = document.createElement('div');
    v4.className = 'full_artists ' + (_c.artists.length > 1 ? 'multi_artist' : '');
    const v5 = document.createElement('span');
    v5.appendChild(
      document.createTextNode(
        ($l_has('Artists_pluralized')
          ? $l('Artists_pluralized', { count: _c.artists.length })
          : $l('Artists')) + ': ',
      ),
    );
    v5.appendChild(v4);
    function v6Loop(context) {
      const $rootContext = context;
      const v6 = document.createDocumentFragment();
      const $binds = { $root: v6 };
      const v7 = document.createElement('a');
      v7.href = '#!/artist/' + context.id;
      v7.appendChild(document.createTextNode(context.name));
      v7.appendChild(v4);
    }
    $binds.artists = context.artists.map((v6Each) => {
      const $r = v6Loop(v6Each);
      v4.appendChild($r.$root);
      return $binds;
    });
    v4.appendChild(v2);
  }
  if (_c.groups && _c.groups.length && !MOBILE) {
    const v9 = document.createElement('div');
    v9.className = 'full_groups ' + (_c.groups.length > 1 ? 'multi_group' : '');
    const v10 = document.createElement('span');
    v10.appendChild(document.createTextNode($l('Groups') + ': '));
    v10.appendChild(v9);
    function v11Loop(context) {
      const $rootContext = context;
      const v11 = document.createDocumentFragment();
      const $binds = { $root: v11 };
      const v12 = document.createElement('a');
      v12.href = '#!/group/' + context.id;
      v12.appendChild(document.createTextNode(context.name));
      v12.appendChild(v9);
    }
    $binds.groups = context.groups.map((v11Each) => {
      const $r = v11Loop(v11Each);
      v9.appendChild($r.$root);
      return $binds;
    });
    v9.appendChild(v2);
  }
  if (context.rating_count) {
    const v14 = document.createElement('div');
    const v15 = document.createElement('span');
    v15.appendChild(document.createTextNode($l('song_rating_detail')));
    v15.appendChild(v14);
    const v16 = document.createElement('span');
    v16.setAttribute('style', 'margin-left: 2px');
    v16.appendChild(
      document.createTextNode(
        $l('rating_detail_numbers', {
          rating: Formatting.rating(_c.rating),
          count: _c.rating_count,
          percentile: _c.rating_rank_percentile,
          percentile_message: _c.rating_percentile_message,
        }),
      ),
    );
    v16.appendChild(v14);
    v14.appendChild(v2);
    const v17 = document.createElement('div');
    $binds['graph_placement'] = v17;
    v17.appendChild(v2);
  } else {
    const v18 = document.createElement('div');
    v18.appendChild(document.createTextNode($l('song_has_no_ratings')));
    v18.appendChild(v2);
  }
  v2.appendChild(v1);
  return $binds;
}
function albumDetail(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  v2.className = 'art_anchor';
  const v3 = document.createElement('div');
  $binds['art'] = v3;
  v3.className = 'art_container';
  v3.appendChild(v2);
  v2.appendChild(v1);
  const v4 = document.createElement('div');
  v4.className = 'detail_header';
  $binds['detail_header'] = v4;
  if (context.new_indicator) {
    const v6 = document.createElement('div');
    v6.className = context.new_indicator_class;
    v6.appendChild(document.createTextNode(context.new_indicator));
    v6.appendChild(v4);
  }
  if (context.all_cooldown) {
    const v8 = document.createElement('div');
    v8.className = 'album_all_cooldown';
    $binds['album_all_cooldown'] = v8;
    const v9 = document.createElement('span');
    v9.appendChild(document.createTextNode($l('album_all_cooldown')));
    v9.appendChild(v8);
    const v10 = document.createElement('sup');
    v10.appendChild(document.createTextNode('?'));
    v10.appendChild(v8);
    v8.appendChild(v4);
  } else {
    if (context.has_cooldown) {
      const v12 = document.createElement('div');
      v12.className = 'album_has_cooldown';
      $binds['album_has_cooldown'] = v12;
      const v13 = document.createElement('span');
      v13.appendChild(document.createTextNode($l('album_has_cooldown')));
      v13.appendChild(v12);
      const v14 = document.createElement('sup');
      v14.appendChild(document.createTextNode('?'));
      v14.appendChild(v12);
      v12.appendChild(v4);
    }
  }
  if (context.rating_user) {
    const v16 = document.createElement('div');
    v16.appendChild(
      document.createTextNode(
        $l('your_album_rating', { rating_user: Formatting.rating(_c.rating_user) }),
      ),
    );
    v16.appendChild(v4);
  }
  if (context.rating_count) {
    const v18 = document.createElement('div');
    const v19 = document.createElement('span');
    v19.appendChild(document.createTextNode($l('album_rating_detail')));
    v19.appendChild(v18);
    const v20 = document.createElement('span');
    v20.appendChild(
      document.createTextNode(
        $l('rating_detail_numbers', {
          rating: Formatting.rating(_c.rating),
          count: _c.rating_count,
          percentile: _c.rating_rank_percentile,
          percentile_message: _c.rating_percentile_message,
        }),
      ),
    );
    v20.appendChild(v18);
    const v21 = document.createElement('div');
    $binds['graph_placement'] = v21;
    v21.appendChild(v18);
    v18.appendChild(v4);
  }
  if (_c.genres.length && !MOBILE) {
    const v23 = document.createElement('div');
    v23.className = 'genres';
    if (_c.genres.length <= 2) {
      const v25 = document.createElement('span');
      v25.appendChild(document.createTextNode($l('relevant_category')));
      v25.appendChild(v23);
      const v26 = document.createElement('a');
      v26.href = '#!/group/' + _c.genres[0].id;
      v26.appendChild(document.createTextNode(_c.genres[0].name));
      v26.appendChild(v23);
      if (_c.genres.length == 2) {
        const v28 = document.createElement('span');
        v28.setAttribute('style', 'margin-right: 2px');
        v28.appendChild(document.createTextNode(','));
        v28.appendChild(v23);
        const v29 = document.createElement('a');
        v29.href = '#!/group/' + _c.genres[1].id;
        v29.appendChild(document.createTextNode(_c.genres[1].name));
        v29.appendChild(v23);
      }
    } else {
      const v30 = document.createElement('div');
      $binds['category_rollover'] = v30;
      v30.appendChild(document.createTextNode($l('relevant_categories_rollover')));
      v30.appendChild(v23);
      const v31 = document.createElement('div');
      $binds['category_list'] = v31;
      v31.className = 'category_list';
      function v32Loop(context) {
        const $rootContext = context;
        const v32 = document.createDocumentFragment();
        const $binds = { $root: v32 };
        const v33 = document.createElement('a');
        v33.href = '#!/group/' + context.id;
        v33.appendChild(document.createTextNode(context.name));
        v33.appendChild(v31);
      }
      $binds.genres = context.genres.map((v32Each) => {
        const $r = v32Loop(v32Each);
        v31.appendChild($r.$root);
        return $binds;
      });
      v31.appendChild(v23);
    }
    v23.appendChild(v4);
  }
  if (User.perks) {
    const v35 = document.createElement('div');
    const v36 = document.createElement('a');
    v36.className = 'fave_all_songs';
    $binds['fave_all_songs'] = v36;
    v36.appendChild(document.createTextNode($l('fave_all_songs')));
    v36.appendChild(v35);
    const v37 = document.createElement('span');
    v37.appendChild(document.createTextNode('-'));
    v37.appendChild(v35);
    const v38 = document.createElement('a');
    v38.className = 'unfave_all_songs';
    $binds['unfave_all_songs'] = v38;
    v38.appendChild(document.createTextNode($l('unfave_all_songs')));
    v38.appendChild(v35);
    v35.appendChild(v4);
  }
  v4.appendChild(v1);
  return $binds;
}
function groupDetail(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  function v2Loop(context) {
    const $rootContext = context;
    const v2 = document.createDocumentFragment();
    const $binds = { $root: v2 };
    const v3 = document.createElement('h2');
    const v4 = document.createElement('a');
    v4.href = '#!/album/' + context.id;
    v4.appendChild(document.createTextNode(context.name));
    v4.appendChild(v3);
    v3.appendChild(v1);
    v1.appendChild(detail.songtable(context));
  }
  $binds.albums = context.albums.map((v2Each) => {
    const $r = v2Loop(v2Each);
    v1.appendChild($r.$root);
    return $binds;
  });
  return $binds;
}
function artistDetail(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  function v2Loop(context) {
    const $rootContext = context;
    const v2 = document.createDocumentFragment();
    const $binds = { $root: v2 };
    if (context.openable) {
      const v4 = document.createElement('h2');
      const v5 = document.createElement('a');
      v5.href = '#!/album/' + context.id;
      v5.appendChild(document.createTextNode(context.name));
      v5.appendChild(v4);
      v4.appendChild(v1);
    } else {
      const v6 = document.createElement('h2');
      v6.appendChild(document.createTextNode(context.name));
      v6.appendChild(v1);
    }
    v1.appendChild(detail.songtable(context));
  }
  $binds.albums = context.albums.map((v2Each) => {
    const $r = v2Loop(v2Each);
    v1.appendChild($r.$root);
    return $binds;
  });
  return $binds;
}
function songTable(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  function v2Loop(context) {
    const $rootContext = context;
    const v2 = document.createDocumentFragment();
    const $binds = { $root: v2 };
    const v3 = document.createElement('div');
    v3.className =
      'row ' +
      (_c.cool ? 'cool' : '') +
      ' ' +
      (_c.fave ? 'song_fave_highlight' : '') +
      ' ' +
      (_c.requestable ? 'requestable' : 'unrequestable') +
      ' ' +
      (_c.is_new ? 'is_new' : _c.is_newish ? 'is_newish' : '');
    $binds['row'] = v3;
    if (!MOBILE) {
      if (Sizing.simple) {
        if (context.url) {
          const v7 = document.createElement('a');
          v7.className = 'url';
          v7.href = context.url;
          v7.setAttribute('target', '_blank');
          v7.appendChild(v3);
        } else {
          const v8 = document.createElement('div');
          v8.className = 'fake_url';
          v8.appendChild(v3);
        }
      }
      if (!Sizing.simple) {
        const v10 = document.createElement('div');
        v10.className = 'cool_info';
        v10.appendChild(document.createTextNode(Formatting.cooldown_glance(_c.cool_end)));
        v10.appendChild(v3);
        const v11 = document.createElement('div');
        v11.className = 'length';
        v11.appendChild(document.createTextNode(Formatting.minute_clock(_c.length)));
        v11.appendChild(v3);
      }
      if (User.id > 1) {
        const v13 = document.createElement('div');
        v13.className = 'rating_clear';
        const v14 = document.createElement('img');
        v14.setAttribute('src', '/static/images4/rating_clear.png');
        $binds['rating_clear'] = v14;
        v13.appendChild(v3);
      }
    }
    v3.appendChild(rating(context));
    if (!MOBILE && !Sizing.simple) {
      const v16 = document.createElement('div');
      v16.className = 'rating_site';
      v16.appendChild(document.createTextNode(Formatting.rating(_c.rating)));
      v16.appendChild(v3);
    }
    if (!Sizing.simple && _c.artists) {
      const v18 = document.createElement('div');
      v18.className = 'artists';
      function v19Loop(context) {
        const $rootContext = context;
        const v19 = document.createDocumentFragment();
        const $binds = { $root: v19 };
        const v20 = document.createElement('a');
        v20.href = '#!/artist/' + context.id;
        v20.appendChild(document.createTextNode(context.name));
        v20.appendChild(v18);
      }
      $binds.artists = context.artists.map((v19Each) => {
        const $r = v19Loop(v19Each);
        v18.appendChild($r.$root);
        return $binds;
      });
      v18.appendChild(v3);
    }
    if (!MOBILE) {
      if (!Sizing.simple) {
        if (context.url) {
          const v24 = document.createElement('a');
          v24.className = 'url';
          v24.href = context.url;
          v24.setAttribute('target', '_blank');
          v24.appendChild(v3);
        } else {
          const v25 = document.createElement('div');
          v25.className = 'fake_url';
          v25.appendChild(v3);
        }
      }
      const v26 = document.createElement('div');
      v26.className = 'detail_icon';
      $binds['detail_icon'] = v26;
      const v27 = document.createElement('img');
      v27.setAttribute('src', '/static/images4/info.png');
      v26.appendChild(v3);
    }
    v3.appendChild(fave(context));
    const v28 = document.createElement('div');
    v28.className = 'title';
    v28.setAttribute('title', context.title);
    $binds['title'] = v28;
    v28.appendChild(document.createTextNode(context.title));
    v28.appendChild(v3);
    v3.appendChild(v1);
  }
  $binds.songs = context.songs.map((v2Each) => {
    const $r = v2Loop(v2Each);
    v1.appendChild($r.$root);
    return $binds;
  });
  return $binds;
}
function listenerDetail(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  v2.className = 'art_anchor';
  const v3 = document.createElement('div');
  v3.className = 'art_container';
  v3.setAttribute('style', 'background-image: url(' + context.avatar + ');');
  v3.appendChild(v2);
  v2.appendChild(v1);
  const v4 = document.createElement('div');
  v4.className = 'detail_header';
  const v5 = document.createElement('div');
  if (context.rank) {
    const v7 = document.createElement('span');
    v7.setAttribute('style', 'color: #' + context.colour + '; padding-right: 5px;');
    v7.appendChild(document.createTextNode(context.rank));
    v7.appendChild(document.createTextNode('.'));
    v7.appendChild(v5);
  }
  const v8 = document.createElement('span');
  v8.appendChild(document.createTextNode($l('registered_in_year', { year: _c.regdate })));
  v8.appendChild(v5);
  v5.appendChild(v4);
  if (_c.user_id == User.id) {
    const v10 = document.createElement('div');
    v10.appendChild(document.createTextNode($l('view_your')));
    v10.appendChild(v4);
    const v11 = document.createElement('div');
    v11.setAttribute('style', 'padding-left: 10px');
    const v12 = document.createElement('a');
    v12.className = 'obvious';
    v12.setAttribute('target', '_blank');
    v12.href = '/pages/user_recent_votes';
    v12.appendChild(document.createTextNode($l('recent_votes')));
    v12.appendChild(v11);
    v11.appendChild(v4);
    const v13 = document.createElement('div');
    v13.setAttribute('style', 'padding-left: 10px');
    const v14 = document.createElement('a');
    v14.className = 'obvious';
    v14.setAttribute('target', '_blank');
    v14.href = '/pages/all_faves';
    v14.appendChild(document.createTextNode($l('all_faves')));
    v14.appendChild(v13);
    v13.appendChild(v4);
    const v15 = document.createElement('div');
    v15.setAttribute('style', 'padding-left: 10px');
    const v16 = document.createElement('a');
    v16.className = 'obvious';
    v16.setAttribute('target', '_blank');
    v16.href = '/pages/user_requested_history';
    v16.appendChild(document.createTextNode($l('request_history')));
    v16.appendChild(v15);
    v15.appendChild(v4);
  }
  v4.appendChild(v1);
  if (_c.top_albums.length) {
    const v18 = document.createElement('h2');
    v18.appendChild(document.createTextNode($l('top_rated_albums')));
    v18.appendChild(v1);
    function v19Loop(context) {
      const $rootContext = context;
      const v19 = document.createDocumentFragment();
      const $binds = { $root: v19 };
      const v20 = document.createElement('div');
      v20.className = 'row';
      v20.appendChild(rating(context));
      const v21 = document.createElement('div');
      v21.className = 'title';
      const v22 = document.createElement('a');
      v22.href = '#!/album/' + context.id;
      v22.appendChild(document.createTextNode(context.name));
      v22.appendChild(v21);
      v21.appendChild(v20);
      v20.appendChild(v1);
    }
    $binds.top_albums = context.top_albums.map((v19Each) => {
      const $r = v19Loop(v19Each);
      v1.appendChild($r.$root);
      return $binds;
    });
  }
  if (_c.top_request_albums) {
    const v24 = document.createElement('h2');
    v24.appendChild(document.createTextNode($l('top_requested_albums')));
    v24.appendChild(v1);
    function v25Loop(context) {
      const $rootContext = context;
      const v25 = document.createDocumentFragment();
      const $binds = { $root: v25 };
      const v26 = document.createElement('div');
      v26.className = 'row';
      const v27 = document.createElement('div');
      v27.className = 'request_count';
      v27.appendChild(document.createTextNode(context.request_count_listener));
      v27.appendChild(v26);
      const v28 = document.createElement('div');
      v28.className = 'title';
      const v29 = document.createElement('a');
      v29.href = '#!/album/' + context.id;
      v29.appendChild(document.createTextNode(context.name));
      v29.appendChild(v28);
      v28.appendChild(v26);
      v26.appendChild(v1);
    }
    $binds.top_request_albums = context.top_request_albums.map((v25Each) => {
      const $r = v25Loop(v25Each);
      v1.appendChild($r.$root);
      return $binds;
    });
  }
  const v30 = document.createElement('div');
  $binds['user_detail_container'] = v30;
  v30.className = 'user_detail_container';
  v30.appendChild(v1);
  return $binds;
}
function event(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  $binds['el'] = v2;
  v2.className = 'timeline_event timeline_' + context.type;
  const v3 = document.createElement('div');
  v3.className = 'timeline_event_animator';
  const v4 = document.createElement('div');
  v4.className = 'timeline_header';
  $binds['header_container'] = v4;
  const v5 = document.createElement('span');
  v5.className = 'timeline_header_clock';
  $binds['clock'] = v5;
  v5.appendChild(v4);
  if (context.url) {
    const v7 = document.createElement('a');
    v7.className = 'header_text';
    v7.href = context.url;
    v7.setAttribute('target', '_blank');
    $binds['header_anchor'] = v7;
    v7.appendChild(v4);
  } else {
    const v8 = document.createElement('span');
    v8.className = 'header_text';
    $binds['header_span'] = v8;
    v8.appendChild(v4);
  }
  v4.appendChild(v3);
  const v9 = document.createElement('div');
  $binds['progress'] = v9;
  v9.className = 'progress';
  const v10 = document.createElement('div');
  v10.className = 'progress_bkg';
  const v11 = document.createElement('div');
  $binds['progress_inside'] = v11;
  v11.className = 'progress_inside';
  v11.appendChild(v10);
  v10.appendChild(v9);
  v9.appendChild(v3);
  function v12Loop(context) {
    const $rootContext = context;
    const v12 = document.createDocumentFragment();
    const $binds = { $root: v12 };
    v3.appendChild(song(context));
  }
  $binds.songs = context.songs.map((v12Each) => {
    const $r = v12Loop(v12Each);
    v3.appendChild($r.$root);
    return $binds;
  });
  v3.appendChild(v2);
  v2.appendChild(v1);
  return $binds;
}
function timeline(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  v2.className = 'timeline';
  $binds['timeline'] = v2;
  const v3 = document.createElement('div');
  v3.className = 'timeline_sizer';
  $binds['timeline_sizer'] = v3;
  const v4 = document.createElement('div');
  v4.className = 'history_header history_expandable unselectable';
  $binds['history_header'] = v4;
  const v5 = document.createElement('div');
  $binds['history_header_link'] = v5;
  const v6 = document.createElement('span');
  v6.className = 'history_header_header';
  v6.appendChild(document.createTextNode($l('previouslyplayed')));
  v6.appendChild(v5);
  const v7 = _svg('pulldown');
  v7.setAttribute('class', 'history_pulldown_arrow');
  v7.appendChild(v5);
  v5.appendChild(v4);
  v4.appendChild(v3);
  const v8 = document.createElement('div');
  $binds['history_bar'] = v8;
  v8.className = 'progress history_bar';
  const v9 = document.createElement('div');
  v9.className = 'progress_bkg';
  const v10 = document.createElement('div');
  $binds['progress_history_inside'] = v10;
  v10.className = 'progress_inside';
  v10.appendChild(v9);
  v9.appendChild(v8);
  v8.appendChild(v3);
  v3.appendChild(v2);
  v2.appendChild(v1);
  return $binds;
}
function message(context) {
  const $rootContext = context;
  const v1 = document.createDocumentFragment();
  const $binds = { $root: v1 };
  const v2 = document.createElement('div');
  $binds['el'] = v2;
  v2.className = 'timeline_event timeline_message';
  if (context.closeable) {
    const v4 = document.createElement('div');
    v4.className = 'close';
    $binds['close'] = v4;
    const v5 = document.createElement('img');
    v5.setAttribute('src', '/static/images4/cancel.png');
    v5.setAttribute('alt', 'X');
    v4.appendChild(v2);
  }
  const v6 = document.createElement('div');
  v6.className = 'message_text';
  $binds['message'] = v6;
  const v7 = document.createElement('span');
  v7.appendChild(document.createTextNode(context.text));
  v7.appendChild(v6);
  v6.appendChild(v2);
  v2.appendChild(v1);
  return $binds;
}
export default {
  requests,
  rating,
  message,
  modalRating,
  searchlist,
  modal,
  pullout,
  whatIsCooldownModal,
  errorModal,
  settings,
  timeline,
  fave,
  songTable,
  artistDetail,
  mobileRating,
  eventTooltip,
  settingsYesNo,
  searchResults,
  index,
  albumRating,
  song,
  settingsMultiOption,
  songDetail,
  listenerDetail,
  event,
  menu,
  oops,
  groupDetail,
  search,
  authFailureModal,
  albumDetail,
  hamburgerMenu,
};

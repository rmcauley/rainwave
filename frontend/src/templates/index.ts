import { svgIcon as _svg } from '../helpers/svg';
import { $l } from '../language';
function index(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `measure_box`;
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.setAttribute('style', `width: 100px; height: 100px; overflow: scroll`);
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.className = `list measure_list`;
  v2.appendChild(v4);
  const v5 = document.createElement('div');
  v5.appendChild(document.createTextNode(`Reference`));
  v5.className = `item`;
  v4.appendChild(v5);
  v1.appendChild(menu(context).$root);
  const v6 = document.createElement('div');
  v6.className = `sizeable`;
  v1.appendChild(v6);
  const v7 = document.createElement('div');
  v6.appendChild(v7);
  const v8 = document.createElement('div');
  v8.className = `requests panel songlist_panel`;
  v6.appendChild(v8);
  const v9 = document.createElement('div');
  v9.className = `search_panel panel`;
  v6.appendChild(v9);
  v9.appendChild(search(context).$root);
  const v10 = document.createElement('div');
  v10.className = `lists panel`;
  v6.appendChild(v10);
  const v11 = document.createElement('div');
  v11.className = `close`;
  v10.appendChild(v11);
  const v12 = document.createElement('img');
  v12.setAttribute('src', `/static/images4/cancel.png`);
  v12.setAttribute('alt', `X`);
  v11.appendChild(v12);
  const v13 = document.createElement('ul');
  v13.className = `panel_header`;
  v10.appendChild(v13);
  const v14 = document.createElement('a');
  v14.href = `#!/album`;
  v13.appendChild(v14);
  const v15 = document.createElement('li');
  v15.appendChild(document.createTextNode($l('Albums')));
  v15.className = `album_tab`;
  v14.appendChild(v15);
  const v16 = document.createElement('a');
  v16.href = `#!/artist`;
  v13.appendChild(v16);
  const v17 = document.createElement('li');
  v17.appendChild(document.createTextNode($l('Artists')));
  v17.className = `artist_tab`;
  v16.appendChild(v17);
  const v18 = document.createElement('a');
  v18.href = `#!/group`;
  v13.appendChild(v18);
  const v19 = document.createElement('li');
  v19.appendChild(document.createTextNode($l('groups_tab_title')));
  v19.className = `group_tab`;
  v18.appendChild(v19);
  const v20 = document.createElement('a');
  v20.href = `#!/request_line`;
  v13.appendChild(v20);
  const v21 = document.createElement('li');
  v21.appendChild(document.createTextNode($l('RequestLine')));
  v21.className = `listener_tab`;
  v20.appendChild(v21);
  const v22 = document.createElement('div');
  v22.className = `list album_list`;
  v10.appendChild(v22);
  const v23 = document.createElement('div');
  v23.className = `list artist_list`;
  v10.appendChild(v23);
  const v24 = document.createElement('div');
  v24.className = `list group_list`;
  v10.appendChild(v24);
  const v25 = document.createElement('div');
  v25.className = `list listener_list`;
  v10.appendChild(v25);
  const v26 = document.createElement('div');
  v26.className = `detail panel`;
  v6.appendChild(v26);
  const v27 = document.createElement('div');
  v27.className = `close`;
  v26.appendChild(v27);
  const v28 = document.createElement('img');
  v28.setAttribute('src', `/static/images4/cancel.png`);
  v28.setAttribute('alt', `X`);
  v27.appendChild(v28);
  const v29 = document.createElement('ul');
  v29.className = `panel_header selectable`;
  v26.appendChild(v29);
  const v30 = document.createElement('li');
  v30.className = `open`;
  v29.appendChild(v30);
  const v31 = document.createElement('span');
  v30.appendChild(v31);
  const v32 = document.createElement('div');
  v26.appendChild(v32);
  
return {
    $root: v1,
    measure_box: v2,
    scroller_size: v3,
    list_item: v5,
    sizeable_area: v6,
    timeline: v7,
    requests_container: v8,
    search_container: v9,
    lists: v10,
    list_close: v11,
    album_list: v22,
    artist_list: v23,
    group_list: v24,
    listener_list: v25,
    detail_container: v26,
    detail_close: v27,
    detail_header_container: v29,
    detail_header: v31,
    detail: v32,
  };
}
function fave(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `fave`;
  v1.appendChild(v2);
  const v3 = document.createElement('img');
  v3.className = `fave_lined`;
  v3.setAttribute('src', `/static/images4/heart_lined.png`);
  v2.appendChild(v3);
  const v4 = document.createElement('img');
  v4.className = `fave_solid`;
  v4.setAttribute('src', `/static/images4/heart_solid_gold.png`);
  v2.appendChild(v4);
  
return { $root: v1, fave: v2 };
}
function searchList(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `searchbox_container`;
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = `searchlist_loading_bar`;
  v2.appendChild(v3);
  const v4 = document.createElement('input');
  v4.setAttribute('type', `text`);
  v4.setAttribute('placeholder', $l('Loading...'));
  v4.setAttribute('autocomplete', `off`);
  v4.setAttribute('autocorrect', `off`);
  v4.setAttribute('autocapitalize', `off`);
  v4.setAttribute('spellcheck', `false`);
  v4.className = `search_box`;
  v4.setAttribute('disabled', `disabled`);
  v2.appendChild(v4);
  const v5 = document.createElement('img');
  v5.setAttribute('src', `/static/images4/search.png`);
  v5.className = `search`;
  v2.appendChild(v5);
  const v6 = document.createElement('img');
  v6.setAttribute('src', `/static/images4/search_clear.png`);
  v6.className = `cancel`;
  v2.appendChild(v6);
  const v7 = document.createElement('div');
  v7.appendChild(document.createTextNode($l('empty_list')));
  v7.className = `no_result_message`;
  v1.appendChild(v7);
  const v8 = document.createElement('div');
  v8.appendChild(document.createTextNode($l('no_search_results')));
  v8.className = `no_result_message while_search_active`;
  v1.appendChild(v8);
  const v9 = document.createElement('div');
  v9.className = `list_contents`;
  v1.appendChild(v9);
  
return {
    $root: v1,
    box_container: v2,
    loading_bar: v3,
    search_box: v4,
    cancel: v6,
    no_result_message: v7,
    no_result_search_active_message: v8,
    list: v9,
  };
}
function search(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `close`;
  v1.appendChild(v2);
  const v3 = document.createElement('img');
  v3.setAttribute('src', `/static/images4/cancel.png`);
  v3.setAttribute('alt', `X`);
  v2.appendChild(v3);
  const v4 = document.createElement('ul');
  v4.className = `panel_header`;
  v1.appendChild(v4);
  const v5 = document.createElement('li');
  v5.className = `open`;
  v4.appendChild(v5);
  const v6 = document.createElement('a');
  v6.appendChild(document.createTextNode($l('search')));
  v5.appendChild(v6);
  const v7 = document.createElement('div');
  v7.className = `searchbox_container`;
  v1.appendChild(v7);
  const v8 = document.createElement('form');
  v7.appendChild(v8);
  const v9 = document.createElement('button');
  v9.appendChild(document.createTextNode($l('go')));
  v9.className = `search_button`;
  v8.appendChild(v9);
  const v10 = document.createElement('div');
  v8.appendChild(v10);
  const v11 = document.createElement('input');
  v11.setAttribute('type', `text`);
  v11.setAttribute('placeholder', $l('search...'));
  v11.setAttribute('autocomplete', `off`);
  v11.setAttribute('autocorrect', `off`);
  v11.setAttribute('autocapitalize', `off`);
  v11.setAttribute('spellcheck', `false`);
  v11.className = `search_box`;
  v10.appendChild(v11);
  const v12 = document.createElement('img');
  v12.setAttribute('src', `/static/images4/search.png`);
  v12.className = `search`;
  v7.appendChild(v12);
  const v13 = document.createElement('img');
  v13.setAttribute('src', `/static/images4/search_clear.png`);
  v13.className = `cancel`;
  v7.appendChild(v13);
  const v14 = document.createElement('div');
  v14.className = `search_results_container`;
  v1.appendChild(v14);
  const v15 = document.createElement('div');
  v15.className = `search_results`;
  v14.appendChild(v15);
  
return {
    $root: v1,
    search_close: v2,
    search_header: v6,
    search_box_container: v7,
    search_form: v8,
    search_button: v9,
    search: v11,
    search_cancel: v13,
    search_results_container: v14,
    search_results: v15,
  };
}
function searchResults(context) {
  const v1 = document.createDocumentFragment();
  if (context.artists.length) {
    const v2 = document.createElement('h2');
    v2.appendChild(document.createTextNode($l('Artists')));
    v1.appendChild(v2);
    const v3 = context.artists.map((context) => {
      const v4 = document.createDocumentFragment();
      const v5 = document.createElement('div');
      v5.className = `row row_artist`;
      v4.appendChild(v5);
      const v6 = document.createElement('div');
      v6.className = `title`;
      v5.appendChild(v6);
      const v7 = document.createElement('a');
      v7.appendChild(document.createTextNode(context.name));
      v7.href = `#!/artist/` + context.id;
      v6.appendChild(v7);
      v1.appendChild(v4);
      
return { title: v7, $root: v4 };
    });
    if (context.artists.length >= 50) {
      const v8 = document.createElement('div');
      v8.appendChild(document.createTextNode($l('search_result_limit')));
      v8.className = `row search_oob`;
      v1.appendChild(v8);
    }
  }
  if (context.albums.length) {
    const v9 = document.createElement('h2');
    v9.appendChild(document.createTextNode($l('Albums')));
    v1.appendChild(v9);
    const v10 = context.albums.map((context) => {
      const v11 = document.createDocumentFragment();
      const v12 = document.createElement('div');
      v12.className =
        'row row_album ' +
        (context.cool ? 'cool' : '') +
        ' ' +
        (context.fave ? 'song_fave_highlight' : '');
      v11.appendChild(v12);
      v12.appendChild(rating(context).$root);
      v12.appendChild(fave(context).$root);
      const v13 = document.createElement('div');
      v13.className = `title`;
      v12.appendChild(v13);
      const v14 = document.createElement('a');
      v14.appendChild(document.createTextNode(context.name));
      v14.href = `#!/album/` + context.id;
      v13.appendChild(v14);
      v1.appendChild(v11);
      
return { title: v14, $root: v11 };
    });
    if (context.albums.length >= 50) {
      const v15 = document.createElement('div');
      v15.appendChild(document.createTextNode($l('search_result_limit')));
      v15.className = `row search_oob`;
      v1.appendChild(v15);
    }
  }
  if (context.songs.length) {
    const v16 = document.createElement('h2');
    v16.appendChild(document.createTextNode($l('Songs')));
    v1.appendChild(v16);
    v1.appendChild(detail.songtable(context).$root);
    if (context.songs.length >= 100) {
      const v17 = document.createElement('div');
      v17.appendChild(document.createTextNode($l('search_result_limit')));
      v17.className = `row search_oob`;
      v1.appendChild(v17);
    }
  }
  
return { $root: v1, artists: v3, albums: v10 };
}
function settingsMultiOption(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className =
    'setting_group ' +
    (context.special ? 'setting_group_special' : '') +
    ' ' +
    (context.power_only ? 'power_only' : '');
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = `multi_select unselectable`;
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.className = `floating_highlight`;
  v3.appendChild(v4);
  const v5 = context.legal_values.map((context) => {
    const v6 = document.createDocumentFragment();
    const v7 = document.createElement('span');
    v7.appendChild(document.createTextNode(context.name));
    v7.className = `link`;
    v6.appendChild(v7);
    v3.appendChild(v6);
    
return { link: v7, $root: v6 };
  });
  const v8 = document.createElement('label');
  v8.appendChild(document.createTextNode(context.name));
  v2.appendChild(v8);
  
return { $root: v1, item_root: v2, area: v3, highlight: v4, legal_values: v5 };
}
function settings(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('with');
  v2.setAttribute('context', `locales`);
  v1.appendChild(v2);
  v2.appendChild(settings_multi(context).$root);
  const v3 = document.createElement('div');
  v3.className = `power_only`;
  v1.appendChild(v3);
  const v4 = document.createElement('with');
  v4.setAttribute('context', `hkm`);
  v3.appendChild(v4);
  v4.appendChild(settings_multi(context).$root);
  if (context.notify) {
    const v5 = document.createElement('with');
    v5.setAttribute('context', `notify`);
    v1.appendChild(v5);
    v5.appendChild(settings_yesno(context).$root);
  }
  const v6 = document.createElement('div');
  v6.appendChild(document.createTextNode($l('site_mode')));
  v6.className = `setting_subheader`;
  v1.appendChild(v6);
  const v7 = document.createElement('with');
  v7.setAttribute('context', `pwr`);
  v1.appendChild(v7);
  v7.appendChild(settings_yesno(context).$root);
  const v8 = document.createElement('div');
  v8.appendChild(document.createTextNode($l('tab_title_preferences')));
  v8.className = `setting_subheader`;
  v1.appendChild(v8);
  const v9 = document.createElement('with');
  v9.setAttribute('context', `t_tl`);
  v1.appendChild(v9);
  v9.appendChild(settings_yesno(context).$root);
  const v10 = document.createElement('with');
  v10.setAttribute('context', `t_clk`);
  v1.appendChild(v10);
  v10.appendChild(settings_yesno(context).$root);
  const v11 = document.createElement('with');
  v11.setAttribute('context', `t_rt`);
  v1.appendChild(v11);
  v11.appendChild(settings_yesno(context).$root);
  const v12 = document.createElement('div');
  v12.appendChild(document.createTextNode($l('font_options')));
  v12.className = `setting_subheader`;
  v1.appendChild(v12);
  const v13 = document.createElement('with');
  v13.setAttribute('context', `roboto`);
  v1.appendChild(v13);
  v13.appendChild(settings_yesno(context).$root);
  const v14 = document.createElement('div');
  v14.className = `power_only`;
  v1.appendChild(v14);
  const v15 = document.createElement('with');
  v15.setAttribute('context', `f_norm`);
  v14.appendChild(v15);
  v15.appendChild(settings_yesno(context).$root);
  const v16 = document.createElement('div');
  v16.appendChild(document.createTextNode($l('timeline_preferences')));
  v16.className = `setting_subheader`;
  v1.appendChild(v16);
  const v17 = document.createElement('with');
  v17.setAttribute('context', `l_displose`);
  v1.appendChild(v17);
  v17.appendChild(settings_yesno(context).$root);
  const v18 = document.createElement('div');
  v18.className = `power_only`;
  v1.appendChild(v18);
  const v19 = document.createElement('with');
  v19.setAttribute('context', `l_stksz`);
  v18.appendChild(v19);
  v19.appendChild(settings_multi(context).$root);
  const v20 = document.createElement('div');
  v20.appendChild(document.createTextNode($l('playlist_preferences')));
  v20.className = `setting_subheader`;
  v18.appendChild(v20);
  const v21 = document.createElement('with');
  v21.setAttribute('context', `p_sort`);
  v18.appendChild(v21);
  v21.appendChild(settings_multi(context).$root);
  const v22 = document.createElement('with');
  v22.setAttribute('context', `p_favup`);
  v18.appendChild(v22);
  v22.appendChild(settings_yesno(context).$root);
  const v23 = document.createElement('with');
  v23.setAttribute('context', `p_fav1`);
  v18.appendChild(v23);
  v23.appendChild(settings_yesno(context).$root);
  const v24 = document.createElement('with');
  v24.setAttribute('context', `p_avup`);
  v18.appendChild(v24);
  v24.appendChild(settings_yesno(context).$root);
  const v25 = document.createElement('with');
  v25.setAttribute('context', `p_null1`);
  v18.appendChild(v25);
  v25.appendChild(settings_yesno(context).$root);
  const v26 = document.createElement('with');
  v26.setAttribute('context', `p_songsort`);
  v18.appendChild(v26);
  v26.appendChild(settings_yesno(context).$root);
  const v27 = document.createElement('div');
  v27.appendChild(document.createTextNode($l('rating_preferences')));
  v27.className = `setting_subheader`;
  v18.appendChild(v27);
  const v28 = document.createElement('with');
  v28.setAttribute('context', `r_incmplt`);
  v18.appendChild(v28);
  v28.appendChild(settings_yesno(context).$root);
  const v29 = document.createElement('with');
  v29.setAttribute('context', `r_noglbl`);
  v18.appendChild(v29);
  v29.appendChild(settings_yesno(context).$root);
  const v30 = document.createElement('with');
  v30.setAttribute('context', `r_clear`);
  v18.appendChild(v30);
  v30.appendChild(settings_yesno(context).$root);
  
return { $root: v1 };
}
function settingsYesNo(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className =
    'setting_group yes_no_group' +
    (context.special ? 'setting_group_special' : '') +
    ' ' +
    (context.power_only ? 'power_only' : '');
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = `yes_no_wrapper unselectable`;
  v2.appendChild(v3);
  const v4 = document.createElement('span');
  v4.appendChild(document.createTextNode($l('yes')));
  v4.className = `yes_no_yes`;
  v3.appendChild(v4);
  const v5 = document.createElement('span');
  v5.className = `yes_no_bar`;
  v3.appendChild(v5);
  const v6 = document.createElement('span');
  v6.className = `yes_no_dot`;
  v3.appendChild(v6);
  const v7 = document.createElement('span');
  v7.appendChild(document.createTextNode($l('no')));
  v7.className = `yes_no_no`;
  v3.appendChild(v7);
  const v8 = document.createElement('label');
  v8.appendChild(document.createTextNode(context.name));
  v2.appendChild(v8);
  
return { $root: v1, item_root: v2, wrap: v3, yes: v4, no: v7, name: v8 };
}
function songTable(context) {
  const v1 = document.createDocumentFragment();
  const v2 = context.songs.map((context) => {
    const v3 = document.createDocumentFragment();
    const v4 = document.createElement('div');
    v4.className =
      'row ' +
      (context.cool ? 'cool' : '') +
      ' ' +
      (context.fave ? 'song_fave_highlight' : '') +
      ' ' +
      (context.requestable ? 'requestable' : 'unrequestable') +
      ' ' +
      (context.is_new ? 'is_new' : context.is_newish ? 'is_newish' : '');
    v3.appendChild(v4);
    if (!MOBILE) {
      if (Sizing.simple) {
        if (context.url) {
          const v5 = document.createElement('a');
          v5.className = `url`;
          v5.href = context.url;
          v5.setAttribute('target', `_blank`);
          v4.appendChild(v5);
        } else {
          const v6 = document.createElement('div');
          v6.className = `fake_url`;
          v4.appendChild(v6);
        }
      }
      if (!Sizing.simple) {
        const v7 = document.createElement('div');
        v7.appendChild(document.createTextNode(Formatting.cooldown_glance(context.cool_end)));
        v7.className = `cool_info`;
        v4.appendChild(v7);
        const v8 = document.createElement('div');
        v8.appendChild(document.createTextNode(Formatting.minute_clock(context.length)));
        v8.className = `length`;
        v4.appendChild(v8);
      }
      if (User.id > 1) {
        const v9 = document.createElement('div');
        v9.className = `rating_clear`;
        v4.appendChild(v9);
        const v10 = document.createElement('img');
        v10.setAttribute('src', `/static/images4/rating_clear.png`);
        v9.appendChild(v10);
      }
    }
    v4.appendChild(rating(context).$root);
    if (!MOBILE && !Sizing.simple) {
      const v11 = document.createElement('div');
      v11.appendChild(document.createTextNode(Formatting.rating(context.rating)));
      v11.className = `rating_site`;
      v4.appendChild(v11);
    }
    if (!Sizing.simple && context.artists) {
      const v12 = document.createElement('div');
      v12.className = `artists`;
      v4.appendChild(v12);
      const v13 = context.artists.map((context) => {
        const v14 = document.createDocumentFragment();
        const v15 = document.createElement('a');
        v15.appendChild(document.createTextNode(context.name));
        v15.href = `#!/artist/` + context.id;
        v14.appendChild(v15);
        v12.appendChild(v14);
        
return { $root: v14 };
      });
    }
    if (!MOBILE) {
      if (!Sizing.simple) {
        if (context.url) {
          const v16 = document.createElement('a');
          v16.className = `url`;
          v16.href = context.url;
          v16.setAttribute('target', `_blank`);
          v4.appendChild(v16);
        } else {
          const v17 = document.createElement('div');
          v17.className = `fake_url`;
          v4.appendChild(v17);
        }
      }
      const v18 = document.createElement('div');
      v18.className = `detail_icon`;
      v4.appendChild(v18);
      const v19 = document.createElement('img');
      v19.setAttribute('src', `/static/images4/info.png`);
      v18.appendChild(v19);
    }
    v4.appendChild(fave(context).$root);
    const v20 = document.createElement('div');
    v20.appendChild(document.createTextNode(context.title));
    v20.className = `title`;
    v20.setAttribute('title', context.title);
    v4.appendChild(v20);
    v1.appendChild(v3);
    
return { row: v4, rating_clear: v10, artists: v13, detail_icon: v18, title: v20, $root: v3 };
  });
  
return { $root: v1, songs: v2 };
}
function groupDetail(context) {
  const v1 = document.createDocumentFragment();
  const v2 = context.albums.map((context) => {
    const v3 = document.createDocumentFragment();
    const v4 = document.createElement('h2');
    v3.appendChild(v4);
    const v5 = document.createElement('a');
    v5.appendChild(document.createTextNode(context.name));
    v5.href = `#!/album/` + context.id;
    v4.appendChild(v5);
    v3.appendChild(detail.songtable(context).$root);
    v1.appendChild(v3);
    
return { $root: v3 };
  });
  
return { $root: v1, albums: v2 };
}
function listenerDetail(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `art_anchor`;
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = `art_container`;
  v3.setAttribute('style', `background-image: url(` + context.avatar + `);`);
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.className = `detail_header`;
  v1.appendChild(v4);
  const v5 = document.createElement('div');
  v4.appendChild(v5);
  if (context.rank) {
    const v6 = document.createElement('span');
    v6.appendChild(document.createTextNode(context.rank + `.`));
    v6.setAttribute('style', `color: #` + context.colour + `; padding-right: 5px;`);
    v5.appendChild(v6);
  }
  const v7 = document.createElement('span');
  v7.appendChild(document.createTextNode($l('registered_in_year', { year: context.regdate })));
  v5.appendChild(v7);
  if (context.user_id == User.id) {
    const v8 = document.createElement('div');
    v8.appendChild(document.createTextNode($l('view_your')));
    v4.appendChild(v8);
    const v9 = document.createElement('div');
    v9.setAttribute('style', `padding-left: 10px`);
    v4.appendChild(v9);
    const v10 = document.createElement('a');
    v10.appendChild(document.createTextNode($l('recent_votes')));
    v10.className = `obvious`;
    v10.setAttribute('target', `_blank`);
    v10.href = `/pages/user_recent_votes`;
    v9.appendChild(v10);
    const v11 = document.createElement('div');
    v11.setAttribute('style', `padding-left: 10px`);
    v4.appendChild(v11);
    const v12 = document.createElement('a');
    v12.appendChild(document.createTextNode($l('all_faves')));
    v12.className = `obvious`;
    v12.setAttribute('target', `_blank`);
    v12.href = `/pages/all_faves`;
    v11.appendChild(v12);
    const v13 = document.createElement('div');
    v13.setAttribute('style', `padding-left: 10px`);
    v4.appendChild(v13);
    const v14 = document.createElement('a');
    v14.appendChild(document.createTextNode($l('request_history')));
    v14.className = `obvious`;
    v14.setAttribute('target', `_blank`);
    v14.href = `/pages/user_requested_history`;
    v13.appendChild(v14);
  }
  if (context.top_albums.length) {
    const v15 = document.createElement('h2');
    v15.appendChild(document.createTextNode($l('top_rated_albums')));
    v1.appendChild(v15);
    const v16 = context.top_albums.map((context) => {
      const v17 = document.createDocumentFragment();
      const v18 = document.createElement('div');
      v18.className = `row`;
      v17.appendChild(v18);
      v18.appendChild(rating(context).$root);
      const v19 = document.createElement('div');
      v19.className = `title`;
      v18.appendChild(v19);
      const v20 = document.createElement('a');
      v20.appendChild(document.createTextNode(context.name));
      v20.href = `#!/album/` + context.id;
      v19.appendChild(v20);
      v1.appendChild(v17);
      
return { $root: v17 };
    });
  }
  if (context.top_request_albums) {
    const v21 = document.createElement('h2');
    v21.appendChild(document.createTextNode($l('top_requested_albums')));
    v1.appendChild(v21);
    const v22 = context.top_request_albums.map((context) => {
      const v23 = document.createDocumentFragment();
      const v24 = document.createElement('div');
      v24.className = `row`;
      v23.appendChild(v24);
      const v25 = document.createElement('div');
      v25.appendChild(document.createTextNode(context.request_count_listener));
      v25.className = `request_count`;
      v24.appendChild(v25);
      const v26 = document.createElement('div');
      v26.className = `title`;
      v24.appendChild(v26);
      const v27 = document.createElement('a');
      v27.appendChild(document.createTextNode(context.name));
      v27.href = `#!/album/` + context.id;
      v26.appendChild(v27);
      v1.appendChild(v23);
      
return { $root: v23 };
    });
  }
  const v28 = document.createElement('div');
  v28.className = `user_detail_container`;
  v1.appendChild(v28);
  
return { $root: v1, top_albums: v16, top_request_albums: v22, user_detail_container: v28 };
}
function songDetail(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `song_detail`;
  v1.appendChild(v2);
  if (context.artists) {
    const v3 = document.createElement('div');
    v3.className = 'full_artists ' + (context.artists.length > 1 ? 'multi_artist' : '');
    v2.appendChild(v3);
    const v4 = document.createElement('span');
    v4.appendChild(
      document.createTextNode(
        ($l_has('Artists_pluralized')
          ? $l('Artists_pluralized', { count: context.artists.length })
          : $l('Artists')) + ': ',
      ),
    );
    v3.appendChild(v4);
    const v5 = context.artists.map((context) => {
      const v6 = document.createDocumentFragment();
      const v7 = document.createElement('a');
      v7.appendChild(document.createTextNode(context.name));
      v7.href = `#!/artist/` + context.id;
      v6.appendChild(v7);
      v3.appendChild(v6);
      
return { $root: v6 };
    });
  }
  if (context.groups && context.groups.length && !MOBILE) {
    const v8 = document.createElement('div');
    v8.className = 'full_groups ' + (context.groups.length > 1 ? 'multi_group' : '');
    v2.appendChild(v8);
    const v9 = document.createElement('span');
    v9.appendChild(document.createTextNode($l('Groups') + ': '));
    v8.appendChild(v9);
    const v10 = context.groups.map((context) => {
      const v11 = document.createDocumentFragment();
      const v12 = document.createElement('a');
      v12.appendChild(document.createTextNode(context.name));
      v12.href = `#!/group/` + context.id;
      v11.appendChild(v12);
      v8.appendChild(v11);
      
return { $root: v11 };
    });
  }
  if (context.rating_count) {
    const v13 = document.createElement('div');
    v2.appendChild(v13);
    const v14 = document.createElement('span');
    v14.appendChild(document.createTextNode($l('song_rating_detail')));
    v13.appendChild(v14);
    const v15 = document.createElement('span');
    v15.appendChild(
      document.createTextNode(
        $l('rating_detail_numbers', {
          rating: Formatting.rating(context.rating),
          count: context.rating_count,
          percentile: context.rating_rank_percentile,
          percentile_message: context.rating_percentile_message,
        }),
      ),
    );
    v15.setAttribute('style', `margin-left: 2px`);
    v13.appendChild(v15);
    const v16 = document.createElement('div');
    v2.appendChild(v16);
  } else {
    const v17 = document.createElement('div');
    v17.appendChild(document.createTextNode($l('song_has_no_ratings')));
    v2.appendChild(v17);
  }
  
return { $root: v1, details: v2, artists: v5, groups: v10, graph_placement: v16 };
}
function artistDetail(context) {
  const v1 = document.createDocumentFragment();
  const v2 = context.albums.map((context) => {
    const v3 = document.createDocumentFragment();
    if (context.openable) {
      const v4 = document.createElement('h2');
      v3.appendChild(v4);
      const v5 = document.createElement('a');
      v5.appendChild(document.createTextNode(context.name));
      v5.href = `#!/album/` + context.id;
      v4.appendChild(v5);
    } else {
      const v6 = document.createElement('h2');
      v6.appendChild(document.createTextNode(context.name));
      v3.appendChild(v6);
    }
    v3.appendChild(detail.songtable(context).$root);
    v1.appendChild(v3);
    
return { $root: v3 };
  });
  
return { $root: v1, albums: v2 };
}
function albumDetail(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `art_anchor`;
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = `art_container`;
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.className = `detail_header`;
  v1.appendChild(v4);
  if (context.new_indicator) {
    const v5 = document.createElement('div');
    v5.appendChild(document.createTextNode(context.new_indicator));
    v5.className = context.new_indicator_class;
    v4.appendChild(v5);
  }
  if (context.all_cooldown) {
    const v6 = document.createElement('div');
    v6.className = `album_all_cooldown`;
    v4.appendChild(v6);
    const v7 = document.createElement('span');
    v7.appendChild(document.createTextNode($l('album_all_cooldown')));
    v6.appendChild(v7);
    const v8 = document.createElement('sup');
    v8.appendChild(document.createTextNode(`?`));
    v6.appendChild(v8);
  } else {
    if (context.has_cooldown) {
      const v9 = document.createElement('div');
      v9.className = `album_has_cooldown`;
      v4.appendChild(v9);
      const v10 = document.createElement('span');
      v10.appendChild(document.createTextNode($l('album_has_cooldown')));
      v9.appendChild(v10);
      const v11 = document.createElement('sup');
      v11.appendChild(document.createTextNode(`?`));
      v9.appendChild(v11);
    }
  }
  if (context.rating_user) {
    const v12 = document.createElement('div');
    v12.appendChild(
      document.createTextNode(
        $l('your_album_rating', { rating_user: Formatting.rating(context.rating_user) }),
      ),
    );
    v4.appendChild(v12);
  }
  if (context.rating_count) {
    const v13 = document.createElement('div');
    v4.appendChild(v13);
    const v14 = document.createElement('span');
    v14.appendChild(document.createTextNode($l('album_rating_detail')));
    v13.appendChild(v14);
    const v15 = document.createElement('span');
    v15.appendChild(
      document.createTextNode(
        $l('rating_detail_numbers', {
          rating: Formatting.rating(context.rating),
          count: context.rating_count,
          percentile: context.rating_rank_percentile,
          percentile_message: context.rating_percentile_message,
        }),
      ),
    );
    v13.appendChild(v15);
    const v16 = document.createElement('div');
    v13.appendChild(v16);
  }
  if (context.genres.length && !MOBILE) {
    const v17 = document.createElement('div');
    v17.className = `genres`;
    v4.appendChild(v17);
    if (context.genres.length <= 2) {
      const v18 = document.createElement('span');
      v18.appendChild(document.createTextNode($l('relevant_category')));
      v17.appendChild(v18);
      const v19 = document.createElement('a');
      v19.appendChild(document.createTextNode(context.genres[0].name));
      v19.href = `#!/group/` + context.genres[0].id;
      v17.appendChild(v19);
      if (context.genres.length == 2) {
        const v20 = document.createElement('span');
        v20.appendChild(document.createTextNode(`,`));
        v20.setAttribute('style', `margin-right: 2px`);
        v17.appendChild(v20);
        const v21 = document.createElement('a');
        v21.appendChild(document.createTextNode(context.genres[1].name));
        v21.href = `#!/group/` + context.genres[1].id;
        v17.appendChild(v21);
      }
    } else {
      const v22 = document.createElement('div');
      v22.appendChild(document.createTextNode($l('relevant_categories_rollover')));
      v17.appendChild(v22);
      const v23 = document.createElement('div');
      v23.className = `category_list`;
      v17.appendChild(v23);
      const v24 = context.genres.map((context) => {
        const v25 = document.createDocumentFragment();
        const v26 = document.createElement('a');
        v26.appendChild(document.createTextNode(context.name));
        v26.href = `#!/group/` + context.id;
        v25.appendChild(v26);
        v23.appendChild(v25);
        
return { $root: v25 };
      });
    }
  }
  if (User.perks) {
    const v27 = document.createElement('div');
    v4.appendChild(v27);
    const v28 = document.createElement('a');
    v28.appendChild(document.createTextNode($l('fave_all_songs')));
    v28.className = `fave_all_songs`;
    v27.appendChild(v28);
    const v29 = document.createElement('span');
    v29.appendChild(document.createTextNode(`-`));
    v27.appendChild(v29);
    const v30 = document.createElement('a');
    v30.appendChild(document.createTextNode($l('unfave_all_songs')));
    v30.className = `unfave_all_songs`;
    v27.appendChild(v30);
  }
  
return {
    $root: v1,
    art: v3,
    detail_header: v4,
    album_all_cooldown: v6,
    album_has_cooldown: v9,
    graph_placement: v16,
    category_rollover: v22,
    category_list: v23,
    genres: v24,
    fave_all_songs: v28,
    unfave_all_songs: v30,
  };
}
function oops(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.setAttribute('style', `margin-left: 5px`);
  v1.appendChild(v2);
  const v3 = document.createElement('b');
  v3.appendChild(document.createTextNode($l('oops')));
  v2.appendChild(v3);
  const v4 = document.createElement('p');
  v4.appendChild(document.createTextNode($l('something_went_wrong')));
  v2.appendChild(v4);
  
return { $root: v1 };
}
function errorModal(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('p');
  v2.appendChild(document.createTextNode($l('report_sending')));
  v1.appendChild(v2);
  const v3 = document.createElement('p');
  v1.appendChild(v3);
  const v4 = document.createElement('a');
  v4.appendChild(document.createTextNode($l('please_refresh')));
  v4.className = `link obvious`;
  v4.setAttribute('onclick', `window.location.reload()`);
  v3.appendChild(v4);
  
return { $root: v1, sending_report: v2 };
}
function modal(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `modal_container`;
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = `header_wrapper`;
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.className = `bkg`;
  v3.appendChild(v4);
  const v5 = document.createElement('div');
  v5.className = `content`;
  v4.appendChild(v5);
  if (context.closeable) {
    const v6 = document.createElement('div');
    v6.className = `modal_close`;
    v5.appendChild(v6);
    const v7 = document.createElement('img');
    v7.setAttribute('src', `/static/images4/cancel.png`);
    v7.setAttribute('alt', `X`);
    v6.appendChild(v7);
  }
  if (context.title) {
    const v8 = document.createElement('span');
    v8.appendChild(document.createTextNode(context.title));
    v5.appendChild(v8);
  }
  const v9 = document.createElement('div');
  v9.className = `content main`;
  v2.appendChild(v9);
  const v10 = document.createElement('div');
  v10.className = `bottom_border`;
  v2.appendChild(v10);
  
return { $root: v1, container: v2, close: v6, content: v9 };
}
function pullout(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.setAttribute('id', `requests_positioner`);
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.setAttribute('id', `requests_grab_tag`);
  v2.appendChild(v3);
  
return { $root: v1, requests_pullout: v2 };
}
function whatIsCooldownModal(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('p');
  v2.appendChild(document.createTextNode($l('cd_blue_bkg_is')));
  v1.appendChild(v2);
  const v3 = document.createElement('p');
  v3.appendChild(document.createTextNode($l('cd_why_use_cooldown')));
  v1.appendChild(v3);
  const v4 = document.createElement('table');
  v4.className = `cooldown_explain`;
  v1.appendChild(v4);
  const v5 = document.createElement('tr');
  v4.appendChild(v5);
  const v6 = document.createElement('th');
  v6.appendChild(document.createTextNode($l('cd_type_of_cooldown')));
  v5.appendChild(v6);
  const v7 = document.createElement('th');
  v7.appendChild(document.createTextNode($l('cd_example')));
  v5.appendChild(v7);
  const v8 = document.createElement('th');
  v8.appendChild(document.createTextNode($l('cd_cooldown_length')));
  v5.appendChild(v8);
  const v9 = document.createElement('tr');
  v4.appendChild(v9);
  const v10 = document.createElement('td');
  v10.appendChild(document.createTextNode($l('cd_song')));
  v9.appendChild(v10);
  const v11 = document.createElement('td');
  v11.appendChild(document.createTextNode(`One Winged Angel`));
  v9.appendChild(v11);
  const v12 = document.createElement('td');
  v12.appendChild(document.createTextNode($l('cd_song_length')));
  v9.appendChild(v12);
  const v13 = document.createElement('tr');
  v4.appendChild(v13);
  const v14 = document.createElement('td');
  v14.appendChild(document.createTextNode($l('cd_album')));
  v13.appendChild(v14);
  const v15 = document.createElement('td');
  v15.appendChild(document.createTextNode(`Final Fantasy VII`));
  v13.appendChild(v15);
  const v16 = document.createElement('td');
  v16.appendChild(document.createTextNode($l('cd_album_length')));
  v13.appendChild(v16);
  const v17 = document.createElement('p');
  v17.appendChild(document.createTextNode($l('cd_cooldowns_depend_on')));
  v1.appendChild(v17);
  const v18 = document.createElement('table');
  v18.className = `cooldown_explain`;
  v1.appendChild(v18);
  const v19 = document.createElement('tr');
  v18.appendChild(v19);
  const v20 = document.createElement('td');
  v20.appendChild(document.createTextNode($l('cd_album_size')));
  v19.appendChild(v20);
  const v21 = document.createElement('td');
  v21.appendChild(document.createTextNode($l('cd_larger_album')));
  v19.appendChild(v21);
  const v22 = document.createElement('tr');
  v18.appendChild(v22);
  const v23 = document.createElement('td');
  v23.appendChild(document.createTextNode($l('cd_rating')));
  v22.appendChild(v23);
  const v24 = document.createElement('td');
  v24.appendChild(document.createTextNode($l('cd_higher_rating')));
  v22.appendChild(v24);
  const v25 = document.createElement('tr');
  v18.appendChild(v25);
  const v26 = document.createElement('td');
  v26.appendChild(document.createTextNode($l('cd_recently_added')));
  v25.appendChild(v26);
  const v27 = document.createElement('td');
  v27.appendChild(document.createTextNode($l('cd_newer')));
  v25.appendChild(v27);
  
return { $root: v1 };
}
function timeline(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `timeline`;
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = `timeline_sizer`;
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.className = `history_header history_expandable unselectable`;
  v3.appendChild(v4);
  const v5 = document.createElement('div');
  v4.appendChild(v5);
  const v6 = document.createElement('span');
  v6.appendChild(document.createTextNode($l('previouslyplayed')));
  v6.className = `history_header_header`;
  v5.appendChild(v6);
  const v7 = _svg('pulldown');
  v7.setAttribute('class', `history_pulldown_arrow`);
  v5.appendChild(v7);
  const v8 = document.createElement('div');
  v8.className = `progress history_bar`;
  v3.appendChild(v8);
  const v9 = document.createElement('div');
  v9.className = `progress_bkg`;
  v8.appendChild(v9);
  const v10 = document.createElement('div');
  v10.className = `progress_inside`;
  v9.appendChild(v10);
  
return {
    $root: v1,
    timeline: v2,
    timeline_sizer: v3,
    history_header: v4,
    history_header_link: v5,
    history_bar: v8,
    progress_history_inside: v10,
  };
}
function message(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `timeline_event timeline_message`;
  v1.appendChild(v2);
  if (context.closeable) {
    const v3 = document.createElement('div');
    v3.className = `close`;
    v2.appendChild(v3);
    const v4 = document.createElement('img');
    v4.setAttribute('src', `/static/images4/cancel.png`);
    v4.setAttribute('alt', `X`);
    v3.appendChild(v4);
  }
  const v5 = document.createElement('div');
  v5.className = `message_text`;
  v2.appendChild(v5);
  const v6 = document.createElement('span');
  v6.appendChild(document.createTextNode(context.text));
  v5.appendChild(v6);
  
return { $root: v1, el: v2, close: v3, message: v5 };
}
function event(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `timeline_event timeline_` + context.type;
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = `timeline_event_animator`;
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.className = `timeline_header`;
  v3.appendChild(v4);
  const v5 = document.createElement('span');
  v5.className = `timeline_header_clock`;
  v4.appendChild(v5);
  if (context.url) {
    const v6 = document.createElement('a');
    v6.className = `header_text`;
    v6.href = context.url;
    v6.setAttribute('target', `_blank`);
    v4.appendChild(v6);
  } else {
    const v7 = document.createElement('span');
    v7.className = `header_text`;
    v4.appendChild(v7);
  }
  const v8 = document.createElement('div');
  v8.className = `progress`;
  v3.appendChild(v8);
  const v9 = document.createElement('div');
  v9.className = `progress_bkg`;
  v8.appendChild(v9);
  const v10 = document.createElement('div');
  v10.className = `progress_inside`;
  v9.appendChild(v10);
  const v11 = context.songs.map((context) => {
    const v12 = document.createDocumentFragment();
    v12.appendChild(song(context).$root);
    v3.appendChild(v12);
    
return { $root: v12 };
  });
  
return {
    $root: v1,
    el: v2,
    header_container: v4,
    clock: v5,
    header_anchor: v6,
    header_span: v7,
    progress: v8,
    progress_inside: v10,
    songs: v11,
  };
}
function timelineEventTooltip(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.appendChild(document.createTextNode(context.text));
  v2.className = `error_tooltip`;
  v1.appendChild(v2);
  
return { $root: v1, el: v2 };
}
function timelineSong(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `song`;
  v1.appendChild(v2);
  if (context.request_id) {
    const v3 = document.createElement('div');
    v3.className = `request_cancel`;
    v2.appendChild(v3);
    const v4 = document.createElement('span');
    v4.appendChild(document.createTextNode(`x`));
    v4.className = `request_cancel_x`;
    v3.appendChild(v4);
  }
  if (context.entry_id) {
    const v5 = document.createElement('div');
    v5.className = `song_highlight song_highlight_left`;
    v2.appendChild(v5);
    const v6 = document.createElement('div');
    v6.className = `song_highlight song_highlight_right`;
    v2.appendChild(v6);
    const v7 = document.createElement('div');
    v7.className = `song_highlight song_highlight_topleft`;
    v2.appendChild(v7);
    const v8 = document.createElement('div');
    v8.className = `song_highlight song_highlight_topright`;
    v2.appendChild(v8);
    const v9 = document.createElement('div');
    v9.className = `song_highlight song_highlight_bottomleft`;
    v2.appendChild(v9);
    const v10 = document.createElement('div');
    v10.className = `song_highlight song_highlight_bottomright`;
    v2.appendChild(v10);
  }
  if (context.entry_id && !MOBILE && Sizing.simple) {
    const v11 = document.createElement('div');
    v11.className = `vote_button`;
    v2.appendChild(v11);
    const v12 = document.createElement('span');
    v12.appendChild(document.createTextNode($l('vote')));
    v12.className = `vote_button_rotate`;
    v11.appendChild(v12);
  }
  const v13 = document.createElement('div');
  v13.className = `art_anchor`;
  v2.appendChild(v13);
  if (context.request_id) {
    const v14 = document.createElement('div');
    v14.className = `request_sort_grab`;
    v13.appendChild(v14);
    const v15 = document.createElement('img');
    v15.setAttribute('src', `/static/images4/sort.svg`);
    v14.appendChild(v15);
  }
  const v16 = document.createElement('div');
  v16.className = `art_container`;
  v13.appendChild(v16);
  if (context._is_timeline && User.sid === 5) {
    const v17 = document.createElement('div');
    v17.className =
      `power_only song_station_indicator song_station_indicator_` + context.origin_sid;
    v16.appendChild(v17);
  }
  if (context.elec_request_user_id) {
    if (context.elec_request_user_id == User.id) {
      const v18 = document.createElement('div');
      v18.className = `requester your_request`;
      v16.appendChild(v18);
      if (!MOBILE) {
        const v19 = document.createElement('a');
        v19.appendChild(document.createTextNode(context.elec_request_username));
        v19.href = `#!/listener/` + context.elec_request_user_id;
        v18.appendChild(v19);
      } else {
        v18.appendChild(document.createTextNode(context.elec_request_username));
      }
      const v20 = document.createElement('div');
      v20.appendChild(document.createTextNode($l('timeline_art__your_request_indicator')));
      v20.className = `request_indicator your_request`;
      v16.appendChild(v20);
    } else {
      const v21 = document.createElement('div');
      v21.className = `requester`;
      v16.appendChild(v21);
      if (!MOBILE) {
        const v22 = document.createElement('a');
        v22.appendChild(document.createTextNode(context.elec_request_username));
        v22.href = `#!/listener/` + context.elec_request_user_id;
        v21.appendChild(v22);
      } else {
        v21.appendChild(document.createTextNode(context.elec_request_username));
      }
      const v23 = document.createElement('div');
      v23.appendChild(document.createTextNode($l('timeline_art__request_indicator')));
      v23.className = `request_indicator`;
      v16.appendChild(v23);
    }
  }
  const v24 = document.createElement('div');
  v24.className = `song_content`;
  v2.appendChild(v24);
  v24.appendChild(rating(context).$root);
  if (context.entry_id) {
    const v25 = document.createElement('div');
    v25.className = `entry_votes`;
    v24.appendChild(v25);
    const v26 = document.createElement('span');
    v25.appendChild(v26);
  }
  v24.appendChild(fave(context).$root);
  const v27 = document.createElement('div');
  v27.appendChild(document.createTextNode(context.title));
  v27.className = `title`;
  v27.setAttribute('title', context.title);
  v24.appendChild(v27);
  if (context.request_id) {
    const v28 = document.createElement('div');
    v28.className = `cooldown_info`;
    v24.appendChild(v28);
  } else {
    const v29 = document.createElement('div');
    v29.className = `artist`;
    v24.appendChild(v29);
    const v30 = context.artists.map((context) => {
      const v31 = document.createDocumentFragment();
      const v32 = document.createElement('a');
      v32.appendChild(document.createTextNode(context.name));
      v32.href = `#!/artist/` + context.id;
      v31.appendChild(v32);
      const v33 = document.createElement('span');
      v33.appendChild(document.createTextNode(`,`));
      v31.appendChild(v33);
      v29.appendChild(v31);
      
return { $root: v31 };
    });
    if (context.url) {
      const v34 = document.createElement('div');
      v34.className = `song_link_container`;
      v24.appendChild(v34);
      const v35 = document.createElement('a');
      v35.appendChild(document.createTextNode(context.link_text));
      v35.className = `song_link`;
      v35.href = context.url;
      v35.setAttribute('target', `_blank`);
      v34.appendChild(v35);
    }
  }
  
return {
    $root: v1,
    root: v2,
    cancel: v3,
    vote_button_text: v12,
    request_drag: v14,
    art: v16,
    votes: v26,
    title: v27,
    cooldown: v28,
    artists: v30,
  };
}
function mobileRating(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `mobile_rating unselectable ` + context.extraclass;
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = `slide_number`;
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.className = `slider`;
  v2.appendChild(v4);
  
return { $root: v1, el: v2, number: v3, slider: v4 };
}
function rating(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `rating`;
  v1.appendChild(v2);
  if (User.id > 1 || context.rating_user) {
    const v3 = document.createElement('div');
    v3.className = `rating_number rating_hover`;
    v2.appendChild(v3);
  }
  
return { $root: v1, rating: v2, rating_hover_number: v3 };
}
function modalRating(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.appendChild(document.createTextNode(`5.0`));
  v2.setAttribute('id', `rating_window_5_0`);
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.appendChild(document.createTextNode(`4.5`));
  v3.setAttribute('id', `rating_window_4_5`);
  v1.appendChild(v3);
  const v4 = document.createElement('div');
  v4.appendChild(document.createTextNode(`4.0`));
  v4.setAttribute('id', `rating_window_4_0`);
  v1.appendChild(v4);
  const v5 = document.createElement('div');
  v5.appendChild(document.createTextNode(`3.5`));
  v5.setAttribute('id', `rating_window_3_5`);
  v1.appendChild(v5);
  const v6 = document.createElement('div');
  v6.appendChild(document.createTextNode(`3.0`));
  v6.setAttribute('id', `rating_window_3_0`);
  v1.appendChild(v6);
  const v7 = document.createElement('div');
  v7.appendChild(document.createTextNode(`2.5`));
  v7.setAttribute('id', `rating_window_2_5`);
  v1.appendChild(v7);
  const v8 = document.createElement('div');
  v8.appendChild(document.createTextNode(`2.0`));
  v8.setAttribute('id', `rating_window_2_0`);
  v1.appendChild(v8);
  const v9 = document.createElement('div');
  v9.appendChild(document.createTextNode(`1.5`));
  v9.setAttribute('id', `rating_window_1_5`);
  v1.appendChild(v9);
  const v10 = document.createElement('div');
  v10.appendChild(document.createTextNode(`1.0`));
  v10.setAttribute('id', `rating_window_1_0`);
  v1.appendChild(v10);
  
return { $root: v1 };
}
function albumRating(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `rating album_rating`;
  v1.appendChild(v2);
  if (!Sizing.simple) {
    const v3 = document.createElement('div');
    v3.className = `rating_number rating_hover`;
    v2.appendChild(v3);
  }
  
return { $root: v1, rating: v2, rating_hover_number: v3 };
}
function authFailureModal(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('p');
  v2.appendChild(document.createTextNode($l('auth_failed_message')));
  v1.appendChild(v2);
  const v3 = document.createElement('p');
  v1.appendChild(v3);
  const v4 = document.createElement('a');
  v4.appendChild(document.createTextNode(`Login Page`));
  v4.className = `link obvious`;
  v4.href = `/oauth/login`;
  v3.appendChild(v4);
  const v5 = document.createElement('p');
  v1.appendChild(v5);
  const v6 = document.createElement('a');
  v6.appendChild(document.createTextNode(`Logout`));
  v6.className = `link obvious`;
  v6.href = `/oauth/logout`;
  v5.appendChild(v6);
  const v7 = document.createElement('p');
  v1.appendChild(v7);
  const v8 = document.createElement('a');
  v8.appendChild(document.createTextNode(`Discord`));
  v8.className = `link obvious`;
  v8.href = `https://discord.gg/fdb2cs7puS`;
  v7.appendChild(v8);
  
return { $root: v1 };
}
function hotkey(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.setAttribute('id', `hotkey_error`);
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.setAttribute('id', `hotkey`);
  v2.appendChild(v4);
  const v5 = document.createElement('div');
  v5.appendChild(document.createTextNode($l('waiting_for_hotkey')));
  v4.appendChild(v5);
  const v6 = document.createElement('div');
  v6.setAttribute('style', `float: left`);
  v4.appendChild(v6);
  const v7 = document.createElement('span');
  v7.appendChild(document.createTextNode(`1-5`));
  v6.appendChild(v7);
  const v8 = document.createElement('span');
  v8.appendChild(document.createTextNode($l('hotkeys_rate10')));
  v6.appendChild(v8);
  const v9 = document.createElement('div');
  v9.setAttribute('style', `float: right; margin-left: 10px`);
  v4.appendChild(v9);
  const v10 = document.createElement('span');
  v10.appendChild(document.createTextNode(`A,S,D`));
  v9.appendChild(v10);
  const v11 = document.createElement('span');
  v11.appendChild(document.createTextNode($l('hotkeys_vote0')));
  v9.appendChild(v11);
  const v12 = document.createElement('div');
  v12.setAttribute('style', `float: left; clear: both`);
  v4.appendChild(v12);
  const v13 = document.createElement('span');
  v13.appendChild(document.createTextNode(`Q-R`));
  v12.appendChild(v13);
  const v14 = document.createElement('span');
  v14.appendChild(document.createTextNode($l('hotkeys_rate05')));
  v12.appendChild(v14);
  const v15 = document.createElement('div');
  v15.setAttribute('style', `float: right; margin-left: 10px`);
  v4.appendChild(v15);
  const v16 = document.createElement('span');
  v16.appendChild(document.createTextNode(`Z,X,C`));
  v15.appendChild(v16);
  const v17 = document.createElement('span');
  v17.appendChild(document.createTextNode($l('hotkeys_vote1')));
  v15.appendChild(v17);
  const v18 = document.createElement('div');
  v18.setAttribute('style', `clear: both`);
  v4.appendChild(v18);
  const v19 = document.createElement('span');
  v19.appendChild(document.createTextNode(`F`));
  v18.appendChild(v19);
  const v20 = document.createElement('span');
  v20.appendChild(document.createTextNode($l('hotkeys_fave')));
  v18.appendChild(v20);
  const v21 = document.createElement('div');
  v21.setAttribute('style', `clear: both`);
  v4.appendChild(v21);
  const v22 = document.createElement('span');
  v22.appendChild(document.createTextNode(`Space`));
  v21.appendChild(v22);
  const v23 = document.createElement('span');
  v23.appendChild(document.createTextNode($l('hotkeys_play')));
  v21.appendChild(v23);
  
return {
    $root: v1,
    hotkey: v2,
    hotkeys_rate10: v7,
    hotkeys_vote0: v10,
    hotkeys_rate05: v13,
    hotkeys_vote1: v16,
    hotkeys_fave: v19,
    hotkeys_play: v22,
  };
}
function menu(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `header unselectable`;
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = `menu_wrapper`;
  v2.appendChild(v3);
  const v4 = document.createElement('ul');
  v4.className = `menu hamburger_container`;
  v3.appendChild(v4);
  const v5 = document.createElement('li');
  v5.className = `hamburger_icon_li`;
  v4.appendChild(v5);
  v5.appendChild(menu_hamburger(context).$root);
  const v6 = document.createElement('a');
  v6.className = `link`;
  v5.appendChild(v6);
  const v7 = document.createElement('div');
  v7.className = `hamburger_icon`;
  v6.appendChild(v7);
  const v8 = document.createElement('ul');
  v8.className = `menu user_status`;
  v3.appendChild(v8);
  if (User.id > 1) {
    const v9 = document.createElement('li');
    v9.className = `user_info`;
    v8.appendChild(v9);
    const v10 = document.createElement('a');
    v10.href = `#!/listener/` + User.id;
    v9.appendChild(v10);
    const v11 = document.createElement('span');
    v11.appendChild(document.createTextNode(User.name));
    v10.appendChild(v11);
    const v12 = document.createElement('img');
    v12.className = `avatar`;
    v12.setAttribute('src', User.avatar);
    v10.appendChild(v12);
  } else {
    const v13 = document.createElement('li');
    v13.className = `login_link`;
    v8.appendChild(v13);
    const v14 = document.createElement('a');
    v14.appendChild(document.createTextNode($l('login')));
    v14.className = `link`;
    v14.href = `/oauth/login`;
    v13.appendChild(v14);
    const v15 = document.createElement('li');
    v15.className = `signup_link`;
    v8.appendChild(v15);
    const v16 = document.createElement('a');
    v16.appendChild(document.createTextNode($l('signup')));
    v16.href = `/oauth/discord`;
    v15.appendChild(v16);
  }
  const v17 = document.createElement('ul');
  v17.className = `menu main_menu`;
  v3.appendChild(v17);
  const v18 = document.createElement('li');
  v18.className = `requests_link`;
  v17.appendChild(v18);
  const v19 = document.createElement('div');
  v19.className = `plusminus`;
  v18.appendChild(v19);
  const v20 = document.createElement('a');
  v18.appendChild(v20);
  const v21 = _svg('requests');
  v21.setAttribute('class', `menu_icon menu_icon_requests`);
  v20.appendChild(v21);
  const v22 = document.createElement('span');
  v22.appendChild(document.createTextNode($l('Requests')));
  v20.appendChild(v22);
  const v23 = document.createElement('li');
  v23.className = `playlist_link`;
  v17.appendChild(v23);
  const v24 = document.createElement('a');
  v23.appendChild(v24);
  const v25 = _svg('library');
  v25.setAttribute('class', `menu_icon menu_icon_library`);
  v24.appendChild(v25);
  const v26 = document.createElement('span');
  v26.appendChild(document.createTextNode($l('library')));
  v24.appendChild(v26);
  const v27 = document.createElement('li');
  v27.className = `search_link`;
  v17.appendChild(v27);
  const v28 = document.createElement('a');
  v27.appendChild(v28);
  const v29 = document.createElement('img');
  v29.className = `menu_icon menu_icon_search`;
  v29.setAttribute('src', `/static/images4/search.png`);
  v28.appendChild(v29);
  const v30 = document.createElement('span');
  v30.appendChild(document.createTextNode($l('search')));
  v28.appendChild(v30);
  const v31 = document.createElement('div');
  v31.setAttribute('id', `station_select`);
  v31.className = `closed`;
  v3.appendChild(v31);
  const v32 = _svg('pulldown');
  v32.setAttribute('class', `pulldown_arrow`);
  v31.appendChild(v32);
  const v33 = document.createElement('a');
  v33.setAttribute('id', `station_select_header`);
  v33.className = `station`;
  v31.appendChild(v33);
  const v34 = document.createElement('div');
  v34.className = `station_details`;
  v33.appendChild(v34);
  const v35 = document.createElement('div');
  v35.appendChild(document.createTextNode($l('station_select_header')));
  v35.className = `station_name`;
  v34.appendChild(v35);
  const v36 = context.stations.map((context) => {
    const v37 = document.createDocumentFragment();
    const v38 = document.createElement('a');
    v38.className = `station`;
    v37.appendChild(v38);
    if (context.id != User.sid && !MOBILE) {
      const v39 = document.createElement('div');
      v39.className = `station_song_container`;
      v38.appendChild(v39);
      const v40 = document.createElement('div');
      v40.className = `ss_art`;
      v39.appendChild(v40);
      const v41 = document.createElement('div');
      v41.className = `ss_title`;
      v39.appendChild(v41);
      const v42 = document.createElement('div');
      v42.className = `ss_album`;
      v39.appendChild(v42);
    }
    const v43 = document.createElement('div');
    v43.className = `station_details`;
    v38.appendChild(v43);
    const v44 = document.createElement('div');
    v44.appendChild(document.createTextNode(context.name));
    v44.className = `station_name`;
    v43.appendChild(v44);
    const v45 = document.createElement('div');
    v45.appendChild(document.createTextNode($l('station_menu_description_id_' + context.id)));
    v45.className = `station_description`;
    v43.appendChild(v45);
    v31.appendChild(v37);
    
return {
      menu_link: v38,
      menu_np: v39,
      menu_np_art: v40,
      menu_np_song: v41,
      menu_np_album: v42,
      $root: v37,
    };
  });
  const v46 = document.createElement('div');
  v46.setAttribute('id', `r4_audio_player`);
  v46.className = `unselectable`;
  v3.appendChild(v46);
  const v47 = document.createElement('div');
  v47.className = `load_indicator`;
  v46.appendChild(v47);
  const v48 = document.createElement('div');
  v48.className = `tuned_in_indicator`;
  v46.appendChild(v48);
  const v49 = document.createElement('div');
  v49.className = `m3u menu_dropdown menu_hover_dropdown pconly`;
  v46.appendChild(v49);
  const v50 = document.createElement('a');
  v50.appendChild(document.createTextNode($l('listen_via_browser')));
  v50.className = `link`;
  v49.appendChild(v50);
  const v51 = document.createElement('a');
  v51.appendChild(document.createTextNode($l('listen_via_mp3')));
  v51.href = `/tune_in/` + User.sid + `.mp3.m3u`;
  v51.setAttribute('target', `_blank`);
  v49.appendChild(v51);
  const v52 = document.createElement('a');
  v52.appendChild(document.createTextNode($l('listen_via_ogg')));
  v52.href = `/tune_in/` + User.sid + `.ogg.m3u`;
  v52.setAttribute('target', `_blank`);
  v49.appendChild(v52);
  const v53 = document.createElement('div');
  v53.className = `background`;
  v46.appendChild(v53);
  const v54 = _svg('play');
  v54.setAttribute('class', `audio_icon audio_icon_play`);
  v53.appendChild(v54);
  const v55 = _svg('stop');
  v55.setAttribute('class', `audio_icon audio_icon_stop pconly`);
  v53.appendChild(v55);
  const v56 = _svg('mute');
  v56.setAttribute('class', `audio_icon audio_icon_mute pconly`);
  v53.appendChild(v56);
  
return {
    $root: v1,
    header: v2,
    menu_wrapper: v3,
    hamburger_container: v4,
    burger_button: v6,
    user_link: v9,
    login: v14,
    main_menu_ul: v17,
    request_indicator: v19,
    request_link: v20,
    request_link_text: v22,
    playlist_link: v24,
    search_link: v28,
    station_select: v31,
    pulldown: v32,
    station_select_header: v33,
    stations: v36,
    player: v46,
    play2: v50,
    play: v54,
    stop: v55,
    mute: v56,
  };
}
function hamburgerMenu(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `hamburgered menu_dropdown`;
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v2.appendChild(v3);
  const v4 = document.createElement('a');
  v4.appendChild(document.createTextNode(`Discord`));
  v4.href = `https://discord.gg/fdb2cs7puS`;
  v4.setAttribute('target', `_blank`);
  v3.appendChild(v4);
  if (User.id > 1 && !User.uses_oauth) {
    const v5 = document.createElement('a');
    v5.appendChild(document.createTextNode($l('link_discord')));
    v5.href = `/oauth/discord`;
    v3.appendChild(v5);
  }
  if (User.id != 1) {
    const v6 = document.createElement('a');
    v6.appendChild(document.createTextNode($l('logout')));
    v6.href = `/oauth/logout`;
    v3.appendChild(v6);
  }
  const v7 = document.createElement('div');
  v7.className = `pconly menu_group`;
  v2.appendChild(v7);
  const v8 = document.createElement('a');
  v8.appendChild(document.createTextNode($l('playback_history_link')));
  v8.href = `/pages/playback_history`;
  v8.setAttribute('target', `_blank`);
  v7.appendChild(v8);
  const v9 = document.createElement('div');
  v9.className = `menu_group`;
  v2.appendChild(v9);
  const v10 = document.createElement('a');
  v10.appendChild(document.createTextNode($l('Patreon')));
  v10.href = `https://www.patreon.com/rainwave`;
  v10.setAttribute('target', `_blank`);
  v9.appendChild(v10);
  const v11 = document.createElement('a');
  v11.appendChild(document.createTextNode($l('PayPal')));
  v11.href = `https://paypal.me/Rainwave/5USD`;
  v11.setAttribute('target', `_blank`);
  v11.className = `pconly`;
  v9.appendChild(v11);
  const v12 = document.createElement('div');
  v12.className = `menu_group pconly`;
  v2.appendChild(v12);
  const v13 = document.createElement('a');
  v13.appendChild(document.createTextNode($l('github_repo')));
  v13.href = `https://github.com/rmcauley/rainwave/`;
  v13.setAttribute('target', `_blank`);
  v12.appendChild(v13);
  const v14 = document.createElement('a');
  v14.appendChild(document.createTextNode($l('api_docs')));
  v14.href = `/api4/`;
  v14.setAttribute('target', `_blank`);
  v12.appendChild(v14);
  if (!MOBILE) {
    const v15 = document.createElement('div');
    v15.className = `menu_group pconly`;
    v2.appendChild(v15);
    const v16 = document.createElement('a');
    v16.appendChild(document.createTextNode($l('Settings')));
    v16.className = `link`;
    v15.appendChild(v16);
  }
  
return { $root: v1, settings_link: v16 };
}
function requestsPanel(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `close`;
  v1.appendChild(v2);
  const v3 = document.createElement('img');
  v3.setAttribute('src', `/static/images4/cancel.png`);
  v3.setAttribute('alt', `X`);
  v2.appendChild(v3);
  const v4 = document.createElement('ul');
  v4.className = `panel_header`;
  v1.appendChild(v4);
  const v5 = document.createElement('li');
  v5.className = `open`;
  v4.appendChild(v5);
  const v6 = document.createElement('a');
  v6.appendChild(document.createTextNode($l('Requests')));
  v5.appendChild(v6);
  if (!Sizing.simple) {
    const v7 = document.createElement('div');
    v7.className = `plusminus`;
    v1.appendChild(v7);
  }
  const v8 = document.createElement('ul');
  v8.className = `panel_header request_icons unselectable`;
  v1.appendChild(v8);
  const v9 = document.createElement('li');
  v9.className = `pause_queue`;
  v8.appendChild(v9);
  const v10 = document.createElement('img');
  v10.setAttribute('src', `/static/images4/request_pause.png`);
  v9.appendChild(v10);
  const v11 = document.createElement('span');
  v11.appendChild(document.createTextNode($l('Suspend')));
  v9.appendChild(v11);
  const v12 = document.createElement('li');
  v12.className = `pause_queue`;
  v8.appendChild(v12);
  const v13 = document.createElement('img');
  v13.setAttribute('src', `/static/images4/request_play.png`);
  v12.appendChild(v13);
  const v14 = document.createElement('span');
  v14.appendChild(document.createTextNode($l('Resume')));
  v12.appendChild(v14);
  const v15 = document.createElement('li');
  v8.appendChild(v15);
  const v16 = document.createElement('img');
  v16.setAttribute('src', `/static/images4/request_faves.png`);
  v15.appendChild(v16);
  const v17 = document.createElement('span');
  v17.appendChild(document.createTextNode($l('Faves')));
  v15.appendChild(v17);
  const v18 = document.createElement('li');
  v8.appendChild(v18);
  const v19 = document.createElement('img');
  v19.setAttribute('src', `/static/images4/request_unrated.png`);
  v18.appendChild(v19);
  const v20 = document.createElement('span');
  v20.appendChild(document.createTextNode($l('Unrated')));
  v18.appendChild(v20);
  const v21 = document.createElement('li');
  v8.appendChild(v21);
  const v22 = document.createElement('img');
  v22.setAttribute('src', `/static/images4/request_clear.png`);
  v21.appendChild(v22);
  const v23 = document.createElement('span');
  v23.appendChild(document.createTextNode($l('Clear')));
  v21.appendChild(v23);
  const v24 = document.createElement('div');
  v1.appendChild(v24);
  const v25 = document.createElement('div');
  v25.className = `song`;
  v25.setAttribute('style', `visibility: hidden; z-index: -1; transition: none`);
  v24.appendChild(v25);
  
return {
    $root: v1,
    panel_close: v2,
    request_header: v6,
    request_indicator2: v7,
    requests_pause: v9,
    requests_play: v12,
    requests_favfill: v15,
    requests_unrated: v18,
    requests_clear: v21,
    song_list: v24,
    last_song_padder: v25,
  };
}
export default {
  albumDetail,
  albumRating,
  artistDetail,
  authFailureModal,
  errorModal,
  event,
  fave,
  groupDetail,
  hamburgerMenu,
  hotkey,
  index,
  listenerDetail,
  menu,
  message,
  mobileRating,
  modal,
  modalRating,
  oops,
  pullout,
  rating,
  requestsPanel,
  search,
  searchList,
  searchResults,
  settings,
  settingsMultiOption,
  settingsYesNo,
  songDetail,
  songTable,
  timeline,
  timelineEventTooltip,
  timelineSong,
  whatIsCooldownModal,
};

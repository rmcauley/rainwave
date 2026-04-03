import { $l } from '../../language';
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
export { hotkey };

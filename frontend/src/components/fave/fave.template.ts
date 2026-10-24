import style from './fave.scss';
function faveTemplate() {
  const v1 = document.createElement('div');
  v1.className = 'fave';
  const v2 = document.createElement('img');
  v2.className = 'fave-lined';
  v2.setAttribute('src', `/static/images4/heart_lined.png`);
  v1.appendChild(v2);
  const v3 = document.createElement('img');
  v3.className = 'fave-solid';
  v3.setAttribute('src', `/static/images4/heart_solid_gold.png`);
  v1.appendChild(v3);
  return { $root: v1, fave: v1 };
}
export { faveTemplate };

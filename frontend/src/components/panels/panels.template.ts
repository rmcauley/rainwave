import { svgIcon as _svg } from '../../helpers/svg';
function panelsTemplate() {
const v1 = document.createElement('div');
v1.setAttribute('id',`panels`);
const v2 = document.createElement('div');
v2.setAttribute('id',`panels-request`);
v2.className='panel';
v1.appendChild(v2);
const v3 = document.createElement('div');
v3.setAttribute('id',`panels-search`);
v3.className='panel';
v1.appendChild(v3);
const v4 = document.createElement('div');
v4.setAttribute('id',`panels-detail`);
v4.className='panel';
v1.appendChild(v4);
const v5 = document.createElement('div');
v5.setAttribute('id',`panels-detail-header`);
v4.appendChild(v5);
const v6 = document.createElement('div');
v5.appendChild(v6);
const v7 = _svg('#rw-icon-close');
v7.setAttribute('class',`rw-icon-close`);
v7.setAttribute('viewbox',`0 0 100 100`);
v5.appendChild(v7);
const v8 = document.createElement('div');
v8.setAttribute('id',`panels-detail-body`);
v4.appendChild(v8);
return {"$root": v1,"requestPanel": v2,"searchPanel": v3,"detailPanel": v4,"header": v6,"closeIcon": v7,"body": v8,}
;}
export { panelsTemplate };
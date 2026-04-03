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
export { modal };

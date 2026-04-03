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
export { message };

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
export { mobileRating };

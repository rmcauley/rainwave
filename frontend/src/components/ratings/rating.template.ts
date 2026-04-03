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
export { rating };

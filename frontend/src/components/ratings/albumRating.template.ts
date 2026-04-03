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
export { albumRating };

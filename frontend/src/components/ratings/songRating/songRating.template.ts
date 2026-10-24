function songRatingTemplate() {
const v1 = document.createElement('song-rating');
v1.className='rating';
const v2 = document.createElement('div');
v2.className='rating-number rating-hover';
v1.appendChild(v2);
return {"$root": v1,"rating": v1,"ratingHoverNumber": v2,}
;}
export { songRatingTemplate };
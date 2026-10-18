import style from './rating.scss';
function ratingTemplate() {
const v1 = document.createElement('div');
v1.className='rating';
if (User.id > 1 || context.rating_user) {
const v2 = document.createElement('div');
v2.className='rating-number rating-hover';
v1.appendChild(v2);
}
return {"$root": v1,"rating": v1,"ratingHoverNumber": v2,}
;}
export { ratingTemplate };
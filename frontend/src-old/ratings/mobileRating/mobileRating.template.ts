function mobileRatingTemplate() {
const v1 = document.createElement('div');
v1.className='mobile-rating unselectable';
const v2 = document.createElement('div');
v2.className='slide-number';
v1.appendChild(v2);
const v3 = document.createElement('div');
v3.className='slider';
v1.appendChild(v3);
return {"$root": v1,"mobileRating": v1,"number": v2,"slider": v3,}
;}
export { mobileRatingTemplate };
// stolen from quirksmode.org
function getMousePosX(e) {
	var posx = 0;
	if (!e) e = window.event;
	if (e.pageX) {
		posx = e.pageX;
	}
	else if (e.clientX) {
		posx = e.clientX + document.body.scrollLeft	+ document.documentElement.scrollLeft;
	}
	return posx;
}

// more stealing from quirksmode.org
function getMousePosY(e) {
	var posy = 0;
	if (!e) e = window.event;
	if (e.pageY) {
		posy = e.pageY;
	}
	else if (e.clientY) {
		posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
	}
	return posy;
}

function mouseUpdate(e) {
	mouse.x = getMousePosX(e);
	mouse.y = getMousePosY(e);
}

window.addEventListener('mousedown', mouseUpdate, true);
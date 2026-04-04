let queue: Array<FrameRequestCallback> = [];
let requested = false;

const go: FrameRequestCallback = (time) => {
  const toExecute = queue.slice();
  queue = [];
  requested = false;
  toExecute.forEach((fn) => fn(time));
};

/* @deprecated */
function delay(): void {
  requestAnimationFrame(go);
}

/* @deprecated */
function requestNextAnimationFrame(callback: FrameRequestCallback): void {
  queue.push(callback);
  if (!requested) {
    requestAnimationFrame(delay);
  }
  requested = true;
}

export { requestNextAnimationFrame };

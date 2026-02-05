let queue: Array<FrameRequestCallback> = [];
let requested = false;

const go: FrameRequestCallback = (time) => {
  const toExecute = queue.slice();
  queue = [];
  requested = false;
  toExecute.forEach((fn) => fn(time));
};

function delay(): void {
  requestAnimationFrame(go);
}

function requestNextAnimationFrame(callback: FrameRequestCallback): void {
  queue.push(callback);
  if (!requested) {
    requestAnimationFrame(delay);
  }
  requested = true;
}

export { requestNextAnimationFrame };

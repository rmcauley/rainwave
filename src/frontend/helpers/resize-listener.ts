type RainwaveResizeListener = (event: UIEvent) => void;

const resizeListeners: Set<RainwaveResizeListener> = new Set();
let priorityResizeListener: RainwaveResizeListener | undefined;

function setPriorityResizeListener(listener: RainwaveResizeListener): void {
  priorityResizeListener = listener;
}

function addResizeListener(listener: RainwaveResizeListener): void {
  resizeListeners.add(listener);
}

function removeResizeListener(listener: RainwaveResizeListener): void {
  resizeListeners.delete(listener);
}

const handleResize: Parameters<typeof window.addEventListener<'resize'>>[1] = (event) => {
  if (priorityResizeListener) {
    priorityResizeListener(event);
  }

  // Then call all registered listeners
  resizeListeners.forEach((listener) => listener(event));
};

window.addEventListener('resize', handleResize);

export { addResizeListener, removeResizeListener, setPriorityResizeListener };

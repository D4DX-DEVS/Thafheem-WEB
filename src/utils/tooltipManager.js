// Global tooltip manager to ensure only one tooltip is visible at a time
let currentTooltipId = null;
const tooltipCallbacks = new Map();

export const registerTooltip = (id, showCallback, hideCallback) => {
  tooltipCallbacks.set(id, { showCallback, hideCallback });
  
  // Hide previous tooltip if different
  if (currentTooltipId && currentTooltipId !== id) {
    const prev = tooltipCallbacks.get(currentTooltipId);
    if (prev?.hideCallback) {
      prev.hideCallback();
    }
  }
  
  currentTooltipId = id;
  
  return () => {
    if (currentTooltipId === id) {
      currentTooltipId = null;
    }
    tooltipCallbacks.delete(id);
  };
};

export const hideCurrentTooltip = () => {
  if (currentTooltipId) {
    const current = tooltipCallbacks.get(currentTooltipId);
    if (current?.hideCallback) {
      current.hideCallback();
    }
    currentTooltipId = null;
  }
};

export const getCurrentTooltipId = () => currentTooltipId;

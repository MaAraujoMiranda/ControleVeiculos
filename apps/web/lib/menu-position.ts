export interface MenuPosition {
  top: number;
  left: number;
}

export function getMenuPosition(
  triggerRect: DOMRect,
  menuWidth: number,
  menuHeight: number,
): MenuPosition {
  const offset = 6;
  const viewportPadding = 8;

  const maxLeft = window.innerWidth - menuWidth - viewportPadding;
  const preferredLeft = triggerRect.right - menuWidth;
  const left = Math.min(Math.max(preferredLeft, viewportPadding), maxLeft);

  const spaceBelow = window.innerHeight - triggerRect.bottom;
  const shouldOpenUp = spaceBelow < menuHeight + offset;

  const preferredTop = shouldOpenUp
    ? triggerRect.top - menuHeight - offset
    : triggerRect.bottom + offset;
  const maxTop = window.innerHeight - menuHeight - viewportPadding;
  const top = Math.min(Math.max(preferredTop, viewportPadding), maxTop);

  return { top, left };
}

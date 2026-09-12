export function positionPopover(panel: HTMLElement, trigger: HTMLElement) {
  const anchor = trigger.getBoundingClientRect();
  const size = panel.getBoundingClientRect();

  let top = anchor.bottom + 6;
  if (top + size.height > window.innerHeight - 8) {
    top = Math.max(8, anchor.top - size.height - 6);
  }

  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - size.width - 8));
  panel.style.top = `${top}px`;
  panel.style.left = `${left}px`;
}

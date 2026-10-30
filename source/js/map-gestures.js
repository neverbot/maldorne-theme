// Pan and zoom gestures shared by the map viewers: drag with one pointer, pinch
// with two, Ctrl or Cmd and the wheel. Returns a function that tells whether the
// last press moved the view, which makes it a drag instead of a click.
window.mapGestures = function (target, board, on) {
  'use strict';

  const pointers = new Map();
  let moved = false;
  let last = null;

  const span = () => {
    const [a, b] = [...pointers.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  target.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.size === 1) moved = false;
    else moved = true;
    last = pointers.size === 2 ? span() : null;
  });

  window.addEventListener('pointermove', (ev) => {
    const p = pointers.get(ev.pointerId);
    if (!p) return;
    const r = board.getBoundingClientRect();
    if (pointers.size === 1) {
      const dx = ev.clientX - p.x;
      const dy = ev.clientY - p.y;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      p.x = ev.clientX;
      p.y = ev.clientY;
      on.pan(dx, dy);
    } else if (pointers.size === 2) {
      p.x = ev.clientX;
      p.y = ev.clientY;
      const now = span();
      if (last && last.d > 0) {
        on.pan(now.x - last.x, now.y - last.y);
        on.zoom(now.d / last.d, now.x - r.left, now.y - r.top);
      }
      last = now;
    }
  });

  const release = (ev) => {
    pointers.delete(ev.pointerId);
    last = null;
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  target.addEventListener(
    'wheel',
    (ev) => {
      // the wheel alone scrolls the page; with Ctrl or Cmd it zooms the map
      if (!ev.ctrlKey && !ev.metaKey) return;
      ev.preventDefault();
      const r = board.getBoundingClientRect();
      on.zoom(
        Math.exp(-ev.deltaY * (ev.deltaMode ? 0.05 : 0.0015)),
        ev.clientX - r.left,
        ev.clientY - r.top,
      );
    },
    { passive: false },
  );

  return () => moved;
};

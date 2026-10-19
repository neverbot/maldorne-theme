// Read-only viewer of a game map (format mapper/1, see scripts/maps.js).
// One cell per location, exits as lines, one level at a time, pan and zoom.
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const CELL = 20; // distance between two cells, in map units
  const SIZE = 12; // side of a location square
  const K_MIN = 0.1;
  const K_MAX = 8;
  const K_STD = 1; // the zoom every level opens at

  // screen vectors (y grows down) of the directions that can be drawn as a line
  const COMPASS = {
    north: [0, -1],
    south: [0, 1],
    east: [1, 0],
    west: [-1, 0],
    northeast: [1, -1],
    northwest: [-1, -1],
    southeast: [1, 1],
    southwest: [-1, 1],
  };
  // direction words as the mud saves them, English or Spanish
  const ALIASES = {
    n: 'north',
    norte: 'north',
    s: 'south',
    sur: 'south',
    e: 'east',
    este: 'east',
    w: 'west',
    o: 'west',
    oeste: 'west',
    ne: 'northeast',
    noreste: 'northeast',
    nw: 'northwest',
    noroeste: 'northwest',
    se: 'southeast',
    sureste: 'southeast',
    sw: 'southwest',
    suroeste: 'southwest',
    u: 'up',
    arriba: 'up',
    d: 'down',
    abajo: 'down',
    in: 'in',
    inside: 'in',
    dentro: 'in',
    entrar: 'in',
    out: 'out',
    outside: 'out',
    fuera: 'out',
    salir: 'out',
  };

  const $ = (id) => document.getElementById(id);
  const svg = $('mapper-svg');
  const board = $('mapper-board');
  if (!svg || !board) return;

  const meta = JSON.parse($('mapper-meta').textContent);
  const els = {
    levels: $('mapper-levels'),
    info: $('mapper-info'),
    tip: $('mapper-tip'),
    status: $('mapper-status'),
    search: $('mapper-search'),
    results: $('mapper-results'),
  };

  let map = null;
  let byId = {};
  let areaName = {};
  let areaHue = {};
  let levels = [];
  let level = 0;
  let selected = null;
  let world = null;
  const view = { x: 0, y: 0, k: 1 };

  const sx = (loc) => loc.x * CELL;
  const sy = (loc) => -loc.y * CELL;
  const dirOf = (word) => {
    const d = String(word).toLowerCase();
    if (COMPASS[d] || ['up', 'down', 'in', 'out'].includes(d)) return d;
    return ALIASES[d] || d;
  };
  const plain = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const make = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach((k) => e.setAttribute(k, attrs[k]));
    if (parent) parent.appendChild(e);
    return e;
  };
  const html = (tag, props, parent) => {
    const e = document.createElement(tag);
    Object.assign(e, props || {});
    if (parent) parent.appendChild(e);
    return e;
  };

  const areaLabel = (id) => areaName[id] || id;
  // the colour group of a location: its zone hash, else its area
  const groupOf = (l) => (l.zone ? 'z:' + l.zone : 'a:' + l.area);
  const levelLocations = (z) => map.locations.filter((l) => l.z === z);

  // ---- view: pan, zoom

  const applyView = () => {
    if (world) world.setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.k})`);
  };

  const zoomAt = (factor, cx, cy) => {
    const k = Math.min(K_MAX, Math.max(K_MIN, view.k * factor));
    const f = k / view.k;
    view.x = cx - (cx - view.x) * f;
    view.y = cy - (cy - view.y) * f;
    view.k = k;
    applyView();
  };

  // the bounds of a level's locations, in map units, with a cell of margin
  const levelBox = (z) => {
    const list = levelLocations(z);
    if (!list.length) return null;
    const xs = list.map(sx);
    const ys = list.map(sy);
    return {
      x0: Math.min(...xs) - CELL,
      x1: Math.max(...xs) + CELL,
      y0: Math.min(...ys) - CELL,
      y1: Math.max(...ys) + CELL,
    };
  };

  // whether the whole level fits in the board at the current zoom
  const levelFits = () => {
    const b = levelBox(level);
    return (
      !!b &&
      (b.x1 - b.x0) * view.k <= board.clientWidth &&
      (b.y1 - b.y0) * view.k <= board.clientHeight
    );
  };

  // centres the whole level in the board, keeping the zoom
  const centreLevel = () => {
    const b = levelBox(level);
    if (!b) return;
    view.x = board.clientWidth / 2 - ((b.x0 + b.x1) / 2) * view.k;
    view.y = board.clientHeight / 2 - ((b.y0 + b.y1) / 2) * view.k;
    applyView();
  };

  // the standard zoom: the whole level centred when it fits, else the middle
  // of its locations
  const standard = () => {
    const list = levelLocations(level);
    if (!list.length) return;
    view.k = K_STD;
    if (levelFits()) {
      centreLevel();
      return;
    }
    const xs = list.map(sx).sort((a, b) => a - b);
    const ys = list.map(sy).sort((a, b) => a - b);
    const cx = xs[Math.floor(xs.length / 2)];
    const cy = ys[Math.floor(ys.length / 2)];
    view.x = board.clientWidth / 2 - cx * K_STD;
    view.y = board.clientHeight / 2 - cy * K_STD;
    applyView();
  };

  const fit = () => {
    const list = levelLocations(level);
    if (!list.length) return;
    const xs = list.map(sx);
    const ys = list.map(sy);
    const x0 = Math.min(...xs) - CELL;
    const x1 = Math.max(...xs) + CELL;
    const y0 = Math.min(...ys) - CELL;
    const y1 = Math.max(...ys) + CELL;
    const w = board.clientWidth;
    const h = board.clientHeight;
    const k = Math.min(K_MAX, Math.max(K_MIN, Math.min(w / (x1 - x0), h / (y1 - y0))));
    view.k = k;
    view.x = (w - (x1 - x0) * k) / 2 - x0 * k;
    view.y = (h - (y1 - y0) * k) / 2 - y0 * k;
    applyView();
  };

  // centres a location keeping the zoom the viewer has
  const centreOn = (loc) => {
    view.x = board.clientWidth / 2 - sx(loc) * view.k;
    view.y = board.clientHeight / 2 - sy(loc) * view.k;
    applyView();
  };

  // ---- drawing of one level

  const draw = () => {
    svg.textContent = '';
    world = make('g', {}, svg);
    const lines = make('g', { class: 'mapper-lines' }, world);
    const rooms = make('g', { class: 'mapper-rooms' }, world);
    const marks = make('g', { class: 'mapper-marks' }, world);
    const list = levelLocations(level);
    const drawn = new Set();
    const ext = {};

    (map.external || []).forEach((e, i) => {
      (ext[e.from] = ext[e.from] || []).push(i);
    });

    list.forEach((a) => {
      // exits between locations of this level
      a.exits.forEach((e) => {
        const b = byId[e.to];
        const dir = dirOf(e.dir);
        if (!b || b === a || b.z !== level || dir === 'up' || dir === 'down') return;
        const key = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id;
        if (drawn.has(key)) return;
        drawn.add(key);
        const far = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) > 1;
        make(
          'line',
          {
            x1: sx(a),
            y1: sy(a),
            x2: sx(b),
            y2: sy(b),
            class: 'mapper-line' + (far ? ' far' : ''),
          },
          lines,
        );
      });

      const r = make(
        'rect',
        {
          x: sx(a) - SIZE / 2,
          y: sy(a) - SIZE / 2,
          width: SIZE,
          height: SIZE,
          rx: 2,
          class: 'mapper-room',
          'data-id': a.id,
          style: `--h:${areaHue[groupOf(a)]};--l:${areaHue[groupOf(a) + ':l']}%`,
        },
        rooms,
      );
      if (selected === a.id) r.classList.add('selected');

      // stairs and doors
      const dirs = a.exits.map((e) => dirOf(e.dir));
      const outer = (map.external || []).filter((e) => e.from === a.id).map((e) => dirOf(e.dir));
      const has = (d) => dirs.includes(d) || outer.includes(d);
      const h = SIZE / 2;
      if (has('up')) {
        make(
          'path',
          { d: `M${sx(a) + h - 1} ${sy(a) - h - 4} l3.5 5 h-7 z`, class: 'mapper-mark' },
          marks,
        );
      }
      if (has('down')) {
        make(
          'path',
          { d: `M${sx(a) + h - 1} ${sy(a) + h + 4} l3.5 -5 h-7 z`, class: 'mapper-mark' },
          marks,
        );
      }
      if (has('in') || has('out')) {
        make(
          'path',
          {
            d: `M${sx(a) - h - 3} ${sy(a) + h + 1} l3 -3.5 l3 3.5 l-3 3.5 z`,
            class: 'mapper-mark' + (has('in') ? '' : ' hollow'),
          },
          marks,
        );
      }
    });

    // exits to other areas: a stub in the direction, clickable
    list.forEach((a) => {
      (ext[a.id] || []).forEach((i) => {
        const e = map.external[i];
        const v = COMPASS[dirOf(e.dir)];
        if (!v) return;
        const gap = SIZE / 2 + 0.5;
        const len = Math.hypot(v[0], v[1]);
        const ux = v[0] / len;
        const uy = v[1] / len;
        const ex = sx(a) + ux * CELL * 0.95;
        const ey = sy(a) + uy * CELL * 0.95;
        const g = make(
          'g',
          { class: 'mapper-ext' + (e.target ? ' linked' : ''), 'data-ext': i },
          marks,
        );
        make(
          'line',
          { x1: sx(a) + ux * gap, y1: sy(a) + uy * gap, x2: ex, y2: ey, class: 'stub' },
          g,
        );
        make('circle', { cx: ex, cy: ey, r: 2.6, class: 'dot' }, g);
        make('circle', { cx: ex, cy: ey, r: 6, class: 'hit' }, g);
      });
    });

    if (selected) {
      const loc = byId[selected];
      if (loc && loc.z === level) {
        make('circle', { cx: sx(loc), cy: sy(loc), r: SIZE * 1.05, class: 'mapper-ring' }, marks);
      }
    }
    applyView();
  };

  // ---- level selector

  const renderLevels = () => {
    els.levels.textContent = '';
    if (levels.length < 2) return;
    levels
      .slice()
      .sort((a, b) => b - a)
      .forEach((z) => {
        const b = html('button', { type: 'button', textContent: `Level ${z}` }, els.levels);
        b.title = `${levelLocations(z).length} locations`;
        b.setAttribute('aria-pressed', String(z === level));
        b.addEventListener('click', () => setLevel(z, true));
      });
  };

  const setLevel = (z, refit) => {
    level = z;
    renderLevels();
    draw();
    if (refit) standard();
  };

  // ---- selection

  const targetUrl = (e) => meta.base.replace(/[^/]+\/$/, '') + e.target.map + '/';

  const renderInfo = (note) => {
    els.info.textContent = '';
    const loc = selected && byId[selected];
    if (!loc && !note) {
      els.info.hidden = true;
      return;
    }
    els.info.hidden = false;
    if (loc) {
      const head = html('p', { className: 'mapper-info-head' }, els.info);
      html('strong', { textContent: loc.name }, head);
      html(
        'span',
        { className: 'maps-meta', textContent: ` ${areaLabel(loc.area)}, level ${loc.z}` },
        head,
      );
      const exits = loc.exits.filter((e) => byId[e.to]);
      if (exits.length) {
        const ul = html('ul', { className: 'mapper-exits' }, els.info);
        exits.forEach((e) => {
          const li = html('li', {}, ul);
          const b = html(
            'button',
            { type: 'button', className: 'mapper-link', textContent: byId[e.to].name },
            li,
          );
          b.addEventListener('click', () => select(e.to, true));
          li.insertBefore(document.createTextNode(`${dirOf(e.dir)}: `), b);
        });
      }
    }
    if (note) html('p', { className: 'maps-meta', textContent: note }, els.info);
  };

  const select = (id, centre, keepHash) => {
    const loc = byId[id];
    if (!loc) return;
    selected = id;
    if (loc.z !== level) setLevel(loc.z, false);
    else draw();
    if (centre) centreOn(loc);
    renderInfo();
    if (!keepHash) {
      try {
        history.replaceState(null, '', '#' + id);
      } catch {
        location.hash = id;
      }
    }
  };

  // where an exit to another area leads, as players may know it: never a path
  const exitPlace = (e) => {
    if (e.kind === 'guild') return e.label ? `the ${e.label} guild` : 'a guild';
    if (e.kind === 'job') return e.label ? `the ${e.label} job` : 'a job';
    return e.label || 'another area';
  };

  const clickExternal = (i) => {
    const e = map.external[i];
    const where = exitPlace(e);
    if (e.target && e.target.map === meta.base.split('/').filter(Boolean).pop()) {
      select(e.target.id, true);
    } else if (e.target) {
      window.location.href = targetUrl(e) + (e.target.id ? '#' + e.target.id : '');
    } else {
      renderInfo(`Exit ${dirOf(e.dir)} to ${where}, which has no map yet.`);
    }
  };

  // ---- hover, click

  const hover = (ev) => {
    if (ev.pointerType === 'touch' || ev.buttons) {
      els.tip.hidden = true;
      return;
    }
    const room = ev.target.closest && ev.target.closest('[data-id]');
    const stub = ev.target.closest && ev.target.closest('[data-ext]');
    let text = '';
    if (room) {
      const loc = byId[room.getAttribute('data-id')];
      text = loc.name;
    } else if (stub) {
      const e = map.external[+stub.getAttribute('data-ext')];
      text = `To ${exitPlace(e)}`;
    }
    if (!text) {
      els.tip.hidden = true;
      return;
    }
    const r = board.getBoundingClientRect();
    els.tip.textContent = text;
    els.tip.hidden = false;
    const x = Math.min(ev.clientX - r.left + 14, r.width - els.tip.offsetWidth - 4);
    els.tip.style.left = Math.max(4, x) + 'px';
    els.tip.style.top = ev.clientY - r.top + 14 + 'px';
  };

  // ---- pointers: drag with one, pinch with two

  const pointers = new Map();
  let moved = false;
  let last = null;

  const span = () => {
    const [a, b] = [...pointers.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  svg.addEventListener('pointerdown', (ev) => {
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
      view.x += dx;
      view.y += dy;
      applyView();
      els.tip.hidden = true;
    } else if (pointers.size === 2) {
      p.x = ev.clientX;
      p.y = ev.clientY;
      const now = span();
      if (last && last.d > 0) {
        view.x += now.x - last.x;
        view.y += now.y - last.y;
        zoomAt(now.d / last.d, now.x - r.left, now.y - r.top);
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

  svg.addEventListener(
    'wheel',
    (ev) => {
      // the wheel alone scrolls the page; with Ctrl or Cmd it zooms the map
      if (!ev.ctrlKey && !ev.metaKey) return;
      ev.preventDefault();
      const r = board.getBoundingClientRect();
      zoomAt(
        Math.exp(-ev.deltaY * (ev.deltaMode ? 0.05 : 0.0015)),
        ev.clientX - r.left,
        ev.clientY - r.top,
      );
    },
    { passive: false },
  );

  svg.addEventListener('click', (ev) => {
    if (moved) return;
    const room = ev.target.closest('[data-id]');
    const stub = ev.target.closest('[data-ext]');
    if (room) select(room.getAttribute('data-id'), false);
    else if (stub) clickExternal(+stub.getAttribute('data-ext'));
  });
  svg.addEventListener('pointermove', hover);
  svg.addEventListener('pointerleave', () => {
    els.tip.hidden = true;
  });

  const zoomBy = (f) => zoomAt(f, board.clientWidth / 2, board.clientHeight / 2);
  $('mapper-zoom-in').addEventListener('click', () => zoomBy(1.4));
  $('mapper-zoom-out').addEventListener('click', () => zoomBy(1 / 1.4));
  $('mapper-fit').addEventListener('click', fit);

  // ---- search

  const search = () => {
    const q = plain(els.search.value.trim());
    els.results.textContent = '';
    if (q.length < 2) {
      els.results.hidden = true;
      return [];
    }
    const found = map.locations.filter((l) => plain(l.name).includes(q)).slice(0, 15);
    found.forEach((l) => {
      const li = html('li', {}, els.results);
      const b = html('button', { type: 'button' }, li);
      html('span', { textContent: l.name }, b);
      html(
        'span',
        { className: 'maps-meta', textContent: ` ${areaLabel(l.area)}, level ${l.z}` },
        b,
      );
      b.addEventListener('click', () => {
        els.results.hidden = true;
        select(l.id, true);
      });
    });
    if (!found.length)
      html('li', { className: 'maps-meta', textContent: 'No matches' }, els.results);
    els.results.hidden = false;
    return found;
  };
  els.search.addEventListener('input', search);
  els.search.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      els.search.value = '';
      els.results.hidden = true;
    } else if (ev.key === 'Enter') {
      const first = search()[0];
      if (first) {
        els.results.hidden = true;
        select(first.id, true);
      }
    }
  });
  document.addEventListener('click', (ev) => {
    if (!ev.target.closest('.mapper-search')) els.results.hidden = true;
  });

  // ---- start

  const fromHash = () => {
    let id;
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch {
      return false;
    }
    if (!byId[id]) return false;
    select(id, true, true);
    return true;
  };

  const start = (data) => {
    map = data;
    map.locations.forEach((l) => {
      byId[l.id] = l;
    });
    areaName = {};
    map.areas.forEach((a) => {
      areaName[a.id] = a.name;
    });
    // one hue per group of locations sharing their move zones (or their area,
    // when they have none), spread with the golden angle; lightness alternates
    const ids = [...new Set(map.locations.map(groupOf))].sort();
    ids.forEach((id, i) => {
      areaHue[id] = Math.round((i * 137.508 + 20) % 360);
      areaHue[id + ':l'] = i % 2 ? 52 : 68;
    });
    levels = [...new Set(map.locations.map((l) => l.z))];
    const count = {};
    map.locations.forEach((l) => {
      count[l.z] = (count[l.z] || 0) + 1;
    });
    level = levels.sort((a, b) => count[b] - count[a])[0];
    els.status.hidden = true;
    renderLevels();
    draw();
    standard();
    if (fromHash() && levelFits()) centreLevel();
  };

  window.addEventListener('hashchange', fromHash);

  fetch(meta.json)
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(start)
    .catch((err) => {
      els.status.textContent = 'The map could not be loaded: ' + err.message;
    });
})();

// Read-only viewer of a world map (format worldmap/1, see scripts/maps.js).
// One glyph per sector on a canvas, only the cells in view are drawn, so it does
// not mind how big the world gets. Far away the cells become one coloured pixel.
(function () {
  'use strict';

  const FONT = 'Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace';
  const CELL_H = 10; // height of a cell at zoom 1, in css pixels
  const GLYPHS_FROM = 5; // below this cell height there are no glyphs to read
  const LABEL_MIN = 11; // the names stop shrinking at this size
  const PLAIN = '#aaaaaa';
  const K_MAX = 8;

  const $ = (id) => document.getElementById(id);
  const canvas = $('worldmap-canvas');
  const board = $('mapper-board');
  if (!canvas || !board) return;

  const meta = JSON.parse($('mapper-meta').textContent);
  const ctx = canvas.getContext('2d');
  const els = {
    levels: $('mapper-levels'),
    labels: $('worldmap-labels'),
    legend: $('worldmap-legend'),
    status: $('mapper-status'),
  };

  ctx.font = `${CELL_H}px ${FONT}`;
  const CELL_W = ctx.measureText('M').width;

  const cache = {}; // z -> level
  let level = null;
  let labelEls = [];
  let queued = false;
  let touched = false; // until the viewer moves the map, it follows the size of the board
  const view = { x: 0, y: 0, k: 1 };

  // ---- data

  const prepare = (data) => {
    const colours = data.styles.map((s) => data.palette[s.colour] || PLAIN);
    const fonts = data.styles.map((s) => (s.bold ? 'bold ' : ''));
    const glyphs = data.rows.map((row) => Array.from(row.text));
    const styles = data.rows.map((row) => {
      const cells = new Uint8Array(data.columns);
      row.runs.forEach(([first, length, style]) => cells.fill(style, first, first + length));
      return cells;
    });

    // one pixel per cell, for the far zooms
    const overview = document.createElement('canvas');
    overview.width = data.columns;
    overview.height = data.rows_count;
    const o = overview.getContext('2d');
    glyphs.forEach((row, r) =>
      row.forEach((glyph, c) => {
        if (glyph === ' ') return;
        o.fillStyle = colours[styles[r][c]];
        o.fillRect(c, r, 1, 1);
      }),
    );

    // cells sit on sector coordinates, so changing level keeps the same place in view
    return {
      data,
      colours,
      fonts,
      glyphs,
      styles,
      overview,
      left: data.sectors.min_x - data.map_left,
      top: -data.sectors.max_y,
    };
  };

  // ---- drawing

  const drawGlyphs = (w, h) => {
    const cw = CELL_W * view.k;
    const ch = CELL_H * view.k;
    const x0 = view.x + level.left * cw;
    const y0 = view.y + level.top * ch;
    const firstRow = Math.max(0, Math.floor(-y0 / ch));
    const lastRow = Math.min(level.data.rows_count - 1, Math.ceil((h - y0) / ch));
    const firstCol = Math.max(0, Math.floor(-x0 / cw));
    const lastCol = Math.min(level.data.columns - 1, Math.ceil((w - x0) / cw));

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let r = firstRow; r <= lastRow; r++) {
      const glyphs = level.glyphs[r];
      const styles = level.styles[r];
      let current = -1;
      for (let c = firstCol; c <= lastCol; c++) {
        const glyph = glyphs[c];
        if (glyph === ' ' || glyph === undefined) continue;
        if (styles[c] !== current) {
          current = styles[c];
          ctx.fillStyle = level.colours[current];
          ctx.font = `${level.fonts[current]}${ch}px ${FONT}`;
        }
        ctx.fillText(glyph, x0 + (c + 0.5) * cw, y0 + (r + 0.5) * ch);
      }
    }
  };

  const drawLabels = () => {
    const size = Math.max(LABEL_MIN, CELL_H * view.k);
    level.data.labels.forEach((label, i) => {
      const x = view.x + (level.left + label.col) * CELL_W * view.k;
      const y = view.y + (level.top + label.row) * CELL_H * view.k;
      labelEls[i].style.fontSize = `${size}px`;
      labelEls[i].style.transform = `translate(${x}px, ${y}px)`;
    });
  };

  const draw = () => {
    queued = false;
    if (!level) return;
    const dpr = window.devicePixelRatio || 1;
    const w = board.clientWidth;
    const h = board.clientHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (CELL_H * view.k >= GLYPHS_FROM) {
      drawGlyphs(w, h);
    } else {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        level.overview,
        view.x + level.left * CELL_W * view.k,
        view.y + level.top * CELL_H * view.k,
        level.data.columns * CELL_W * view.k,
        level.data.rows_count * CELL_H * view.k,
      );
    }
    drawLabels();
  };

  const redraw = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(draw);
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(board.clientWidth * dpr);
    canvas.height = Math.round(board.clientHeight * dpr);
    if (touched) redraw();
    else fit();
  };

  // ---- view: pan, zoom

  // the zoom that shows the whole level
  const fitK = () =>
    Math.min(
      K_MAX,
      0.95 *
        Math.min(
          board.clientWidth / (level.data.columns * CELL_W),
          board.clientHeight / (level.data.rows_count * CELL_H),
        ),
    );

  const zoomAt = (factor, cx, cy) => {
    if (!level) return;
    touched = true;
    const k = Math.min(K_MAX, Math.max(fitK() / 2, view.k * factor));
    const f = k / view.k;
    view.x = cx - (cx - view.x) * f;
    view.y = cy - (cy - view.y) * f;
    view.k = k;
    redraw();
  };

  const fit = () => {
    if (!level) return;
    const { columns, rows_count: rows } = level.data;
    const w = board.clientWidth;
    const h = board.clientHeight;
    view.k = fitK();
    view.x = (w - columns * CELL_W * view.k) / 2 - level.left * CELL_W * view.k;
    view.y = (h - rows * CELL_H * view.k) / 2 - level.top * CELL_H * view.k;
    redraw();
  };

  const wasMoved = window.mapGestures(board, board, {
    pan: (dx, dy) => {
      touched = true;
      view.x += dx;
      view.y += dy;
      redraw();
    },
    zoom: zoomAt,
  });

  // a drag that starts on a name is a drag, not a visit to its map
  els.labels.addEventListener('click', (ev) => {
    if (wasMoved()) ev.preventDefault();
  });

  const zoomBy = (f) => zoomAt(f, board.clientWidth / 2, board.clientHeight / 2);
  $('mapper-zoom-in').addEventListener('click', () => zoomBy(1.4));
  $('mapper-zoom-out').addEventListener('click', () => zoomBy(1 / 1.4));
  $('mapper-fit').addEventListener('click', () => {
    touched = false;
    fit();
  });
  new ResizeObserver(resize).observe(board);

  // ---- level

  const renderLabels = () => {
    els.labels.textContent = '';
    labelEls = level.data.labels.map((label) => {
      const e = document.createElement(label.url ? 'a' : 'span');
      e.textContent = label.text;
      if (label.url) e.href = label.url;
      els.labels.appendChild(e);
      return e;
    });
  };

  // only what this level has
  const renderLegend = () => {
    els.legend.textContent = '';
    level.data.legend.forEach((item) => {
      const found = level.glyphs.some((row, r) =>
        row.some((glyph, c) => glyph === item.glyph && level.styles[r][c] === item.style),
      );
      if (!found) return;
      const li = document.createElement('li');
      const b = document.createElement('b');
      b.textContent = item.glyph;
      b.style.color = level.colours[item.style];
      if (level.fonts[item.style]) b.className = 'bold';
      li.append(b, item.kind.replace(/-/g, ' '));
      els.legend.appendChild(li);
    });
  };

  const load = async (entry) => {
    if (!cache[entry.z]) {
      const response = await fetch(entry.url);
      if (!response.ok) throw new Error(response.statusText);
      cache[entry.z] = prepare(await response.json());
    }
    return cache[entry.z];
  };

  const setLevel = async (entry) => {
    const first = !level;
    els.status.textContent = 'Loading the map...';
    els.status.hidden = false;
    try {
      level = await load(entry);
    } catch {
      els.status.textContent = 'The map could not be loaded.';
      return;
    }
    els.status.hidden = true;
    [...els.levels.children].forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.z === String(entry.z))),
    );
    history.replaceState(null, '', `#level=${entry.z}`);
    renderLabels();
    renderLegend();
    if (first) fit();
    else redraw();
  };

  if (meta.levels.length > 1) {
    meta.levels.forEach((entry) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `Level ${entry.z}`;
      b.dataset.z = entry.z;
      b.addEventListener('click', () => setLevel(entry));
      els.levels.appendChild(b);
    });
  }

  const wanted = /^#level=(-?\d+)$/.exec(location.hash);
  resize();
  setLevel(
    (wanted && meta.levels.find((l) => l.z === +wanted[1])) ||
      meta.levels.find((l) => l.z === 0) ||
      meta.levels[0],
  );
})();

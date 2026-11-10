/* =========================================================
   Room plan – shared SVG renderer + interactive editor
   Improvements for Req #2, #3, #9, #14:
   - Req #2: จุดหน้าต่าง/ประตู รองรับทั้งบานตรง และบานดัดโค้ง/เข้ามุมตามผนังห้องได้อิสระ
     (คลิกจุดต่อเนื่องตามแนวผนัง หรือลากผ่านมุมห้อง ระบบจะเดินตามแนวผนังเข้ามุมให้อัตโนมัติ)
   - Req #3: เพิ่มขนาดกรอบของจุดหน้าต่าง/ประตูและป้ายลำดับให้ใหญ่ชัดเจนเมื่อแสดงในเอกสาร A4
   - Req #9: ดึงจุดจากแปลนห้องมาแสดงตามลำดับ พร้อมรู้ว่าเป็นบานเข้ามุมแบบใด
   - Req #14: ไม่ต้องมีกรอบล้อมรอบแปลนห้อง
   ========================================================= */
const PLAN_W = 800, PLAN_H = 500, PLAN_GRID = 20;

function planEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Normalize an opening item (window/door) to an array of points [{x,y}, ...] */
function itemPoints(it) {
  if (Array.isArray(it.pts) && it.pts.length >= 2) return it.pts;
  return [{ x: it.x1, y: it.y1 }, { x: it.x2, y: it.y2 }];
}

/** Collect all wall segments and vertices from rect and wall items */
function planWallSegments(items) {
  const segs = [];
  (items || []).forEach(it => {
    if (it.type === 'rect') {
      const x1 = Math.min(it.x1, it.x2), x2 = Math.max(it.x1, it.x2);
      const y1 = Math.min(it.y1, it.y2), y2 = Math.max(it.y1, it.y2);
      segs.push(
        { x1, y1, x2, y2: y1, roomRect: { x1, y1, x2, y2 } },
        { x1: x2, y1, x2, y2, roomRect: { x1, y1, x2, y2 } },
        { x1: x2, y1: y2, x2: x1, y2, roomRect: { x1, y1, x2, y2 } },
        { x1, y1: y2, x2: x1, y2: y1, roomRect: { x1, y1, x2, y2 } }
      );
    } else if (it.type === 'wall') {
      segs.push({ x1: it.x1, y1: it.y1, x2: it.x2, y2: it.y2 });
    }
  });
  return segs;
}

/** Project point (px,py) onto segment s; returns {x,y,dist,t,seg} */
function projectPointToSeg(px, py, s) {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return { x: s.x1, y: s.y1, dist: Math.hypot(px - s.x1, py - s.y1), t: 0, seg: s };
  const t = Math.max(0, Math.min(1, ((px - s.x1) * dx + (py - s.y1) * dy) / l2));
  const x = s.x1 + t * dx, y = s.y1 + t * dy;
  return { x, y, dist: Math.hypot(px - x, py - y), t, seg: s };
}

function snapToWallPoint(px, py, segs, maxDist = 36) {
  let best = null;
  // ถ้าระยะใกล้เคียงหัวมุมผนัง ให้ดูดเข้ามุมพอดีเพื่อความเสถียรในการลากบานเข้ามุม
  for (const s of segs) {
    for (const [vx, vy] of [[s.x1, s.y1], [s.x2, s.y2]]) {
      const d = Math.hypot(px - vx, py - vy);
      if (d <= 22 && (!best || d < best.dist - 2)) {
        best = { x: vx, y: vy, dist: d, seg: s, isCorner: true };
      }
    }
  }
  if (best) return best;
  for (const s of segs) {
    const pr = projectPointToSeg(px, py, s);
    if (pr.dist <= maxDist && (!best || pr.dist < best.dist)) best = pr;
  }
  return best;
}

/**
 * Given start point A and current point B on a rectangular room,
 * if A and B lie on adjacent walls, automatically insert the shared corner vertex
 * so dragging around a corner creates a bent L-shaped window/door!
 */
function buildWallPathBetween(pStart, pEnd, segs) {
  const h1 = snapToWallPoint(pStart.x, pStart.y, segs, 40);
  const h2 = snapToWallPoint(pEnd.x, pEnd.y, segs, 40);
  const a = h1 ? { x: Math.round(h1.x), y: Math.round(h1.y) } : pStart;
  const b = h2 ? { x: Math.round(h2.x), y: Math.round(h2.y) } : pEnd;
  if (!h1 || !h2) return [a, b];

  // ถ้าอยู่บนเส้นเดียวกัน
  if (h1.seg === h2.seg) return [a, b];

  // เช็คว่าเส้นผนัง 2 เส้นมีจุดมุมร่วมกันหรือไม่ (บานเข้ามุม 90 องศา)
  const corners1 = [{ x: h1.seg.x1, y: h1.seg.y1 }, { x: h1.seg.x2, y: h1.seg.y2 }];
  const corners2 = [{ x: h2.seg.x1, y: h2.seg.y1 }, { x: h2.seg.x2, y: h2.seg.y2 }];
  for (const c1 of corners1) {
    for (const c2 of corners2) {
      if (Math.hypot(c1.x - c2.x, c1.y - c2.y) < 4) {
        return [a, { x: Math.round(c1.x), y: Math.round(c1.y) }, b];
      }
    }
  }

  // กรณีลากครอบ 3 ด้าน (ตัวยู U-shape บนห้องสี่เหลี่ยมเดียวกัน)
  if (h1.seg.roomRect && h2.seg.roomRect &&
      h1.seg.roomRect.x1 === h2.seg.roomRect.x1 && h1.seg.roomRect.y1 === h2.seg.roomRect.y1) {
    const r = h1.seg.roomRect;
    const midY = (r.y1 + r.y2) / 2, midX = (r.x1 + r.x2) / 2;
    if (Math.abs(a.x - r.x1) < 4 && Math.abs(b.x - r.x2) < 4) {
      const yCorner = (a.y + b.y) / 2 < midY ? r.y1 : r.y2;
      return [a, { x: r.x1, y: yCorner }, { x: r.x2, y: yCorner }, b];
    }
    if (Math.abs(a.y - r.y1) < 4 && Math.abs(b.y - r.y2) < 4) {
      const xCorner = (a.x + b.x) / 2 < midX ? r.x1 : r.x2;
      return [a, { x: xCorner, y: r.y1 }, { x: xCorner, y: r.y2 }, b];
    }
  }
  return [a, b];
}

/** Build an offset polygon (thick band) around a polyline of points */
function buildThickBandPolygon(pts, halfThick) {
  if (!pts || pts.length < 2) return '';
  const n = pts.length;
  const segNormals = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x, dy = pts[i + 1].y - pts[i].y;
    const len = Math.hypot(dx, dy) || 1;
    segNormals.push({ nx: -dy / len, ny: dx / len });
  }
  const vertexNormals = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) vertexNormals.push(segNormals[0]);
    else if (i === n - 1) vertexNormals.push(segNormals[n - 2]);
    else {
      const n1 = segNormals[i - 1], n2 = segNormals[i];
      let nx = n1.nx + n2.nx, ny = n1.ny + n2.ny;
      const l = Math.hypot(nx, ny);
      if (l < 0.01) { nx = n1.nx; ny = n1.ny; }
      else {
        // miter factor for crisp 90-degree corners
        const dot = n1.nx * (nx / l) + n1.ny * (ny / l);
        const scale = Math.min(1.6, 1 / Math.max(0.5, dot));
        nx = (nx / l) * scale; ny = (ny / l) * scale;
      }
      vertexNormals.push({ nx, ny });
    }
  }
  const leftSide = pts.map((p, i) => `${Math.round(p.x + vertexNormals[i].nx * halfThick)},${Math.round(p.y + vertexNormals[i].ny * halfThick)}`);
  const rightSide = pts.slice().reverse().map((p, idx) => {
    const i = n - 1 - idx;
    return `${Math.round(p.x - vertexNormals[i].nx * halfThick)},${Math.round(p.y - vertexNormals[i].ny * halfThick)}`;
  });
  return [...leftSide, ...rightSide].join(' ');
}

/** Find midpoint along a polyline */
function polylineMidpoint(pts) {
  if (!pts || !pts.length) return { x: 0, y: 0 };
  if (pts.length === 1) return pts[0];
  let total = 0;
  const lens = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    lens.push(d); total += d;
  }
  let half = total / 2;
  for (let i = 0; i < lens.length; i++) {
    if (half <= lens[i] || i === lens.length - 1) {
      const t = lens[i] ? half / lens[i] : 0.5;
      return {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * t,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * t,
      };
    }
    half -= lens[i];
  }
  return pts[0];
}

/**
 * Req #1: ปรับขนาดตัวเลขในแปลนห้องให้เท่ากับตัวอักษรส่วนของลูกค้า (~9.5px บนหน้า A4)
 * คำนวณขนาดตัวอักษรแบบไดนามิกตามสัดส่วน viewBox ของแปลนห้อง (previewScale)
 * เพื่อให้ไม่ว่าจะวาดแปลนห้องเล็กหรือใหญ่ ตัวเลขในช่อง MAP ROOM บนกระดาษ A4 จะมีขนาดเท่ากับตัวอักษรส่วนลูกค้าเสมอ
 */
function planLabelBadge(x, y, text, color = '#000', previewScale = 0) {
  if (!text) return '';
  const fontSize = previewScale ? Math.round(9.8 / previewScale) : 28;
  const h = previewScale ? Math.round(13.8 / previewScale) : 38;
  const w = Math.max(h, previewScale ? Math.round((String(text).length * 6.8 + 6.5) / previewScale) : (String(text).length * 18 + 20));
  const rx = previewScale ? Math.round(2.2 / previewScale) : 6;
  const sw = previewScale ? Math.max(1.2, Math.round((1.0 / previewScale) * 10) / 10) : 3;
  const yOff = Math.round(fontSize * 0.35);
  return `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${rx}" fill="#fff" stroke="${color}" stroke-width="${sw}"/>` +
    `<text x="${x}" y="${y + yOff}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="#000" font-family="Sarabun, Tahoma, sans-serif">${planEsc(text)}</text>`;
}

/** Render one item. opts: {editable, sel, previewScale} */
function planItemSVG(it, i, opts = {}) {
  const ed = !!opts.editable;
  const ps = opts.previewScale || 0;
  const wallSw = ps ? Math.max(2, Math.round((1.35 / ps) * 10) / 10) : 6;
  let g = '';

  switch (it.type) {
    case 'rect': {
      const x = Math.min(it.x1, it.x2), y = Math.min(it.y1, it.y2), w = Math.abs(it.x2 - it.x1), h = Math.abs(it.y2 - it.y1);
      g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#111" stroke-width="${wallSw}"/>`;
      if (ed) g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="transparent" stroke-width="20"/>`;
      break;
    }
    case 'wall': {
      const { x1, y1, x2, y2 } = it;
      g += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111" stroke-width="${wallSw}" stroke-linecap="square"/>`;
      if (ed) g += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="22"/>`;
      break;
    }
    case 'window':
    case 'door': {
      // วาดกรอบขาวขอบดำครอบคลุมทั้งหมดตามแนวที่ลากเส้น (เหมือนกันทั้งบานตรงและบานดัดโค้งเข้ามุม) พร้อมตัวเลขกำกับตรงกลาง
      const rawPts = itemPoints(it);
      const labelText = it.label || '?';
      const halfThick = ps ? Math.round(6.9 / ps) : 19;
      const bandSw = ps ? Math.max(1.3, Math.round((1.0 / ps) * 10) / 10) : 3;
      const fontSize = ps ? Math.round(9.8 / ps) : 28;
      const yOff = Math.round(fontSize * 0.35);

      // กรณีลากเส้นตรงสั้นกว่าความกว้างตัวอักษร ให้ขยายความยาวขั้นต่ำเพื่อให้กรอบครอบตัวเลขได้สวยงามเสมอ
      let pts = rawPts;
      if (rawPts.length === 2) {
        const dx = rawPts[1].x - rawPts[0].x;
        const dy = rawPts[1].y - rawPts[0].y;
        const len = Math.hypot(dx, dy);
        const minLen = ps
          ? Math.max(halfThick * 2, Math.round((String(labelText).length * 6.8 + 6.5) / ps))
          : Math.max(halfThick * 2, String(labelText).length * 18 + 20);
        if (len < minLen) {
          const cx = (rawPts[0].x + rawPts[1].x) / 2;
          const cy = (rawPts[0].y + rawPts[1].y) / 2;
          const ux = len > 0.5 ? dx / len : 1;
          const uy = len > 0.5 ? dy / len : 0;
          pts = [
            { x: cx - ux * (minLen / 2), y: cy - uy * (minLen / 2) },
            { x: cx + ux * (minLen / 2), y: cy + uy * (minLen / 2) },
          ];
        }
      }

      const mid = polylineMidpoint(pts);
      const polyPts = buildThickBandPolygon(pts, halfThick);
      g += `<polygon points="${polyPts}" fill="#fff" stroke="#000" stroke-width="${bandSw}" stroke-linejoin="miter"/>`;
      g += `<text x="${mid.x}" y="${mid.y + yOff}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="#000" stroke="#fff" stroke-width="${ps ? 2 : 4}" paint-order="stroke" font-family="Sarabun, Tahoma, sans-serif">${planEsc(labelText)}</text>`;

      if (ed) {
        const centerLine = pts.map(p => `${p.x},${p.y}`).join(' ');
        g += `<polyline points="${centerLine}" fill="none" stroke="transparent" stroke-width="44"/>`;
      }
      break;
    }
    case 'entrance': {
      // ลูกศรบอกทิศทางทางเข้าห้อง (ลากจากหางลูกศร x1,y1 ไปยังหัวลูกศร x2,y2)
      const { x1, y1, x2, y2 } = it;
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const nx = -uy, ny = ux;
      const sw = ps ? Math.max(2.2, Math.round((1.5 / ps) * 10) / 10) : 5;
      const headLen = ps ? Math.round(6.8 / ps) : 22;
      const headW = ps ? Math.round(4.4 / ps) : 14;
      const hx = x2 - ux * headLen, hy = y2 - uy * headLen;
      const lx = x2 - ux * (headLen * 0.7), ly = y2 - uy * (headLen * 0.7);
      g += `<line x1="${x1}" y1="${y1}" x2="${lx}" y2="${ly}" stroke="#000" stroke-width="${sw}" stroke-linecap="round"/>`;
      g += `<polygon points="${x2},${y2} ${Math.round(hx + nx * headW)},${Math.round(hy + ny * headW)} ${Math.round(hx - nx * headW)},${Math.round(hy - ny * headW)}" fill="#000" stroke="#000" stroke-width="1" stroke-linejoin="round"/>`;
      if (it.label) {
        const fSize = ps ? Math.round(8.8 / ps) : 22;
        const tx = Math.round(x1 - ux * (fSize * 0.6));
        const ty = Math.round(y1 - uy * (fSize * 0.6) + fSize * 0.35);
        g += `<text x="${tx}" y="${ty}" text-anchor="middle" font-size="${fSize}" font-weight="700" fill="#000" font-family="Sarabun, Tahoma, sans-serif">${planEsc(it.label)}</text>`;
      }
      if (ed) g += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="28"/>`;
      break;
    }
    case 'text': {
      const size = ps ? Math.round(9.6 / ps) : (it.size || 28);
      g += `<text x="${it.x1}" y="${it.y1}" font-size="${size}" font-weight="700" fill="#000" font-family="Sarabun, Tahoma, sans-serif">${planEsc(it.text)}</text>`;
      if (ed) {
        const w = Math.max(36, String(it.text || '').length * size * 0.6);
        g += `<rect x="${it.x1 - 2}" y="${it.y1 - size}" width="${w + 4}" height="${size + 6}" fill="transparent"/>`;
      }
      break;
    }
  }

  if (ed && opts.sel === i) {
    if (it.type === 'text') {
      const size = it.size || 20, w = Math.max(28, String(it.text || '').length * size * 0.6);
      g += `<rect x="${it.x1 - 4}" y="${it.y1 - size - 2}" width="${w + 8}" height="${size + 10}" fill="none" stroke="#ff9800" stroke-dasharray="4 3" stroke-width="2"/>`;
    } else if (it.type === 'window' || it.type === 'door') {
      const pts = itemPoints(it);
      pts.forEach((p, pi) => {
        g += `<circle data-pt="${pi}" cx="${p.x}" cy="${p.y}" r="8" fill="#ff9800" stroke="#fff" stroke-width="2" style="cursor:move"/>`;
      });
    } else {
      g += `<circle data-h="1" cx="${it.x1}" cy="${it.y1}" r="8" fill="#ff9800" stroke="#fff" stroke-width="2" style="cursor:move"/>`;
      g += `<circle data-h="2" cx="${it.x2}" cy="${it.y2}" r="8" fill="#ff9800" stroke="#fff" stroke-width="2" style="cursor:move"/>`;
    }
  }
  return `<g${ed ? ` data-i="${i}"` : ''}>${g}</g>`;
}

/** Order so that rooms/walls are under windows/doors/entrance/text */
function planOrdered(items) {
  const rank = { rect: 0, wall: 1, window: 2, door: 2, entrance: 3, text: 4 };
  return (items || []).map((it, i) => ({ it, i })).sort((a, b) => ((rank[a.it.type] ?? 2) - (rank[b.it.type] ?? 2)) || (a.i - b.i));
}

/** Static preview SVG fitted to drawing bounds (scales labels to match customer text size on A4) */
function planPreviewSVG(items) {
  if (!items || !items.length) return '';
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const add = (x, y) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
  items.forEach(it => {
    if (it.type === 'text') {
      const s = it.size || 28;
      add(it.x1, it.y1 - s); add(it.x1 + String(it.text || '').length * s * 0.6, it.y1 + 8);
    } else if (it.type === 'window' || it.type === 'door') {
      itemPoints(it).forEach(p => { add(p.x - 20, p.y - 20); add(p.x + 20, p.y + 20); });
    } else if (it.type === 'entrance') {
      add(it.x1 - 18, it.y1 - 18); add(it.x1 + 18, it.y1 + 18);
      add(it.x2 - 18, it.y2 - 18); add(it.x2 + 18, it.y2 + 18);
    } else {
      add(it.x1, it.y1); add(it.x2, it.y2);
    }
  });
  // คำนวณสัดส่วนเบื้องต้นเพื่อเผื่อขอบ (pad) ให้ป้ายตัวเลขไม่โดนตัดขอบ
  const rawW = Math.max(80, maxX - minX);
  const rawH = Math.max(60, maxY - minY);
  const approxScale = Math.min(122 / (rawW * 1.22), 66 / (rawH * 1.22));
  const pad = Math.round(9.5 / Math.max(0.05, approxScale));
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const vbW = Math.max(60, maxX - minX);
  const vbH = Math.max(60, maxY - minY);
  // กล่อง .pbox บนหน้า A4 มีขนาด 122 x 66 px
  const previewScale = Math.min(122 / vbW, 66 / vbH);
  const body = planOrdered(items).map(o => planItemSVG(o.it, o.i, { previewScale })).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
}

/**
 * Infer cornerShape ('1'..'9') from a window/door polyline in the room plan
 * so bent windows on the plan automatically select a matching 90° shape if not yet customized!
 */
function inferCornerShapeFromPlanItem(it) {
  const pts = itemPoints(it);
  if (pts.length === 3) return '2'; // บานเข้ามุม 90° 1 ด้าน
  if (pts.length >= 4) return '4';  // บานเข้ามุม 90° 2 ด้าน
  return '1';
}

/* =========================================================
   Interactive editor (supports drag along walls & corners + multi-click polyline)
   ========================================================= */
const PlanEditor = (() => {
  let items = [], tool = 'window', sel = -1, drag = null, activePoly = null, undoS = [], redoS = [], onSave = null;
  let svg, modal, hint, btnFinish;

  const HINTS = {
    select: 'คลิกเลือกวัตถุแล้วลากเพื่อย้าย • ลากจุดกลมสีส้มเพื่อปรับมุม/ความยาว • ดับเบิลคลิกเพื่อแก้เลขลำดับ/ข้อความ • Delete เพื่อลบ',
    rect: 'ลากเพื่อวาดกรอบแปลนห้องสี่เหลี่ยม',
    wall: 'ลากเพื่อวาดเส้นผนังห้องเพิ่มเติม',
    window: 'วิธีที่ 1: กดลากตามเส้นผนัง (ลากเลี้ยวเข้ามุมห้องได้เลย!) • วิธีที่ 2: คลิกทีละจุดตามมุมผนังอิสระ แล้วกด Enter หรือดับเบิลคลิกเพื่อจบ',
    door: 'วิธีที่ 1: กดลากตามเส้นผนัง (ลากเลี้ยวเข้ามุมห้องได้เลย!) • วิธีที่ 2: คลิกทีละจุดตามมุมผนังอิสระ แล้วกด Enter หรือดับเบิลคลิกเพื่อจบ',
    entrance: 'กดลากจากจุดเริ่มต้นไปยังทิศทางเข้าห้องเพื่อวาดลูกศรทางเข้า (หรือคลิก 1 ครั้งเพื่อวางลูกศรทางเข้าอัตโนมัติ)',
    text: 'คลิกตำแหน่งที่ต้องการใส่ข้อความในแปลนห้อง',
    erase: 'คลิกที่วัตถุเพื่อลบ (ระบบจะเรียงลำดับเลขจุดหน้าต่าง/ประตูใหม่ให้อัตโนมัติ)',
  };

  const snapOn = () => document.getElementById('planSnap').checked;
  const snapGrid = v => snapOn() ? Math.round(v / (PLAN_GRID / 2)) * (PLAN_GRID / 2) : Math.round(v);
  const clone = o => JSON.parse(JSON.stringify(o));

  function pt(e) {
    const r = svg.getBoundingClientRect();
    return { x: (e.clientX - r.left) * PLAN_W / r.width, y: (e.clientY - r.top) * PLAN_H / r.height };
  }

  function snapPoint(rawP) {
    if (snapOn()) {
      const segs = planWallSegments(items);
      const hit = snapToWallPoint(rawP.x, rawP.y, segs, 36);
      if (hit) return { x: Math.round(hit.x), y: Math.round(hit.y) };
    }
    return { x: snapGrid(rawP.x), y: snapGrid(rawP.y) };
  }

  function pushUndo() { undoS.push(clone(items)); if (undoS.length > 100) undoS.shift(); redoS = []; }

  function nextNo() {
    let m = 0;
    items.forEach(it => {
      if (it.type === 'window' || it.type === 'door') {
        const n = parseInt(it.label, 10);
        if (!isNaN(n)) m = Math.max(m, n);
      }
    });
    return String(m + 1);
  }

  function renumberOpenings() {
    let n = 1;
    items.forEach(it => {
      if (it.type === 'window' || it.type === 'door') {
        if (/^\d+$/.test(String(it.label || ''))) it.label = String(n++);
      }
    });
  }

  function syncLegacyCoords(it) {
    if (Array.isArray(it.pts) && it.pts.length >= 2) {
      it.x1 = it.pts[0].x; it.y1 = it.pts[0].y;
      it.x2 = it.pts[it.pts.length - 1].x; it.y2 = it.pts[it.pts.length - 1].y;
    }
  }

  function finishActivePoly() {
    if (!activePoly) return;
    const it = items[activePoly.idx];
    if (it && Array.isArray(it.pts)) {
      // ลบจุดซ้ำปลายทาง
      while (it.pts.length >= 2) {
        const a = it.pts[it.pts.length - 2], b = it.pts[it.pts.length - 1];
        if (Math.hypot(b.x - a.x, b.y - a.y) < 6) it.pts.pop();
        else break;
      }
      if (it.pts.length < 2) {
        items.splice(activePoly.idx, 1);
      } else {
        it.label = it.label || nextNo();
        syncLegacyCoords(it);
      }
    }
    activePoly = null;
    if (btnFinish) btnFinish.hidden = true;
    draw();
  }

  function draw() {
    const grid = `<defs><pattern id="pgrid" width="${PLAN_GRID}" height="${PLAN_GRID}" patternUnits="userSpaceOnUse">` +
      `<path d="M ${PLAN_GRID} 0 L 0 0 0 ${PLAN_GRID}" fill="none" stroke="#e6e9ee" stroke-width="1"/></pattern></defs>` +
      `<rect width="${PLAN_W}" height="${PLAN_H}" fill="url(#pgrid)"/>`;
    svg.innerHTML = grid + planOrdered(items).map(o => planItemSVG(o.it, o.i, { editable: true, sel })).join('');
    svg.style.cursor = tool === 'select' ? 'default' : tool === 'erase' ? 'not-allowed' : 'crosshair';
  }

  function setTool(t) {
    finishActivePoly();
    tool = t; sel = -1;
    document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
    hint.textContent = HINTS[t] || '';
    draw();
  }

  function editLabel(i) {
    const it = items[i]; if (!it) return;
    if (it.type === 'text') {
      const t = prompt('แก้ไขข้อความ', it.text || ''); if (t === null) return;
      pushUndo(); it.text = t; if (!t.trim()) items.splice(i, 1);
    } else if (it.type === 'window' || it.type === 'door') {
      const t = prompt('ลำดับจุด / ป้ายกำกับ', it.label || ''); if (t === null) return;
      pushUndo(); it.label = t.trim();
    } else if (it.type === 'entrance') {
      const t = prompt('ข้อความกำกับลูกศรทางเข้า (เว้นว่างได้)', it.label || ''); if (t === null) return;
      pushUndo(); it.label = t.trim();
    }
    sel = -1; draw();
  }

  function onDown(e) {
    if (e.button !== 0) return;
    const p = pt(e);
    const sp = snapPoint(p);
    const gEl = e.target.closest('[data-i]');
    const idx = gEl ? +gEl.dataset.i : -1;
    const handle = e.target.getAttribute && e.target.getAttribute('data-h');
    const ptIdx = e.target.getAttribute && e.target.getAttribute('data-pt');

    if (tool === 'select') {
      if (idx >= 0) {
        sel = idx;
        if (ptIdx !== null && ptIdx !== '') {
          const it = items[idx];
          if (!Array.isArray(it.pts)) it.pts = itemPoints(it);
          drag = { mode: 'pt', ptIdx: +ptIdx, before: clone(items) };
        } else if (handle) {
          drag = { mode: 'end', h: handle, before: clone(items) };
        } else {
          drag = { mode: 'move', start: sp, orig: clone(items[idx]), before: clone(items) };
        }
      } else sel = -1;
    } else if (tool === 'erase') {
      if (idx >= 0) { pushUndo(); items.splice(idx, 1); renumberOpenings(); }
    } else if (tool === 'text') {
      const t = prompt('ข้อความในแปลน');
      if (t && t.trim()) { pushUndo(); items.push({ type: 'text', x1: sp.x, y1: sp.y, x2: sp.x, y2: sp.y, text: t.trim(), size: 20 }); }
      setTool('select'); return;
    } else if (tool === 'window' || tool === 'door') {
      // ถ้ากำลังคลิกสร้างบานหลายจุดต่อเนื่อง (multi-click mode)
      if (activePoly) {
        const it = items[activePoly.idx];
        const lastFixed = it.pts[it.pts.length - 2];
        if (Math.hypot(sp.x - lastFixed.x, sp.y - lastFixed.y) < 8) {
          finishActivePoly();
          return;
        }
        it.pts[it.pts.length - 1] = { x: sp.x, y: sp.y };
        it.pts.push({ x: sp.x, y: sp.y });
        syncLegacyCoords(it);
        draw();
        return;
      }
      // เริ่มวางจุดแรก (รองรับทั้งกดลากผ่านมุมผนัง หรือคลิกปล่อยเพื่อต่อจุดที่ 2, 3...)
      const before = clone(items);
      const it = {
        type: tool,
        x1: sp.x, y1: sp.y, x2: sp.x, y2: sp.y,
        pts: [{ x: sp.x, y: sp.y }, { x: sp.x, y: sp.y }],
        label: nextNo(),
      };
      items.push(it);
      sel = items.length - 1;
      drag = { mode: 'createOpening', idx: items.length - 1, startPt: sp, moved: false, before };
    } else {
      const it = { type: tool, x1: sp.x, y1: sp.y, x2: sp.x, y2: sp.y };
      items.push(it);
      drag = { mode: 'create', idx: items.length - 1, before: clone(items.slice(0, -1)) };
    }
    svg.setPointerCapture(e.pointerId);
    draw();
  }

  function onMove(e) {
    const p = pt(e);
    if (activePoly && !drag) {
      const sp = snapPoint(p);
      const it = items[activePoly.idx];
      if (it && it.pts && it.pts.length >= 2) {
        it.pts[it.pts.length - 1] = { x: sp.x, y: sp.y };
        syncLegacyCoords(it);
        draw();
      }
      return;
    }
    if (!drag) return;
    let x = snapGrid(p.x), y = snapGrid(p.y);

    if (drag.mode === 'createOpening') {
      const it = items[drag.idx];
      if (Math.hypot(p.x - drag.startPt.x, p.y - drag.startPt.y) > 8) drag.moved = true;
      if (snapOn()) {
        const segs = planWallSegments(items);
        it.pts = buildWallPathBetween(drag.startPt, p, segs);
      } else {
        it.pts = [drag.startPt, { x, y }];
      }
      syncLegacyCoords(it);
    } else if (drag.mode === 'create') {
      const it = items[drag.idx];
      if (it.type !== 'rect' && e.shiftKey === false) {
        if (Math.abs(x - it.x1) < Math.abs(y - it.y1) * 0.25) x = it.x1;
        else if (Math.abs(y - it.y1) < Math.abs(x - it.x1) * 0.25) y = it.y1;
      }
      it.x2 = x; it.y2 = y;
    } else if (drag.mode === 'move') {
      const it = items[sel], o = drag.orig, dx = x - drag.start.x, dy = y - drag.start.y;
      it.x1 = o.x1 + dx; it.y1 = o.y1 + dy; it.x2 = o.x2 + dx; it.y2 = o.y2 + dy;
      if (Array.isArray(o.pts)) {
        it.pts = o.pts.map( q => ({ x: q.x + dx, y: q.y + dy }) );
      }
    } else if (drag.mode === 'pt') {
      const it = items[sel];
      const sp = snapPoint(p);
      it.pts[drag.ptIdx] = { x: sp.x, y: sp.y };
      syncLegacyCoords(it);
    } else if (drag.mode === 'end') {
      const it = items[sel];
      if (drag.h === '1') { it.x1 = x; it.y1 = y; } else { it.x2 = x; it.y2 = y; }
    }
    draw();
  }

  function onUp() {
    if (!drag) return;
    if (drag.mode === 'createOpening') {
      const it = items[drag.idx];
      const dist = Math.hypot(it.x2 - it.x1, it.y2 - it.y1);
      if (!drag.moved || dist < 10) {
        // เปลี่ยนเข้าสู่โหมดคลิกทีละจุดตามแนวผนัง (ช่วยให้คลิกเลี้ยวเข้ามุมได้สะดวกและเสถียร 100%)
        undoS.push(drag.before); redoS = [];
        activePoly = { idx: drag.idx };
        if (btnFinish) btnFinish.hidden = false;
      } else {
        undoS.push(drag.before); redoS = [];
      }
    } else if (drag.mode === 'create') {
      const it = items[drag.idx];
      if (Math.hypot(it.x2 - it.x1, it.y2 - it.y1) < 10) {
        if (it.type === 'entrance') {
          // หากคลิก 1 ครั้งโดยไม่ลาก ให้สร้างลูกศรชี้ขึ้นด้านบนขนาดมาตรฐานให้อัตโนมัติ
          it.y1 = it.y1 + 32;
          it.y2 = it.y2 - 28;
          undoS.push(drag.before); redoS = [];
        } else {
          items.splice(drag.idx, 1);
        }
      } else {
        undoS.push(drag.before); redoS = [];
      }
    } else if (JSON.stringify(drag.before) !== JSON.stringify(items)) {
      undoS.push(drag.before); redoS = [];
    }
    drag = null; draw();
  }

  function onKey(e) {
    if (modal.hidden) return;
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'Enter' && activePoly) { finishActivePoly(); e.preventDefault(); return; }
    if (e.key === 'Escape') {
      if (activePoly) { finishActivePoly(); e.preventDefault(); return; }
      sel = -1; draw(); return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel >= 0) {
      pushUndo(); items.splice(sel, 1); renumberOpenings(); sel = -1; draw(); e.preventDefault();
    }
    else if (e.ctrlKey && e.key.toLowerCase() === 'z') { undo(); e.preventDefault(); }
    else if (e.ctrlKey && e.key.toLowerCase() === 'y') { redo(); e.preventDefault(); }
  }

  function undo() { finishActivePoly(); if (!undoS.length) return; redoS.push(clone(items)); items = undoS.pop(); sel = -1; draw(); }
  function redo() { finishActivePoly(); if (!redoS.length) return; undoS.push(clone(items)); items = redoS.pop(); sel = -1; draw(); }

  function init() {
    svg = document.getElementById('planSvg');
    modal = document.getElementById('planModal');
    hint = document.getElementById('planHint');
    btnFinish = document.getElementById('planFinishPoly');
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);
    svg.addEventListener('dblclick', () => {
      if (activePoly) { finishActivePoly(); return; }
      if (tool === 'select' && sel >= 0) editLabel(sel);
    });
    document.addEventListener('keydown', onKey);
    document.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
    if (btnFinish) btnFinish.onclick = finishActivePoly;
    document.getElementById('planUndo').onclick = undo;
    document.getElementById('planRedo').onclick = redo;
    document.getElementById('planDel').onclick = () => {
      finishActivePoly();
      if (sel >= 0) { pushUndo(); items.splice(sel, 1); renumberOpenings(); sel = -1; draw(); }
    };
    document.getElementById('planClear').onclick = () => {
      finishActivePoly();
      if (items.length && confirm('ล้างแปลนทั้งหมด?')) { pushUndo(); items = []; sel = -1; draw(); }
    };
    document.getElementById('planCancel').onclick = close;
    document.getElementById('planOk').onclick = () => {
      finishActivePoly();
      const savedItems = clone(items);
      const cb = onSave;
      close();
      if (cb) {
        try { cb(savedItems); } catch (err) { console.error('planOk callback error:', err); }
      }
    };
  }

  function open(current, cb) {
    items = clone(current || []);
    if (!items.length) {
      items.push({ type: 'rect', x1: 160, y1: 80, x2: 640, y2: 420 });
    }
    activePoly = null;
    if (btnFinish) btnFinish.hidden = true;
    onSave = cb; undoS = []; redoS = []; sel = -1;
    modal.hidden = false;
    setTool('window');
  }
  function close() { finishActivePoly(); modal.hidden = true; drag = null; }

  return { init, open };
})();

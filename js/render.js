/* =========================================================
   Sheet renderer – builds A4 pages (HTML) from order & sheets
   Covers all latest v4 requirements:
   - Req #1: ตัวเลขและจุดหน้าต่าง/ประตูของแปลนห้องขนาดใหญ่เท่ากับตัวอักษรอื่นๆ ในเอกสาร
   - Req #2: กล่องข้อความอิสระไม่ต้องแสดงเส้นขอบ/กรอบ
   - Req #3 & #4: บานดัดโค้งแสดงการรวบผ้าม่านขนาดใหญ่ชัดเจนไม่สับสน และเชื่อมต่อต่อเนื่องกันกับบานตรงเมื่อเป็นบานเดียวกัน
                  หรือเลือกแยกการใช้งานแต่ละส่วน (ทั้งบานต่อเนื่อง / เฉพาะบานกลาง / เฉพาะปีกซ้าย / เฉพาะปีกขวา) ได้อิสระ
   - Req #5: ขนาดความกว้างเต็ม มีชื่อกำกับ "= กว้างเต็ม ..." เหมือน "= สูงเต็ม ..."
   - Req #6: เส้นความกว้างกับเส้นความสูงตัดผ่านกัน และเลขของพื้นที่ด้านซ้าย/ขวา/บน/ล่าง อยู่นอกเส้น
   - Req #7: ระยะเผื่อแสดงสัญลักษณ์ "+" ติดกับฝั่งเฟรมความกว้าง/ความสูง (เช่น ซ้ายเป็น "15+" และขวาเป็น "+15")
   - Req #8: ตัวอักษรแนวตั้ง ("แบบ", "สี", "ห่วงตาไก่") วาดด้วย SVG จึงไม่เพี้ยนเป็นแนวนอนเมื่อ Export PDF
   - Req #9: การใช้งานผ้าม่าน หากบานไหนไม่มีข้อมูล Default เป็น "ไม่มีข้อมูล" (ไม่แสดงหน้ากาก)
   ========================================================= */

/* 9 รูปแบบโครงกรอบบานตรงและเข้ามุม 90 องศา ตามไฟล์แนบ 2621470 */
const CORNER_SHAPES = [
  ['1', 'แบบที่ 1 : บานตรงปกติ'],
  ['2', 'แบบที่ 2 : โค้งเข้ามุม 90° ด้านซ้าย (ยื่นลง)'],
  ['3', 'แบบที่ 3 : โค้งเข้ามุม 90° ด้านขวา (ยื่นลง)'],
  ['4', 'แบบที่ 4 : โค้งเข้ามุม 90° ทั้งซ้าย-ขวา (ยื่นลง)'],
  ['5', 'แบบที่ 5 : โค้งเข้ามุม 90° ด้านซ้าย (พับขึ้น)'],
  ['6', 'แบบที่ 6 : โค้งเข้ามุม 90° ด้านขวา (พับขึ้น)'],
  ['7', 'แบบที่ 7 : โค้งเข้ามุม 90° ทั้งซ้าย-ขวา (พับขึ้น)'],
  ['8', 'แบบที่ 8 : โค้งเข้ามุม 90° ซ้ายพับขึ้น - ขวายื่นลง'],
  ['9', 'แบบที่ 9 : โค้งเข้ามุม 90° ซ้ายยื่นลง - ขวาพับขึ้น'],
];

const PANE_STYLES = [
  ['1', '1 ช่อง (บานเดี่ยว)'],
  ['2', '2 ช่อง (มาตรฐาน)'],
  ['3', '3 ช่อง'],
  ['4', '4 ช่อง'],
  ['5', '5 ช่อง'],
  ['6', '6 ช่อง'],
  ['7', '7 ช่อง'],
  ['8', '8 ช่อง'],
  ['9', '9 ช่อง'],
  ['10', '10 ช่อง'],
  ['12', '12 ช่อง'],
];

function getPaneCount(w) {
  if (!w) return 2;
  const raw = w.paneCount || w.paneStyle || '2';
  const s = String(raw).trim();
  if (s === 'single') return 1;
  if (s === 'double') return 2;
  if (s === 'triple') return 3;
  if (s === 'quad') return 4;
  const n = parseInt(s, 10);
  return (!isNaN(n) && n >= 1) ? Math.min(24, n) : 2;
}

/* Req #9: Default เป็น '' (ไม่มีข้อมูล) หากยังไม่ได้ระบุการใช้งานผ้าม่าน */
const LAYER_OPS = [
  ['', '-- ไม่มีข้อมูล (ไม่แสดง) --'],
  ['split', 'แยกกลาง ซ้าย-ขวา (← →)'],
  ['left', 'รวบซ้าย (←)'],
  ['right', 'รวบขวา (→)'],
  ['chainL', 'ม่านม้วน (โซ่ดึงซ้าย)'],
  ['chainR', 'ม่านม้วน (โซ่ดึงขวา)'],
];

/* Req #4: เลือกได้ทั้งแบบรวมทั้งบาน (บานตรง+บานดัดโค้งต่อเนื่องกัน) หรือแยกแต่ละช่องบาน (รองรับมากกว่า 4 บาน) */
function getLayerTargetsForWindow(w) {
  const pCount = getPaneCount(w);
  const targets = [
    ['all', 'รวมทั้งบาน (บานตรง+ดัดโค้งต่อเนื่องกัน)'],
    ['leftHalfAll', 'ซีกซ้าย (รวมบานดัดโค้งซ้าย+บานซ้าย)'],
    ['rightHalfAll', 'ซีกขวา (รวมบานขวา+บานดัดโค้งขวา)'],
  ];
  for (let k = 1; k <= Math.max(4, pCount); k++) {
    const suffix = k === 1 ? ' (ซ้ายสุด)' : (k === pCount ? ' (ขวาสุด)' : '');
    targets.push([`pane${k}`, `เฉพาะบานที่ ${k}${suffix}`]);
  }
  targets.push(
    ['center', 'เฉพาะกรอบบานตรงกลาง'],
    ['leftWing', 'เฉพาะบานดัดโค้งซ้าย 90°'],
    ['rightWing', 'เฉพาะบานดัดโค้งขวา 90°']
  );
  return targets;
}
const LAYER_TARGETS = getLayerTargetsForWindow({ paneStyle: '4' });

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const F = (v, cls = '') => `<span class="fl ${cls}">${esc(v)}</span>`;
const CB = (on, label = '') => `<span class="ck"><span class="cb">${on ? '✓' : ''}</span>${label}</span>`;
const L = t => `<span class="lb">${t}</span>`;

/**
 * Req #8: วาดตัวอักษรแนวตั้ง ("แบบ", "สี", "ห่วงตาไก่") ลงบน Canvas ความละเอียดสูง (4x) แล้วแปลงเป็น <img>
 * เพื่อให้ทั้งหน้าจอปกติและหลังจากการ Export เป็น PDF ด้วย html2canvas แสดงตัวอักษรแนวตั้งเหมือนไฟล์ 105818 100%
 */
function vTextSVG(text, w = 18, h = 44) {
  try {
    const scale = 4;
    const cvs = document.createElement('canvas');
    cvs.width = w * scale;
    cvs.height = h * scale;
    const ctx = cvs.getContext('2d');
    ctx.scale(scale, scale);
    ctx.translate(w / 2 + 2, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '600 8.8px Sarabun, Tahoma, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    const dataUrl = cvs.toDataURL('image/png');
    return `<span class="vt-svg"><img src="${dataUrl}" style="width:${w}px;height:${h}px;display:block;margin:0 auto;" alt="${esc(text)}"></span>`;
  } catch (e) {
    return `<span class="vt-svg"><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<text transform="translate(${Math.round(w / 2 + 3)} ${Math.round(h / 2)}) rotate(-90)" text-anchor="middle" font-size="8.8" font-weight="700" fill="#000" font-family="Sarabun, Tahoma, sans-serif">${esc(text)}</text>` +
      `</svg></span>`;
  }
}

function fmtDate(v) {
  if (!v) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
}

const numVal = v => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};
const hasVal = v => v !== undefined && v !== null && String(v).trim() !== '';

function calcRailWidth(w) {
  if (!w) return '';
  if ((w.calcMode === 'manual' || (w.manualFields && w.manualFields.railW)) && hasVal(w.customRailW)) {
    return String(w.customRailW).trim();
  }
  if (!hasVal(w.width) && !hasVal(w.extL) && !hasVal(w.extR)) return '';
  const sum = numVal(w.width) + numVal(w.extL) + numVal(w.extR);
  return sum ? String(Math.round(sum * 100) / 100) : '';
}
function calcRailHeight(w) {
  if (!w) return '';
  if ((w.calcMode === 'manual' || (w.manualFields && w.manualFields.railH)) && hasVal(w.customRailH)) {
    return String(w.customRailH).trim();
  }
  // คำนวณความสูงราง = สูงเฟรม + เผื่อบน + เผื่อล่าง
  if (!hasVal(w.height) && !hasVal(w.extT) && !hasVal(w.extB)) return '';
  const sum = numVal(w.height) + numVal(w.extT) + numVal(w.extB);
  return sum ? String(Math.round(sum * 100) / 100) : '';
}

function valWithNote(val, note) {
  const v = hasVal(val) ? String(val).trim() : '';
  const n = hasVal(note) ? String(note).trim() : '';
  return { v, n };
}

/* =========================================================
   Window / Door SVG Diagram
   ========================================================= */
function shapeWings(shape) {
  switch (String(shape || '1')) {
    case '2': return { left: 'down', right: null };
    case '3': return { left: null, right: 'down' };
    case '4': return { left: 'down', right: 'down' };
    case '5': return { left: 'up', right: null };
    case '6': return { left: null, right: 'up' };
    case '7': return { left: 'up', right: 'up' };
    case '8': return { left: 'up', right: 'down' };
    case '9': return { left: 'down', right: 'up' };
    default:  return { left: null, right: null };
  }
}

/**
 * Create quadrilateral surfaces { tl, tr, br, bl } for:
 * - center frame
 * - left 90° wing (wider dx=28 so curtain drape is clearly visible - Req #3)
 * - right 90° wing
 */
function getFrameSurfaces(x0, x1, y0, y1, wings, dx = 28, dy = 16) {
  const center = {
    tl: { x: x0, y: y0 },
    tr: { x: x1, y: y0 },
    br: { x: x1, y: y1 },
    bl: { x: x0, y: y1 },
  };
  let leftWing = null, rightWing = null;
  if (wings.left) {
    const s = wings.left === 'down' ? 1 : -1;
    leftWing = {
      tl: { x: x0 - dx, y: y0 + s * dy },
      tr: { x: x0,      y: y0 },
      br: { x: x0,      y: y1 },
      bl: { x: x0 - dx, y: y1 + s * dy },
    };
  }
  if (wings.right) {
    const s = wings.right === 'down' ? 1 : -1;
    rightWing = {
      tl: { x: x1,      y: y0 },
      tr: { x: x1 + dx, y: y0 + s * dy },
      br: { x: x1 + dx, y: y1 + s * dy },
      bl: { x: x1,      y: y1 },
    };
  }
  return { center, leftWing, rightWing };
}

function quadPt(q, u, v) {
  const topX = q.tl.x + (q.tr.x - q.tl.x) * u;
  const topY = q.tl.y + (q.tr.y - q.tl.y) * u;
  const botX = q.bl.x + (q.br.x - q.bl.x) * u;
  const botY = q.bl.y + (q.br.y - q.bl.y) * u;
  return {
    x: Math.round((topX + (botX - topX) * v) * 10) / 10,
    y: Math.round((topY + (botY - topY) * v) * 10) / 10,
  };
}

function subQuad(q, u0, u1, v0 = 0, v1 = 1) {
  return {
    tl: quadPt(q, u0, v0),
    tr: quadPt(q, u1, v0),
    br: quadPt(q, u1, v1),
    bl: quadPt(q, u0, v1),
  };
}

function quadPolygonSVG(q, attrs) {
  return `<polygon points="${q.tl.x},${q.tl.y} ${q.tr.x},${q.tr.y} ${q.br.x},${q.br.y} ${q.bl.x},${q.bl.y}" ${attrs}/>`;
}

/**
 * Req #3 & #4:
 * - วาดหน้ากากและการรวบผ้าม่านให้ชัดเจน (เพิ่มความเข้ม เส้นจีบลอน สายรวบ และลูกศรขนาดใหญ่ชัดเจน)
 * - รองรับการวาดเฉพาะระบายหัวม่านต่อเนื่อง (valanceOnly) หรือวาดม่านรวบซ้าย/ขวาขนาดใหญ่บนปีกโค้ง (wingScale)
 */
function drawDrapeSideOnQuad(q, side, widthRatio = 0.42) {
  const p = (u, v) => { const pt = quadPt(q, u, v); return `${pt.x},${pt.y}`; };
  const w = Math.min(0.78, Math.max(0.32, widthRatio));
  const waist = w * 0.48;
  const hem = w * 0.82;
  if (side === 'L') {
    const path = `M ${p(0, 0)} L ${p(w, 0)} Q ${p(waist, 0.54)} ${p(hem, 1)} L ${p(0, 1)} Z`;
    const fold1 = `M ${p(w * 0.55, 0)} Q ${p(waist * 0.55, 0.54)} ${p(hem * 0.55, 1)}`;
    const tieA = quadPt(q, 0, 0.53), tieB = quadPt(q, waist * 1.18, 0.56);
    return `<path d="${path}" fill="rgba(0,0,0,0.18)" stroke="#000" stroke-width="1.35"/>` +
      `<path d="${fold1}" fill="none" stroke="#000" stroke-width="0.85"/>` +
      `<line x1="${tieA.x}" y1="${tieA.y}" x2="${tieB.x}" y2="${tieB.y}" stroke="#000" stroke-width="1.8"/>`;
  } else {
    const path = `M ${p(1, 0)} L ${p(1 - w, 0)} Q ${p(1 - waist, 0.54)} ${p(1 - hem, 1)} L ${p(1, 1)} Z`;
    const fold1 = `M ${p(1 - w * 0.55, 0)} Q ${p(1 - waist * 0.55, 0.54)} ${p(1 - hem * 0.55, 1)}`;
    const tieA = quadPt(q, 1, 0.53), tieB = quadPt(q, 1 - waist * 1.18, 0.56);
    return `<path d="${path}" fill="rgba(0,0,0,0.18)" stroke="#000" stroke-width="1.35"/>` +
      `<path d="${fold1}" fill="none" stroke="#000" stroke-width="0.85"/>` +
      `<line x1="${tieA.x}" y1="${tieA.y}" x2="${tieB.x}" y2="${tieB.y}" stroke="#000" stroke-width="1.8"/>`;
  }
}

function drawArrowUV(q, u1, u2, v = 0.36) {
  const a = quadPt(q, u1, v), b = quadPt(q, u2, v);
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;
  const hx = b.x - ux * 5.5, hy = b.y - uy * 5.5;
  return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#000" stroke-width="1.35"/>` +
    `<polygon points="${b.x},${b.y} ${hx + nx * 3},${hy + ny * 3} ${hx - nx * 3},${hy - ny * 3}" fill="#000"/>`;
}

function drawChainUV(q, u) {
  const a = quadPt(q, u, 0.04), b = quadPt(q, u, 0.78);
  return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#000" stroke-width="1.4" stroke-dasharray="2.5 2"/>` +
    `<circle cx="${b.x}" cy="${b.y + 2.5}" r="2.6" fill="#000"/>`;
}

/**
 * วาดหน้ากากการใช้งานผ้าม่านโดยไม่มีแถบขอบด้านบน (ตามที่ผู้ใช้กำหนด)
 * และหากเป็นม่านม้วนจะมีป้ายเลขกำกับ (เช่น ผืน 1, ผืน 2) แสดงชัดเจน
 */
function drawMaskOnQuad(q, op, tagText, isNarrowWing = false, splitRatio = 0.5) {
  if (!op) return '';
  let out = '';
  const wRatio = isNarrowWing ? 0.68 : 0.36;
  const sr = (Number.isFinite(splitRatio) && splitRatio > 0.12 && splitRatio < 0.88) ? splitRatio : 0.5;

  switch (op) {
    case 'left':
      out += drawDrapeSideOnQuad(q, 'L', wRatio) + drawArrowUV(q, isNarrowWing ? 0.88 : 0.76, isNarrowWing ? 0.38 : 0.28, 0.36);
      break;
    case 'right':
      out += drawDrapeSideOnQuad(q, 'R', wRatio) + drawArrowUV(q, isNarrowWing ? 0.12 : 0.24, isNarrowWing ? 0.62 : 0.72, 0.36);
      break;
    case 'split': {
      const lWidth = isNarrowWing ? 0.44 : Math.max(0.22, Math.min(0.58, sr * 0.68));
      const rWidth = isNarrowWing ? 0.44 : Math.max(0.22, Math.min(0.58, (1 - sr) * 0.68));
      const aLStart = Math.max(0.18, sr - 0.04);
      const aLEnd   = Math.max(0.12, sr * 0.44);
      const aRStart = Math.min(0.82, sr + 0.04);
      const aREnd   = Math.min(0.88, sr + (1 - sr) * 0.56);
      out += drawDrapeSideOnQuad(q, 'L', lWidth) +
        drawDrapeSideOnQuad(q, 'R', rWidth) +
        drawArrowUV(q, aLStart, aLEnd, 0.36) + drawArrowUV(q, aRStart, aREnd, 0.36);
      break;
    }
    case 'chainL':
      out += drawChainUV(q, isNarrowWing ? 0.16 : 0.08);
      break;
    case 'chainR':
      out += drawChainUV(q, isNarrowWing ? 0.84 : 0.92);
      break;
  }

  if (tagText) {
    const mid = quadPt(q, 0.5, 0.18);
    out += `<text x="${mid.x}" y="${mid.y + 3}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#000">${esc(tagText)}</text>`;
  }
  return out;
}

/**
 * วาดลูกศรเส้นต่อเนื่อง (สามารถหักมุมตามบานดัดโค้ง 90° ได้เป็นเส้นเดียวต่อเนื่องกัน)
 */
function drawPolylineArrow(pts) {
  if (!pts || pts.length < 2) return '';
  const poly = pts.map(p => `${p.x},${p.y}`).join(' ');
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;
  const hx = b.x - ux * 5.8, hy = b.y - uy * 5.8;
  return `<polyline points="${poly}" fill="none" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/>` +
    `<polygon points="${b.x},${b.y} ${hx + nx * 3.2},${hy + ny * 3.2} ${hx - nx * 3.2},${hy - ny * 3.2}" fill="#000"/>`;
}

/**
 * วาดผ้าม่านที่คลุมต่อเนื่องกันข้ามชุดพื้นผิว (เช่น [leftWing, center, rightWing] หรือ [leftWing, leftHalfCenter])
 * โดยไม่มีแถบขอบด้านบน และไม่แยกบานดัดโค้งออกจากบานตรง
 */
function drawContinuousSpanMask(leftQ, centerQ, rightQ, op, tagText, splitRatio = 0.5) {
  if (!op) return '';
  const quads = [leftQ, centerQ, rightQ].filter(Boolean);
  if (!quads.length) return '';
  const sr = (Number.isFinite(splitRatio) && splitRatio > 0.12 && splitRatio < 0.88) ? splitRatio : 0.5;
  if (quads.length === 1) {
    return drawMaskOnQuad(quads[0], op, tagText, !centerQ, sr);
  }

  let out = '';
  const vArr = 0.36;

  if (op === 'left') {
    if (leftQ) {
      out += drawDrapeSideOnQuad(leftQ, 'L', 0.72);
      const pts = [];
      if (rightQ) {
        pts.push(quadPt(rightQ, 0.72, vArr), quadPt(rightQ, 0.0, vArr));
      }
      if (centerQ) {
        if (!pts.length) pts.push(quadPt(centerQ, 0.78, vArr));
        pts.push(quadPt(centerQ, 0.0, vArr));
      }
      pts.push(quadPt(leftQ, 0.52, vArr));
      out += drawPolylineArrow(pts);
    } else if (centerQ) {
      out += drawDrapeSideOnQuad(centerQ, 'L', 0.36);
      const pts = [];
      if (rightQ) {
        pts.push(quadPt(rightQ, 0.72, vArr), quadPt(rightQ, 0.0, vArr));
      } else {
        pts.push(quadPt(centerQ, 0.78, vArr));
      }
      pts.push(quadPt(centerQ, 0.28, vArr));
      out += drawPolylineArrow(pts);
    }
  } else if (op === 'right') {
    if (rightQ) {
      out += drawDrapeSideOnQuad(rightQ, 'R', 0.72);
      const pts = [];
      if (leftQ) {
        pts.push(quadPt(leftQ, 0.28, vArr), quadPt(leftQ, 1.0, vArr));
      }
      if (centerQ) {
        if (!pts.length) pts.push(quadPt(centerQ, 0.22, vArr));
        pts.push(quadPt(centerQ, 1.0, vArr));
      }
      pts.push(quadPt(rightQ, 0.48, vArr));
      out += drawPolylineArrow(pts);
    } else if (centerQ) {
      out += drawDrapeSideOnQuad(centerQ, 'R', 0.36);
      const pts = [];
      if (leftQ) {
        pts.push(quadPt(leftQ, 0.28, vArr), quadPt(leftQ, 1.0, vArr));
      } else {
        pts.push(quadPt(centerQ, 0.22, vArr));
      }
      pts.push(quadPt(centerQ, 0.72, vArr));
      out += drawPolylineArrow(pts);
    }
  } else if (op === 'split') {
    const aLStart = Math.max(0.18, sr - 0.05);
    const aRStart = Math.min(0.82, sr + 0.05);
    if (leftQ) {
      out += drawDrapeSideOnQuad(leftQ, 'L', 0.72);
      const ptsL = centerQ
        ? [quadPt(centerQ, aLStart, vArr), quadPt(centerQ, 0.0, vArr), quadPt(leftQ, 0.52, vArr)]
        : [quadPt(leftQ, 0.90, vArr), quadPt(leftQ, 0.52, vArr)];
      out += drawPolylineArrow(ptsL);
    } else if (centerQ) {
      out += drawDrapeSideOnQuad(centerQ, 'L', Math.max(0.22, Math.min(0.56, sr * 0.68)));
      out += drawArrowUV(centerQ, aLStart, Math.max(0.12, sr * 0.44), vArr);
    }

    if (rightQ) {
      out += drawDrapeSideOnQuad(rightQ, 'R', 0.72);
      const ptsR = centerQ
        ? [quadPt(centerQ, aRStart, vArr), quadPt(centerQ, 1.0, vArr), quadPt(rightQ, 0.48, vArr)]
        : [quadPt(rightQ, 0.10, vArr), quadPt(rightQ, 0.48, vArr)];
      out += drawPolylineArrow(ptsR);
    } else if (centerQ) {
      out += drawDrapeSideOnQuad(centerQ, 'R', Math.max(0.22, Math.min(0.56, (1 - sr) * 0.68)));
      out += drawArrowUV(centerQ, aRStart, Math.min(0.88, sr + (1 - sr) * 0.56), vArr);
    }
  } else if (op === 'chainL') {
    const firstQ = leftQ || centerQ || rightQ;
    out += drawChainUV(firstQ, leftQ ? 0.18 : 0.08);
  } else if (op === 'chainR') {
    const lastQ = rightQ || centerQ || leftQ;
    out += drawChainUV(lastQ, rightQ ? 0.82 : 0.92);
  }

  if (tagText) {
    const midQ = centerQ || leftQ || rightQ;
    const mid = quadPt(midQ, 0.5, 0.18);
    out += `<text x="${mid.x}" y="${mid.y + 3}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#000">${esc(tagText)}</text>`;
  }
  return out;
}

/**
 * วาดเลเยอร์การใช้งานผ้าม่านทั้งหมด:
 * - หากเป็นม่านม้วน (chainL / chainR หรือประเภทม่านมีคำว่า "ม่านม้วน") จะแสดงเลขกำกับ (เช่น ผืน 1, ผืน 2) เหมือนเวอร์ชั่นก่อนหน้า
 * - รองรับจำนวนบานในกรอบมากกว่า 4 บาน (pane1 .. paneN)
 * - รองรับการแบ่งผ้าม่านผืนซ้าย/ผืนขวาไม่เท่ากัน (splitRatio)
 */
function renderAllCurtainLayers(layers, surfaces, pCount = 2, isRollerWindow = false, splitRatio = 0.5) {
  const list = (layers || []).filter(l => l && l.op);
  if (!list.length) return '';
  let out = '';

  const resolveTag = (ly, idx, totalInGroup) => {
    if (ly.label && String(ly.label).trim()) return String(ly.label).trim();
    const isRollerOp = (ly.op === 'chainL' || ly.op === 'chainR' || isRollerWindow);
    if (isRollerOp || totalInGroup > 1) return `ผืน ${idx + 1}`;
    return '';
  };

  // 1) เลเยอร์ที่กำหนดเป็น "รวมทั้งบาน (all)" — รวมปีกดัดโค้งซ้าย/ขวาเข้ากับบานตรงโดยไม่แยกออกจากกัน
  const allLayers = list.filter(l => !l.target || l.target === 'all');
  if (allLayers.length) {
    const n = allLayers.length;
    allLayers.forEach((ly, idx) => {
      const u0 = idx / n, u1 = (idx + 1) / n;
      const centerSub = subQuad(surfaces.center, u0, u1, 0, 1);
      const incLeft = (idx === 0) ? surfaces.leftWing : null;
      const incRight = (idx === n - 1) ? surfaces.rightWing : null;
      if (idx > 0) {
        const topP = quadPt(surfaces.center, u0, 0), botP = quadPt(surfaces.center, u0, 1);
        out += `<line x1="${topP.x}" y1="${topP.y}" x2="${botP.x}" y2="${botP.y}" stroke="#000" stroke-width="0.9" stroke-dasharray="3 2"/>`;
      }
      const tag = resolveTag(ly, idx, n);
      out += drawContinuousSpanMask(incLeft, centerSub, incRight, ly.op, tag, n === 1 ? splitRatio : 0.5);
    });
  }

  // 2) เลเยอร์ที่เลือกซีกซ้ายรวมดัดโค้ง (leftHalfAll) หรือซีกขวารวมดัดโค้ง (rightHalfAll)
  list.filter(l => l.target === 'leftHalfAll').forEach((ly) => {
    const globalIdx = list.indexOf(ly);
    const leftHalfCenter = subQuad(surfaces.center, 0, splitRatio, 0, 1);
    out += drawContinuousSpanMask(surfaces.leftWing, leftHalfCenter, null, ly.op, resolveTag(ly, globalIdx, list.length), 0.5);
  });
  list.filter(l => l.target === 'rightHalfAll').forEach((ly) => {
    const globalIdx = list.indexOf(ly);
    const rightHalfCenter = subQuad(surfaces.center, splitRatio, 1, 0, 1);
    out += drawContinuousSpanMask(null, rightHalfCenter, surfaces.rightWing, ly.op, resolveTag(ly, globalIdx, list.length), 0.5);
  });

  // 3) เลเยอร์ที่เลือกแต่ละช่องบาน (pane1 .. paneN รองรับมากกว่า 4 บาน)
  list.forEach((ly, globalIdx) => {
    const m = /^pane(\d+)$/.exec(String(ly.target || ''));
    if (!m) return;
    const pIdx = Math.max(0, parseInt(m[1], 10) - 1);
    const totalP = Math.max(pCount, pIdx + 1);
    const u0 = pIdx / totalP, u1 = (pIdx + 1) / totalP;
    const paneQuad = subQuad(surfaces.center, u0, u1, 0, 1);
    out += drawMaskOnQuad(paneQuad, ly.op, resolveTag(ly, globalIdx, list.length), false, 0.5);
  });

  // 4) เลเยอร์ที่เลือกเฉพาะกรอบบานตรงกลาง ('center') หรือเฉพาะปีกซ้าย ('leftWing') หรือเฉพาะปีกขวา ('rightWing')
  const centerOnly = list.filter(l => l.target === 'center');
  if (centerOnly.length) {
    const n = centerOnly.length;
    centerOnly.forEach((ly, idx) => {
      const u0 = idx / n, u1 = (idx + 1) / n;
      const sq = subQuad(surfaces.center, u0, u1, 0, 1);
      if (idx > 0) {
        const topP = quadPt(surfaces.center, u0, 0), botP = quadPt(surfaces.center, u0, 1);
        out += `<line x1="${topP.x}" y1="${topP.y}" x2="${botP.x}" y2="${botP.y}" stroke="#000" stroke-width="0.9" stroke-dasharray="3 2"/>`;
      }
      const tag = resolveTag(ly, idx, n);
      out += drawMaskOnQuad(sq, ly.op, tag, false, n === 1 ? splitRatio : 0.5);
    });
  }

  const leftOnly = list.filter(l => l.target === 'leftWing');
  if (surfaces.leftWing && leftOnly.length) {
    const n = leftOnly.length;
    leftOnly.forEach((ly, idx) => {
      const sq = subQuad(surfaces.leftWing, idx / n, (idx + 1) / n, 0, 1);
      out += drawMaskOnQuad(sq, ly.op, resolveTag(ly, list.indexOf(ly), n), true);
    });
  }

  const rightOnly = list.filter(l => l.target === 'rightWing');
  if (surfaces.rightWing && rightOnly.length) {
    const n = rightOnly.length;
    rightOnly.forEach((ly, idx) => {
      const sq = subQuad(surfaces.rightWing, idx / n, (idx + 1) / n, 0, 1);
      out += drawMaskOnQuad(sq, ly.op, resolveTag(ly, list.indexOf(ly), n), true);
    });
  }

  return out;
}

function windowSVG(w) {
  w = w || {};
  const shape = String(w.cornerShape || '1');
  const wings = shapeWings(shape);
  const VW = 316, VH = 172;

  // ขยายรูปแปลนหน้าต่าง/ประตูให้ใหญ่ขึ้นชัดเจน ดูง่ายไม่เล็กไป
  const wingDX = 28, wingDY = 14;
  const x0 = 82, x1 = 226;
  const y0 = 42, y1 = 136;
  const surfaces = getFrameSurfaces(x0, x1, y0, y1, wings, wingDX, wingDY);

  const leftOuterX = wings.left ? x0 - wingDX : x0;
  const rightOuterX = wings.right ? x1 + wingDX : x1;
  const topOuterY = (wings.left === 'up' || wings.right === 'up') ? y0 - wingDY : y0;
  const botOuterY = (wings.left === 'down' || wings.right === 'down') ? y1 + wingDY : y1;

  // ตามไฟล์แนบ 151942:
  // 1) เส้นความกว้าง (แนวนอน hLineY) กับ เส้นความสูง (แนวตั้ง vLineX) ตัดผ่านกันที่มุมขวาบน (vLineX, hLineY)
  // 2) ปลายเส้นทั้ง 4 ด้าน (ซ้ายสุด hLineX0, ขวาสุด hLineX1, บนสุด vLineY0, ล่างสุด vLineY1) มีขีดปิดปลายเส้น
  //    และตัวเลขของ พื้นที่ด้านซ้าย / พื้นที่ด้านขวา / พื้นที่ด้านบน / พื้นที่ด้านล่าง อยู่นอกเส้น!
  // 3) เหนือเฟรมหน้าต่าง (ระหว่าง leftOuterX ถึง vLineX) แสดงสัญลักษณ์ "+" คั่นเป็น: เผื่อซ้าย + ความกว้าง + เผื่อขวา (เช่น 50 + 150 + 50)
  // 4) ด้านขวาของเฟรมหน้าต่าง (ระหว่าง topOuterY ถึง botOuterY) แสดงสัญลักษณ์ "+" คั่นเป็น: เผื่อบน + ความสูง + เผื่อล่าง
  const hLineY = topOuterY - 10;
  const vLineX = wings.right ? rightOuterX + 5 : rightOuterX;

  const hLineX0 = leftOuterX - 24;
  const hLineX1 = vLineX + 28;

  const vLineY0 = hLineY - 14;
  const vLineY1 = botOuterY + 14;

  const cx = (leftOuterX + rightOuterX) / 2;
  const cy = (y0 + y1) / 2;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMid meet" font-family="Sarabun, Tahoma, sans-serif">`;

  // ==================== 1) เส้นความกว้างแนวนอน + สัญลักษณ์ "+" (50 + 150 + 50) ตามรูป 151942 ====================
  s += `<line x1="${hLineX0}" y1="${hLineY}" x2="${hLineX1}" y2="${hLineY}" stroke="#000" stroke-width="1.25"/>`;
  s += `<line x1="${hLineX0}" y1="${hLineY - 5}" x2="${hLineX0}" y2="${hLineY + 5}" stroke="#000" stroke-width="1.15"/>`;
  s += `<line x1="${hLineX1}" y1="${hLineY - 5}" x2="${hLineX1}" y2="${hLineY + 5}" stroke="#000" stroke-width="1.15"/>`;

  const leftFrameTopY = surfaces.leftWing ? surfaces.leftWing.tl.y : y0;
  s += `<line x1="${leftOuterX}" y1="${leftFrameTopY}" x2="${leftOuterX}" y2="${hLineY - 5}" stroke="#000" stroke-width="1.15"/>`;

  const spanW = vLineX - leftOuterX;
  const plusX1 = Math.round(leftOuterX + spanW * 0.30);
  const plusX2 = Math.round(leftOuterX + spanW * 0.70);
  [plusX1, plusX2].forEach(px => {
    s += `<line x1="${px}" y1="${hLineY - 9}" x2="${px}" y2="${hLineY}" stroke="#000" stroke-width="1.1"/>`;
    s += `<line x1="${px - 4.5}" y1="${hLineY - 4.5}" x2="${px + 4.5}" y2="${hLineY - 4.5}" stroke="#000" stroke-width="1.1"/>`;
  });

  const yTopNum = hLineY - 3;
  const yTopNote = hLineY - 12;
  const drawHText = (x, anchor, textStr, noteStr, yNum = yTopNum, yNote = yTopNote) => {
    if (textStr) s += `<text x="${x}" y="${yNum}" text-anchor="${anchor}" font-size="11.2" font-weight="700" fill="#000">${esc(textStr)}</text>`;
    if (noteStr) s += `<text x="${x}" y="${yNote}" text-anchor="${anchor}" font-size="9.2" font-weight="700" fill="#000">${esc(noteStr)}</text>`;
  };

  const pExtL = valWithNote(w.extL, w.noteExtL);
  drawHText((leftOuterX + plusX1) / 2, 'middle', pExtL.v, pExtL.n);

  const pWidth = valWithNote(w.width, w.noteWidth);
  drawHText((plusX1 + plusX2) / 2, 'middle', pWidth.v, pWidth.n);

  const pExtR = valWithNote(w.extR, w.noteExtR);
  drawHText((plusX2 + vLineX) / 2, 'middle', pExtR.v, pExtR.n);

  const pWallL = valWithNote(w.wallL, w.noteWallL);
  drawHText(hLineX0 - 3, 'end', pWallL.v, pWallL.n, hLineY + 4, hLineY - 6);

  const pWallR = valWithNote(w.wallR, w.noteWallR);
  drawHText(hLineX1 + 3, 'start', pWallR.v, pWallR.n, hLineY + 4, hLineY - 6);

  // ==================== 2) เส้นความสูงแนวตั้ง + สัญลักษณ์ "+" ด้านขวาเฟรม ตามรูป 151942 ====================
  s += `<line x1="${vLineX}" y1="${vLineY0}" x2="${vLineX}" y2="${vLineY1}" stroke="#000" stroke-width="1.25"/>`;
  s += `<line x1="${vLineX - 5}" y1="${vLineY0}" x2="${vLineX + 5}" y2="${vLineY0}" stroke="#000" stroke-width="1.15"/>`;
  s += `<line x1="${vLineX - 5}" y1="${vLineY1}" x2="${vLineX + 5}" y2="${vLineY1}" stroke="#000" stroke-width="1.15"/>`;

  const brkX = vLineX + 6;
  const spanH = botOuterY - topOuterY;
  s += `<line x1="${vLineX}" y1="${topOuterY}" x2="${vLineX + 10}" y2="${topOuterY}" stroke="#000" stroke-width="1.05"/>`;
  s += `<line x1="${vLineX}" y1="${botOuterY}" x2="${vLineX + 10}" y2="${botOuterY}" stroke="#000" stroke-width="1.05"/>`;
  s += `<line x1="${brkX}" y1="${topOuterY}" x2="${brkX}" y2="${Math.round(topOuterY + spanH * 0.36)}" stroke="#000" stroke-width="1.0"/>`;
  s += `<line x1="${brkX}" y1="${Math.round(topOuterY + spanH * 0.64)}" x2="${brkX}" y2="${botOuterY}" stroke="#000" stroke-width="1.0"/>`;

  const plusY1 = Math.round(topOuterY + spanH * 0.33);
  const plusY2 = Math.round(topOuterY + spanH * 0.67);
  const plusVX = vLineX + 19;
  [plusY1, plusY2].forEach(py => {
    s += `<line x1="${plusVX - 4.5}" y1="${py}" x2="${plusVX + 4.5}" y2="${py}" stroke="#000" stroke-width="1.1"/>`;
    s += `<line x1="${plusVX}" y1="${py - 4.5}" x2="${plusVX}" y2="${py + 4.5}" stroke="#000" stroke-width="1.1"/>`;
  });

  const drawVText = (xPos, yPos, anchor, textStr, noteStr) => {
    const label = [textStr, noteStr].filter(Boolean).join(' ');
    if (label) {
      s += `<text x="${xPos}" y="${yPos}" text-anchor="${anchor}" font-size="11.0" font-weight="700" fill="#000">${esc(label)}</text>`;
    }
  };

  const pExtT = valWithNote(w.extT, w.noteExtT);
  drawVText(plusVX, Math.round((topOuterY + plusY1) / 2 + 3), 'middle', pExtT.v, pExtT.n);

  const pHeight = valWithNote(w.height, w.noteHeight);
  drawVText(plusVX, Math.round((plusY1 + plusY2) / 2 + 4), 'middle', pHeight.v, pHeight.n);

  const pExtB = valWithNote(w.extB, w.noteExtB);
  drawVText(plusVX, Math.round((plusY2 + botOuterY) / 2 + 4), 'middle', pExtB.v, pExtB.n);

  const pCeilT = valWithNote(w.ceilT, w.noteCeilT);
  drawVText(vLineX, vLineY0 - 3, 'middle', pCeilT.v, pCeilT.n);

  const pFloorB = valWithNote(w.floorB, w.noteFloorB);
  drawVText(vLineX, vLineY1 + 11, 'middle', pFloorB.v, pFloorB.n);

  // ==================== 3) ความสูงเต็ม & ความกว้างเต็ม ====================
  const fullHPair = valWithNote(w.fullH, w.noteFullH);
  const leftFullText = fullHPair.v ? `สูงเต็ม = ${fullHPair.v}` : (hasVal(w.drop) ? `สูงเต็ม = ${w.drop}` : 'สูงเต็ม =');
  s += `<text x="2" y="${cy + 3}" text-anchor="start" font-size="10.0" font-weight="700" fill="#000">${esc(leftFullText)}</text>`;
  if (fullHPair.n) {
    s += `<text x="2" y="${cy + 14}" text-anchor="start" font-size="9.0" font-weight="700" fill="#000">${esc(fullHPair.n)}</text>`;
  }

  const fullWPair = valWithNote(w.fullW, w.noteFullW);
  const botFullText = fullWPair.v
    ? `กว้างเต็ม = ${fullWPair.v}${fullWPair.n ? ' (' + fullWPair.n + ')' : ''}`
    : (fullWPair.n ? `กว้างเต็ม = (${fullWPair.n})` : 'กว้างเต็ม =');
  s += `<text x="${cx}" y="${botOuterY + 13}" text-anchor="middle" font-size="10.0" font-weight="700" fill="#000">${esc(botFullText)}</text>`;

  // ==================== 4) วาดกรอบหน้าต่าง/ประตู (แบบ 1–9) ขนาดใหญ่ชัดเจน ====================
  if (surfaces.leftWing) {
    s += quadPolygonSVG(surfaces.leftWing, `fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"`);
    const innerLW = subQuad(surfaces.leftWing, 0.10, 0.90, 0.06, 0.94);
    s += quadPolygonSVG(innerLW, `fill="none" stroke="#000" stroke-width="0.95"`);
  }
  if (surfaces.rightWing) {
    s += quadPolygonSVG(surfaces.rightWing, `fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"`);
    const innerRW = subQuad(surfaces.rightWing, 0.10, 0.90, 0.06, 0.94);
    s += quadPolygonSVG(innerRW, `fill="none" stroke="#000" stroke-width="0.95"`);
  }

  s += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#fff" stroke="#000" stroke-width="1.5"/>`;
  const pCount = getPaneCount(w);
  const ix0 = x0 + 4.5, ix1 = x1 - 4.5;
  const gap = pCount > 6 ? 2 : (pCount > 4 ? 3 : 4.5);
  const pw = Math.max(4, (ix1 - ix0 - gap * (pCount - 1)) / pCount);
  for (let k = 0; k < pCount; k++) {
    const px = ix0 + k * (pw + gap);
    s += `<rect x="${px}" y="${y0 + 4.5}" width="${pw}" height="${y1 - y0 - 9}" fill="none" stroke="#000" stroke-width="0.95"/>`;
  }

  // ==================== 5) เลเยอร์บนสุด: หน้ากากการใช้งานผ้าม่านภายในกรอบ + จุดแบ่งรางม่านไม่เท่ากัน ====================
  const sLNum = numVal(w.splitLeft);
  const sRNum = numVal(w.splitRight);
  const hasUnequalSplit = Boolean(w.unequalSplit && (hasVal(w.splitLeft) || hasVal(w.splitRight)));
  const splitRatio = (hasUnequalSplit && sLNum > 0 && sRNum > 0)
    ? Math.max(0.18, Math.min(0.82, sLNum / (sLNum + sRNum)))
    : 0.5;

  const isRollerWindow = /ม่านม้วน/.test(String(w.curtainStyle1 || '')) || /ม่านม้วน/.test(String(w.curtainStyle2 || ''));
  s += renderAllCurtainLayers(w.layers, surfaces, pCount, isRollerWindow, splitRatio);

  if (hasUnequalSplit) {
    const splitX = Math.round(leftOuterX + (rightOuterX - leftOuterX) * splitRatio);
    const sLText = hasVal(w.splitLeft) ? String(w.splitLeft).trim() : '';
    const sRText = hasVal(w.splitRight) ? String(w.splitRight).trim() : '';
    const ySplitDim = y0 + 13;

    // เส้นประจุดแบ่งที่รางม่านและสัญลักษณ์ขีดแบ่งบนรางม่านเดียวกัน
    s += `<line x1="${splitX}" y1="${y0 - 4}" x2="${splitX}" y2="${y1}" stroke="#000" stroke-width="1.35" stroke-dasharray="3.5 2"/>`;
    s += `<polygon points="${splitX},${y0 + 1} ${splitX - 4},${y0 - 4.5} ${splitX + 4},${y0 - 4.5}" fill="#000"/>`;

    // เส้นบอกขนาดช่วงที่แบ่ง (ซ้าย / ขวา) บนรางม่าน
    s += `<line x1="${leftOuterX + 2}" y1="${ySplitDim}" x2="${rightOuterX - 2}" y2="${ySplitDim}" stroke="#000" stroke-width="1.15"/>`;
    s += `<line x1="${leftOuterX + 2}" y1="${ySplitDim - 3.5}" x2="${leftOuterX + 2}" y2="${ySplitDim + 3.5}" stroke="#000" stroke-width="1.15"/>`;
    s += `<line x1="${splitX}" y1="${ySplitDim - 4.5}" x2="${splitX}" y2="${ySplitDim + 4.5}" stroke="#000" stroke-width="1.35"/>`;
    s += `<line x1="${rightOuterX - 2}" y1="${ySplitDim - 3.5}" x2="${rightOuterX - 2}" y2="${ySplitDim + 3.5}" stroke="#000" stroke-width="1.15"/>`;

    if (sLText) {
      const lx = Math.round((leftOuterX + splitX) / 2);
      const bw = Math.max(22, sLText.length * 6.8 + 8);
      s += `<rect x="${Math.round(lx - bw / 2)}" y="${ySplitDim - 7.5}" width="${bw}" height="13" rx="2.5" fill="#fff" stroke="#000" stroke-width="0.9"/>`;
      s += `<text x="${lx}" y="${ySplitDim + 2.5}" text-anchor="middle" font-size="10.2" font-weight="700" fill="#000">${esc(sLText)}</text>`;
    }
    if (sRText) {
      const rx = Math.round((splitX + rightOuterX) / 2);
      const bw = Math.max(22, sRText.length * 6.8 + 8);
      s += `<rect x="${Math.round(rx - bw / 2)}" y="${ySplitDim - 7.5}" width="${bw}" height="13" rx="2.5" fill="#fff" stroke="#000" stroke-width="0.9"/>`;
      s += `<text x="${rx}" y="${ySplitDim + 2.5}" text-anchor="middle" font-size="10.2" font-weight="700" fill="#000">${esc(sRText)}</text>`;
    }
  }

  // ==================== 6) โซนคลิกแก้ไขแม่นยำรายจุดบนแปลนหน้าต่าง/ประตู (Interactive Hit Zones) ====================
  const hit = (field, title, hx, hy, hw, hh) =>
    `<rect class="svg-hit" data-svg-field="${field}" x="${Math.round(hx)}" y="${Math.round(hy)}" width="${Math.max(8, Math.round(hw))}" height="${Math.max(8, Math.round(hh))}" fill="transparent" style="cursor:pointer"><title>คลิกเพื่อแก้ไข: ${title}</title></rect>`;

  s += hit('wallL', 'พื้นที่ด้านซ้าย', 2, hLineY - 18, Math.max(20, hLineX0 - 2), 26);
  s += hit('extL', 'เผื่อด้านซ้าย (+)', leftOuterX, hLineY - 18, plusX1 - leftOuterX, 24);
  s += hit('width', 'ความกว้างเฟรม', plusX1, hLineY - 18, plusX2 - plusX1, 24);
  s += hit('extR', 'เผื่อด้านขวา (+)', plusX2, hLineY - 18, vLineX - plusX2, 24);
  s += hit('wallR', 'พื้นที่ด้านขวา', hLineX1 - 2, hLineY - 18, Math.max(24, VW - hLineX1), 26);

  s += hit('ceilT', 'พื้นที่ด้านบน', vLineX - 24, 0, 56, Math.max(14, vLineY0 + 4));
  s += hit('extT', 'เผื่อด้านบน (+)', vLineX + 2, topOuterY, Math.max(28, VW - vLineX - 4), plusY1 - topOuterY);
  s += hit('height', 'ความสูงเฟรม', vLineX + 2, plusY1, Math.max(28, VW - vLineX - 4), plusY2 - plusY1);
  s += hit('extB', 'เผื่อด้านล่าง (+)', vLineX + 2, plusY2, Math.max(28, VW - vLineX - 4), botOuterY - plusY2);
  s += hit('floorB', 'พื้นที่ด้านล่าง', vLineX - 24, vLineY1 - 2, 56, Math.max(16, VH - vLineY1));

  s += hit('fullH', 'ความสูงเต็ม', 0, cy - 14, Math.max(48, leftOuterX - 4), 34);
  s += hit('fullW', 'ความกว้างเต็ม', leftOuterX, botOuterY + 1, rightOuterX - leftOuterX, Math.max(16, VH - botOuterY - 1));
  if (hasUnequalSplit) {
    s += hit('split', 'จุดแบ่งผ้าม่านซ้าย/ขวาไม่เท่ากัน', leftOuterX, y0 - 6, rightOuterX - leftOuterX, 26);
  }
  s += hit('layers', 'หน้ากากการใช้งานผ้าม่าน / รูปแบบบาน / จุดแบ่งราง', leftOuterX, hasUnequalSplit ? y0 + 20 : y0, rightOuterX - leftOuterX, Math.max(24, y1 - (hasUnequalSplit ? y0 + 20 : y0)));

  s += '</svg>';
  return s;
}

/* =========================================================
   Blocks on the A4 Form
   ========================================================= */
function rHeader(order) {
  const c = order.company || {};
  const logoSrc = c.logo || 'pasaya-logo.png';
  const logo = `<img src="${logoSrc}" alt="PASAYA" class="pasaya-hd-logo">`;
  return `<div class="s-hd"><div class="logo">${logo}<div class="ltitle">${esc(c.title)}</div></div>
    <div class="addr">${esc(c.address)}</div></div>`;
}

function rCustomer(order, pageNo, totalPages) {
  const c = order.customer, st = order.staff, d = order.discount;
  const pageText = `${pageNo}/${totalPages}`;
  const orderNoDisplay = (st.orderNo && String(st.orderNo).trim()) ? String(st.orderNo).trim() : '-';
  return `<div class="s-cust">
    <div class="cl">
      <div class="r">${L('CUSTOMER NAME (ชื่อลูกค้า) :')}${F(c.name, 'cust-name')}</div>
      <div class="r">${L('ADDRESS (สถานที่ติดตั้ง) : เลขที่ :')}${F(c.houseNo, 'w65')}${L('ชั้น')}${F(c.floor, 'w40')}${L('หมู่')}${F(c.moo, 'w40')}${L('ถนน')}${F(c.road)}</div>
      <div class="r">${L('อาคาร/หมู่บ้าน :')}${F(c.building)}${L('ซอย')}${F(c.soi, 'w85')}${L('ตำบล/แขวง :')}${F(c.subdistrict, 'w85')}</div>
      <div class="r">${L('อำเภอ/เขต :')}${F(c.district)}${L('จังหวัด :')}${F(c.province)}${L('รหัสไปรษณีย์ :')}${F(c.zipcode, 'w60')}</div>
      <div class="r">${L('MOBILE (มือถือ)')}${F(c.mobile)}${L('TEL. (โทร) :')}${F(c.tel)}${L('EMAIL (อีเมล) :')}${F(c.email)}</div>
      <div class="r">${L('DELIVERY DATE (วันที่ส่ง) :')}${F(fmtDate(c.deliveryDate))}</div>
      <div class="r">${L('DELIVERY PLACE (สถานที่ส่ง) :')}${F(c.deliveryPlace)}</div>
    </div>
    <div class="cr">
      <div class="r">${L('ORDER NO (เลขที่) :')}${F(orderNoDisplay)}</div>
      <div class="r">${L('PAGE NO (แผ่นที่) :')}${F(pageText)}</div>
      <div class="r">${L('S.R. (ชื่อพนักงาน) :')}${F(st.name)}</div>
      <div class="r">${L('DEPT. (แผนก) :')}${F(st.dept)}</div>
      <div class="r">${L('Branch (สาขา) :')}${F(st.branch)}</div>
      <div class="disc">
        <div class="r"><span class="dlbl">ผ้าทึบ</span>${F(d.blackout)}${L('%')}<span class="dlbl">ผ้าโปร่ง</span>${F(d.sheer)}${L('%')}</div>
        <div class="r"><span class="dlbl">อุปกรณ์</span>${F(d.equipment)}${L('%')}<span class="dlbl">ค่าแรง</span>${F(d.labor)}${L('%')}</div>
      </div>
    </div>
  </div>`;
}

function rMap(sheet) {
  const r = sheet.room;
  const plan = planPreviewSVG(sheet.plan.items);
  const notes = (sheet.notes || []).filter(n => String(n).trim());
  const yn = (label, v) => `<div class="r"><span class="ol">${label}</span>${CB(v === 'no', 'No')}${CB(v === 'yes', 'Yes')}</div>`;
  return `<div class="s-map">
    <div class="pbox">${plan || '<span class="empty"></span>'}</div>
    <div class="mid">
      <div class="r">${L('MAP ROOM (ห้อง)')}${F(r.name)}</div>
      <div class="r map-note-hd">${L('หมายเหตุ :')}</div>
      <ol class="notes-list">${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ol>
    </div>
    <div class="rt" data-map-part="roomOpts">
      <div class="r"><span class="ol">แอร์ผนัง</span>${CB(r.aircon === 'no', 'No')}${CB(r.aircon === 'yes', 'Yes')}${L('<b><u>No.</u></b>')}${F(r.refNo)}</div>
      ${yn('เหล็กดัด', r.grille)}
      <div class="r"><span class="ol">มุ้งลวด</span>${CB(r.screen === 'no', 'No')}${CB(r.screen === 'yes', 'Yes')}${L('<b><u>โปร.</u></b>')}${F(r.promo)}</div>
    </div>
  </div>`;
}

function rCalc(t, r, u1, u2, rowKey = '') {
  r = r || {};
  const tRaw = String(r.t ?? '').trim();
  const isTextOnlyT = !tRaw || tRaw === '-' || tRaw === 'ใช้รางเดิม' || tRaw === 'ไม่เอาราง' || tRaw === 'ไม่รับราง';
  const showU2 = (isTextOnlyT || tRaw.endsWith('หลา') || tRaw.endsWith('ตร.ม.') || tRaw.endsWith('เมตร') || tRaw.endsWith('ชุด')) ? '' : u2;
  return `<div class="calc-row" data-calc-row="${esc(rowKey)}">
    <span class="c-lbl">${esc(t)}</span>
    <span class="fl" data-calc-col="a">${esc(r.a)}</span>
    <span class="c-op">X</span>
    <span class="fl" data-calc-col="b">${esc(r.b)}</span>
    <span class="c-op">=</span>
    <span class="fl" data-calc-col="n">${esc(r.n)}</span>
    <span class="c-unit">${esc(u1)}</span>
    <span class="c-op">=</span>
    <span class="fl" data-calc-col="t">${esc(r.t)}</span>
    <span class="c-unit2">${esc(showU2)}</span>
  </div>`;
}

function buildGroupedBlindCalcRows(w) {
  const pieces = Array.isArray(w.blindPieces) ? w.blindPieces : [];
  if (!pieces.length) return null;
  const style = (w.curtainStyle1 || w.curtainStyle2 || '').trim();
  const blindRule = (typeof masterDB !== 'undefined' && masterDB.blinds || []).find(bl => bl.curtainStyle === style)
    || { minSqm: 1.5, roundMode: 'ceil_1dec' };
  const minSqm = Math.max(1.5, parseFloat(blindRule.minSqm) || 1.5);

  // จัดกลุ่มผืนที่ขนาดความกว้างและความสูงซ้ำกัน เช่น ผืนที่ 2/ผืนที่ 3
  const groups = [];
  const keyMap = new Map();
  pieces.forEach((p, idx) => {
    const pw = String(p && p.w !== undefined ? p.w : '').trim();
    const ph = String(p && p.h !== undefined ? p.h : '').trim();
    const key = (pw || ph) ? `${pw}x${ph}` : `__empty_${idx}`;
    if (pw && ph && keyMap.has(key)) {
      keyMap.get(key).indices.push(idx + 1);
    } else {
      const grp = { w: pw, h: ph, indices: [idx + 1] };
      groups.push(grp);
      if (pw && ph) keyMap.set(key, grp);
    }
  });

  return groups.map((grp, gi) => {
    const lbl = grp.indices.map(n => `ผืนที่ ${n}`).join('/');
    const wn = parseFloat(grp.w) || 0;
    const hn = parseFloat(grp.h) || 0;
    const cnt = grp.indices.length;
    let sqmStr = '';
    if (wn > 0 && hn > 0) {
      const sqmPerPiece = Math.max(minSqm, (wn / 100) * (hn / 100));
      const totalSqm = sqmPerPiece * cnt;
      sqmStr = (typeof applyRoundMode === 'function')
        ? applyRoundMode(totalSqm, blindRule.roundMode || 'ceil_1dec')
        : String(Math.ceil((totalSqm - 1e-9) * 10) / 10);
    }
    return {
      label: lbl,
      row: { a: grp.w, b: grp.h, n: (grp.w || grp.h) ? String(cnt) : '', t: sqmStr },
      key: `blind_${gi}`,
    };
  });
}

function rWinCell(w, n, winIdx = 0) {
  w = w || {};
  const cType = formatCurtainType(w);
  const showHook = curtainNeedsHook(w.curtainStyle1, w.curtainStyle2);
  const hookTxt = showHook ? (w.hookSize || '') : '';
  const boxSizeTxt = w.box === 'yes' ? (w.boxSize || '') : '';
  const ceilAttachTxt = (w.mount === 'wall' && w.wallCeilingAttach)
    ? `ผนังชิดเพดาน${w.wallCeilingNote ? ' (' + w.wallCeilingNote + ')' : ''}`
    : '';
  const numLabel = w.planNo || n;
  const isBlind1 = (typeof isBlindOrRollerStyle === 'function') && isBlindOrRollerStyle(w.curtainStyle1);
  const isBlind2 = (typeof isBlindOrRollerStyle === 'function') && isBlindOrRollerStyle(w.curtainStyle2);

  const railInfo = (typeof computeWindowRailRow === 'function') ? computeWindowRailRow(w) : { countUnit: 'ชั้น', totalUnit: 'เมตร', isNoRail: !!w.noRail };
  const railUnit1 = w.railCountUnit || railInfo.countUnit || ((isBlind1 && !w.curtainStyle2) ? 'ผืน' : 'ชั้น');
  const railUnit2 = w.noRail ? '' : (w.railUnit || railInfo.totalUnit || (isBlind1 ? 'ตร.ม.' : 'เมตร'));

  const lbl1 = (w.rowLabel1 && String(w.rowLabel1).trim()) || 'รางม่าน';
  const lbl2 = (w.rowLabel2 && String(w.rowLabel2).trim()) || 'ผ้าม่านทึบ';
  const lbl3 = (w.rowLabel3 && String(w.rowLabel3).trim()) || 'ผ้าม่านโปร่ง';

  const blindRows = buildGroupedBlindCalcRows(w);
  let calcHtml = '';
  if (blindRows && blindRows.length) {
    calcHtml = blindRows.map(item => rCalc(item.label, item.row, 'ผืน', 'ตร.ม.', item.key)).join('');
  } else {
    calcHtml = `
      ${rCalc(lbl1, w.rail, railUnit1, railUnit2, 'rail')}
      ${rCalc(lbl2, w.blackout, 'ผืน', isBlind1 ? 'ตร.ม.' : 'หลา', 'blackout')}
      ${rCalc(lbl3, w.sheer, 'ผืน', isBlind2 ? 'ตร.ม.' : 'หลา', 'sheer')}
    `;
  }

  return `<div class="wc" data-preview-win="${winIdx}" title="คลิกที่ส่วนใดของจุดที่ ${esc(numLabel)} เพื่อแก้ไขตรงจุดนั้นทันที">
    <div class="r" data-win-part="header"><span class="wn">${esc(numLabel)}</span><span class="wbox">${esc(w.label)}</span>${L('ประเภทม่าน')}${F(cType)}${L('ขนาดตะขอ')}${F(hookTxt, 'w45')}</div>
    <div class="opt-align-row" data-win-part="box">
      <span class="opt-lbl">กล่องม่าน</span>
      <span class="opt-col1">${CB(w.box === 'no', 'No')}</span>
      <span class="opt-col2">${CB(w.box === 'yes', 'Yes')}</span>
      ${F(boxSizeTxt)}
    </div>
    <div class="opt-align-row" data-win-part="mount">
      <span class="opt-lbl">ขาจับราง</span>
      <span class="opt-col1">${CB(w.mount === 'wall', 'ผนัง')}</span>
      <span class="opt-col2">${CB(w.mount === 'ceiling', 'เพดาน')}</span>
      ${ceilAttachTxt ? F(ceilAttachTxt) : '<span class="opt-spacer"></span>'}
    </div>
    <div class="wdiag">${windowSVG(w)}</div>
    <div class="calc-group" data-win-part="calc">
      ${calcHtml}
    </div>
  </div>`;
}

/**
 * Req #2: กล่องข้อความอิสระไม่ต้องแสดงเส้นขอบ/กรอบ
 */
function rNoteBoxes(sheet, sIdx, cIdx) {
  const boxes = (sheet.noteBoxes || []).filter(b => (b.pageChunk || 0) === cIdx);
  return boxes.map((b) => {
    const realIdx = sheet.noteBoxes.indexOf(b);
    return `<div class="float-note-box" data-sidx="${sIdx}" data-bidx="${realIdx}"
      style="left:${b.x ?? 120}px;top:${b.y ?? 80}px;width:${b.w ?? 180}px;height:${b.h ?? 64}px;font-size:${b.fontSize || 11}px">
      <div class="fnb-bar no-print">
        <span class="fnb-drag" title="ลากเพื่อย้ายตำแหน่ง">✥ ย้าย</span>
        <div class="fnb-tools">
          <button type="button" data-fnb-font="-1" title="ลดขนาดตัวอักษร">A-</button>
          <button type="button" data-fnb-font="1" title="เพิ่มขนาดตัวอักษร">A+</button>
          <button type="button" data-fnb-del="1" title="ลบกล่องข้อความนี้">✕</button>
        </div>
      </div>
      <textarea class="fnb-text" placeholder="พิมพ์ข้อความหมายเหตุ...">${esc(b.text || '')}</textarea>
      <div class="fnb-resize no-print" title="ลากเพื่อย่อ-ขยายกรอบ"></div>
    </div>`;
  }).join('');
}

function rWinGrid(list, startNo, sheet, sIdx, cIdx) {
  let h = '';
  for (let k = 0; k < 4; k++) h += rWinCell(list[k], startNo + k + 1, startNo + k);
  return `<div class="s-wins" data-sidx="${sIdx}" data-cidx="${cIdx}">${h}${rNoteBoxes(sheet, sIdx, cIdx)}</div>`;
}

function computePageFabricQtySums(sheet, pageWins) {
  const sums = { blackout: 0, sheer: 0, roller: 0, blinds: 0, other: 0 };
  const f = (sheet && sheet.fabrics) || {};
  const wins = Array.isArray(pageWins) ? pageWins : (sheet && sheet.windows) || [];
  const parseYds = val => (typeof extractYardsFromCalcText === 'function')
    ? extractYardsFromCalcText(val)
    : (() => {
        const s = String(val ?? '').trim();
        if (!s) return 0;
        const part = s.includes('/') ? s.split('/').pop() : s;
        const n = parseFloat(part.replace(/[^\d.-]/g, ''));
        return (!isNaN(n) && Number.isFinite(n)) ? n : 0;
      })();

  const matchColForLayer = (w, layerNo) => {
    const explicitCol = layerNo === 1 ? w.fabricCol1 : w.fabricCol2;
    if (explicitCol && sums[explicitCol] !== undefined) return explicitCol;
    const style = String(layerNo === 1 ? (w.curtainStyle1 || '') : (w.curtainStyle2 || w.curtainStyle1 || ''));
    if (/ม่านม้วน/.test(style)) return 'roller';
    if (/มู่ลี่|ม่านปรับแสง/.test(style)) return 'blinds';
    const fabId = layerNo === 1 ? w.fabricId1 : w.fabricId2;
    if (fabId && typeof masterDB !== 'undefined' && Array.isArray(masterDB.fabrics)) {
      const fabObj = masterDB.fabrics.find(x => x.id === fabId);
      if (fabObj && fabObj.name) {
        for (const ck of ['blackout', 'sheer', 'other', 'roller', 'blinds']) {
          if (f[ck] && String(f[ck].name || '').trim() === String(fabObj.name).trim()) {
            if (!f[ck].design || !fabObj.design || String(f[ck].design).trim() === String(fabObj.design).trim()) {
              return ck;
            }
          }
        }
      }
    }
    return layerNo === 1 ? 'blackout' : 'sheer';
  };

  wins.forEach(w => {
    if (!w) return;
    const y1 = parseYds(w.blackout && w.blackout.t);
    if (y1 > 0) {
      const col1 = matchColForLayer(w, 1);
      if (col1 && sums[col1] !== undefined) {
        if ((f[col1] && String(f[col1].name || '').trim()) || w.fabricCol1 === col1 || col1 === 'roller' || col1 === 'blinds' || col1 === 'blackout') {
          sums[col1] = Math.round((sums[col1] + y1) * 100) / 100;
        }
      }
    }
    const y2 = parseYds(w.sheer && w.sheer.t);
    if (y2 > 0) {
      const col2 = matchColForLayer(w, 2);
      if (col2 && sums[col2] !== undefined) {
        if ((f[col2] && String(f[col2].name || '').trim()) || w.fabricCol2 === col2 || col2 === 'sheer') {
          sums[col2] = Math.round((sums[col2] + y2) * 100) / 100;
        }
      }
    }
  });
  return sums;
}

function rFabric(sheet, pageWins) {
  const f = sheet.fabrics;
  const colKeys = ['blackout', 'sheer', 'roller', 'blinds', 'other'];
  const cols = [f.blackout, f.sheer, f.roller, f.blinds, f.other];
  const sums = computePageFabricQtySums(sheet, pageWins);
  const row = (label, key) => `<tr><th>${label}</th>${cols.map((c, ci) => {
    const ck = colKeys[ci];
    let val = c[key];
    if (key === 'qty') {
      const autoSum = sums[ck];
      if (autoSum > 0 && (!c.manualQty || !String(c.qty || '').trim())) {
        val = String(autoSum);
      } else if (String(val || '').includes('/')) {
        val = String(extractYardsFromCalcText(val) || '');
      }
    }
    return `<td data-fab-col="${ck}" data-fab-field="${key}">${esc(val)}</td>`;
  }).join('')}</tr>`;
  const chkMini = on => `<span class="cb-mini">${on ? '✓' : ''}</span>`;
  return `<table class="s-tb">
    <colgroup>
      <col style="width:112px">
      <col><col><col><col><col>
    </colgroup>
    <thead>
      <tr>
        <th>PRODUCT (สินค้า) :</th>
        <th class="th-split" data-fab-col="blackout">
          <div class="split-box">
            <div>${chkMini(f.blackout.isOpaque)}<span>ทึบ</span></div>
            <div>${chkMini(f.blackout.isSheer)}<span>โปร่ง</span></div>
          </div>
          <div class="split-title">CURTAIN<br>ผ้าม่านทึบ</div>
        </th>
        <th class="th-split" data-fab-col="sheer">
          <div class="split-box">
            <div>${chkMini(f.sheer.isOpaque)}<span>ทึบ</span></div>
            <div>${chkMini(f.sheer.isSheer)}<span>โปร่ง</span></div>
          </div>
          <div class="split-title">SHEER<br>ผ้าม่านโปร่ง</div>
        </th>
        <th data-fab-col="roller">ROLLER BLINDS<br>ม่านม้วน</th>
        <th data-fab-col="blinds">BAMBOO BLINDS<br>มู่ลี่</th>
        <th data-fab-col="other">OTHER<br>${esc(f.other.label || 'อื่นๆ')}</th>
      </tr>
    </thead>
    <tbody>
      ${row('CS DES. (ผ้า) :', 'name')}
      ${row('DES.NO. (ดีไซน์) :', 'design')}
      ${row('COLOUR (สี) :', 'color')}
      ${row('QTY. (จำนวนหลา) :', 'qty')}
    </tbody>
  </table>`;
}

function rDrawCol(title, d) {
  const it = (k, label) => `<div class="r"><span class="dw-lbl">${CB(d[k].on, label)}</span>${F(d[k].qty)}${L('อัน')}</div>`;
  return `<div class="draw-col"><div class="colh">${title}</div>
    ${it('wood', 'ลายไม้')}
    ${it('alu', 'อลูมิเนียม')}
    ${it('acrylic', 'อะคริลิค')}
    <div class="r">${CB(d.other.on, '')}${F(d.other.name)}${F(d.other.qty, 'w30')}${L('อัน')}</div>
    <div class="r" style="padding-left:14px">${L('ขนาด')}&nbsp;${CB(d.size120, '120 cm.')}</div>
    <div class="r" style="padding-left:40px">${CB(!!d.sizeCustom, '')}${F(d.sizeCustom)}${L('cm.')}</div>
  </div>`;
}

function rGrommet(title, g, colors) {
  return `<div class="grom-blk"><div class="gtitle">${title}</div>
    <div class="r">${colors.map(([k, l]) => CB(g[k], l)).join('')}</div>
    <div class="r">${CB(g.other, 'อื่นๆ')}${F(g.otherText)}</div></div>`;
}

function rRods(sheet) {
  const r = sheet.rods, h = r.hold;
  // Req #8: ใช้ vTextSVG วาดตัวอักษรแนวตั้ง ("แบบ", "สี", "ห่วงตาไก่") เพื่อไม่ให้เพี้ยนเป็นแนวนอนตอน Export PDF
  return `<table class="s-rod">
    <colgroup>
      <col style="width:112px">
      <col style="width:392px">
      <col>
    </colgroup>
    <tbody>
      <tr data-rod-part="rodType">
        <td class="hcell">ROD TYPE<br>ประเภทรางม่าน<br>${CB(r.typeNo, 'NO')}</td>
        <td colspan="2">
          <div class="rod-top-grid">
            <div>
              <div class="r">${L('รางม่านจีบ')}${F(r.pleat.model)}${L('สี')}${F(r.pleat.color, 'w80')}</div>
              <div class="r">${L('รางโชว์')}${F(r.show.model)}${L('สี')}${F(r.show.color, 'w65')}${L('หัวปิดราง')}${F(r.show.cap, 'w70')}</div>
            </div>
            <div>
              <div class="r">${L('รางม่านลอน')}${F(r.wave.model)}${L('สี')}${F(r.wave.color, 'w80')}</div>
              <div class="r">${L('รางม่านพับ')}${F(r.fold.model)}${L('สี')}${F(r.fold.color, 'w80')}</div>
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td class="hcell" data-rod-part="holdBack">HOLD BACK :<br>ตะขอเกี่ยวสายรวบ<br>${CB(r.holdNo, 'NO')}</td>
        <td data-rod-part="holdBack">
          <div class="hold-grid">
            ${vTextSVG('แบบ', 18, 34)}
            <div>
              <div class="r">${CB(r.holdStd, 'มาตรฐาน')}</div>
              <div class="r">${CB(r.holdCrystal, 'คริสตัล')}</div>
            </div>
            ${vTextSVG('สี', 18, 34)}
            <div>
              <div class="r"><span class="hlbl">${CB(h.silver.on, 'เงิน')}</span>${F(h.silver.qty)}${L('อัน')}</div>
              <div class="r"><span class="hlbl">${CB(h.black.on, 'ดำ')}</span>${F(h.black.qty)}${L('อัน')}</div>
            </div>
            <div>
              <div class="r"><span class="hlbl2">${CB(h.brass.on, 'ทองเหลือง')}</span>${F(h.brass.qty)}${L('อัน')}</div>
              <div class="r"><span class="hlbl2">${CB(h.copper.on, 'ทองแดง')}</span>${F(h.copper.qty)}${L('อัน')}</div>
            </div>
          </div>
        </td>
        <td rowspan="2" class="grom-td" data-rod-part="grommet">
          <div class="grom-wrap">
            ${vTextSVG('ห่วงตาไก่', 18, 136)}
            <div class="grom-list">
              ${rGrommet('แบบเรียบ', r.grommet.flat, [['silver', 'สีเงิน'], ['brass', 'ทองเหลือง'], ['copper', 'ทองแดง']])}
              ${rGrommet('แบบลอน', r.grommet.wave, [['brass', 'ทองเหลือง'], ['copper', 'ทองแดง']])}
              ${rGrommet('แบบคลื่น', r.grommet.ripple, [['brass', 'ทองเหลือง'], ['copper', 'ทองแดง']])}
            </div>
          </div>
        </td>
      </tr>
      <tr data-rod-part="drawRod">
        <td class="hcell">DRAW-ROD :<br>ก้านจูง<br>${CB(r.drawNo, 'NO')}</td>
        <td class="draw-td">
          <div class="draw-grid">${rDrawCol('ผ้าม่านทึบ', r.drawBlackout)}${rDrawCol('ผ้าม่านโปร่ง', r.drawSheer)}</div>
        </td>
      </tr>
    </tbody>
  </table>`;
}

function rSign(order) {
  const g = order.sign;
  const col = (key, name, label, date) => `<div class="sign-col" data-sign-part="${key}">
    <div class="r"><span class="lb">${label}</span>${F(name)}</div>
    <div class="r"><span class="lb">DATE (วันที่)</span>${F(fmtDate(date))}</div>
  </div>`;
  return `<div class="s-sign">
    ${col('requester', g.requester || order.staff.name, 'Request Name (ชื่อผู้ขอ) :', g.requesterDate)}
    ${col('customer', g.customer || order.customer.name, 'CUSTOMER NAME (ชื่อลูกค้า)', g.customerDate)}
    ${col('installer', g.installer, 'CURTAIN INSTALLER (ชื่อช่างติดตั้ง)', g.installerDate)}
    ${col('cs', g.cs, 'C.S. NAME (ชื่อผู้ทำใบเสนอราคา)', g.csDate)}
  </div>`;
}

/* =========================================================
   Special Pages: แปลนงานม่านจั่ว (5 รูปแบบตามไฟล์แนบ) & แปลนงานผ้าม่านเย็บต่อด้านข้าง
   ========================================================= */
function gableDiagramSVG(w) {
  const g = (w && w.gable) || {};
  const gType = String(g.type || '1');
  const deduct = parseFloat(g.heightDeduct) || 0;
  const calcReducedH = (fullVal, customReducedVal) => {
    if (customReducedVal !== undefined && String(customReducedVal).trim() !== '') return String(customReducedVal).trim();
    const fv = parseFloat(fullVal);
    if (isNaN(fv) || fv <= 0) return '';
    return String(Math.max(0, Math.round((fv - deduct) * 100) / 100));
  };

  const hA = calcReducedH(g.fullA, g.redA);
  const hB = calcReducedH(g.fullB, g.redB);
  const hC = calcReducedH(g.fullC, g.redC);
  const wL = String(g.widthLeft || w.splitLeft || '').trim();
  const wR = String(g.widthRight || w.splitRight || '').trim();
  const wTotal = String(g.widthTotal || w.width || '').trim();

  const drawVertDim = (x, yTop, yBot, letter, valText, fieldKey) => {
    const midY = Math.round((yTop + yBot) / 2);
    const boxW = 68, boxH = 30;
    return `
      <g class="svg-hit" data-gable-field="${esc(fieldKey)}" style="cursor:pointer">
        <text x="${x}" y="${yTop - 8}" text-anchor="middle" font-size="14" font-weight="700" fill="#000">${esc(letter)}</text>
        <line x1="${x - 16}" y1="${yTop}" x2="${x + 16}" y2="${yTop}" stroke="#000" stroke-width="1.4"/>
        <line x1="${x}" y1="${yTop}" x2="${x}" y2="${midY - boxH / 2}" stroke="#000" stroke-width="1.3"/>
        <line x1="${x}" y1="${midY + boxH / 2}" x2="${x}" y2="${yBot}" stroke="#000" stroke-width="1.3"/>
        <line x1="${x - 16}" y1="${yBot}" x2="${x + 16}" y2="${yBot}" stroke="#000" stroke-width="1.4"/>
        <rect x="${Math.round(x - boxW / 2)}" y="${Math.round(midY - boxH / 2)}" width="${boxW}" height="${boxH}" fill="#fff" stroke="#bbb" stroke-width="0.9"/>
        <line x1="${Math.round(x - boxW / 2)}" y1="${Math.round(midY + boxH / 2)}" x2="${Math.round(x + boxW / 2)}" y2="${Math.round(midY + boxH / 2)}" stroke="#000" stroke-width="1.3"/>
        <text x="${x}" y="${midY + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#000">${esc(valText)}</text>
      </g>
    `;
  };

  const drawHorizDimBox = (x0, x1, y, valText, fieldKey) => {
    const midX = Math.round((x0 + x1) / 2);
    const boxW = 68, boxH = 30;
    return `
      <g class="svg-hit" data-gable-field="${esc(fieldKey)}" style="cursor:pointer">
        <line x1="${x0}" y1="${y}" x2="${midX - boxW / 2}" y2="${y}" stroke="#000" stroke-width="1.3"/>
        <line x1="${midX + boxW / 2}" y1="${y}" x2="${x1}" y2="${y}" stroke="#000" stroke-width="1.3"/>
        <rect x="${Math.round(midX - boxW / 2)}" y="${Math.round(y - boxH / 2)}" width="${boxW}" height="${boxH}" fill="#fff" stroke="#bbb" stroke-width="0.9"/>
        <line x1="${Math.round(midX - boxW / 2)}" y1="${Math.round(y + boxH / 2)}" x2="${Math.round(midX + boxW / 2)}" y2="${Math.round(y + boxH / 2)}" stroke="#000" stroke-width="1.3"/>
        <text x="${midX}" y="${y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#000">${esc(valText)}</text>
      </g>
    `;
  };

  let svgBody = '';
  let polyPoints = '';
  const xL = 160, xM = 350, xR = 540;
  const yPeak = 38, yEave = 148, yBot = 285, yDimW = 324;
  const yMidSlope = Math.round((yPeak + yEave) / 2); // 93

  if (gType === '1') {
    // แบบที่ 1: จั่วสามเหลี่ยมสมมาตร แบ่งซ้าย-ขวา (A, B, C)
    polyPoints = `${xL},${yEave} ${xM},${yPeak} ${xR},${yEave} ${xR},${yBot} ${xL},${yBot}`;
    svgBody = `
      <polygon points="${polyPoints}" fill="none" stroke="#000" stroke-width="1.4"/>
      <line x1="${xL}" y1="${yEave}" x2="${xR}" y2="${yEave}" stroke="#000" stroke-width="1.3"/>
      <line x1="${xM}" y1="${yPeak}" x2="${xM}" y2="${yBot}" stroke="#000" stroke-width="1.3"/>
      ${drawVertDim(106, yEave, yBot, 'A', hA, 'fullA')}
      ${drawVertDim(398, yPeak, yBot, 'B', hB, 'fullB')}
      ${drawVertDim(594, yEave, yBot, 'C', hC, 'fullC')}
      <line x1="${xL}" y1="${yDimW - 15}" x2="${xL}" y2="${yDimW + 15}" stroke="#000" stroke-width="1.4"/>
      <line x1="${xM}" y1="${yDimW - 15}" x2="${xM}" y2="${yDimW + 15}" stroke="#000" stroke-width="1.4"/>
      <line x1="${xR}" y1="${yDimW - 15}" x2="${xR}" y2="${yDimW + 15}" stroke="#000" stroke-width="1.4"/>
      ${drawHorizDimBox(xL, xM, yDimW, wL, 'widthLeft')}
      ${drawHorizDimBox(xM, xR, yDimW, wR, 'widthRight')}
    `;
  } else if (gType === '2') {
    // แบบที่ 2: จั่วเฉียงลาดลงขวา แบ่งซ้าย-ขวา (สูงซ้าย A → กลาง B → ขวา C)
    polyPoints = `${xL},${yPeak} ${xR},${yEave} ${xR},${yBot} ${xL},${yBot}`;
    svgBody = `
      <polygon points="${polyPoints}" fill="none" stroke="#000" stroke-width="1.4"/>
      <line x1="${xL}" y1="${yEave}" x2="${xR}" y2="${yEave}" stroke="#000" stroke-width="1.3"/>
      <line x1="${xM}" y1="${yMidSlope}" x2="${xM}" y2="${yBot}" stroke="#000" stroke-width="1.3"/>
      ${drawVertDim(106, yPeak, yBot, 'A', hA, 'fullA')}
      ${drawVertDim(398, yMidSlope, yBot, 'B', hB, 'fullB')}
      ${drawVertDim(594, yEave, yBot, 'C', hC, 'fullC')}
      <line x1="${xL}" y1="${yDimW - 15}" x2="${xL}" y2="${yDimW + 15}" stroke="#000" stroke-width="1.4"/>
      <line x1="${xM}" y1="${yDimW - 15}" x2="${xM}" y2="${yDimW + 15}" stroke="#000" stroke-width="1.4"/>
      <line x1="${xR}" y1="${yDimW - 15}" x2="${xR}" y2="${yDimW + 15}" stroke="#000" stroke-width="1.4"/>
      ${drawHorizDimBox(xL, xM, yDimW, wL, 'widthLeft')}
      ${drawHorizDimBox(xM, xR, yDimW, wR, 'widthRight')}
    `;
  } else if (gType === '3') {
    // แบบที่ 3: จั่วเฉียงลาดลงขวา ช่วงเดียว (สูงซ้าย A → ขวา B, กว้างรวม)
    polyPoints = `${xL},${yPeak} ${xR},${yEave} ${xR},${yBot} ${xL},${yBot}`;
    svgBody = `
      <polygon points="${polyPoints}" fill="none" stroke="#000" stroke-width="1.4"/>
      <line x1="${xL}" y1="${yEave}" x2="${xR}" y2="${yEave}" stroke="#000" stroke-width="1.3"/>
      ${drawVertDim(106, yPeak, yBot, 'A', hA, 'fullA')}
      ${drawVertDim(594, yEave, yBot, 'B', hB, 'fullB')}
      <line x1="${xL}" y1="${yDimW - 15}" x2="${xL}" y2="${yDimW + 15}" stroke="#000" stroke-width="1.4"/>
      <line x1="${xR}" y1="${yDimW - 15}" x2="${xR}" y2="${yDimW + 15}" stroke="#000" stroke-width="1.4"/>
      ${drawHorizDimBox(xL, xR, yDimW, wTotal, 'widthTotal')}
    `;
  } else if (gType === '4') {
    // แบบที่ 4: จั่วเฉียงลาดขึ้นขวา แบ่งซ้าย-ขวา (ซ้าย A → กลาง B → สูงขวา C)
    polyPoints = `${xL},${yEave} ${xR},${yPeak} ${xR},${yBot} ${xL},${yBot}`;
    svgBody = `
      <polygon points="${polyPoints}" fill="none" stroke="#000" stroke-width="1.4"/>
      <line x1="${xL}" y1="${yEave}" x2="${xR}" y2="${yEave}" stroke="#000" stroke-width="1.3"/>
      <line x1="${xM}" y1="${yMidSlope}" x2="${xM}" y2="${yBot}" stroke="#000" stroke-width="1.3"/>
      ${drawVertDim(106, yEave, yBot, 'A', hA, 'fullA')}
      ${drawVertDim(398, yMidSlope, yBot, 'B', hB, 'fullB')}
      ${drawVertDim(594, yPeak, yBot, 'C', hC, 'fullC')}
      <line x1="${xL}" y1="${yDimW - 15}" x2="${xL}" y2="${yDimW + 15}" stroke="#000" stroke-width="1.4"/>
      <line x1="${xM}" y1="${yDimW - 15}" x2="${xM}" y2="${yDimW + 15}" stroke="#000" stroke-width="1.4"/>
      <line x1="${xR}" y1="${yDimW - 15}" x2="${xR}" y2="${yDimW + 15}" stroke="#000" stroke-width="1.4"/>
      ${drawHorizDimBox(xL, xM, yDimW, wL, 'widthLeft')}
      ${drawHorizDimBox(xM, xR, yDimW, wR, 'widthRight')}
    `;
  } else {
    // แบบที่ 5: จั่วเฉียงลาดขึ้นขวา ช่วงเดียว (ซ้าย A → สูงขวา B, กว้างรวม)
    polyPoints = `${xL},${yEave} ${xR},${yPeak} ${xR},${yBot} ${xL},${yBot}`;
    svgBody = `
      <polygon points="${polyPoints}" fill="none" stroke="#000" stroke-width="1.4"/>
      <line x1="${xL}" y1="${yEave}" x2="${xR}" y2="${yEave}" stroke="#000" stroke-width="1.3"/>
      ${drawVertDim(106, yEave, yBot, 'A', hA, 'fullA')}
      ${drawVertDim(594, yPeak, yBot, 'B', hB, 'fullB')}
      <line x1="${xL}" y1="${yDimW - 15}" x2="${xL}" y2="${yDimW + 15}" stroke="#000" stroke-width="1.4"/>
      <line x1="${xR}" y1="${yDimW - 15}" x2="${xR}" y2="${yDimW + 15}" stroke="#000" stroke-width="1.4"/>
      ${drawHorizDimBox(xL, xR, yDimW, wTotal, 'widthTotal')}
    `;
  }

  // หน้ากากแสดงการใช้งานผ้าม่านบนแปลนงานม่านจั่ว (ดึงข้อมูลจากแปลนงานหลัก w.layers มาแสดง)
  const clipId = `gableClip_${String(w.planNo || 'x').replace(/\W/g, '')}_${gType}`;
  const isRollerWindow = /ม่านม้วน/.test(String(w.curtainStyle1 || '')) || /ม่านม้วน/.test(String(w.curtainStyle2 || ''));
  const gableSurfaces = {
    center: [{ x: xL, y: yPeak }, { x: xR, y: yPeak }, { x: xR, y: yBot }, { x: xL, y: yBot }],
    leftWing: null,
    rightWing: null,
  };
  const maskSvg = renderAllCurtainLayers(w.layers, gableSurfaces, 2, isRollerWindow, 0.5);
  const clippedMask = maskSvg
    ? `<defs><clipPath id="${clipId}"><polygon points="${polyPoints}"/></clipPath></defs><g clip-path="url(#${clipId})">${maskSvg}</g>`
    : '';

  return `<svg viewBox="0 0 700 355" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-height:365px;display:block;margin:0 auto">${clippedMask}${svgBody}</svg>`;
}

function rGableSpecialPage(order, sheet, w, sIdx, wIdx, pageNo, totalPages) {
  const g = (w && w.gable) || {};
  const gType = String(g.type || '1');
  const isSingleSpan = gType === '3' || gType === '5';
  const roomName = (sheet && sheet.room && String(sheet.room.name || '').trim()) || '';
  const autoTitle = [roomName, String(w.label || '').trim()].filter(Boolean).join(' ');
  const titleLabel = g.title || autoTitle || ('จุดที่ ' + (w.planNo || (wIdx + 1)));

  const clearanceLabelMap = { float: 'ลอยจากพื้น', puddle: 'กองพื้น', touch: 'พอดีพื้น' };
  const clearanceText = clearanceLabelMap[g.hemClearanceType || 'float'] || 'ลอยจากพื้น';
  const clearanceVal = (g.hemClearanceVal !== undefined && String(g.hemClearanceVal).trim() !== '')
    ? String(g.hemClearanceVal).trim()
    : (g.noteDeduct || '');

  const rowLine = (lbl, rowObj, unitTxt) => {
    const r = rowObj || {};
    return `
      <div class="gable-calc-row">
        <span class="gc-lbl">${lbl}</span>
        <span class="gc-val">${esc(r.a || '')}</span>
        <span class="gc-op">x</span>
        <span class="gc-val">${esc(r.b || '')}</span>
        <span class="gc-op">=</span>
        <span class="gc-val">${esc(r.n || '')}</span>
        <span class="gc-unit">${unitTxt}</span>
      </div>
    `;
  };

  const fBo = sheet && sheet.fabrics && sheet.fabrics.blackout ? sheet.fabrics.blackout : {};
  const fSh = sheet && sheet.fabrics && sheet.fabrics.sheer ? sheet.fabrics.sheer : {};
  const boName = g.boName || fBo.name || '';
  const boDesign = g.boDesign || fBo.design || '';
  const boColor = g.boColor || fBo.color || '';
  const boQty = g.boQty || (w.blackout && w.blackout.t ? String(extractYardsFromCalcText(w.blackout.t) || w.blackout.t) : '');

  const shName = g.shName || fSh.name || '';
  const shDesign = g.shDesign || fSh.design || '';
  const shColor = g.shColor || fSh.color || '';
  const shQty = g.shQty || (w.sheer && w.sheer.t ? String(extractYardsFromCalcText(w.sheer.t) || w.sheer.t) : '');

  return `
    <div class="gable-page-wrap" data-special-win="${wIdx}" title="คลิกเพื่อแก้ไขข้อมูลแปลนงานม่านจั่ว">
      <div class="gable-top-meta">แผ่นที่ ${pageNo}/${totalPages} • อ้างอิงจุดที่ ${esc(w.planNo || (wIdx + 1))} (${esc(w.label || '-')})</div>
      <div class="gable-title">แปลนงานม่านจั่ว <span class="gable-title-line">${esc(titleLabel)}</span></div>
      <div class="gable-svg-box">${gableDiagramSVG(w)}</div>

      <div class="gable-calc-section">
        <div class="gable-calc-group">
          ${rowLine('รางม่าน (ซ้าย)', g.railLeft, 'ชั้น')}
          ${rowLine('ผ้าม่านทึบ (ซ้าย)', g.boLeft, 'ผืน')}
          ${rowLine('ผ้าม่านโปร่ง (ซ้าย)', g.shLeft, 'ผืน')}
        </div>
        <div class="gable-calc-group" style="margin-top:16px">
          ${rowLine('รางม่าน (ขวา)', g.railRight, 'ชั้น')}
          ${rowLine('ผ้าม่านทึบ (ขวา)', g.boRight, 'ผืน')}
          ${rowLine('ผ้าม่านโปร่ง (ขวา)', g.shRight, 'ผืน')}
        </div>
      </div>

      <table class="gable-prod-tbl">
        <colgroup>
          <col style="width:26%">
          <col style="width:37%">
          <col style="width:37%">
        </colgroup>
        <thead>
          <tr>
            <th>สินค้า</th>
            <th>ผ้าม่านทึบ</th>
            <th>ผ้าม่านโปร่ง</th>
          </tr>
        </thead>
        <tbody>
          <tr><th>ผ้า</th><td>${esc(boName)}</td><td>${esc(shName)}</td></tr>
          <tr><th>ดีไซน์</th><td>${esc(boDesign)}</td><td>${esc(shDesign)}</td></tr>
          <tr><th>สี</th><td>${esc(boColor)}</td><td>${esc(shColor)}</td></tr>
          <tr><th>จำนวน</th><td>${esc(boQty)}</td><td>${esc(shQty)}</td></tr>
        </tbody>
      </table>

      <div class="gable-note-line">
        <span>หมายเหตุ (สูงเต็ม) :</span>
        <span>[A] <span class="gn-fill">${esc(g.fullA || '')}</span></span>
        <span>[B] <span class="gn-fill">${esc(g.fullB || '')}</span></span>
        ${!isSingleSpan ? `<span>[C] <span class="gn-fill">${esc(g.fullC || '')}</span></span>` : ''}
        <span style="margin-left:18px">ระยะชายม่าน: <b>${esc(clearanceText)}</b> <span class="gn-fill gn-wide">${esc(clearanceVal)}</span> ซม.</span>
      </div>
    </div>
  `;
}

function rSideJoinSpecialPage(order, sheet, w, sIdx, wIdx, pageNo, totalPages) {
  const sj = (w && w.sideJoin) || {};
  const sjType = sj.type || 'both_sides';
  const titleLabel = sj.title || `${w.label || ('จุดที่ ' + (w.planNo || (wIdx + 1)))}${sheet.room && sheet.room.name ? ' (' + sheet.room.name + ')' : ''}`;
  const mainW = sj.mainWidth || (w.blackout && w.blackout.a) || w.width || '';
  const borderW = sj.borderWidth || '30';
  const curtainH = sj.height || (w.blackout && w.blackout.b) || w.height || '';

  return `
    <div class="gable-page-wrap" data-special-win="${wIdx}" title="คลิกเพื่อแก้ไขข้อมูลผ้าม่านเย็บต่อด้านข้าง / รายการพิเศษ">
      <div class="gable-top-meta">แผ่นที่ ${pageNo}/${totalPages} • อ้างอิงจุดที่ ${esc(w.planNo || (wIdx + 1))} (${esc(w.label || '-')})</div>
      <div class="gable-title">แปลนงานผ้าม่านเย็บต่อด้านข้าง <span class="gable-title-line">${esc(titleLabel)}</span></div>

      <div class="gable-svg-box">
        <svg viewBox="0 0 700 320" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-height:320px;display:block;margin:0 auto">
          <!-- กรอบผืนซ้าย และ ผืนขวา พร้อมแถบเย็บต่อด้านข้าง -->
          <rect x="130" y="36" width="205" height="220" fill="#fff" stroke="#000" stroke-width="1.5"/>
          <rect x="365" y="36" width="205" height="220" fill="#fff" stroke="#000" stroke-width="1.5"/>
          ${(sjType === 'both_sides' || sjType === 'outer_side') ? `
            <rect x="130" y="36" width="44" height="220" fill="#e6ecf5" stroke="#000" stroke-width="1.2"/>
            <rect x="526" y="36" width="44" height="220" fill="#e6ecf5" stroke="#000" stroke-width="1.2"/>
          ` : ''}
          ${(sjType === 'both_sides' || sjType === 'inner_side') ? `
            <rect x="291" y="36" width="44" height="220" fill="#e6ecf5" stroke="#000" stroke-width="1.2"/>
            <rect x="365" y="36" width="44" height="220" fill="#e6ecf5" stroke="#000" stroke-width="1.2"/>
          ` : ''}
          ${sjType === 'bottom_border' ? `
            <rect x="130" y="212" width="205" height="44" fill="#e6ecf5" stroke="#000" stroke-width="1.2"/>
            <rect x="365" y="212" width="205" height="44" fill="#e6ecf5" stroke="#000" stroke-width="1.2"/>
          ` : ''}
          <text x="232" y="142" text-anchor="middle" font-size="13" font-weight="700" fill="#000">ผ้าหลัก (ซ้าย)</text>
          <text x="467" y="142" text-anchor="middle" font-size="13" font-weight="700" fill="#000">ผ้าหลัก (ขวา)</text>
          <text x="232" y="164" text-anchor="middle" font-size="12" fill="#333">กว้าง ${esc(mainW)} ซม.</text>
          <text x="467" y="164" text-anchor="middle" font-size="12" fill="#333">แถบต่อ ${esc(borderW)} ซม.</text>
          <!-- เส้นบอกความสูงด้านขวา -->
          <line x1="605" y1="36" x2="605" y2="256" stroke="#000" stroke-width="1.3"/>
          <line x1="590" y1="36" x2="620" y2="36" stroke="#000" stroke-width="1.3"/>
          <line x1="590" y1="256" x2="620" y2="256" stroke="#000" stroke-width="1.3"/>
          <rect x="572" y="131" width="66" height="28" fill="#fff" stroke="#000" stroke-width="1"/>
          <text x="605" y="150" text-anchor="middle" font-size="13" font-weight="700">${esc(curtainH)}</text>
          <!-- เส้นบอกความกว้างด้านล่าง -->
          <line x1="130" y1="286" x2="570" y2="286" stroke="#000" stroke-width="1.3"/>
          <line x1="130" y1="274" x2="130" y2="298" stroke="#000" stroke-width="1.3"/>
          <line x1="570" y1="274" x2="570" y2="298" stroke="#000" stroke-width="1.3"/>
          <rect x="290" y="272" width="120" height="28" fill="#fff" stroke="#000" stroke-width="1"/>
          <text x="350" y="291" text-anchor="middle" font-size="13" font-weight="700">${esc(w.rail && w.rail.a ? w.rail.a : mainW)}</text>
        </svg>
      </div>

      <table class="gable-prod-tbl" style="margin-top:18px">
        <colgroup>
          <col style="width:26%">
          <col style="width:37%">
          <col style="width:37%">
        </colgroup>
        <thead>
          <tr>
            <th>รายการ</th>
            <th>ผ้าหลัก</th>
            <th>ผ้าที่เย็บต่อด้านข้าง / ขอบ</th>
          </tr>
        </thead>
        <tbody>
          <tr><th>ชื่อผ้า</th><td>${esc(sj.mainFabName || (sheet.fabrics && sheet.fabrics.blackout && sheet.fabrics.blackout.name) || '')}</td><td>${esc(sj.joinFabName || (sheet.fabrics && sheet.fabrics.other && sheet.fabrics.other.name) || '')}</td></tr>
          <tr><th>ดีไซน์</th><td>${esc(sj.mainDesign || (sheet.fabrics && sheet.fabrics.blackout && sheet.fabrics.blackout.design) || '')}</td><td>${esc(sj.joinDesign || (sheet.fabrics && sheet.fabrics.other && sheet.fabrics.other.design) || '')}</td></tr>
          <tr><th>สี</th><td>${esc(sj.mainColor || (sheet.fabrics && sheet.fabrics.blackout && sheet.fabrics.blackout.color) || '')}</td><td>${esc(sj.joinColor || (sheet.fabrics && sheet.fabrics.other && sheet.fabrics.other.color) || '')}</td></tr>
          <tr><th>ขนาด / ความกว้างที่ต่อ</th><td>${esc(mainW)} ซม. × สูง ${esc(curtainH)} ซม.</td><td>กว้างแถบต่อ ${esc(borderW)} ซม. × สูง ${esc(curtainH)} ซม.</td></tr>
          <tr><th>จำนวนหลาที่ใช้</th><td>${esc(sj.mainQty || (w.blackout && w.blackout.t ? String(extractYardsFromCalcText(w.blackout.t)) : ''))}</td><td>${esc(sj.joinQty || '')}</td></tr>
        </tbody>
      </table>

      <div class="gable-note-line" style="margin-top:20px">
        <span>รายละเอียดการเย็บต่อพิเศษ :</span>
        <span class="gn-fill" style="min-width:420px;text-align:left;padding:0 8px">${esc(sj.note || '')}</span>
      </div>
    </div>
  `;
}

/* =========================================================
   Build all A4 pages for an Order
   ========================================================= */
function expandOrderPages(order) {
  const pages = [];
  (order.sheets || []).forEach((sheet, sIdx) => {
    const wins = sheet.windows || [];
    const chunks = [];
    for (let i = 0; i < Math.max(1, wins.length); i += 4) {
      chunks.push({ wins: wins.slice(i, i + 4), startNo: i });
    }
    chunks.forEach((ch, cIdx) => {
      pages.push({ pageType: 'standard', sheet, sIdx, cIdx, wins: ch.wins, startNo: ch.startNo });
      // หากมีรายการพิเศษ (เช่น ม่านจั่ว หรือ ผ้าม่านเย็บต่อด้านข้าง) ให้สร้างหน้าถัดไปแยกต่างหากสำหรับรายการพิเศษนั้นๆ ทันที
      ch.wins.forEach((w, localIdx) => {
        if (w && (w.specialType === 'gable' || w.specialType === 'side_join')) {
          pages.push({
            pageType: w.specialType,
            sheet,
            sIdx,
            cIdx,
            wIdx: ch.startNo + localIdx,
            win: w,
          });
        }
      });
    });
  });
  return pages;
}

function renderOrderPages(order) {
  const pages = expandOrderPages(order);
  const total = pages.length;
  return pages.map((p, idx) => {
    const pageNo = idx + 1;
    if (p.pageType === 'gable') {
      const body = rGableSpecialPage(order, p.sheet, p.win, p.sIdx, p.wIdx, pageNo, total);
      return `<div class="page page-special" data-page-idx="${idx}" data-sheet-idx="${p.sIdx}" data-chunk-idx="${p.cIdx}" data-special-widx="${p.wIdx}">${body}</div>`;
    }
    if (p.pageType === 'side_join') {
      const body = rSideJoinSpecialPage(order, p.sheet, p.win, p.sIdx, p.wIdx, pageNo, total);
      return `<div class="page page-special" data-page-idx="${idx}" data-sheet-idx="${p.sIdx}" data-chunk-idx="${p.cIdx}" data-special-widx="${p.wIdx}">${body}</div>`;
    }
    const body =
      rHeader(order) +
      rCustomer(order, pageNo, total) +
      rMap(p.sheet) +
      rWinGrid(p.wins, p.startNo, p.sheet, p.sIdx, p.cIdx) +
      rFabric(p.sheet, p.wins) +
      rRods(p.sheet) +
      rSign(order);
    return `<div class="page" data-page-idx="${idx}" data-sheet-idx="${p.sIdx}" data-chunk-idx="${p.cIdx}">${body}</div>`;
  }).join('');
}

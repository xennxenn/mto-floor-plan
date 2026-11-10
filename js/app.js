/* =========================================================
   App – v3:
   - Req #1 & #10: Top-most navigation bar with "👤 ข้อมูลลูกค้า/พนักงาน" tab + Room sheet tabs + Left/Right arrows,
     and section header bar to jump/filter sections inside each room sheet
   - Req #6 & #7.16: Updated dimension labels (6.1–6.12) + per-dimension remark fields linked to Master DB
   - Req #9: Pull/select points from room plan in order
   - Req #12: Draggable & resizable floating text boxes on the window/door section (top layer)
   - Req #13: Preview modes: Fit Page, Fit Width, Single Page vs All Pages
   ========================================================= */
const ORDERS_STORAGE_KEY = 'mto-orders-list-v2';
const LEGACY_STORAGE_KEY = 'mto-order-form-v1';
const LOCAL_AUTH_KEY = 'mto-local-auth-session-v1';

const calcRow = () => ({ a: '', b: '', n: '', t: '' });

function newWindow(planNo = '') {
  return {
    planNo: String(planNo || ''),
    label: '',
    curtainStyle1: '',
    curtainStyle2: '',
    curtainType: '',
    rodType: '',
    hookSize: '',
    widthFormulaId1: '',
    heightFormulaId1: '',
    widthFormulaId2: '',
    heightFormulaId2: '',
    box: '',
    boxSize: '',
    mount: '',
    wallCeilingAttach: false,
    wallCeilingNote: '',
    cornerShape: '1',
    paneStyle: '2',
    drop: '',
    // Req #6.1 - #6.12 + #7.16 (หมายเหตุกำกับแต่ละตำแหน่ง)
    width: '',  noteWidth: '',   // 6.1 ความกว้าง
    height: '', noteHeight: '',  // 6.2 ความสูง
    wallL: '',  noteWallL: '',   // 6.3 พื้นที่ด้านซ้าย
    wallR: '',  noteWallR: '',   // 6.4 พื้นที่ด้านขวา
    ceilT: '',  noteCeilT: '',   // 6.5 พื้นที่ด้านบน
    floorB: '', noteFloorB: '',  // 6.6 พื้นที่ด้านล่าง
    fullW: '',  noteFullW: '',   // 6.7 ความกว้างเต็ม
    fullH: '',  noteFullH: '',   // 6.8 ความสูงเต็ม
    extL: '',   noteExtL: '',    // 6.9 เผื่อด้านซ้าย
    extR: '',   noteExtR: '',    // 6.10 เผื่อด้านขวา
    extT: '',   noteExtT: '',    // 6.11 เผื่อด้านบน
    extB: '',   noteExtB: '',    // 6.12 เผื่อด้านล่าง
    layers: [
      { op: '', target: 'all', label: '' },
    ],
    rail: calcRow(),
    blackout: calcRow(),
    sheer: calcRow(),
  };
}

const fab = () => ({ isOpaque: false, isSheer: false, name: '', design: '', color: '', qty: '' });
const qty = () => ({ on: false, qty: '' });
const drawSet = () => ({
  wood: qty(), alu: qty(), acrylic: qty(),
  other: { on: false, name: '', qty: '' },
  size120: false, sizeCustom: '',
});

function newSheet(index = 1) {
  return {
    id: 'sh_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    title: `แผ่นที่ ${index}`,
    room: { name: '', aircon: '', grille: '', screen: '', refNo: '', promo: '' },
    plan: {
      items: [
        { type: 'rect', x1: 160, y1: 80, x2: 640, y2: 420 },
      ],
    },
    notes: [''],
    windows: [newWindow(1), newWindow(2), newWindow(3), newWindow(4)],
    noteBoxes: [], // Req #12: กล่องข้อความอิสระในหน้าข้อมูลหน้าต่าง/ประตู
    fabrics: {
      blackout: Object.assign(fab(), { isOpaque: true }),
      sheer: Object.assign(fab(), { isSheer: true }),
      roller: fab(),
      blinds: fab(),
      other: Object.assign(fab(), { label: 'อื่นๆ' }),
    },
    rods: {
      typeNo: false,
      pleat: { model: '', color: '' },
      show: { model: '', color: '', cap: '' },
      wave: { model: '', color: '' },
      fold: { model: '', color: '' },
      other: { name: '', model: '', color: '' },
      holdNo: false, holdStd: false, holdCrystal: false,
      hold: { silver: qty(), brass: qty(), black: qty(), copper: qty() },
      drawNo: false, drawBlackout: drawSet(), drawSheer: drawSet(),
      grommet: {
        flat: { silver: false, brass: false, copper: false, other: false, otherText: '' },
        wave: { brass: false, copper: false, other: false, otherText: '' },
        ripple: { brass: false, copper: false, other: false, otherText: '' },
      },
    },
  };
}

function defaultOrder(orderSeq = 1) {
  return {
    id: 'ord_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    updatedAt: new Date().toISOString(),
    ownerUsername: '',
    company: {
      name: 'PASAYA',
      title: 'REQUEST FORM FOR MADE TO ORDER',
      logo: '',
      address: 'HEAD OFFICE :\n77/191-192 42nd.FL , SINNSATHORN TOWER , KLONGSARN , BKK 10600\nTEL : +66 (02) 4400 955    FAX : +66 (02) 4400 933-4\nWEBSITE : WWW.PASAYA.COM',
    },
    customer: {
      name: '', houseNo: '', floor: '', moo: '', road: '', building: '', soi: '',
      subdistrict: '', district: '', province: '', zipcode: '',
      mobile: '', tel: '', email: '', deliveryDate: '', deliveryPlace: '',
    },
    staff: { name: '', dept: '', branch: '', orderNo: '' },
    discount: { blackout: '', sheer: '', labor: '', equipment: '' },
    sign: { requester: '', requesterDate: '', customer: '', customerDate: '', installer: '', installerDate: '', cs: '', csDate: '' },
    sheets: [newSheet(1)],
  };
}

/* ---------------- Local Auth & Role Access Control ---------------- */
function getCurrentUser() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_AUTH_KEY));
    if (!raw || !raw.username) return null;
    const uname = String(raw.username).trim().toLowerCase();
    const staffList = (typeof masterDB !== 'undefined' && Array.isArray(masterDB.staff)) ? masterDB.staff : [];
    const found = staffList.find(s => String(s.username || '').trim().toLowerCase() === uname);
    if (found) return found;
    if (uname === 't58121') {
      return { username: 'T58121', role: 'admin', name: 'แอดมิน (T58121)', dept: 'Admin', branch: 'สำนักงานใหญ่' };
    }
    return null;
  } catch (e) {
    return null;
  }
}

function isUserLoggedIn() {
  return !!getCurrentUser();
}

function isAdminUser() {
  const u = getCurrentUser();
  return !!(u && u.role === 'admin');
}

function canAccessOrder(ord) {
  const u = getCurrentUser();
  if (!u || !ord) return false;
  if (u.role === 'admin') return true;
  const uName = String(u.username || '').trim().toLowerCase();
  const oOwner = String(ord.ownerUsername || '').trim().toLowerCase();
  if (uName && oOwner && uName === oOwner) return true;
  const staffFullName = String(u.name || '').trim();
  const ordStaffName = String((ord.staff && ord.staff.name) || '').trim();
  if (staffFullName && ordStaffName && staffFullName === ordStaffName) return true;
  return false;
}

function showLoginView() {
  activeOrderId = null;
  const loginView = document.getElementById('loginView');
  if (loginView) loginView.hidden = false;
  document.getElementById('mainTopbar').hidden = true;
  document.getElementById('topSheetNav').hidden = true;
  document.getElementById('dashboardView').hidden = true;
  document.getElementById('workspaceView').hidden = true;
  const errEl = document.getElementById('loginError');
  if (errEl) errEl.hidden = true;
}

function applyUserRoleUI() {
  const u = getCurrentUser();
  if (!u) { showLoginView(); return; }
  document.getElementById('loginView').hidden = true;
  document.getElementById('mainTopbar').hidden = false;
  const badge = document.getElementById('userBadge');
  if (badge) {
    badge.hidden = false;
    badge.textContent = `👤 ${u.name || u.username} (${u.role === 'admin' ? 'Admin' : 'พนักงาน'})`;
  }
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) btnLogout.hidden = false;
  const staffDbTab = document.querySelector('#dbModal .db-tabs [data-db-tab="staff"]');
  if (staffDbTab) staffDbTab.hidden = (u.role !== 'admin');
}

/* ---------------- Deep merge / migration helpers ---------------- */
function mergeDefaults(def, src) {
  if (Array.isArray(def)) return Array.isArray(src) ? src : def;
  if (def && typeof def === 'object') {
    const out = {};
    Object.keys(def).forEach(k => { out[k] = mergeDefaults(def[k], src ? src[k] : undefined); });
    if (src && typeof src === 'object') Object.keys(src).forEach(k => { if (!(k in out)) out[k] = src[k]; });
    return out;
  }
  return src === undefined || src === null ? def : src;
}

function normalizeWindow(w, idx) {
  const nw = mergeDefaults(newWindow(idx + 1), w);
  if (!Array.isArray(nw.layers) || !nw.layers.length) nw.layers = [{ op: '', target: 'all', label: '' }];
  nw.layers = nw.layers.map(ly => Object.assign({ op: '', target: 'all', label: '' }, ly));
  if (!nw.curtainStyle1 && nw.curtainType) nw.curtainStyle1 = nw.curtainType;
  nw.paneStyle = String(getPaneCount(nw));
  return nw;
}

function normalizeSheet(sh, idx) {
  const ns = mergeDefaults(newSheet(idx + 1), sh);
  ns.windows = (ns.windows || []).map((w, i) => normalizeWindow(w, i));
  if (!ns.windows.length) ns.windows = [newWindow(1), newWindow(2), newWindow(3), newWindow(4)];
  if (!Array.isArray(ns.notes) || !ns.notes.length) ns.notes = [''];
  if (!Array.isArray(ns.noteBoxes)) ns.noteBoxes = [];
  return ns;
}

function normalizeOrder(raw, idx = 1) {
  if (raw && !Array.isArray(raw.sheets) && (raw.windows || raw.room)) {
    const ord = defaultOrder(idx);
    ord.company = mergeDefaults(ord.company, raw.company);
    ord.customer = mergeDefaults(ord.customer, raw.customer);
    ord.staff = mergeDefaults(ord.staff, raw.staff);
    ord.discount = mergeDefaults(ord.discount, raw.discount);
    ord.sign = mergeDefaults(ord.sign, raw.sign);
    ord.sheets = [normalizeSheet({
      room: raw.room, plan: raw.plan, notes: raw.notes,
      windows: raw.windows, fabrics: raw.fabrics, rods: raw.rods,
    }, 0)];
    return ord;
  }
  const ord = mergeDefaults(defaultOrder(idx), raw);
  ord.sheets = (ord.sheets || []).map((s, i) => normalizeSheet(s, i));
  if (!ord.sheets.length) ord.sheets = [newSheet(1)];
  return ord;
}

/* ---------------- Load & save Orders list ---------------- */
let orders = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return saved.map((o, i) => normalizeOrder(o, i + 1));
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (legacy) return [normalizeOrder(legacy, 1)];
  } catch (e) { console.warn(e); }
  return [defaultOrder(1)];
})();

let activeOrderId = null;
// activeTabMode: 'customer' (หน้ากรอกข้อมูลลูกค้า/พนักงาน) หรือ 'sheet' (หน้ากรอกข้อมูลห้องตาม activeSheetIdx)
let activeTabMode = 'customer';
let activeSheetIdx = 0;
let activeSectionFilter = 'all';

// Preview state (Req #13 & Left-Right Sync)
let previewMode = 'single'; // 'single' | 'all' — เริ่มต้นแสดงหน้าเดียวเพื่อให้ซ้าย-ขวาตรงกันเสมอ
let currentPreviewPageIdx = 0;
let suppressPreviewScrollSync = false;

function saveOrders() {
  try { localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders)); }
  catch (e) { console.warn('saveOrders failed', e); }
  if (typeof RealtimeSync !== 'undefined') RealtimeSync.schedulePush();
}

function currentOrder() {
  return orders.find(o => o.id === activeOrderId) || null;
}
function currentSheet() {
  const ord = currentOrder();
  if (!ord) return null;
  if (activeSheetIdx < 0 || activeSheetIdx >= ord.sheets.length) activeSheetIdx = 0;
  return ord.sheets[activeSheetIdx];
}

/* ---------------- Path helpers ---------------- */
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
function setPath(o, p, v) {
  const ks = p.split('.'); let a = o;
  for (let i = 0; i < ks.length - 1; i++) { if (a[ks[i]] == null) a[ks[i]] = {}; a = a[ks[i]]; }
  a[ks[ks.length - 1]] = v;
}

/* =========================================================
   VIEW 1: Orders Dashboard
   ========================================================= */
function fmtDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return '-';
  return d.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
}

function renderDashboard() {
  if (!isUserLoggedIn()) { showLoginView(); return; }
  const q = (document.getElementById('orderSearch').value || '').trim().toLowerCase();
  const tbody = document.getElementById('ordersTableBody');
  const accessible = orders.filter(o => canAccessOrder(o));
  const filtered = accessible.filter(o => {
    if (!q) return true;
    const hay = [o.customer.name, o.customer.mobile, o.staff.name, o.staff.branch]
      .map(x => String(x || '').toLowerCase()).join(' ');
    return hay.includes(q);
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="c" style="padding:24px;color:#777">ไม่พบรายการออเดอร์ — กด "➕ สร้างออเดอร์ใหม่" ด้านบน</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(o => {
    const pageCount = expandOrderPages(o).length;
    return `<tr>
      <td><b>${esc(o.customer.name || '(ยังไม่ระบุชื่อลูกค้า)')}</b></td>
      <td class="c">${esc(o.customer.mobile || '-')}</td>
      <td class="c">${esc(o.staff.name || '-')}</td>
      <td class="c">${esc(o.staff.branch || '-')}</td>
      <td class="c"><span class="pill">${pageCount} หน้า</span></td>
      <td class="c">${fmtDateTime(o.updatedAt)}</td>
      <td class="c">
        <button type="button" class="primary" data-dash-open="${o.id}">📝 เปิดฟอร์ม</button>
        <button type="button" data-dash-dup="${o.id}" title="คัดลอกออเดอร์">⧉</button>
        <button type="button" class="danger" data-dash-del="${o.id}" title="ลบออเดอร์">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

function showDashboard() {
  if (!isUserLoggedIn()) { showLoginView(); return; }
  applyUserRoleUI();
  activeOrderId = null;
  document.getElementById('dashboardView').hidden = false;
  document.getElementById('workspaceView').hidden = true;
  document.getElementById('topSheetNav').hidden = true;
  document.getElementById('btnHome').hidden = true;
  document.getElementById('topOrderBadge').hidden = true;
  document.getElementById('orderActions').hidden = true;
  renderDashboard();
}

function openOrder(orderId, mode = 'sheet', sheetIdx = 0) {
  if (!isUserLoggedIn()) { showLoginView(); return; }
  const ord = orders.find(o => o.id === orderId);
  if (!ord || !canAccessOrder(ord)) return;
  applyUserRoleUI();
  activeOrderId = ord.id;
  // ถ้ายังไม่ได้กรอกชื่อลูกค้าเลย ให้เปิดแท็บข้อมูลลูกค้าก่อน
  activeTabMode = (!ord.customer.name && mode === 'auto') ? 'customer' : (mode === 'customer' ? 'customer' : 'sheet');
  activeSheetIdx = Math.max(0, Math.min(sheetIdx, ord.sheets.length - 1));
  currentPreviewPageIdx = 0;

  document.getElementById('dashboardView').hidden = true;
  document.getElementById('workspaceView').hidden = false;
  document.getElementById('topSheetNav').hidden = false;
  document.getElementById('btnHome').hidden = false;
  document.getElementById('topOrderBadge').hidden = false;
  document.getElementById('orderActions').hidden = false;
  renderAllWorkspace();
  fitZoomWidth();
}

/* =========================================================
   VIEW 2: Top Sheet Navigation & Section Jump Header (Req #1, #10)
   ========================================================= */
function updateTopBadge() {
  const ord = currentOrder();
  if (!ord) return;
  const badge = document.getElementById('topOrderBadge');
  badge.textContent = `${ord.customer.name || 'ยังไม่ระบุชื่อลูกค้า'}${ord.staff.name ? ' • ' + ord.staff.name : ''}`;
}

function renderTopSheetNav() {
  const ord = currentOrder();
  if (!ord) return;
  const el = document.getElementById('sheetTabs');
  const custActive = activeTabMode === 'customer' ? 'active' : '';
  let html = `<button type="button" class="sheet-tab cust-tab ${custActive}" data-nav-cust="1">
    👤 ข้อมูลลูกค้า / พนักงาน
  </button>`;

  html += ord.sheets.map((sh, i) => {
    const isAct = (activeTabMode === 'sheet' && i === activeSheetIdx) ? 'active' : '';
    const rName = sh.room.name ? sh.room.name : 'ยังไม่ระบุชื่อห้อง';
    const winCount = (sh.windows || []).length;
    return `<button type="button" class="sheet-tab ${isAct}" data-sheet-tab="${i}">
      🏠 หน้า ${i + 1}: ${esc(rName)} <small>(${winCount} บาน)</small>
    </button>`;
  }).join('');

  el.innerHTML = html;

  // Toggle Customer pane vs Room pane (Req #1: แยกหน้ากรอกข้อมูลลูกค้า/พนักงาน ไม่แสดงซ้ำกับหน้าต่าง/ประตู)
  document.getElementById('customerEditorPane').hidden = (activeTabMode !== 'customer');
  document.getElementById('roomEditorPane').hidden = (activeTabMode !== 'sheet');
}

function applySectionFilter(secId) {
  activeSectionFilter = secId || 'all';
  document.querySelectorAll('#secJumpBar .sec-jump').forEach(b => {
    b.classList.toggle('active', b.dataset.sec === activeSectionFilter);
  });
  document.querySelectorAll('#roomEditorPane .room-sec').forEach(sec => {
    if (activeSectionFilter === 'all' || sec.id === activeSectionFilter) {
      sec.hidden = false;
      sec.open = true;
    } else {
      sec.hidden = true;
    }
  });
}

function renderStaffDropdown() {
  const sel = document.getElementById('staffSelect');
  const u = getCurrentUser();
  const visibleStaff = (u && u.role !== 'admin')
    ? masterDB.staff.map((s, i) => ({ s, i })).filter(({ s }) => String(s.username || '').toLowerCase() === String(u.username || '').toLowerCase())
    : masterDB.staff.map((s, i) => ({ s, i }));
  sel.innerHTML = `<option value="">-- เลือกพนักงานจากฐานข้อมูล (${visibleStaff.length} คน) --</option>` +
    visibleStaff.map(({ s, i }) => `<option value="${i}">${esc(s.name)} (${esc(s.dept || '-')} / ${esc(s.branch || '-')})</option>`).join('');
}

function syncSharedInputs(root = document) {
  const ord = currentOrder(); if (!ord) return;
  root.querySelectorAll('[data-shared]').forEach(el => {
    const v = getPath(ord, el.dataset.shared);
    if (el.type === 'checkbox') el.checked = !!v;
    else if (el.type === 'radio') el.checked = v === el.value;
    else el.value = v ?? '';
  });
}

function syncSheetInputs(root = document) {
  const sh = currentSheet(); if (!sh) return;
  root.querySelectorAll('[data-sheet]').forEach(el => {
    const v = getPath(sh, el.dataset.sheet);
    if (el.type === 'checkbox') el.checked = !!v;
    else if (el.type === 'radio') el.checked = v === el.value;
    else el.value = v ?? '';
  });
}

/* =========================================================
   Sync points from Room Plan in order (Req #9)
   ========================================================= */
function getPlanOpenings(sh) {
  return ((sh && sh.plan && sh.plan.items) || []).filter(it => it.type === 'window' || it.type === 'door');
}

function syncWindowsFromPlan(sh) {
  if (!sh) return;
  const openings = getPlanOpenings(sh);
  if (!openings.length) return;
  while (sh.windows.length < openings.length) {
    sh.windows.push(newWindow(sh.windows.length + 1));
  }
  openings.forEach((op, idx) => {
    const w = sh.windows[idx];
    if (!w) return;
    const no = op.label || String(idx + 1);
    w.planNo = no;
    if (!w.label) w.label = (op.type === 'door' ? 'D' : 'W') + no;
    const inferred = inferCornerShapeFromPlanItem(op);
    if (inferred !== '1' && (!w.cornerShape || w.cornerShape === '1')) {
      w.cornerShape = inferred;
    }
  });
}

/* =========================================================
   Window Editor Card (Req #5, #6.1–6.12, #7.16, #9)
   ========================================================= */
function dimFieldRow(b, label, numKey, noteKey, idx, isRailCalc = false) {
  return `<div class="dim-pair">
    <span class="dim-lbl">${label}</span>
    <input type="number" step="any" ${b(numKey)} ${isRailCalc ? `data-rail-calc="${idx}"` : ''} placeholder="ขนาด">
    <input list="dlRemarks" ${b(noteKey)} placeholder="หมายเหตุ (เช่น ชนแอร์)">
  </div>`;
}

function windowEditorHTML(w, i, planOpenings) {
  const b = p => `data-sheet="windows.${i}.${p}"`;
  const needHook = curtainNeedsHook(w.curtainStyle1, w.curtainStyle2);
  const curtainOpts = `<option value="">-- เลือก --</option>` +
    masterDB.curtains.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
  const hookOpts = `<option value="">-- เลือกขนาดตะขอ --</option>` +
    masterDB.hooks.map(h => `<option value="${esc(h.name)}">${esc(h.name)}</option>`).join('');
  const rodTypeOpts = `<option value="">-- เลือกประเภทรางม่าน --</option>` +
    ['รางม่านจีบ', 'รางโชว์', 'รางม่านลอน', 'รางม่านพับ'].map(rt => `<option value="${esc(rt)}">${esc(rt)}</option>`).join('');

  // Req #9: จุดที่สามารถเลือกตำแหน่งจากแปลนห้องมาแสดงตามลำดับได้เลย
  const planSelectOpts = `<option value="">-- เลือกจุดจากแปลน --</option>` +
    planOpenings.map((op, oi) => {
      const no = op.label || (oi + 1);
      const tName = op.type === 'door' ? 'ประตู' : 'หน้าต่าง';
      const code = (op.type === 'door' ? 'D' : 'W') + no;
      return `<option value="${oi}">จุดที่ ${esc(no)} (${tName} → ${esc(code)})</option>`;
    }).join('');

  const railW = calcRailWidth(w);
  const railH = calcRailHeight(w);

  const wfList1 = getWidthFormulasForStyle(w.curtainStyle1);
  const hfList1 = getHeightFormulasForWindow(w.curtainStyle1, w.rodType, w.hookSize);
  const wfList2 = getWidthFormulasForStyle(w.curtainStyle2 || w.curtainStyle1);
  const hfList2 = getHeightFormulasForWindow(w.curtainStyle2 || w.curtainStyle1, w.rodType, w.hookSize);

  const wfOpts1 = `<option value="">-- เลือกสูตรกว้าง (${wfList1.length} ค่า) --</option>` +
    wfList1.map(f => `<option value="${esc(f.id)}">${esc(f.curtainStyle ? `[${f.curtainStyle}] ` : '')}${esc(f.label)} (${esc(f.widthExp)})</option>`).join('');
  const hfOpts1 = `<option value="">-- เลือกสูตรสูง (${hfList1.length} ค่า) --</option>` +
    hfList1.map(f => `<option value="${esc(f.id)}">${esc(f.curtainStyle ? `[${f.curtainStyle}] ` : '')}${esc(f.rodType ? `${f.rodType} ` : '')}${esc(f.hookSize ? `ตะขอ ${f.hookSize} ` : '')}${esc(f.label)} (${esc(f.heightExp)})</option>`).join('');
  const wfOpts2 = `<option value="">-- เลือกสูตรกว้าง (${wfList2.length} ค่า) --</option>` +
    wfList2.map(f => `<option value="${esc(f.id)}">${esc(f.curtainStyle ? `[${f.curtainStyle}] ` : '')}${esc(f.label)} (${esc(f.widthExp)})</option>`).join('');
  const hfOpts2 = `<option value="">-- เลือกสูตรสูง (${hfList2.length} ค่า) --</option>` +
    hfList2.map(f => `<option value="${esc(f.id)}">${esc(f.curtainStyle ? `[${f.curtainStyle}] ` : '')}${esc(f.rodType ? `${f.rodType} ` : '')}${esc(f.hookSize ? `ตะขอ ${f.hookSize} ` : '')}${esc(f.label)} (${esc(f.heightExp)})</option>`).join('');

  const calc = (key, title, u1, u2) => `<tr><th class="r">${title}</th>
    <td><input ${b(key + '.a')} placeholder="กว้าง"></td><td class="op">×</td>
    <td><input ${b(key + '.b')} placeholder="สูง/ชั้น"></td><td class="op">=</td>
    <td><input ${b(key + '.n')} placeholder="${u1}"></td><td class="op">=</td>
    <td><input ${b(key + '.t')} placeholder="${u2}"></td></tr>`;

  const targetOpts = getLayerTargetsForWindow(w);
  const layersHTML = (w.layers || []).map((ly, li) => `
    <div class="layer-row">
      <span class="layer-tag">ผืนที่ ${li + 1}</span>
      <select data-sheet="windows.${i}.layers.${li}.op" title="รูปแบบการรวบ/โซ่ดึง">
        ${LAYER_OPS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}
      </select>
      <select data-sheet="windows.${i}.layers.${li}.target" title="ตำแหน่งในกรอบหน้าต่าง" style="max-width:145px">
        ${targetOpts.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}
      </select>
      <input data-sheet="windows.${i}.layers.${li}.label" placeholder="ป้ายกำกับ" style="width:85px">
      <button type="button" class="danger" data-act="delLayer" data-i="${i}" data-li="${li}" title="ลบผืนนี้">✕</button>
    </div>
  `).join('');

  return `<div class="win-ed" data-win-idx="${i}">
    <div class="win-ed-hd">
      <span class="num">ลำดับ ${esc(w.planNo || (i + 1))}</span>
      <input ${b('planNo')} style="max-width:48px;text-align:center" title="หมายเลขลำดับจุด">
      <input ${b('label')} placeholder="รหัส/ตำแหน่ง เช่น W1, D1">
      <select data-plan-pick="${i}" style="max-width:155px" title="ดึงตำแหน่งจากจุดที่วาดไว้ในแปลนห้อง">${planSelectOpts}</select>
      <button type="button" data-act="upWin" data-i="${i}" title="เลื่อนขึ้น">▲</button>
      <button type="button" data-act="dupWin" data-i="${i}" title="คัดลอกบานนี้">⧉</button>
      <button type="button" data-act="delWin" data-i="${i}" class="danger" title="ลบบานนี้">✕</button>
    </div>

    <div class="grid2">
      <label>รูปแบบผ้าม่านชั้นที่ 1 (ม่านทึบ/หลัก)
        <span class="inline">
          <select ${b('curtainStyle1')}>${curtainOpts}</select>
          <button type="button" data-act="openDbCurtains" title="เพิ่ม/แก้ไขรูปแบบผ้าม่าน">🗄️</button>
        </span>
      </label>
      <label>รูปแบบผ้าม่านชั้นที่ 2 (ม่านโปร่ง - ถ้าต่างกันจะคั่น "/")
        <select ${b('curtainStyle2')}>${curtainOpts}</select>
      </label>
      <label>ประเภทรางม่าน (ใช้จับคู่คำนวณความสูง)
        <select ${b('rodType')}>${rodTypeOpts}</select>
      </label>
      <label>ขนาดตะขอ ${needHook ? '<b>(ม่านจีบ/ลอน)</b>' : '<small>(เฉพาะม่านจีบ/ลอน)</small>'}
        <span class="inline">
          <select ${b('hookSize')} ${needHook ? '' : 'disabled'}>${hookOpts}</select>
          <button type="button" data-act="openDbHooks" title="เพิ่ม/แก้ไขขนาดตะขอ">🗄️</button>
        </span>
      </label>
      <label>รูปแบบหน้าต่าง/ประตู (แบบ 1–9 โค้ง 90°)
        <select ${b('cornerShape')}>${CORNER_SHAPES.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>
      </label>
      <label>จำนวนช่องบานในกรอบ (เพิ่มได้มากกว่า 4 บาน)
        <span class="inline">
          <button type="button" data-act="decPane" data-i="${i}" title="ลดจำนวนช่องบาน">−</button>
          <input type="number" min="1" max="24" step="1" ${b('paneStyle')} style="max-width:70px;text-align:center;font-weight:700" title="ระบุจำนวนช่องบานในกรอบ (เช่น 1, 2, 3, 4, 5, 6...)">
          <button type="button" data-act="incPane" data-i="${i}" title="เพิ่มจำนวนช่องบาน">＋</button>
          <small style="color:#555">ช่องบาน</small>
        </span>
      </label>
      <label>ข้อความระยะความสูง (= สูงเต็ม)
        <input ${b('drop')} placeholder="เช่น สูงเต็ม">
      </label>
    </div>

    <div class="opts">
      <div><span class="olbl">กล่องม่าน</span>
        <label><input type="radio" name="box${i}" value="no" ${b('box')}>No</label>
        <label><input type="radio" name="box${i}" value="yes" ${b('box')}>Yes</label>
        ${w.box === 'yes' ? `<input ${b('boxSize')} placeholder="ระบุขนาดกล่องม่าน" style="width:165px;margin-left:4px">` : ''}
      </div>
      <div><span class="olbl">ขาจับราง</span>
        <label><input type="radio" name="mount${i}" value="wall" ${b('mount')}>ผนัง</label>
        <label><input type="radio" name="mount${i}" value="ceiling" ${b('mount')}>เพดาน</label>
        ${w.mount === 'wall' ? `
          <label style="margin-left:6px;font-weight:700">
            <input type="checkbox" ${b('wallCeilingAttach')}>ผนังชิดเพดาน
          </label>
          ${w.wallCeilingAttach ? `<input ${b('wallCeilingNote')} placeholder="ระบุระยะ/หมายเหตุ" style="width:120px">` : ''}
        ` : ''}
      </div>
    </div>

    <div class="subcard" style="margin:6px 0">
      <div class="inline" style="justify-content:space-between;margin-bottom:4px">
        <b style="margin:0">📏 ขนาดและพื้นที่รอบบาน (พร้อมช่องใส่หมายเหตุ เช่น ชนแอร์, ปลั๊กไฟ, บิ้วอิน)</b>
        <button type="button" data-act="openDbRemarks" title="เพิ่ม/ลบ/แก้ไขข้อความหมายเหตุในฐานข้อมูล">🗄️ ฐานข้อมูลหมายเหตุ</button>
      </div>
      <div class="dim-grid">
        ${dimFieldRow(b, 'ความกว้าง', 'width', 'noteWidth', i, true)}
        ${dimFieldRow(b, 'ความสูง', 'height', 'noteHeight', i, true)}
        ${dimFieldRow(b, 'พื้นที่ด้านซ้าย', 'wallL', 'noteWallL', i)}
        ${dimFieldRow(b, 'พื้นที่ด้านขวา', 'wallR', 'noteWallR', i)}
        ${dimFieldRow(b, 'พื้นที่ด้านบน', 'ceilT', 'noteCeilT', i)}
        ${dimFieldRow(b, 'พื้นที่ด้านล่าง', 'floorB', 'noteFloorB', i)}
        ${dimFieldRow(b, 'เผื่อด้านซ้าย (+)', 'extL', 'noteExtL', i, true)}
        ${dimFieldRow(b, 'เผื่อด้านขวา (+)', 'extR', 'noteExtR', i, true)}
        ${dimFieldRow(b, 'เผื่อด้านบน (+)', 'extT', 'noteExtT', i, true)}
        ${dimFieldRow(b, 'เผื่อด้านล่าง (+)', 'extB', 'noteExtB', i, true)}
        ${dimFieldRow(b, 'ความกว้างเต็ม', 'fullW', 'noteFullW', i)}
        ${dimFieldRow(b, 'ความสูงเต็ม', 'fullH', 'noteFullH', i)}
      </div>
      <div class="rail-summary" data-rail-sum="${i}">
        <span>ขนาดความกว้างรางม่าน = <b>${railW || '-'}</b></span>
        <span>ขนาดความสูงรางม่าน = <b>${railH || '-'}</b></span>
        <button type="button" data-act="fillSize" data-i="${i}">↘ ส่งค่าราง/ม่านลงตารางคำนวณ</button>
      </div>
    </div>

    <div class="subcard" style="margin:6px 0">
      <div class="inline" style="justify-content:space-between;margin-bottom:4px">
        <b style="margin:0">🪟 หน้ากากแสดงการใช้งานผ้าม่าน (แสดงภายในกรอบหน้าต่าง/ประตู)</b>
        <button type="button" data-act="addLayer" data-i="${i}">➕ เพิ่มชิ้นผ้าม่าน</button>
      </div>
      <div class="layers-ed">${layersHTML}</div>
    </div>

    <div class="win-thumb" data-thumb="${i}">${windowSVG(w)}</div>

    <div class="subcard" style="margin-top:6px">
      <div class="inline" style="justify-content:space-between;flex-wrap:wrap;margin-bottom:6px">
        <b style="margin:0">🧮 คำนวณขนาดราง / ผ้าม่านทึบ / ผ้าม่านโปร่ง</b>
        <div class="inline">
          <button type="button" class="primary" data-act="applyFormula" data-i="${i}" title="คำนวณตามสูตรความกว้างและความสูงที่เลือก">⚡ คำนวณตามสูตร</button>
          <button type="button" data-act="openDbWidthFormulas" title="ฐานข้อมูลคำนวณขนาดความกว้างผ้าม่าน">📐 ฐานข้อมูลกว้าง</button>
          <button type="button" data-act="openDbHeightFormulas" title="ฐานข้อมูลคำนวณขนาดความสูงผ้าม่าน">📏 ฐานข้อมูลสูง</button>
        </div>
      </div>
      <div class="grid2" style="margin-bottom:6px">
        <label>สูตรความกว้าง (ผ้าม่านทึบ)
          <select ${b('widthFormulaId1')}>${wfOpts1}</select>
        </label>
        <label>สูตรความสูง (ผ้าม่านทึบ)
          <select ${b('heightFormulaId1')}>${hfOpts1}</select>
        </label>
        <label>สูตรความกว้าง (ผ้าม่านโปร่ง)
          <select ${b('widthFormulaId2')}>${wfOpts2}</select>
        </label>
        <label>สูตรความสูง (ผ้าม่านโปร่ง)
          <select ${b('heightFormulaId2')}>${hfOpts2}</select>
        </label>
      </div>
      <table class="calc-ed">
        <tr><th></th><th>ขนาดกว้าง</th><th></th><th>ขนาดสูง/ชั้น</th><th></th><th>จำนวน</th><th></th><th>รวม</th></tr>
        ${calc('rail', 'รางม่าน', 'ชั้น', 'เมตร')}
        ${calc('blackout', 'ผ้าม่านทึบ', 'ผืน', 'หลา')}
        ${calc('sheer', 'ผ้าม่านโปร่ง', 'ผืน', 'หลา')}
      </table>
    </div>
  </div>`;
}

function renderWindowsEditor() {
  const sh = currentSheet(); if (!sh) return;
  const planOpenings = getPlanOpenings(sh);
  const el = document.getElementById('windowsEditor');
  el.innerHTML = sh.windows.map((w, i) => windowEditorHTML(w, i, planOpenings)).join('');
  syncSheetInputs(el);
}

function renderNotesEditor() {
  const sh = currentSheet(); if (!sh) return;
  const el = document.getElementById('notesEditor');
  el.innerHTML = sh.notes.map((n, i) => `<li><div class="nrow">
    <input data-sheet="notes.${i}" data-note="${i}" placeholder="หมายเหตุข้อ ${i + 1}">
    <button type="button" data-act="delNote" data-i="${i}" class="danger">✕</button></div></li>`).join('');
  syncSheetInputs(el);
}

function renderDrawAndGrommetEditor() {
  const col = (key, title) => {
    const b = p => `data-sheet="rods.${key}.${p}"`;
    const row = (k, l) => `<label><input type="checkbox" ${b(k + '.on')}>${l}</label><input type="number" min="0" ${b(k + '.qty')} placeholder="อัน">`;
    return `<div class="subcard"><b>${title}</b><div class="qty-grid">
      ${row('wood', 'ลายไม้')}${row('alu', 'อลูมิเนียม')}${row('acrylic', 'อะคริลิค')}
      <label><input type="checkbox" ${b('other.on')}><input ${b('other.name')} placeholder="อื่นๆ" style="width:90px"></label><input type="number" min="0" ${b('other.qty')} placeholder="อัน">
      <label><input type="checkbox" ${b('size120')}>ขนาด 120 cm</label><span></span>
      <label>ขนาดอื่น (cm)</label><input type="number" min="0" ${b('sizeCustom')}>
    </div></div>`;
  };
  document.getElementById('drawEditor').innerHTML = col('drawBlackout', 'ผ้าม่านทึบ') + col('drawSheer', 'ผ้าม่านโปร่ง');

  const g = (key, title, colors) => {
    const b = p => `data-sheet="rods.grommet.${key}.${p}"`;
    return `<div class="subcard"><b>${title}</b><div class="opts" style="margin:0">
      ${colors.map(([k, l]) => `<label><input type="checkbox" ${b(k)}>${l}</label>`).join('')}
      <label><input type="checkbox" ${b('other')}>อื่นๆ</label><input ${b('otherText')} style="width:140px" placeholder="ระบุ">
    </div></div>`;
  };
  document.getElementById('grommetEditor').innerHTML =
    g('flat', 'แบบเรียบ', [['silver', 'สีเงิน'], ['brass', 'ทองเหลือง'], ['copper', 'ทองแดง']]) +
    g('wave', 'แบบลอน', [['brass', 'ทองเหลือง'], ['copper', 'ทองแดง']]) +
    g('ripple', 'แบบคลื่น', [['brass', 'ทองเหลือง'], ['copper', 'ทองแดง']]);

  syncSheetInputs(document.getElementById('drawEditor'));
  syncSheetInputs(document.getElementById('grommetEditor'));
}

function renderPlanMini() {
  const sh = currentSheet(); if (!sh) return;
  const svg = planPreviewSVG(sh.plan.items);
  document.getElementById('planMini').innerHTML = svg || '<span class="hint">ยังไม่มีแปลน — คลิกเพื่อวาด</span>';
}

/* =========================================================
   Preview Rendering & Single/All Page Modes (Req #13)
   ========================================================= */
let renderTimer = null;
let isSyncingScroll = false;

function findPreviewPageIdxForSheet(sheetIdx, chunkIdx = 0) {
  const ord = currentOrder();
  if (!ord) return 0;
  const pages = expandOrderPages(ord);
  let idx = pages.findIndex(p => p.sIdx === sheetIdx && p.cIdx === chunkIdx);
  if (idx < 0) idx = pages.findIndex(p => p.sIdx === sheetIdx);
  return idx >= 0 ? idx : 0;
}

function syncPreviewToSheet(sheetIdx, chunkIdx = 0) {
  currentPreviewPageIdx = findPreviewPageIdxForSheet(sheetIdx, chunkIdx);
  applyPreviewPageVisibility();
  if (previewMode === 'all') {
    const pageEls = document.querySelectorAll('#preview .page');
    const target = pageEls[currentPreviewPageIdx];
    const wrap = document.getElementById('previewWrap');
    if (target && wrap) {
      isSyncingScroll = true;
      const zoom = parseFloat(document.getElementById('preview').style.getPropertyValue('--zoom')) || 0.8;
      wrap.scrollTo({ top: Math.max(0, target.offsetTop * zoom - 12), behavior: 'smooth' });
      setTimeout(() => { isSyncingScroll = false; }, 350);
    }
  }
}

function syncEditorToPreviewPage(pageIdx, scrollChunk = true) {
  const ord = currentOrder();
  if (!ord) return;
  const pages = expandOrderPages(ord);
  if (!pages.length) return;
  const clamped = Math.max(0, Math.min(pageIdx, pages.length - 1));
  currentPreviewPageIdx = clamped;
  const p = pages[clamped];
  if (activeTabMode !== 'sheet' || activeSheetIdx !== p.sIdx) {
    activeTabMode = 'sheet';
    activeSheetIdx = p.sIdx;
    renderTopSheetNav();
    applySectionFilter(activeSectionFilter);
    renderWindowsEditor();
    renderNotesEditor();
    renderDrawAndGrommetEditor();
    renderPlanMini();
    syncSheetInputs();
  }
  if (scrollChunk && p.cIdx > 0) {
    const winCard = document.querySelector(`.win-ed[data-win-idx="${p.cIdx * 4}"]`);
    if (winCard) winCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function applyPreviewPageVisibility() {
  const pageEls = document.querySelectorAll('#preview .page');
  const total = pageEls.length || 1;
  if (currentPreviewPageIdx >= total) currentPreviewPageIdx = total - 1;
  if (currentPreviewPageIdx < 0) currentPreviewPageIdx = 0;

  document.getElementById('modeAllPages').classList.toggle('active', previewMode === 'all');
  document.getElementById('modeSinglePage').classList.toggle('active', previewMode === 'single');
  document.getElementById('singlePageNav').hidden = (previewMode !== 'single');
  document.getElementById('singlePageIndicator').textContent = `${currentPreviewPageIdx + 1}/${total}`;

  pageEls.forEach((p, idx) => {
    p.style.display = (previewMode === 'single' && idx !== currentPreviewPageIdx) ? 'none' : '';
  });
}

function renderPreview() {
  const ord = currentOrder(); if (!ord) return;
  const pages = expandOrderPages(ord);
  document.getElementById('pageCountInfo').textContent = `รวม ${pages.length} หน้า`;
  document.getElementById('preview').innerHTML = renderOrderPages(ord);
  applyPreviewPageVisibility();
}

function touchAndSave() {
  const ord = currentOrder();
  if (ord) ord.updatedAt = new Date().toISOString();
  saveOrders();
}

function changed(sheetPath, sharedPath) {
  const sh = currentSheet();
  if (sh && sheetPath) {
    if (/^windows\.\d+\.(curtainStyle1|curtainStyle2|rodType|hookSize|box|mount|wallCeilingAttach|paneStyle)$/.test(sheetPath)) {
      const m = /^windows\.(\d+)\./.exec(sheetPath);
      const w = sh.windows[+m[1]];
      if (!curtainNeedsHook(w.curtainStyle1, w.curtainStyle2)) w.hookSize = '';
      w.paneStyle = String(getPaneCount(w));
      renderWindowsEditor();
    }
    const mCalc = /^windows\.(\d+)\.(width|height|extL|extR|extT|extB)$/.exec(sheetPath);
    if (mCalc) {
      const idx = +mCalc[1];
      const w = sh.windows[idx];
      const rw = calcRailWidth(w), rh = calcRailHeight(w);
      const sumEl = document.querySelector(`[data-rail-sum="${idx}"]`);
      if (sumEl) {
        sumEl.querySelectorAll('b')[0].textContent = rw || '-';
        sumEl.querySelectorAll('b')[1].textContent = rh || '-';
      }
    }
    const mThumb = /^windows\.(\d+)\./.exec(sheetPath);
    if (mThumb) {
      const idx = +mThumb[1];
      const t = document.querySelector(`[data-thumb="${idx}"]`);
      if (t && sh.windows[idx]) t.innerHTML = windowSVG(sh.windows[idx]);
    }
    if (sheetPath === 'room.name') renderTopSheetNav();
  }
  if (sharedPath) updateTopBadge();

  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => { renderPreview(); touchAndSave(); }, 120);
}

function renderAllWorkspace() {
  updateTopBadge();
  renderStaffDropdown();
  renderTopSheetNav();
  applySectionFilter(activeSectionFilter);
  syncSharedInputs();
  renderWindowsEditor();
  renderNotesEditor();
  renderDrawAndGrommetEditor();
  renderPlanMini();
  syncSheetInputs();
  renderPreview();
}

/* =========================================================
   Floating Note Boxes in Window Section (Req #12)
   - Moveable, Resizable, Multiple allowed, Always on top layer
   ========================================================= */
let fnbDrag = null;

document.addEventListener('pointerdown', e => {
  const dragEl = e.target.closest('.fnb-drag');
  const resizeEl = e.target.closest('.fnb-resize');
  if (!dragEl && !resizeEl) return;
  const boxEl = e.target.closest('.float-note-box');
  if (!boxEl) return;
  const ord = currentOrder(); if (!ord) return;
  const sIdx = +boxEl.dataset.sidx, bIdx = +boxEl.dataset.bidx;
  const sh = ord.sheets[sIdx];
  if (!sh || !sh.noteBoxes || !sh.noteBoxes[bIdx]) return;
  const nb = sh.noteBoxes[bIdx];
  const zoom = parseFloat(document.getElementById('preview').style.getPropertyValue('--zoom')) || 0.8;

  fnbDrag = {
    mode: resizeEl ? 'resize' : 'move',
    boxEl, nb, zoom,
    startX: e.clientX, startY: e.clientY,
    origX: nb.x ?? 120, origY: nb.y ?? 80,
    origW: nb.w ?? 180, origH: nb.h ?? 64,
  };
  e.preventDefault();
});

document.addEventListener('pointermove', e => {
  if (!fnbDrag) return;
  const dx = (e.clientX - fnbDrag.startX) / fnbDrag.zoom;
  const dy = (e.clientY - fnbDrag.startY) / fnbDrag.zoom;
  const { boxEl, nb } = fnbDrag;
  if (fnbDrag.mode === 'move') {
    nb.x = Math.max(0, Math.min(720, Math.round(fnbDrag.origX + dx)));
    nb.y = Math.max(0, Math.min(480, Math.round(fnbDrag.origY + dy)));
    boxEl.style.left = nb.x + 'px';
    boxEl.style.top = nb.y + 'px';
  } else {
    nb.w = Math.max(80, Math.min(720, Math.round(fnbDrag.origW + dx)));
    nb.h = Math.max(32, Math.min(480, Math.round(fnbDrag.origH + dy)));
    boxEl.style.width = nb.w + 'px';
    boxEl.style.height = nb.h + 'px';
  }
});

document.addEventListener('pointerup', () => {
  if (fnbDrag) {
    fnbDrag = null;
    touchAndSave();
  }
});

document.addEventListener('input', e => {
  if (e.target.classList && e.target.classList.contains('fnb-text')) {
    const boxEl = e.target.closest('.float-note-box');
    const ord = currentOrder();
    if (!boxEl || !ord) return;
    const sh = ord.sheets[+boxEl.dataset.sidx];
    const nb = sh && sh.noteBoxes && sh.noteBoxes[+boxEl.dataset.bidx];
    if (nb) { nb.text = e.target.value; touchAndSave(); }
  }
});

document.addEventListener('click', e => {
  const fontBtn = e.target.closest('[data-fnb-font]');
  if (fontBtn) {
    const boxEl = fontBtn.closest('.float-note-box');
    const ord = currentOrder(); if (!boxEl || !ord) return;
    const sh = ord.sheets[+boxEl.dataset.sidx];
    const nb = sh && sh.noteBoxes && sh.noteBoxes[+boxEl.dataset.bidx];
    if (nb) {
      nb.fontSize = Math.max(8, Math.min(24, (nb.fontSize || 11) + (+fontBtn.dataset.fnbFont)));
      boxEl.style.fontSize = nb.fontSize + 'px';
      touchAndSave();
    }
    return;
  }
  const delBtn = e.target.closest('[data-fnb-del]');
  if (delBtn) {
    const boxEl = delBtn.closest('.float-note-box');
    const ord = currentOrder(); if (!boxEl || !ord) return;
    const sh = ord.sheets[+boxEl.dataset.sidx];
    if (sh && sh.noteBoxes) {
      sh.noteBoxes.splice(+boxEl.dataset.bidx, 1);
      renderPreview();
      touchAndSave();
    }
  }
});

document.getElementById('btnAddNoteBox').addEventListener('click', () => {
  const sh = currentSheet(); if (!sh) return;
  if (!Array.isArray(sh.noteBoxes)) sh.noteBoxes = [];
  const offset = (sh.noteBoxes.length % 5) * 18;
  sh.noteBoxes.push({
    pageChunk: 0,
    x: 260 + offset,
    y: 210 + offset,
    w: 220,
    h: 64,
    fontSize: 11,
    text: '',
  });
  renderPreview();
  touchAndSave();
});

/* ---------------- Input Listeners ---------------- */
function onFieldInput(e) {
  const el = e.target;
  if (!el.dataset) return;

  // เลือกดึงจุดจากแปลนห้อง (Req #9)
  if (el.dataset.planPick !== undefined && el.value !== '') {
    const sh = currentSheet(); if (!sh) return;
    const winIdx = +el.dataset.planPick;
    const opIdx = +el.value;
    const op = getPlanOpenings(sh)[opIdx];
    const w = sh.windows[winIdx];
    if (op && w) {
      const no = op.label || String(opIdx + 1);
      w.planNo = no;
      w.label = (op.type === 'door' ? 'D' : 'W') + no;
      const inferred = inferCornerShapeFromPlanItem(op);
      if (inferred !== '1') w.cornerShape = inferred;
      renderWindowsEditor();
      changed();
    }
    return;
  }

  let v;
  if (el.type === 'checkbox') v = el.checked;
  else if (el.type === 'radio') { if (!el.checked) return; v = el.value; }
  else v = el.value;

  if (el.dataset.shared) {
    const ord = currentOrder(); if (!ord) return;
    setPath(ord, el.dataset.shared, v);
    changed(null, el.dataset.shared);
  } else if (el.dataset.sheet) {
    const sh = currentSheet(); if (!sh) return;
    setPath(sh, el.dataset.sheet, v);
    changed(el.dataset.sheet, null);
  }
}
document.addEventListener('input', onFieldInput);
document.addEventListener('change', onFieldInput);

// คลิกซ้ำที่ radio เพื่อยกเลิกการเลือกได้
document.addEventListener('click', e => {
  const el = e.target;
  if (el.type === 'radio' && (el.dataset.shared || el.dataset.sheet)) {
    if (el.dataset.was === '1') {
      el.checked = false;
      if (el.dataset.shared) { setPath(currentOrder(), el.dataset.shared, ''); changed(null, el.dataset.shared); }
      else { setPath(currentSheet(), el.dataset.sheet, ''); changed(el.dataset.sheet, null); }
    }
    document.querySelectorAll(`input[type=radio][name="${el.name}"]`).forEach(r => { r.dataset.was = r.checked ? '1' : ''; });
  }
});
document.addEventListener('pointerdown', e => {
  const el = e.target;
  if (el.type === 'radio') el.dataset.was = el.checked ? '1' : '';
}, true);

// เลือกพนักงานจากฐานข้อมูล
document.getElementById('staffSelect').addEventListener('change', e => {
  const idx = e.target.value;
  if (idx === '') return;
  const st = masterDB.staff[+idx];
  const ord = currentOrder();
  if (st && ord) {
    ord.staff.name = st.name || '';
    ord.staff.dept = st.dept || '';
    ord.staff.branch = st.branch || '';
    syncSharedInputs();
    changed(null, 'staff.name');
  }
});

/* ---------------- Actions ---------------- */
const actions = {
  addWin() {
    const sh = currentSheet(); if (!sh) return;
    sh.windows.push(newWindow(sh.windows.length + 1));
    renderWindowsEditor(); renderTopSheetNav(); changed();
  },
  delWin(i) {
    const sh = currentSheet(); if (!sh) return;
    if (sh.windows.length <= 1) { alert('ต้องมีอย่างน้อย 1 บานในหน้านี้'); return; }
    if (!confirm(`ลบหน้าต่าง/ประตู จุดที่ ${i + 1}?`)) return;
    sh.windows.splice(i, 1);
    renderWindowsEditor(); renderTopSheetNav(); changed();
  },
  dupWin(i) {
    const sh = currentSheet(); if (!sh) return;
    const copy = JSON.parse(JSON.stringify(sh.windows[i]));
    copy.planNo = String(sh.windows.length + 1);
    sh.windows.splice(i + 1, 0, copy);
    renderWindowsEditor(); renderTopSheetNav(); changed();
  },
  upWin(i) {
    const sh = currentSheet(); if (!sh || i <= 0) return;
    const w = sh.windows; [w[i - 1], w[i]] = [w[i], w[i - 1]];
    renderWindowsEditor(); changed();
  },
  fillSize(i) {
    const sh = currentSheet(); if (!sh) return;
    const w = sh.windows[i];
    const rw = calcRailWidth(w) || w.width;
    const rh = calcRailHeight(w) || w.height;
    if (rw) { w.rail.a = rw; w.blackout.a = rw; w.sheer.a = rw; }
    if (rh) { w.blackout.b = rh; w.sheer.b = rh; }
    renderWindowsEditor(); changed();
  },
  applyFormula(i) {
    const sh = currentSheet(); if (!sh) return;
    const w = sh.windows[i];
    const rw = +calcRailWidth(w) || +w.width || 0;
    const rh = +calcRailHeight(w) || +w.height || 0;
    if (rw) {
      w.rail.a = String(rw);
      const tracks = (w.curtainStyle1 && w.curtainStyle2) ? 2 : 1;
      w.rail.b = String(tracks);
      w.rail.n = String(tracks);
      w.rail.t = String(Math.round((rw / 100) * tracks * 100) / 100);
    }

    const wfAll = masterDB.widthFormulas || [];
    const hfAll = masterDB.heightFormulas || [];

    const wf1 = (w.widthFormulaId1 && wfAll.find(f => f.id === w.widthFormulaId1))
      || getWidthFormulasForStyle(w.curtainStyle1)[0] || null;
    const hf1 = (w.heightFormulaId1 && hfAll.find(f => f.id === w.heightFormulaId1))
      || getHeightFormulasForWindow(w.curtainStyle1, w.rodType, w.hookSize)[0] || null;

    if (wf1 || hf1) {
      const r1 = computeCurtainLayerByWidthHeight(w, wf1, hf1);
      if (r1.a) w.blackout.a = r1.a;
      if (r1.b) w.blackout.b = r1.b;
      if (r1.n) w.blackout.n = r1.n;
      if (r1.t) w.blackout.t = r1.t;
    } else if (rw || rh) {
      if (rw) w.blackout.a = String(rw);
      if (rh) w.blackout.b = String(rh);
    }

    if (w.curtainStyle2 || w.widthFormulaId2 || w.heightFormulaId2) {
      const style2 = w.curtainStyle2 || w.curtainStyle1;
      const wf2 = (w.widthFormulaId2 && wfAll.find(f => f.id === w.widthFormulaId2))
        || getWidthFormulasForStyle(style2)[0] || null;
      const hf2 = (w.heightFormulaId2 && hfAll.find(f => f.id === w.heightFormulaId2))
        || getHeightFormulasForWindow(style2, w.rodType, w.hookSize)[0] || null;
      if (wf2 || hf2) {
        const r2 = computeCurtainLayerByWidthHeight(w, wf2, hf2);
        if (r2.a) w.sheer.a = r2.a;
        if (r2.b) w.sheer.b = r2.b;
        if (r2.n) w.sheer.n = r2.n;
        if (r2.t) w.sheer.t = r2.t;
      }
    }
    renderWindowsEditor(); changed();
  },
  addLayer(i) {
    const sh = currentSheet(); if (!sh) return;
    sh.windows[i].layers.push({ op: 'split', target: 'all', label: '' });
    renderWindowsEditor(); changed();
  },
  incPane(i) {
    const sh = currentSheet(); if (!sh || !sh.windows[i]) return;
    const w = sh.windows[i];
    w.paneStyle = String(Math.min(24, getPaneCount(w) + 1));
    renderWindowsEditor(); changed();
  },
  decPane(i) {
    const sh = currentSheet(); if (!sh || !sh.windows[i]) return;
    const w = sh.windows[i];
    w.paneStyle = String(Math.max(1, getPaneCount(w) - 1));
    renderWindowsEditor(); changed();
  },
  delLayer(i, li) {
    const sh = currentSheet(); if (!sh) return;
    const list = sh.windows[i].layers;
    if (list.length <= 1) { list[0] = { op: '', target: 'all', label: '' }; }
    else list.splice(li, 1);
    renderWindowsEditor(); changed();
  },
  addNote(focus = true) {
    const sh = currentSheet(); if (!sh) return;
    sh.notes.push(''); renderNotesEditor(); changed();
    if (focus) document.querySelector(`[data-note="${sh.notes.length - 1}"]`).focus();
  },
  delNote(i) {
    const sh = currentSheet(); if (!sh) return;
    sh.notes.splice(i, 1); if (!sh.notes.length) sh.notes.push('');
    renderNotesEditor(); changed();
  },
  syncFromPlan() {
    const sh = currentSheet(); if (!sh) return;
    syncWindowsFromPlan(sh);
    renderWindowsEditor();
    renderTopSheetNav();
    changed();
  },
  openPlan() {
    const sh = currentSheet(); if (!sh) return;
    PlanEditor.open(sh.plan.items, items => {
      sh.plan.items = items;
      syncWindowsFromPlan(sh);
      renderPlanMini();
      renderWindowsEditor();
      renderTopSheetNav();
      changed();
    });
  },
  clearLogo() {
    const ord = currentOrder(); if (!ord) return;
    ord.company.logo = ''; document.getElementById('logoFile').value = ''; changed();
  },
  openDbStaff() { MasterDBModal.open(isAdminUser() ? 'staff' : 'curtains'); },
  openDbCurtains() { MasterDBModal.open('curtains'); },
  openDbHooks() { MasterDBModal.open('hooks'); },
  openDbRemarks() { MasterDBModal.open('remarks'); },
  openDbWidthFormulas() { MasterDBModal.open('widthFormulas'); },
  openDbHeightFormulas() { MasterDBModal.open('heightFormulas'); },
};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b) {
    const fn = actions[b.dataset.act];
    if (fn) fn(b.dataset.i !== undefined ? +b.dataset.i : undefined, b.dataset.li !== undefined ? +b.dataset.li : undefined);
    return;
  }
  const navCust = e.target.closest('[data-nav-cust]');
  if (navCust) {
    activeTabMode = 'customer';
    renderTopSheetNav();
    return;
  }
  const st = e.target.closest('[data-sheet-tab]');
  if (st) {
    activeTabMode = 'sheet';
    activeSheetIdx = +st.dataset.sheetTab;
    renderAllWorkspace();
    syncPreviewToSheet(activeSheetIdx, 0);
    return;
  }
  const winCard = e.target.closest('.win-ed[data-win-idx]');
  if (winCard && activeTabMode === 'sheet') {
    const wIdx = +winCard.dataset.winIdx;
    const targetChunk = Math.floor(wIdx / 4);
    const targetPageIdx = findPreviewPageIdxForSheet(activeSheetIdx, targetChunk);
    if (currentPreviewPageIdx !== targetPageIdx) {
      syncPreviewToSheet(activeSheetIdx, targetChunk);
    }
  }
  const secBtn = e.target.closest('[data-sec]');
  if (secBtn) {
    applySectionFilter(secBtn.dataset.sec);
    return;
  }
  const dOpen = e.target.closest('[data-dash-open]');
  if (dOpen) { openOrder(dOpen.dataset.dashOpen, 'sheet', 0); return; }
  const dDup = e.target.closest('[data-dash-dup]');
  if (dDup) {
    const orig = orders.find(o => o.id === dDup.dataset.dashDup);
    if (orig && canAccessOrder(orig)) {
      const copy = JSON.parse(JSON.stringify(orig));
      copy.id = 'ord_' + Date.now();
      const u = getCurrentUser();
      if (u && u.username) copy.ownerUsername = u.username;
      copy.updatedAt = new Date().toISOString();
      orders.unshift(copy);
      saveOrders(); renderDashboard();
    }
    return;
  }
  const dDel = e.target.closest('[data-dash-del]');
  if (dDel) {
    const idx = orders.findIndex(o => o.id === dDel.dataset.dashDel);
    if (idx >= 0 && canAccessOrder(orders[idx]) && confirm(`ต้องการลบออเดอร์ของลูกค้า "${orders[idx].customer.name || '(ยังไม่ระบุ)'}" หรือไม่?`)) {
      orders.splice(idx, 1);
      saveOrders(); renderDashboard();
    }
  }
});

document.getElementById('planMini').addEventListener('click', () => actions.openPlan());
document.getElementById('btnGoFirstRoom').addEventListener('click', () => {
  activeTabMode = 'sheet';
  activeSheetIdx = 0;
  renderAllWorkspace();
  syncPreviewToSheet(0, 0);
});

// Top Sheet Nav Left/Right Arrows & Add/Dup/Del Sheet (Req #10)
document.getElementById('btnPrevSheet').addEventListener('click', () => {
  const ord = currentOrder(); if (!ord) return;
  if (activeTabMode === 'sheet') {
    if (activeSheetIdx > 0) activeSheetIdx--;
    else activeTabMode = 'customer';
  }
  renderAllWorkspace();
  if (activeTabMode === 'sheet') syncPreviewToSheet(activeSheetIdx, 0);
});

document.getElementById('btnNextSheet').addEventListener('click', () => {
  const ord = currentOrder(); if (!ord) return;
  if (activeTabMode === 'customer') {
    activeTabMode = 'sheet';
    activeSheetIdx = 0;
  } else if (activeSheetIdx < ord.sheets.length - 1) {
    activeSheetIdx++;
  }
  renderAllWorkspace();
  if (activeTabMode === 'sheet') syncPreviewToSheet(activeSheetIdx, 0);
});

document.getElementById('btnAddSheet').addEventListener('click', () => {
  const ord = currentOrder(); if (!ord) return;
  ord.sheets.push(newSheet(ord.sheets.length + 1));
  activeTabMode = 'sheet';
  activeSheetIdx = ord.sheets.length - 1;
  renderAllWorkspace();
  syncPreviewToSheet(activeSheetIdx, 0);
  touchAndSave();
});

document.getElementById('btnDupSheet').addEventListener('click', () => {
  const ord = currentOrder(); const sh = currentSheet();
  if (!ord || !sh) return;
  const copy = JSON.parse(JSON.stringify(sh));
  copy.id = 'sh_' + Date.now();
  ord.sheets.splice(activeSheetIdx + 1, 0, copy);
  activeTabMode = 'sheet';
  activeSheetIdx += 1;
  renderAllWorkspace();
  syncPreviewToSheet(activeSheetIdx, 0);
  touchAndSave();
});

document.getElementById('btnDelSheet').addEventListener('click', () => {
  const ord = currentOrder(); if (!ord) return;
  if (ord.sheets.length <= 1) { alert('ต้องมีอย่างน้อย 1 หน้าห้องในออเดอร์'); return; }
  if (!confirm(`ลบหน้าห้องที่ ${activeSheetIdx + 1} ออกจากออเดอร์นี้?`)) return;
  ord.sheets.splice(activeSheetIdx, 1);
  if (activeSheetIdx >= ord.sheets.length) activeSheetIdx = ord.sheets.length - 1;
  activeTabMode = 'sheet';
  renderAllWorkspace();
  syncPreviewToSheet(activeSheetIdx, 0);
  touchAndSave();
});

// Enter in a note -> insert a new note below
document.getElementById('notesEditor').addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target.dataset.note) return;
  e.preventDefault();
  const sh = currentSheet(); if (!sh) return;
  const i = +e.target.dataset.note;
  sh.notes.splice(i + 1, 0, '');
  renderNotesEditor(); changed();
  document.querySelector(`[data-note="${i + 1}"]`).focus();
});

document.getElementById('logoFile').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const ord = currentOrder(); if (!ord) return;
  const rd = new FileReader();
  rd.onload = () => { ord.company.logo = rd.result; changed(); };
  rd.readAsDataURL(f);
});

/* ---------------- Topbar & Dashboard controls ---------------- */
document.getElementById('btnHome').addEventListener('click', showDashboard);
document.getElementById('btnMasterDb').addEventListener('click', () => MasterDBModal.open(isAdminUser() ? 'staff' : 'curtains'));
document.getElementById('orderSearch').addEventListener('input', renderDashboard);

document.getElementById('btnNewOrder').addEventListener('click', () => {
  const ord = defaultOrder(orders.length + 1);
  if (orders[0] && orders[0].company) ord.company = JSON.parse(JSON.stringify(orders[0].company));
  const u = getCurrentUser();
  if (u) {
    ord.ownerUsername = u.username || '';
    ord.staff.name = u.name || '';
    ord.staff.dept = u.dept || '';
    ord.staff.branch = u.branch || '';
  }
  orders.unshift(ord);
  saveOrders();
  openOrder(ord.id, 'customer', 0);
});

function fileBase() {
  const ord = currentOrder();
  if (!ord) return 'MTO_Order';
  const n = [ord.customer.name, ord.staff.name].filter(Boolean).join('_') || 'MTO_Order';
  return 'MTO_' + n.replace(/[\\/:*?"<>|\s]+/g, '_');
}

document.getElementById('btnSaveJson').onclick = () => {
  const ord = currentOrder(); if (!ord) return;
  const blob = new Blob([JSON.stringify(ord, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = fileBase() + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

document.getElementById('fileImportOrder').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const parsed = JSON.parse(rd.result);
      const ord = normalizeOrder(parsed, orders.length + 1);
      ord.id = 'ord_' + Date.now();
      ord.updatedAt = new Date().toISOString();
      orders.unshift(ord);
      saveOrders();
      openOrder(ord.id, 'sheet', 0);
    } catch (err) {
      alert('ไฟล์ไม่ถูกต้อง: ' + err.message);
    }
    e.target.value = '';
  };
  rd.readAsText(f);
});

document.getElementById('btnPrint').onclick = () => { renderPreview(); window.print(); };

async function exportPDF() {
  renderPreview();
  if (!window.html2canvas || !window.jspdf) {
    alert('โหลดไลบรารีสร้าง PDF ไม่ได้ (ต้องเชื่อมต่ออินเทอร์เน็ต)\nจะเปิดหน้าพิมพ์แทน — เลือกเครื่องพิมพ์เป็น "Save as PDF / บันทึกเป็น PDF"');
    window.print(); return;
  }
  const busy = document.getElementById('busy');
  const prev = document.getElementById('preview');
  busy.hidden = false;
  const oldZoom = prev.style.getPropertyValue('--zoom');
  const prevMode = previewMode;
  previewMode = 'all';
  applyPreviewPageVisibility();
  prev.style.setProperty('--zoom', '1');
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    const pages = prev.querySelectorAll('.page');
    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], {
        scale: 2.5, backgroundColor: '#ffffff', useCORS: true, logging: false,
        width: 794, height: 1123, windowWidth: 1400,
        onclone: doc => {
          doc.querySelectorAll('.page').forEach(p => { p.style.boxShadow = 'none'; });
          doc.querySelectorAll('.no-print').forEach(el => { el.style.display = 'none'; });
        },
      });
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
    }
    pdf.save(fileBase() + '.pdf');
  } catch (err) {
    console.error(err);
    alert('สร้าง PDF ไม่สำเร็จ: ' + err.message + '\nลองใช้ปุ่ม "พิมพ์" แล้วเลือก "บันทึกเป็น PDF" แทน');
  } finally {
    previewMode = prevMode;
    applyPreviewPageVisibility();
    prev.style.setProperty('--zoom', oldZoom);
    busy.hidden = true;
  }
}
document.getElementById('btnPdf').onclick = exportPDF;

/* ---------------- Preview Zoom & View Modes (Req #13) ---------------- */
const zoomEl = document.getElementById('zoom');
function setZoom(pct) {
  pct = Math.max(35, Math.min(160, Math.round(pct)));
  zoomEl.value = pct;
  document.getElementById('zoomVal').textContent = pct + '%';
  document.getElementById('preview').style.setProperty('--zoom', pct / 100);
}
function fitZoomWidth() {
  const wrap = document.getElementById('previewWrap');
  if (!wrap || !wrap.clientWidth) return;
  setZoom((wrap.clientWidth - 44) / 794 * 100);
}
function fitZoomPage() {
  const wrap = document.getElementById('previewWrap');
  if (!wrap || !wrap.clientHeight) return;
  const hPct = (wrap.clientHeight - 58) / 1123 * 100;
  const wPct = (wrap.clientWidth - 44) / 794 * 100;
  setZoom(Math.min(hPct, wPct));
}
zoomEl.addEventListener('input', () => setZoom(+zoomEl.value));
document.getElementById('zoomFitWidth').onclick = fitZoomWidth;
document.getElementById('zoomFitPage').onclick = fitZoomPage;

document.getElementById('modeAllPages').onclick = () => {
  previewMode = 'all';
  applyPreviewPageVisibility();
  syncPreviewToSheet(activeSheetIdx, 0);
};
document.getElementById('modeSinglePage').onclick = () => {
  previewMode = 'single';
  applyPreviewPageVisibility();
};
document.getElementById('prevPreviewPage').onclick = () => {
  const nextIdx = Math.max(0, currentPreviewPageIdx - 1);
  syncEditorToPreviewPage(nextIdx);
  applyPreviewPageVisibility();
};
document.getElementById('nextPreviewPage').onclick = () => {
  const total = document.querySelectorAll('#preview .page').length || 1;
  const nextIdx = Math.min(total - 1, currentPreviewPageIdx + 1);
  syncEditorToPreviewPage(nextIdx);
  applyPreviewPageVisibility();
};

// ซิงค์เวลาเลื่อนดูหน้างานฝั่งซ้าย <-> ฝั่งขวา ให้แสดงหน้าเดียวกันเสมอ
document.getElementById('previewWrap').addEventListener('scroll', () => {
  if (isSyncingScroll || previewMode !== 'all') return;
  const wrap = document.getElementById('previewWrap');
  const pageEls = document.querySelectorAll('#preview .page');
  if (!wrap || !pageEls.length) return;
  const wrapRect = wrap.getBoundingClientRect();
  const midY = wrapRect.top + wrapRect.height * 0.35;
  let bestIdx = currentPreviewPageIdx;
  let bestDist = Infinity;
  pageEls.forEach((p, idx) => {
    const r = p.getBoundingClientRect();
    const d = Math.abs((r.top + r.bottom) / 2 - midY);
    if (d < bestDist) { bestDist = d; bestIdx = idx; }
  });
  if (bestIdx !== currentPreviewPageIdx) {
    isSyncingScroll = true;
    syncEditorToPreviewPage(bestIdx, false);
    document.getElementById('singlePageIndicator').textContent = `${currentPreviewPageIdx + 1}/${pageEls.length}`;
    setTimeout(() => { isSyncingScroll = false; }, 150);
  }
}, { passive: true });

document.getElementById('editor').addEventListener('scroll', () => {
  if (isSyncingScroll || activeTabMode !== 'sheet') return;
  const sh = currentSheet();
  if (!sh || (sh.windows || []).length <= 4) return;
  const ed = document.getElementById('editor');
  const edRect = ed.getBoundingClientRect();
  const midY = edRect.top + edRect.height * 0.35;
  const cards = ed.querySelectorAll('.win-ed[data-win-idx]');
  let bestWinIdx = 0;
  let bestDist = Infinity;
  cards.forEach(c => {
    const r = c.getBoundingClientRect();
    const d = Math.abs((r.top + r.bottom) / 2 - midY);
    if (d < bestDist) { bestDist = d; bestWinIdx = +c.dataset.winIdx; }
  });
  const targetChunk = Math.floor(bestWinIdx / 4);
  const targetPageIdx = findPreviewPageIdxForSheet(activeSheetIdx, targetChunk);
  if (targetPageIdx !== currentPreviewPageIdx) {
    syncPreviewToSheet(activeSheetIdx, targetChunk);
  }
}, { passive: true });

/* ---------------- Login / Logout Listeners & Init ---------------- */
document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const uInput = document.getElementById('loginUsername').value.trim();
  const pInput = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');

  const staffList = (typeof masterDB !== 'undefined' && Array.isArray(masterDB.staff)) ? masterDB.staff : [];
  let matched = staffList.find(s =>
    String(s.username || '').trim().toLowerCase() === uInput.toLowerCase() &&
    String(s.password || '') === pInput
  );
  if (!matched && uInput.toLowerCase() === 't58121' && pInput === 'Admin') {
    matched = { username: 'T58121', password: 'Admin', role: 'admin', name: 'แอดมิน (T58121)', dept: 'Admin', branch: 'สำนักงานใหญ่' };
  }

  if (!matched) {
    errEl.hidden = false;
    return;
  }

  errEl.hidden = true;
  try {
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify({
      username: matched.username,
      loginAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('localStorage auth save failed', err);
  }
  document.getElementById('loginPassword').value = '';
  applyUserRoleUI();
  showDashboard();
});

document.getElementById('btnLogout').addEventListener('click', () => {
  try { localStorage.removeItem(LOCAL_AUTH_KEY); } catch (e) {}
  showLoginView();
});

PlanEditor.init();
MasterDBModal.init(() => {
  if (isUserLoggedIn()) {
    applyUserRoleUI();
    if (activeOrderId) renderAllWorkspace();
    else renderDashboard();
  }
});

if (isUserLoggedIn()) {
  applyUserRoleUI();
  showDashboard();
  if (location.hash === '#open' && orders[0] && canAccessOrder(orders[0])) {
    openOrder(orders[0].id, 'sheet', 0);
  }
} else {
  showLoginView();
}

if (typeof RealtimeSync !== 'undefined') RealtimeSync.init();
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    if (activeOrderId && isUserLoggedIn()) renderPreview();
  });
}

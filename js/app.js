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
    calcMode: 'auto', // 'auto' | 'manual'
    manualFields: {}, // เลือกกรอกเองเฉพาะบางรายการ: { railW, railH, railA, railB, railN, railT, boA, boB, boN, boT, shA, shB, shN, shT }
    customRailW: '',
    customRailH: '',
    unequalSplit: false,
    splitLeft: '',
    splitRight: '',
    railTracks: '',   // จำนวนรางม่าน (ชั้น): '' = อัตโนมัติ, '1' = 1 ชั้น, '2' = 2 ชั้น
    pieces1: '',      // จำนวนผืน ชั้นที่ 1: '' = ตามสูตร, '1', '2', '3', '4'
    pieces2: '',      // จำนวนผืน ชั้นที่ 2
    noRail: false,    // กรณีไม่รับรางม่าน
    noRailStatus: 'ใช้รางเดิม', // ข้อความแสดงในช่องจำนวนราง: 'ใช้รางเดิม' | 'ไม่เอาราง'
    railCountUnit: '', // หน่วยช่องชั้น: '' = อัตโนมัติ, 'ชั้น', 'ผืน', 'ชุด'
    railUnit: '',      // หน่วยช่องจำนวนราง: '' = อัตโนมัติตามฐานข้อมูลราง, 'เมตร', 'ชุด', 'ชุด/เมตร', 'เมตร/ชุด', 'ตร.ม.'
    railSetRanges: '', // กำหนดช่วงแบ่งชุดเฉพาะบาน (ถ้าว่างใช้จากฐานข้อมูลราง)
    floorMode: 'std',  // ระยะลอย/กองพื้นบนแปลน: 'std' (ลอย 1 ซม. ตามฐานข้อมูล) | 'float' (ลอยมากขึ้น) | 'touch' (พอดีพื้น) | 'puddle' (กองพื้น)
    floorAdjust: '',   // ตัวเลขระยะปรับ ซม. (ไม่ดูเครื่องหมาย +/- ดูตัวเลขแล้วคำนวณตาม floorMode)
    rowLabel1: '',     // ชื่อแถวที่ 1 (ค่าเริ่มต้น "รางม่าน" หรือ "ผืนที่ 1" สำหรับม่านม้วน/มู่ลี่)
    rowLabel2: '',     // ชื่อแถวที่ 2 (ค่าเริ่มต้น "ผ้าม่านทึบ")
    rowLabel3: '',     // ชื่อแถวที่ 3 (ค่าเริ่มต้น "ผ้าม่านโปร่ง")
    blindPieces: [],   // ม่านม้วน/มู่ลี่หลายผืน: [{ w, h }]  ผืนที่ 1, ผืนที่ 2 ...
    noRailDeductPreset: 'existing_pleat_2',
    noRailDeductCustom: '',
    backLayerHeightDeduct: '0', // กรณีม่าน 2 ชั้น เลือกลดความสูงม่านชั้นด้านหลังเพิ่มได้ 0, 0.5 หรือ 1 ซม.
    backLayerTarget: 'layer2',  // 'layer2' = ชั้นที่ 2 ม่านโปร่ง (ด้านหลัง), 'layer1' = ชั้นที่ 1 ม่านทึบ
    fabricCol1: '',             // รายการผ้าที่เลือกจากตารางผ้าด้านล่างสำหรับชั้นที่ 1 ('blackout'|'sheer'|'roller'|'blinds'|'other')
    fabricCol2: '',             // รายการผ้าที่เลือกจากตารางผ้าด้านล่างสำหรับชั้นที่ 2
    specialType: '',            // '' | 'gable' (ม่านจั่ว 5 รูปแบบ) | 'side_join' (ผ้าม่านเย็บต่อด้านข้าง)
    gable: {
      type: '1',                // '1'..'5' ตามไฟล์แนบ 5 หน้า
      title: '',
      fullA: '', fullB: '', fullC: '',
      redA: '', redB: '', redC: '',
      widthLeft: '', widthRight: '', widthTotal: '',
      heightDeduct: '2',
      noteDeduct: '',
      hemClearanceType: 'float', // 'float' = ลอยจากพื้น | 'puddle' = กองพื้น | 'touch' = พอดีพื้น
      hemClearanceVal: '',       // ระยะชายม่านที่ต้องการ (ซม.)
      railLeft: calcRow(), boLeft: calcRow(), shLeft: calcRow(),
      railRight: calcRow(), boRight: calcRow(), shRight: calcRow(),
      boName: '', boDesign: '', boColor: '', boQty: '',
      shName: '', shDesign: '', shColor: '', shQty: '',
    },
    sideJoin: {
      type: 'both_sides',
      title: '',
      mainWidth: '', borderWidth: '30', height: '',
      mainFabName: '', mainDesign: '', mainColor: '', mainQty: '',
      joinFabName: '', joinDesign: '', joinColor: '', joinQty: '',
      note: '',
    },
    yardMode1: 'exact', // 'exact' | 'ceil_yard' | 'ceil_plus' | 'exact_plus'
    extraYards1: '',
    yardMode2: 'exact',
    extraYards2: '',
    railModel: '',
    curtainStyle1: '',
    curtainStyle2: '',
    curtainType: '',
    rodType: '',
    hookSize: '',
    widthFormulaId1: '',
    heightFormulaId1: '',
    fabricId1: '',
    grainType1: 'opaque',
    fabricRuleId1: '',
    blindId1: '',
    widthFormulaId2: '',
    heightFormulaId2: '',
    fabricId2: '',
    grainType2: 'sheer',
    fabricRuleId2: '',
    blindId2: '',
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
    staff: { name: '', dept: '', branch: '', orderNo: '-' },
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
  const isAdmin = u.role === 'admin';
  document.body.classList.toggle('role-staff', !isAdmin);
  document.getElementById('loginView').hidden = true;
  document.getElementById('mainTopbar').hidden = false;
  const badge = document.getElementById('userBadge');
  if (badge) {
    badge.hidden = false;
    badge.textContent = `👤 ${u.name || u.username} (${isAdmin ? 'Admin' : 'พนักงาน'})`;
  }
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) btnLogout.hidden = false;
  const btnMasterDb = document.getElementById('btnMasterDb');
  if (btnMasterDb) btnMasterDb.hidden = !isAdmin;
  document.querySelectorAll('.admin-only-db').forEach(el => {
    el.hidden = !isAdmin;
  });
  if (!isAdmin) {
    const dbModal = document.getElementById('dbModal');
    if (dbModal) dbModal.hidden = true;
  }
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
  if (nw.calcMode !== 'manual') nw.calcMode = 'auto';
  nw.paneStyle = String(getPaneCount(nw));
  const rh = +calcRailHeight(nw) || +nw.height || 0;
  if (rh && !nw.noRail && nw.calcMode !== 'manual' && !(nw.manualFields && nw.manualFields.railB)) {
    if (!nw.rail.b || nw.rail.b === '1' || nw.rail.b === '2') {
      nw.rail.b = String(rh);
    }
  }
  if (nw.blackout && nw.blackout.t) {
    nw.blackout.t = String(nw.blackout.t).replace(/\s*หน้า\s*\/\s*/g, '/');
  }
  if (nw.sheer && nw.sheer.t) {
    nw.sheer.t = String(nw.sheer.t).replace(/\s*หน้า\s*\/\s*/g, '/');
  }
  // ล้างค่าผิดพลาดเดิม "8 x -1.5" บนบานที่ยังไม่มีขนาดหน้าต่าง/ประตู
  const hasAnyDim = !!(parseFloat(nw.width) > 0 || parseFloat(nw.height) > 0 || parseFloat(nw.customRailW) > 0 || parseFloat(nw.customRailH) > 0);
  if (!hasAnyDim && nw.calcMode !== 'manual') {
    if (nw.blackout && nw.blackout.a === '8' && nw.blackout.b === '-1.5') nw.blackout = calcRow();
    if (nw.sheer && nw.sheer.a === '8' && nw.sheer.b === '-1.5') nw.sheer = calcRow();
  }
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
    if (!ord.staff.orderNo || !String(ord.staff.orderNo).trim() || /^MTO-\d+$/i.test(String(ord.staff.orderNo).trim())) {
      ord.staff.orderNo = '-';
    }
    return ord;
  }
  const ord = mergeDefaults(defaultOrder(idx), raw);
  if (!ord.staff.orderNo || !String(ord.staff.orderNo).trim() || /^MTO-\d+$/i.test(String(ord.staff.orderNo).trim())) {
    ord.staff.orderNo = '-';
  }
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
    const hay = [o.staff.orderNo, o.customer.name, o.customer.mobile, o.customer.building, o.customer.road, o.staff.name, o.staff.branch]
      .map(x => String(x || '').toLowerCase()).join(' ');
    return hay.includes(q);
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="c" style="padding:24px;color:#777">ไม่พบรายการออเดอร์ — กด "➕ สร้างออเดอร์ใหม่" ด้านบน</td></tr>`;
    return;
  }

  // Count how many plans each customer name has
  const custPlanCount = {};
  accessible.forEach(o => {
    const k = String(o.customer.name || '').trim().toLowerCase();
    if (k) custPlanCount[k] = (custPlanCount[k] || 0) + 1;
  });

  tbody.innerHTML = filtered.map(o => {
    const pageCount = expandOrderPages(o).length;
    const cName = o.customer.name || '(ยังไม่ระบุชื่อลูกค้า)';
    const cKey = String(o.customer.name || '').trim().toLowerCase();
    const multiBadge = (cKey && custPlanCount[cKey] > 1)
      ? ` <span class="pill" style="background:#eef4ff;color:#1f6feb;font-size:11px">มี ${custPlanCount[cKey]} แปลนงาน</span>`
      : '';
    const locSummary = [o.customer.building, o.customer.houseNo ? `เลขที่ ${o.customer.houseNo}` : '', o.customer.road ? `ถ.${o.customer.road}` : '', o.customer.district]
      .filter(Boolean).join(' ');
    return `<tr>
      <td class="c"><b>${esc(o.staff.orderNo || '-')}</b></td>
      <td>
        <b>${esc(cName)}</b>${multiBadge}
        ${locSummary ? `<div style="font-size:11.5px;color:#555">📍 ${esc(locSummary)}</div>` : ''}
      </td>
      <td class="c">${esc(o.customer.mobile || '-')}</td>
      <td class="c">${esc(o.staff.name || '-')}</td>
      <td class="c">${esc(o.staff.branch || '-')}</td>
      <td class="c"><span class="pill">${pageCount} หน้า</span></td>
      <td class="c">${fmtDateTime(o.updatedAt)}</td>
      <td class="c">
        <button type="button" class="primary" data-dash-open="${o.id}">📝 เปิดฟอร์ม</button>
        <button type="button" data-dash-newplan="${o.id}" title="สร้างแปลนงานเพิ่มให้ลูกค้ารายนี้ (กรณีมีที่พักอาศัยหลายที่)">🏠+ แปลนใหม่</button>
        <button type="button" data-dash-dup="${o.id}" title="คัดลอกออเดอร์">⧉</button>
        <button type="button" class="danger" data-dash-del="${o.id}" title="ลบออเดอร์">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

function createNewPlanForCustomer(sourceOrder) {
  if (!sourceOrder) return;
  const ord = defaultOrder(orders.length + 1);
  if (sourceOrder.company) ord.company = JSON.parse(JSON.stringify(sourceOrder.company));
  // คัดลอกชื่อลูกค้าและข้อมูลติดต่อ (ให้สามารถระบุที่พักอาศัยแห่งใหม่หรือแก้ไขที่อยู่ได้ทันที)
  ord.customer = Object.assign(ord.customer, {
    name: sourceOrder.customer.name || '',
    mobile: sourceOrder.customer.mobile || '',
    tel: sourceOrder.customer.tel || '',
    email: sourceOrder.customer.email || '',
  });
  const u = getCurrentUser();
  if (u) {
    ord.ownerUsername = u.username || '';
    ord.staff.name = u.name || sourceOrder.staff.name || '';
    ord.staff.dept = u.dept || sourceOrder.staff.dept || '';
    ord.staff.branch = u.branch || sourceOrder.staff.branch || '';
  } else {
    ord.staff.name = sourceOrder.staff.name || '';
    ord.staff.dept = sourceOrder.staff.dept || '';
    ord.staff.branch = sourceOrder.staff.branch || '';
  }
  ord.staff.orderNo = '-';
  orders.unshift(ord);
  saveOrders();
  openOrder(ord.id, 'customer', 0);
}

function renderExistingCustomerSelect() {
  const sel = document.getElementById('existingCustomerSelect');
  if (!sel) return;
  const accessible = orders.filter(o => canAccessOrder(o) && o.customer && String(o.customer.name || '').trim());
  const byName = new Map();
  accessible.forEach(o => {
    const nameKey = String(o.customer.name).trim().toLowerCase();
    if (!byName.has(nameKey)) {
      byName.set(nameKey, { order: o, count: 1 });
    } else {
      byName.get(nameKey).count++;
    }
  });
  const list = Array.from(byName.values());
  sel.innerHTML = `<option value="">-- เลือกชื่อลูกค้าที่มีอยู่แล้ว เพื่อดึงข้อมูล (${list.length} รายชื่อ) --</option>` +
    list.map(({ order, count }) => {
      const c = order.customer;
      return `<option value="${esc(order.id)}">${esc(c.name)} (${esc(c.mobile || '-')} • มี ${count} แปลนงาน)</option>`;
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
  setRightOnlyMode(true);
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
  const no = (ord.staff && ord.staff.orderNo && String(ord.staff.orderNo).trim()) ? ord.staff.orderNo : '-';
  badge.textContent = `เลขที่ ${no} • ${ord.customer.name || 'ยังไม่ระบุชื่อลูกค้า'}${ord.staff.name ? ' • ' + ord.staff.name : ''}`;
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

  const btnMoveL = document.getElementById('btnMoveSheetLeft');
  const btnMoveR = document.getElementById('btnMoveSheetRight');
  if (btnMoveL) btnMoveL.disabled = (activeTabMode !== 'sheet' || activeSheetIdx <= 0);
  if (btnMoveR) btnMoveR.disabled = (activeTabMode !== 'sheet' || activeSheetIdx >= ord.sheets.length - 1);
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

function isFieldManual(w, key) {
  if (!w) return false;
  if (w.calcMode === 'manual') return true;
  return !!(w.manualFields && w.manualFields[key]);
}

/**
 * ดึงรายการผ้าที่ผู้ใช้เลือก/กรอกไว้ใน "ตารางผ้า (7. ข้อมูลผ้า)" ของหน้านั้นๆ
 * เพื่อให้แต่ละบานเลือกผ้าตามที่กำหนดไว้ในตารางผ้าของหน้านั้นได้
 */
function getSheetTableFabricChoices(sh) {
  if (!sh || !sh.fabrics) return [];
  const f = sh.fabrics;
  const fabAll = (typeof masterDB !== 'undefined' && Array.isArray(masterDB.fabrics)) ? masterDB.fabrics : [];
  const blindAll = (typeof masterDB !== 'undefined' && Array.isArray(masterDB.blinds)) ? masterDB.blinds : [];
  const colDefs = [
    ['blackout', 'ผ้าม่านทึบ'],
    ['sheer', 'ผ้าม่านโปร่ง'],
    ['roller', 'ม่านม้วน'],
    ['blinds', 'มู่ลี่'],
    ['other', f.other && f.other.label ? f.other.label : 'อื่นๆ'],
  ];
  const out = [];
  colDefs.forEach(([colKey, colTitle]) => {
    const cell = f[colKey];
    if (!cell) return;
    const name = String(cell.name || '').trim();
    if (!name) return;
    const design = String(cell.design || '').trim();
    const color = String(cell.color || '').trim();
    const isBlindCol = colKey === 'roller' || colKey === 'blinds';
    const fabricObj = !isBlindCol
      ? (fabAll.find(x => String(x.name || '').trim() === name && (!design || !x.design || String(x.design).trim() === design))
        || fabAll.find(x => String(x.name || '').trim() === name)
        || { id: 'sheet_' + colKey, name, design, fabricWidth: colKey === 'sheer' ? 300 : 140, yRepeat: 0, calcMode: colKey === 'sheer' ? 'both' : 'opaque' })
      : null;
    const blindObj = isBlindCol
      ? (blindAll.find(x => String(x.name || '').trim() === name) || { id: 'sheet_' + colKey, name, curtainStyle: colTitle, minSqm: 1.5, roundMode: 'ceil_1dec' })
      : null;
    out.push({
      colKey,
      colTitle,
      name,
      design,
      color,
      isBlindCol,
      fabricObj,
      blindObj,
      displayText: `[${colTitle}] ${name}${design ? ' • ดีไซน์ ' + design : ''}${color ? ' • สี ' + color : ''}${fabricObj ? ' (หน้าผ้า ' + fabricObj.fabricWidth + ' ซม.)' : ''}`,
    });
  });
  return out;
}

function resolveWindowFabricChoice(w, sh, layerNo) {
  const choices = getSheetTableFabricChoices(sh);
  const fabAll = (typeof masterDB !== 'undefined' && Array.isArray(masterDB.fabrics)) ? masterDB.fabrics : [];
  const colField = layerNo === 1 ? 'fabricCol1' : 'fabricCol2';
  const idField = layerNo === 1 ? 'fabricId1' : 'fabricId2';

  if (w[colField]) {
    const matched = choices.find(c => c.colKey === w[colField]);
    if (matched) {
      if (matched.fabricObj && matched.fabricObj.id) w[idField] = matched.fabricObj.id;
      return matched.fabricObj;
    }
  }
  if (w[idField]) {
    const byId = fabAll.find(x => x.id === w[idField]);
    if (byId) {
      const matchCol = choices.find(c => c.name === byId.name);
      if (matchCol && !w[colField]) w[colField] = matchCol.colKey;
      return byId;
    }
  }
  return null;
}

function autoUpdateSheetFabricTableQty(sh) {
  if (!sh || !sh.fabrics) return;
  const sums = (typeof computePageFabricQtySums === 'function')
    ? computePageFabricQtySums(sh, sh.windows || [])
    : { blackout: 0, sheer: 0, roller: 0, blinds: 0, other: 0 };
  ['blackout', 'sheer', 'roller', 'blinds', 'other'].forEach(ck => {
    if (!sh.fabrics[ck]) return;
    if (!sh.fabrics[ck].manualQty) {
      sh.fabrics[ck].qty = sums[ck] > 0 ? String(sums[ck]) : '';
    }
  });
}

function formatFloorStatusSummary(w) {
  const mode = String((w && w.floorMode) || 'std');
  const mag = (typeof parseUnsignedFloat === 'function') ? parseUnsignedFloat(w && w.floorAdjust) : Math.abs(parseFloat(w && w.floorAdjust) || 0);
  if (mode === 'float') {
    const total = Math.round((1 + mag) * 100) / 100;
    return `ลอยจากพื้นมากขึ้น +${mag} ซม. → รวมลอยจากพื้น ${total} ซม. (ลดความสูงผ้าลง -${mag} ซม. จากมาตรฐาน 1 ซม.)`;
  }
  if (mode === 'touch') {
    return 'พอดีพื้น 0 ซม. (บวกคืนความสูงผ้า +1 ซม. จากมาตรฐานลอย 1 ซม.)';
  }
  if (mode === 'puddle') {
    return `กองพื้น ${mag} ซม. (บวกเพิ่มความสูงผ้า +${Math.round((1 + mag) * 100) / 100} ซม. จากมาตรฐานลอย 1 ซม.)`;
  }
  return 'มาตรฐานฐานข้อมูล (ลอยจากพื้น 1 ซม.)';
}

/**
 * คำนวณแปลนงานม่านจั่ว
 * 1) ขนาดรางม่านจั่ว (Z): พีทาโกรัส X² + Y² = Z² (ปัดเศษลงเป็นจำนวนเต็ม Math.floor)
 *    โดย X = ความสูงที่สูงสุดของบานนั้นๆ ลบด้วย ความสูงที่เตี้ยสุดของบานนั้นๆ (เฉพาะบานผ้าม่านผืนนั้น)
 *        Y = ความกว้างของบานผ้าม่านผืนนั้นๆ (ไม่ใช่ทั้งหมด)
 * 2) ความสูงม่านจั่ว = ความสูงที่สูงที่สุดของบาน/ช่วงนั้นๆ แล้วลดขนาดตามที่กำหนด (heightDeduct)
 * 3) ความกว้างผ้าม่าน = คำนวณตามสูตรของแต่ละรูปแบบม่าน (ใช้ขนาดรางเอียง Z เป็น RW)
 *    และปริมาณผ้าจะคำนวณเฉพาะเมื่อเลือกผ้าแล้วเท่านั้น
 */
function calcGableSlopeLength(spanWidth, hLow, hHigh) {
  const X = Math.abs((parseFloat(hHigh) || 0) - (parseFloat(hLow) || 0));
  const Y = parseFloat(spanWidth) || 0;
  if (Y <= 0) return 0;
  return Math.floor(Math.sqrt((X * X) + (Y * Y)) + 1e-9);
}

function autoCalculateGable(w, sh) {
  if (!w || w.specialType !== 'gable') return;
  if (!w.gable || typeof w.gable !== 'object') w.gable = {};
  const g = w.gable;
  if (!g.type) g.type = '1';
  const gType = String(g.type);
  const isSingleSpan = gType === '3' || gType === '5';
  const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

  // ชื่อห้องแปลนม่านจั่ว = ชื่อห้อง + ตำแหน่งหน้าต่าง/ประตู (เช่น ห้องนอนใหญ่ W1)
  const roomName = (sh && sh.room && String(sh.room.name || '').trim()) || '';
  const autoTitle = [roomName, String(w.label || '').trim()].filter(Boolean).join(' ');
  if (!g.titleManual) g.title = autoTitle;

  const deduct = num(g.heightDeduct);
  const fullA = num(g.fullA);
  const fullB = num(g.fullB);
  const fullC = num(g.fullC);

  g.redA = fullA > 0 ? String(Math.max(0, Math.round((fullA - deduct) * 100) / 100)) : '';
  g.redB = fullB > 0 ? String(Math.max(0, Math.round((fullB - deduct) * 100) / 100)) : '';
  g.redC = (!isSingleSpan && fullC > 0) ? String(Math.max(0, Math.round((fullC - deduct) * 100) / 100)) : '';

  const redANum = num(g.redA);
  const redBNum = num(g.redB);
  const redCNum = num(g.redC);
  const wLeft = num(g.widthLeft);
  const wRight = num(g.widthRight);
  const wTotal = num(g.widthTotal) || (wLeft + wRight);
  const effTracks = +w.railTracks || ((w.curtainStyle1 && w.curtainStyle2) ? 2 : 1);
  const isTwoLayer = effTracks >= 2 || !!(w.curtainStyle1 && w.curtainStyle2);
  const backDeductVal = isTwoLayer ? num(w.backLayerHeightDeduct) : 0;
  const backDeduct1 = (w.backLayerTarget === 'layer1') ? backDeductVal : 0;
  const backDeduct2 = (w.backLayerTarget !== 'layer1') ? backDeductVal : 0;

  ['railLeft', 'boLeft', 'shLeft', 'railRight', 'boRight', 'shRight'].forEach(k => {
    g[k] = calcRow();
  });

  const style1 = String(w.curtainStyle1 || '').trim();
  const style2 = String(w.curtainStyle2 || '').trim();
  const wfAll = masterDB.widthFormulas || [];
  const ruleAll = masterDB.fabricCalcRules || [];
  const fab1 = resolveWindowFabricChoice(w, sh, 1);
  const fab2 = resolveWindowFabricChoice(w, sh, 2);
  // บานจำลองสำหรับคำนวณม่านจั่ว (หักลดเฉพาะ heightDeduct ของจั่ว)
  const calcWin = Object.assign({}, w, { noRail: false, unequalSplit: false, calcMode: 'auto', manualFields: {} });

  const calcLayer = (layerNo, railZ, curtainH, piecesForSpan) => {
    const style = layerNo === 1 ? style1 : (style2 || style1);
    if (!style || railZ <= 0 || curtainH <= 0) return null;
    const layerType = layerNo === 1 ? 'opaque' : 'sheer';
    const wf = (w[`widthFormulaId${layerNo}`] && wfAll.find(f => f.id === w[`widthFormulaId${layerNo}`]))
      || getWidthFormulasForStyle(style, piecesForSpan, effTracks, w.rodType, layerType)[0]
      || null;
    const fabItem = layerNo === 1 ? fab1 : fab2;
    let grain = w[`grainType${layerNo}`] || (layerNo === 1 ? 'opaque' : 'sheer');
    if (fabItem && !canFabricUseSheerGrain(fabItem.fabricWidth)) grain = 'opaque';
    const rule = (w[`fabricRuleId${layerNo}`] && ruleAll.find(r => r.id === w[`fabricRuleId${layerNo}`]))
      || getFabricCalcRulesForStyle(style, grain)[0]
      || null;
    return computeCurtainLayerByWidthHeight(calcWin, wf, null, {
      curtainStyle: style,
      pieces: piecesForSpan,
      railTracks: effTracks,
      fabric: fabItem,
      grainType: grain,
      fabricRule: rule,
      yardMode: w[`yardMode${layerNo}`] || 'exact',
      extraYards: w[`extraYards${layerNo}`] || 0,
      overrideRW: railZ,
      overrideRH: curtainH,
      skipFloorAdjust: true,
    });
  };

  const fillSpan = (side, spanW, hLowFull, hHighFull, maxRedH, piecesForSpan) => {
    const railZ = calcGableSlopeLength(spanW, hLowFull, hHighFull);
    const fullMaxH = Math.max(hLowFull, hHighFull);
    const rail = g[`rail${side}`];
    if (railZ > 0 || fullMaxH > 0) {
      rail.a = railZ > 0 ? String(railZ) : '';
      rail.b = fullMaxH > 0 ? String(fullMaxH) : '';
      rail.n = String(effTracks);
      rail.t = railZ > 0 ? String(Math.round(Math.max(1, railZ / 100) * effTracks * 100) / 100) : '';
    }
    g[`slope${side}`] = railZ > 0 ? String(railZ) : '';
    if (style1) {
      const h1 = Math.max(0, Math.round((maxRedH - backDeduct1) * 100) / 100);
      const r1 = calcLayer(1, railZ, h1, piecesForSpan);
      if (r1) Object.assign(g[`bo${side}`], { a: r1.a || '', b: r1.b || '', n: r1.n || '', t: r1.t || '' });
    }
    if (style2) {
      const h2 = Math.max(0, Math.round((maxRedH - backDeduct2) * 100) / 100);
      const r2 = calcLayer(2, railZ, h2, piecesForSpan);
      if (r2) Object.assign(g[`sh${side}`], { a: r2.a || '', b: r2.b || '', n: r2.n || '', t: r2.t || '' });
    }
  };

  if (isSingleSpan) {
    // ช่วงเดียว (แบบที่ 3 / 5): X = |สูงสุด - เตี้ยสุด| ของบาน, Y = ความกว้างของบานนั้น
    const pieces1 = Math.max(1, parseInt(w.pieces1, 10) || 1);
    fillSpan('Left', wTotal, fullA, fullB, Math.max(redANum, redBNum), String(pieces1));
    g.slopeRight = '';
  } else {
    // แบ่งซ้าย-ขวา (แบบที่ 1 / 2 / 4):
    // บานซ้าย: X = |max(A,B) - min(A,B)|, Y = กว้างบานซ้ายเท่านั้น
    // บานขวา: X = |max(B,C) - min(B,C)|, Y = กว้างบานขวาเท่านั้น
    fillSpan('Left', wLeft, fullA, fullB, Math.max(redANum, redBNum), '1');
    fillSpan('Right', wRight, fullB, fullC, Math.max(redBNum, redCNum), '1');
  }

  // รวมจำนวนหลาของม่านจั่ว (ซ้าย + ขวา) — ว่างเปล่าหากยังไม่ได้เลือกผ้า
  const sumYards = (...rows) => {
    const total = rows.reduce((s, r) => s + (r && r.t ? extractYardsFromCalcText(r.t) : 0), 0);
    return total > 0 ? String(Math.round(total * 10) / 10) : '';
  };
  if (!g.boQtyManual) g.boQty = sumYards(g.boLeft, g.boRight);
  if (!g.shQtyManual) g.shQty = sumYards(g.shLeft, g.shRight);

  // ซิงค์ความกว้าง/สูงวัดจริงเข้าบานหลักกรณีบานหลักยังว่าง
  const totalMeasW = isSingleSpan ? wTotal : (wLeft + wRight);
  const maxFullH = isSingleSpan ? Math.max(fullA, fullB) : Math.max(fullA, fullB, fullC);
  if (totalMeasW > 0 && !w.width) w.width = String(totalMeasW);
  if (maxFullH > 0 && !w.height) w.height = String(maxFullH);
}

function autoCalculateWindow(w, sh) {
  if (!w) return;
  if (!w.manualFields || typeof w.manualFields !== 'object') w.manualFields = {};
  const mf = w.manualFields;
  const isAllManual = w.calcMode === 'manual';

  if (w.specialType === 'gable') {
    autoCalculateGable(w, sh);
    if (!isAllManual && w.gable) {
      const g = w.gable;
      const gType = String(g.type || '1');
      const isSingleSpan = gType === '3' || gType === '5';
      const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
      if (w.noRail) {
        const railRes = computeWindowRailRow(w, sh);
        if (!mf.railA) w.rail.a = railRes.a;
        if (!mf.railB) w.rail.b = railRes.b;
        if (!mf.railN) w.rail.n = railRes.n;
        if (!mf.railT) w.rail.t = railRes.t;
      } else if (isSingleSpan) {
        if (!mf.railA) w.rail.a = g.railLeft.a || '';
        if (!mf.railB) w.rail.b = g.railLeft.b || '';
        if (!mf.railN) w.rail.n = g.railLeft.n || '';
        if (!mf.railT) w.rail.t = g.railLeft.t || '';
      } else {
        const rL = num(g.railLeft.a), rR = num(g.railRight.a);
        const effTracks = +w.railTracks || ((w.curtainStyle1 && w.curtainStyle2) ? 2 : 1);
        const maxRailH = Math.max(num(g.railLeft.b), num(g.railRight.b));
        const totalRailM = (rL > 0 ? Math.max(1, rL / 100) * effTracks : 0) + (rR > 0 ? Math.max(1, rR / 100) * effTracks : 0);
        if (!mf.railA) w.rail.a = (rL && rR) ? `${rL}/${rR}` : String(rL || rR || '');
        if (!mf.railB) w.rail.b = maxRailH > 0 ? String(maxRailH) : '';
        if (!mf.railN) w.rail.n = (rL || rR) ? String(effTracks) : '';
        if (!mf.railT) w.rail.t = totalRailM > 0 ? String(Math.round(totalRailM * 100) / 100) : '';
      }

      const syncMainLayerFromGable = (prefix, leftRow, rightRow) => {
        const aF = prefix + 'A', bF = prefix + 'B', nF = prefix + 'N', tF = prefix + 'T';
        const targetObj = prefix === 'bo' ? w.blackout : w.sheer;
        const sumPanels = rowStr => {
          const s = String(rowStr || '');
          if (!s.includes('/')) return 0;
          return parseInt(s.split('/')[0], 10) || 0;
        };
        if (isSingleSpan) {
          if (!mf[aF]) targetObj.a = leftRow.a || '';
          if (!mf[bF]) targetObj.b = leftRow.b || '';
          if (!mf[nF]) targetObj.n = leftRow.n || '';
          if (!mf[tF]) targetObj.t = leftRow.t || '';
        } else {
          const la = leftRow.a || '', ra = rightRow.a || '';
          const lb = num(leftRow.b), rb = num(rightRow.b);
          const ln = num(leftRow.n), rn = num(rightRow.n);
          const totalPanels = sumPanels(leftRow.t) + sumPanels(rightRow.t);
          const totalYards = (leftRow.t ? extractYardsFromCalcText(leftRow.t) : 0) + (rightRow.t ? extractYardsFromCalcText(rightRow.t) : 0);
          if (!mf[aF]) targetObj.a = (la && ra) ? (la === ra ? la : `${la}/${ra}`) : (la || ra);
          if (!mf[bF]) targetObj.b = Math.max(lb, rb) > 0 ? String(Math.max(lb, rb)) : '';
          if (!mf[nF]) targetObj.n = (ln + rn) > 0 ? String(ln + rn) : '';
          if (!mf[tF]) {
            targetObj.t = totalYards > 0
              ? (totalPanels > 0 ? `${totalPanels}/${Math.round(totalYards * 10) / 10}` : String(Math.round(totalYards * 10) / 10))
              : '';
          }
        }
      };
      syncMainLayerFromGable('bo', g.boLeft, g.boRight);
      syncMainLayerFromGable('sh', g.shLeft, g.shRight);

      if (sh) autoUpdateSheetFabricTableQty(sh);
      return;
    }
  }

  const rw = +calcRailWidth(w) || +w.width || 0;
  const rh = +calcRailHeight(w) || +w.height || 0;
  const effTracks = +w.railTracks || ((w.curtainStyle1 && w.curtainStyle2) ? 2 : 1);
  const isTwoLayer = effTracks >= 2 || !!(w.curtainStyle1 && w.curtainStyle2);
  const backDeductVal = isTwoLayer ? (parseFloat(w.backLayerHeightDeduct) || 0) : 0;
  const extraDeduct1 = (isTwoLayer && w.backLayerTarget === 'layer1') ? backDeductVal : 0;
  const extraDeduct2 = (isTwoLayer && w.backLayerTarget !== 'layer1') ? backDeductVal : 0;

  if (!isAllManual) {
    const railRes = computeWindowRailRow(w, sh);
    if (!mf.railA) w.rail.a = railRes.a;
    if (!mf.railB) w.rail.b = railRes.b;
    if (!mf.railN) w.rail.n = railRes.n;
    if (!mf.railT) w.rail.t = railRes.t;
  }

  const wfAll = masterDB.widthFormulas || [];
  const hfAll = masterDB.heightFormulas || [];
  const blindAll = masterDB.blinds || [];
  const ruleAll = masterDB.fabricCalcRules || [];

  // ต้องเลือกข้อมูล (เช่น รูปแบบผ้าม่าน ชั้นที่ 1) และต้องมีขนาดหน้าต่าง/ประตูของบานนี้ก่อน จึงจะเริ่มคำนวณ
  const style1 = String(w.curtainStyle1 || '').trim();
  const hasLayer1Selection = !!(style1 || w.widthFormulaId1 || w.heightFormulaId1 || w.fabricCol1);

  if (!isAllManual) {
    if (hasLayer1Selection && (rw > 0 || rh > 0)) {
      const wf1 = (w.widthFormulaId1 && wfAll.find(f => f.id === w.widthFormulaId1))
        || (style1 ? getWidthFormulasForStyle(style1, w.pieces1, effTracks, w.rodType, 'opaque')[0] : null);
      const hf1 = (w.heightFormulaId1 && hfAll.find(f => f.id === w.heightFormulaId1))
        || findAutoHeightFormulaForWindow(style1, w.rodType, w.hookSize, effTracks, w.pieces1);
      const fab1 = resolveWindowFabricChoice(w, sh, 1);
      if (fab1 && !canFabricUseSheerGrain(fab1.fabricWidth)) {
        w.grainType1 = 'opaque';
      }
      const grain1 = w.grainType1 || 'opaque';
      const rule1 = (w.fabricRuleId1 && ruleAll.find(r => r.id === w.fabricRuleId1))
        || (style1 ? getFabricCalcRulesForStyle(style1, grain1)[0] : null);
      const blind1 = (w.blindId1 && blindAll.find(b => b.id === w.blindId1))
        || (isBlindOrRollerStyle(style1) ? getBlindsForStyle(style1)[0] : null);

      const r1 = computeCurtainLayerByWidthHeight(w, wf1, hf1, {
        curtainStyle: style1,
        pieces: w.pieces1 || (wf1 && wf1.pieces) || '',
        railTracks: effTracks,
        fabric: fab1,
        grainType: grain1,
        fabricRule: rule1,
        blindItem: blind1,
        yardMode: w.yardMode1 || 'exact',
        extraYards: w.extraYards1 || 0,
        extraHeightDeduct: extraDeduct1,
      });
      if (!mf.boA) w.blackout.a = r1.a || '';
      if (!mf.boB) w.blackout.b = r1.b || '';
      if (!mf.boN) w.blackout.n = r1.n || '';
      if (!mf.boT) w.blackout.t = r1.t || '';
    } else if (rw <= 0 && rh <= 0) {
      if (!mf.boA) w.blackout.a = '';
      if (!mf.boB) w.blackout.b = '';
      if (!mf.boN) w.blackout.n = '';
      if (!mf.boT) w.blackout.t = '';
    }
  }

  // Layer 2 (ม่านโปร่ง) — ต้องเลือกรูปแบบผ้าม่านชั้นที่ 2 หรือเลือกผ้าชั้นที่ 2 และมีขนาดก่อนจึงจะเริ่มคำนวณ
  const style2 = String(w.curtainStyle2 || '').trim();
  const hasLayer2Selection = !!(style2 || w.widthFormulaId2 || w.heightFormulaId2 || w.fabricCol2);
  if (!isAllManual) {
    if (hasLayer2Selection && (rw > 0 || rh > 0)) {
      const effStyle2 = style2 || style1;
      const wf2 = (w.widthFormulaId2 && wfAll.find(f => f.id === w.widthFormulaId2))
        || (effStyle2 ? getWidthFormulasForStyle(effStyle2, w.pieces2 || w.pieces1, effTracks, w.rodType, 'sheer')[0] : null);
      const hf2 = (w.heightFormulaId2 && hfAll.find(f => f.id === w.heightFormulaId2))
        || findAutoHeightFormulaForWindow(effStyle2, w.rodType, w.hookSize, effTracks, w.pieces2 || w.pieces1);
      const fab2 = resolveWindowFabricChoice(w, sh, 2);
      if (fab2 && !canFabricUseSheerGrain(fab2.fabricWidth)) {
        w.grainType2 = 'opaque';
      }
      const grain2 = w.grainType2 || 'sheer';
      const rule2 = (w.fabricRuleId2 && ruleAll.find(r => r.id === w.fabricRuleId2))
        || (effStyle2 ? getFabricCalcRulesForStyle(effStyle2, grain2)[0] : null);
      const blind2 = (w.blindId2 && blindAll.find(b => b.id === w.blindId2))
        || (isBlindOrRollerStyle(effStyle2) ? getBlindsForStyle(effStyle2)[0] : null);

      const r2 = computeCurtainLayerByWidthHeight(w, wf2, hf2, {
        curtainStyle: effStyle2,
        pieces: w.pieces2 || w.pieces1 || (wf2 && wf2.pieces) || '',
        railTracks: effTracks,
        fabric: fab2,
        grainType: grain2,
        fabricRule: rule2,
        blindItem: blind2,
        yardMode: w.yardMode2 || 'exact',
        extraYards: w.extraYards2 || 0,
        extraHeightDeduct: extraDeduct2,
      });
      if (!mf.shA) w.sheer.a = r2.a || '';
      if (!mf.shB) w.sheer.b = r2.b || '';
      if (!mf.shN) w.sheer.n = r2.n || '';
      if (!mf.shT) w.sheer.t = r2.t || '';
    } else if (rw <= 0 && rh <= 0) {
      if (!mf.shA) w.sheer.a = '';
      if (!mf.shB) w.sheer.b = '';
      if (!mf.shN) w.sheer.n = '';
      if (!mf.shT) w.sheer.t = '';
    }
  }

  // ซิงค์รุ่นรางและอัปเดตผลรวมจำนวนหลาในตารางผ้าของหน้าห้อง
  if (sh) {
    if (w.railModel && sh.rods) {
      const railObj = (masterDB.rails || []).find(r => r.name === w.railModel);
      if (railObj) {
        const catMap = { 'รางม่านจีบ': 'pleat', 'รางโชว์': 'show', 'รางม่านลอน': 'wave', 'รางม่านพับ': 'fold' };
        const rk = catMap[railObj.rodCategory || w.rodType] || 'pleat';
        if (sh.rods[rk] && !sh.rods[rk].model) {
          sh.rods[rk].model = railObj.name;
          if (!sh.rods[rk].color && railObj.defaultColor) sh.rods[rk].color = railObj.defaultColor;
        }
      }
    }
    if (w.specialType === 'gable' && w.gable) {
      if (w.blackout && w.blackout.t && !w.gable.boQty) {
        w.gable.boQty = String(extractYardsFromCalcText(w.blackout.t) || w.blackout.t);
      }
      if (w.sheer && w.sheer.t && !w.gable.shQty) {
        w.gable.shQty = String(extractYardsFromCalcText(w.sheer.t) || w.sheer.t);
      }
    }
    autoUpdateSheetFabricTableQty(sh);
  }
}
function windowEditorHTML(w, i, planOpenings) {
  const b = p => `data-sheet="windows.${i}.${p}"`;
  const isAdmin = isAdminUser();
  const dbBtnAttr = isAdmin ? 'class="admin-only-db"' : 'class="admin-only-db" hidden';
  const isManual = w.calcMode === 'manual';
  const mf = w.manualFields || {};
  const needHook = curtainNeedsHook(w.curtainStyle1, w.curtainStyle2);
  const curtainOpts = `<option value="">-- เลือก --</option>` +
    masterDB.curtains.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
  const hookOpts = `<option value="">-- เลือกขนาดตะขอ --</option>` +
    masterDB.hooks.map(h => `<option value="${esc(h.name)}">${esc(h.name)}</option>`).join('');
  const rodTypeOpts = `<option value="">-- เลือกประเภทรางม่าน --</option>` +
    ['รางม่านจีบ', 'รางโชว์', 'รางม่านลอน', 'รางม่านพับ'].map(rt => `<option value="${esc(rt)}">${esc(rt)}</option>`).join('');

  const railList = getRailsForStyle(w.curtainStyle1, w.rodType);
  const railModelOpts = `<option value="">-- เลือกรุ่นรางและอุปกรณ์ (${railList.length} รายการ) --</option>` +
    railList.map(r => `<option value="${esc(r.name)}">${esc(r.name)} (${esc(r.rodCategory || '-')}${r.curtainStyle ? ' • ' + esc(r.curtainStyle) : ''})</option>`).join('');

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
  const effTracks = +w.railTracks || ((w.curtainStyle1 && w.curtainStyle2) ? 2 : 1);

  const style1 = w.curtainStyle1 || '';
  const style2 = w.curtainStyle2 || w.curtainStyle1 || '';
  const isBlind1 = isBlindOrRollerStyle(style1);
  const isBlind2 = isBlindOrRollerStyle(style2);

  const wfList1 = getWidthFormulasForStyle(style1, w.pieces1, effTracks, w.rodType, 'opaque');
  const hfList1 = getHeightFormulasForWindow(style1, w.rodType, w.hookSize, effTracks, w.pieces1);
  const wfList2 = getWidthFormulasForStyle(style2, w.pieces2 || w.pieces1, effTracks, w.rodType, 'sheer');
  const hfList2 = getHeightFormulasForWindow(style2, w.rodType, w.hookSize, effTracks, w.pieces2 || w.pieces1);

  const layerTagTxt = lt => lt === 'opaque' ? 'ม่านทึบ' : (lt === 'sheer' ? 'ม่านโปร่ง' : 'ทึบ+โปร่ง');
  const wfOpts1 = `<option value="">-- อัตโนมัติตามเงื่อนไข (${wfList1.length} สูตร) --</option>` +
    wfList1.map(f => `<option value="${esc(f.id)}">[${layerTagTxt(f.layerType)}] ${esc(f.curtainStyle ? `${f.curtainStyle} • ` : '')}${esc(f.label)} (ผืน:${esc(f.pieces)}, ย่น:${esc(f.gatherRatio)}, เกย:${esc(f.overlap)}, อ้อม:${esc(f.sideReturn)})</option>`).join('');
  const hfOpts1 = `<option value="">-- อัตโนมัติตามเงื่อนไข (${hfList1.length} สูตร) --</option>` +
    hfList1.map(f => `<option value="${esc(f.id)}">${esc(f.curtainStyle ? `[${f.curtainStyle}] ` : '')}${esc(f.rodType ? `${f.rodType} ` : '')}${esc(f.hookSize ? `ตะขอ ${f.hookSize} ` : '')}${esc(f.label)} (${esc(f.heightExp)})</option>`).join('');
  const wfOpts2 = `<option value="">-- อัตโนมัติตามเงื่อนไข (${wfList2.length} สูตร) --</option>` +
    wfList2.map(f => `<option value="${esc(f.id)}">[${layerTagTxt(f.layerType)}] ${esc(f.curtainStyle ? `${f.curtainStyle} • ` : '')}${esc(f.label)} (ผืน:${esc(f.pieces)}, ย่น:${esc(f.gatherRatio)}, เกย:${esc(f.overlap)}, อ้อม:${esc(f.sideReturn)})</option>`).join('');
  const hfOpts2 = `<option value="">-- อัตโนมัติตามเงื่อนไข (${hfList2.length} สูตร) --</option>` +
    hfList2.map(f => `<option value="${esc(f.id)}">${esc(f.curtainStyle ? `[${f.curtainStyle}] ` : '')}${esc(f.rodType ? `${f.rodType} ` : '')}${esc(f.hookSize ? `ตะขอ ${f.hookSize} ` : '')}${esc(f.label)} (${esc(f.heightExp)})</option>`).join('');

  const sh = currentSheet();
  const sheetFabChoices = getSheetTableFabricChoices(sh);
  const sheetFabOpts = sheetFabChoices.length
    ? `<option value="">-- เลือกผ้าจากตารางผ้าของหน้านี้ (${sheetFabChoices.length} รายการ) --</option>` +
      sheetFabChoices.map(c => `<option value="${esc(c.colKey)}">${esc(c.displayText)}</option>`).join('')
    : `<option value="">-- กรุณาเลือกผ้าที่ตารางผ้าด้านล่างก่อน --</option>`;

  const selFab1 = resolveWindowFabricChoice(w, sh, 1);
  const allowSheer1 = !selFab1 || canFabricUseSheerGrain(selFab1.fabricWidth);
  const effGrain1 = (!allowSheer1 && w.grainType1 === 'sheer') ? 'opaque' : (w.grainType1 || 'opaque');
  const fRules1 = getFabricCalcRulesForStyle(style1, effGrain1);
  const fRuleOpts1 = `<option value="">-- สูตรปริมาณผ้า (${fRules1.length} สูตร) --</option>` +
    fRules1.map(r => `<option value="${esc(r.id)}">${esc(r.label)} (${r.grainType === 'sheer' ? 'เกรนโปร่ง' : 'เกรนทึบ'})</option>`).join('');

  const selFab2 = resolveWindowFabricChoice(w, sh, 2);
  const allowSheer2 = !selFab2 || canFabricUseSheerGrain(selFab2.fabricWidth);
  const effGrain2 = (!allowSheer2 && w.grainType2 === 'sheer') ? 'opaque' : (w.grainType2 || 'sheer');
  const fRules2 = getFabricCalcRulesForStyle(style2, effGrain2);
  const fRuleOpts2 = `<option value="">-- สูตรปริมาณผ้า (${fRules2.length} สูตร) --</option>` +
    fRules2.map(r => `<option value="${esc(r.id)}">${esc(r.label)} (${r.grainType === 'sheer' ? 'เกรนโปร่ง' : 'เกรนทึบ'})</option>`).join('');

  const blinds1 = getBlindsForStyle(style1);
  const blindOpts1 = `<option value="">-- เลือกมู่ลี่/ม่านม้วน (${blinds1.length} รายการ) --</option>` +
    blinds1.map(bl => `<option value="${esc(bl.id)}">${esc(bl.name)} [${esc(bl.curtainStyle)}] (ขั้นต่ำ ${esc(bl.minSqm || 1.5)} ตร.ม./ผืน)</option>`).join('');

  const unit1 = isBlind1 ? 'ตร.ม.' : 'หน้า/หลา';
  const unit2 = isBlind2 ? 'ตร.ม.' : 'หน้า/หลา';
  const isTwoLayer = effTracks >= 2 || !!(w.curtainStyle1 && w.curtainStyle2);
  const backDeductOpts = BACK_LAYER_DEDUCT_OPTIONS.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
  const specialTypeOpts = SPECIAL_WIN_TYPES.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
  const gableTypeOpts = GABLE_TYPES.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
  const sideJoinTypeOpts = SIDE_JOIN_TYPES.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
  const gType = (w.gable && w.gable.type) || '1';
  const isGableSingleSpan = gType === '3' || gType === '5';

  const lockBtn = (mKey, titleTxt) => {
    const locked = isFieldManual(w, mKey);
    return `<button type="button" class="field-mode-btn ${locked ? 'is-manual' : 'is-auto'}" data-act="toggleFieldManual" data-i="${i}" data-mkey="${mKey}" title="${locked ? 'ขณะนี้: กรอกเอง (คลิกเพื่อสลับเป็นคำนวณอัตโนมัติ)' : 'ขณะนี้: คำนวณอัตโนมัติ (คลิกเพื่อล็อกค่ากรอกเอง)'} — ${titleTxt}">${locked ? '✍️' : '⚡'}</button>`;
  };

  const calc = (key, mPrefix, title, u1, u2) => `<tr><th class="r">${title}</th>
    <td><div class="calc-cell-wrap">${lockBtn(mPrefix + 'A', title + ' กว้าง')}<input ${b(key + '.a')} data-mkey="${mPrefix}A" placeholder="กว้าง"></div></td><td class="op">×</td>
    <td><div class="calc-cell-wrap">${lockBtn(mPrefix + 'B', title + ' สูง')}<input ${b(key + '.b')} data-mkey="${mPrefix}B" placeholder="สูง"></div></td><td class="op">=</td>
    <td><div class="calc-cell-wrap">${lockBtn(mPrefix + 'N', title + ' จำนวน')}<input ${b(key + '.n')} data-mkey="${mPrefix}N" placeholder="${u1}"></div></td><td class="op">=</td>
    <td><div class="calc-cell-wrap">${lockBtn(mPrefix + 'T', title + ' รวม')}<input ${b(key + '.t')} data-mkey="${mPrefix}T" placeholder="${u2}"></div></td></tr>`;

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

  const noRailDeductVal = getNoRailHeightDeduction(w);
  const noRailPresetOpts = NO_RAIL_DEDUCT_PRESETS.filter(p => p[0] !== '0').map(([v, labelText]) =>
    `<option value="${esc(v)}">${esc(labelText)}</option>`
  ).join('');
  const yardModeOpts = YARD_DISPLAY_MODES.map(([v, labelText]) =>
    `<option value="${esc(v)}">${esc(labelText)}</option>`
  ).join('');

  const manualKeysCount = Object.values(mf).filter(Boolean).length;

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

    <div class="calc-mode-bar" style="flex-wrap:wrap;gap:6px">
      <span>⚙️ โหมดคำนวณ / กรอกเอง (เลือกเฉพาะบางรายการหรือทั้งหมดได้):</span>
      <div class="inline" style="flex-wrap:wrap">
        <button type="button" class="${!isManual && manualKeysCount === 0 ? 'primary' : ''}" data-act="setAllAuto" data-i="${i}" title="ตั้งค่าให้ทุกรายการคำนวณอัตโนมัติตามสูตร">⚡ อัตโนมัติทั้งหมด</button>
        <button type="button" class="${isManual ? 'primary' : ''}" data-act="setAllManual" data-i="${i}" title="ตั้งค่าให้กรอกเองทุกรายการ">✍️ กรอกเองทั้งหมด</button>
        ${!isManual && manualKeysCount > 0 ? `<span class="pill" style="background:#fff3cd;color:#856404;font-size:11px">✍️ กรอกเองบางรายการ (${manualKeysCount} ช่อง) • กดปุ่ม ⚡/✍️ หน้าช่องเพื่อสลับ</span>` : `<span style="font-size:11px;color:#555">กดปุ่ม ⚡/✍️ หน้าแต่ละช่องเพื่อเลือกกรอกเองเฉพาะบางรายการได้</span>`}
      </div>
    </div>

    <div class="grid2" style="margin-top:6px">
      <label>รูปแบบผ้าม่านชั้นที่ 1 (ม่านทึบ/หลัก)
        <span class="inline">
          <select ${b('curtainStyle1')}>${curtainOpts}</select>
          <button type="button" data-act="openDbCurtains" ${dbBtnAttr} title="เพิ่ม/แก้ไขรูปแบบผ้าม่าน">🗄️</button>
        </span>
      </label>
      <label>รูปแบบผ้าม่านชั้นที่ 2 (ม่านโปร่ง - ถ้าต่างกันจะคั่น "/")
        <select ${b('curtainStyle2')}>${curtainOpts}</select>
      </label>
      <label>จำนวนผืน ชั้นที่ 1 / ชั้นที่ 2 (เงื่อนไขคำนวณขนาดม่าน)
        <span class="inline">
          <select ${b('pieces1')} title="จำนวนผืน ชั้นที่ 1">
            <option value="">ชั้น 1: ตามสูตร</option>
            <option value="1">ชั้น 1: 1 ผืน (รวบข้างเดียว)</option>
            <option value="2">ชั้น 1: 2 ผืน (แยกกลาง)</option>
            <option value="3">ชั้น 1: 3 ผืน</option>
            <option value="4">ชั้น 1: 4 ผืน</option>
          </select>
          <select ${b('pieces2')} title="จำนวนผืน ชั้นที่ 2">
            <option value="">ชั้น 2: ตามชั้น 1/สูตร</option>
            <option value="1">ชั้น 2: 1 ผืน</option>
            <option value="2">ชั้น 2: 2 ผืน</option>
            <option value="3">ชั้น 2: 3 ผืน</option>
            <option value="4">ชั้น 2: 4 ผืน</option>
          </select>
        </span>
      </label>
      <label>จำนวนรางม่าน(ชั้น) & ประเภทรางม่าน
        <span class="inline">
          <select ${b('railTracks')} style="max-width:115px" title="จำนวนชั้นรางม่าน">
            <option value="">อัตโนมัติ (${effTracks} ชั้น)</option>
            <option value="1">ราง 1 ชั้น</option>
            <option value="2">ราง 2 ชั้น</option>
          </select>
          <select ${b('rodType')}>${rodTypeOpts}</select>
        </span>
      </label>
      <label>รุ่นรางและอุปกรณ์เสริม
        <span class="inline">
          <select ${b('railModel')}>${railModelOpts}</select>
          <button type="button" data-act="openDbRails" ${dbBtnAttr} title="ฐานข้อมูลรางม่านและอุปกรณ์เสริม">🗄️</button>
        </span>
      </label>
      <label>ขนาดตะขอ ${needHook ? '<b>(ม่านจีบ/ลอน)</b>' : '<small>(เฉพาะม่านจีบ/ลอน)</small>'}
        <span class="inline">
          <select ${b('hookSize')} ${needHook ? '' : 'disabled'}>${hookOpts}</select>
          <button type="button" data-act="openDbHooks" ${dbBtnAttr} title="เพิ่ม/แก้ไขขนาดตะขอ">🗄️</button>
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
    </div>

    <div style="margin-top:6px;padding:7px 9px;background:#fff8f6;border:1px dashed #ef9a9a;border-radius:6px">
      <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:6px">
        <label class="inline" style="font-weight:700;color:#b71c1c;cursor:pointer">
          <input type="checkbox" ${b('noRail')}>
          🚫 ไม่รับรางม่าน (ให้ระบบลดขนาดความสูงผ้าม่านตามตัวเลือกพร้อมรายละเอียด)
        </label>
        ${w.noRail ? `<span style="font-size:11.5px;color:#b71c1c;font-weight:700">ลดความสูงผ้าม่านลง: <b>-${esc(noRailDeductVal)} ซม.</b></span>` : ''}
      </div>
      ${w.noRail ? `
        <div class="grid2" style="margin-top:6px">
          <label>ข้อความแสดงในช่องจำนวนราง (เมื่อไม่เอาราง)
            <select ${b('noRailStatus')}>
              <option value="ใช้รางเดิม">ใช้รางเดิม</option>
              <option value="ไม่เอาราง">ไม่เอาราง</option>
            </select>
          </label>
          <label>เลือกรายละเอียดการลดขนาดความสูงผ้าม่าน
            <select ${b('noRailDeductPreset')}>${noRailPresetOpts}</select>
          </label>
          ${w.noRailDeductPreset === 'custom' ? `
            <label class="full">ระบุระยะที่ต้องการลดความสูงผ้าม่านเอง (ซม.)
              <input type="number" step="any" min="0" ${b('noRailDeductCustom')} placeholder="เช่น 2.5">
            </label>
          ` : ''}
        </div>
      ` : ''}
    </div>

    ${isTwoLayer ? `
      <div style="margin-top:6px;padding:7px 9px;background:#f4fbf7;border:1px dashed #81c784;border-radius:6px">
        <div class="grid2">
          <label>กรณีม่าน 2 ชั้น: เลือกลดความสูงผ้าม่านชั้นด้านหลังเพิ่ม
            <select ${b('backLayerHeightDeduct')}>${backDeductOpts}</select>
          </label>
          <label>ชั้นม่านที่อยู่ด้านหลัง (ที่ต้องการลดความสูงเพิ่ม)
            <select ${b('backLayerTarget')}>
              <option value="layer2">ชั้นที่ 2 (ม่านโปร่ง — ค่ามาตรฐาน)</option>
              <option value="layer1">ชั้นที่ 1 (ม่านทึบ)</option>
            </select>
          </label>
        </div>
      </div>
    ` : ''}

    <div style="margin-top:6px;padding:7px 9px;background:#f6f3ff;border:1px dashed #b39ddb;border-radius:6px">
      <div class="grid2">
        <label class="full">⭐ รายการพิเศษ (แสดงหน้าขยายแยกต่างหากในหน้าถัดไปของรายการพิเศษนี้)
          <select ${b('specialType')}>${specialTypeOpts}</select>
        </label>
      </div>
      ${w.specialType === 'gable' ? `
        <div style="margin-top:6px;padding:8px;background:#fff;border:1px solid #d1c4e9;border-radius:6px">
          <b style="color:#4527a0">📐 ตั้งค่าแปลนงานม่านจั่ว (แสดงแยกในหน้าถัดไปตามไฟล์แนบ 5 รูปแบบ)</b>
          <div class="grid2" style="margin-top:6px">
            <label class="full">เลือกรูปแบบม่านจั่ว (1–5)
              <select ${b('gable.type')}>${gableTypeOpts}</select>
            </label>
            <label>หัวข้อแปลนงานม่านจั่ว (ดึงชื่อห้อง+ตำแหน่งอัตโนมัติ)
              <input ${b('gable.title')} placeholder="เช่น ห้องนอนใหญ่ W1">
            </label>
            <label>ระยะลดความสูงม่านจั่ว (ซม.)
              <input type="number" step="any" ${b('gable.heightDeduct')} placeholder="เช่น 2">
            </label>
            <label>ระยะชายม่านท้ายใบม่านจั่ว
              <select ${b('gable.hemClearanceType')}>
                <option value="float">ลอยจากพื้น</option>
                <option value="touch">พอดีพื้น</option>
                <option value="puddle">กองพื้น</option>
              </select>
            </label>
            <label>ระบุระยะชายม่านที่ต้องการ (ซม.)
              <input type="number" step="any" ${b('gable.hemClearanceVal')} placeholder="เช่น 1 หรือ 2">
            </label>
            ${isGableSingleSpan ? `
              <label class="full">ความกว้างที่วัดได้จริง (ซม.)
                <input type="number" step="any" ${b('gable.widthTotal')} placeholder="ระบุความกว้างที่วัดได้จริง">
              </label>
              <label>ความสูงเต็ม [A] (ซม.)
                <input type="number" step="any" ${b('gable.fullA')} placeholder="สูงเต็ม A">
              </label>
              <label>ความสูงเต็ม [B] (ซม.)
                <input type="number" step="any" ${b('gable.fullB')} placeholder="สูงเต็ม B">
              </label>
              <label>ขนาดความสูง [A] ที่ลดความสูงแล้ว (ซม.)
                <input type="number" step="any" ${b('gable.redA')} placeholder="คำนวณอัตโนมัติ">
              </label>
              <label>ขนาดความสูง [B] ที่ลดความสูงแล้ว (ซม.)
                <input type="number" step="any" ${b('gable.redB')} placeholder="คำนวณอัตโนมัติ">
              </label>
            ` : `
              <label>ความกว้างซ้าย ที่วัดได้จริง (ซม.)
                <input type="number" step="any" ${b('gable.widthLeft')} placeholder="กว้างซ้ายวัดจริง">
              </label>
              <label>ความกว้างขวา ที่วัดได้จริง (ซม.)
                <input type="number" step="any" ${b('gable.widthRight')} placeholder="กว้างขวาวัดจริง">
              </label>
              <label>ความสูงเต็ม [A] ซ้าย (ซม.)
                <input type="number" step="any" ${b('gable.fullA')} placeholder="สูงเต็ม A">
              </label>
              <label>ความสูงเต็ม [B] กลาง (ซม.)
                <input type="number" step="any" ${b('gable.fullB')} placeholder="สูงเต็ม B">
              </label>
              <label>ความสูงเต็ม [C] ขวา (ซม.)
                <input type="number" step="any" ${b('gable.fullC')} placeholder="สูงเต็ม C">
              </label>
              <label>หมายเหตุท้ายใบม่านจั่ว (ซม.)
                <input ${b('gable.noteDeduct')} placeholder="เช่น หักราง 2">
              </label>
              <label>ความสูง [A] ที่ลดความสูงแล้ว (ซม.)
                <input type="number" step="any" ${b('gable.redA')} placeholder="คำนวณอัตโนมัติ">
              </label>
              <label>ความสูง [B] ที่ลดความสูงแล้ว (ซม.)
                <input type="number" step="any" ${b('gable.redB')} placeholder="คำนวณอัตโนมัติ">
              </label>
              <label>ความสูง [C] ที่ลดความสูงแล้ว (ซม.)
                <input type="number" step="any" ${b('gable.redC')} placeholder="คำนวณอัตโนมัติ">
              </label>
            `}
          </div>
        </div>
      ` : ''}
      ${w.specialType === 'side_join' ? `
        <div style="margin-top:6px;padding:8px;background:#fff;border:1px solid #d1c4e9;border-radius:6px">
          <b style="color:#4527a0">🧵 ตั้งค่าแปลนงานผ้าม่านเย็บต่อด้านข้าง (แสดงแยกในหน้าถัดไป)</b>
          <div class="grid2" style="margin-top:6px">
            <label class="full">รูปแบบการเย็บต่อผ้า
              <select ${b('sideJoin.type')}>${sideJoinTypeOpts}</select>
            </label>
            <label>ความกว้างผ้าหลัก (ซม.)
              <input type="number" step="any" ${b('sideJoin.mainWidth')} placeholder="เช่น 200">
            </label>
            <label>ความกว้างแถบผ้าที่เย็บต่อ (ซม.)
              <input type="number" step="any" ${b('sideJoin.borderWidth')} placeholder="เช่น 30">
            </label>
            <label>ชื่อผ้าที่นำมาเย็บต่อด้านข้าง
              <input list="dlFabrics" ${b('sideJoin.joinFabName')} placeholder="ระบุชื่อผ้าต่อข้าง">
            </label>
            <label>รหัสดีไซน์ / สีของผ้าที่ต่อ
              <span class="inline">
                <input ${b('sideJoin.joinDesign')} placeholder="ดีไซน์">
                <input ${b('sideJoin.joinColor')} placeholder="สี">
              </span>
            </label>
            <label>จำนวนหลาผ้าต่อข้างที่ใช้
              <input ${b('sideJoin.joinQty')} placeholder="เช่น 6.5">
            </label>
            <label>หมายเหตุการเย็บต่อพิเศษ
              <input ${b('sideJoin.note')} placeholder="เช่น ต่อริมในฝั่งชนกลาง กว้าง 30 ซม.">
            </label>
          </div>
        </div>
      ` : ''}
    </div>

    <div class="opts">
      <div><span class="olbl">กล่องม่าน</span>
        <label><input type="radio" name="box${i}" value="no" ${b('box')}>ไม่มี</label>
        <label><input type="radio" name="box${i}" value="yes" ${b('box')}>มี</label>
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
        <b style="margin:0">📏 ขนาดและพื้นที่รอบบาน (ความสูงราง = สูงเฟรม + เผื่อบน + เผื่อล่าง)</b>
        <button type="button" data-act="openDbRemarks" ${dbBtnAttr} title="เพิ่ม/ลบ/แก้ไขข้อความหมายเหตุในฐานข้อมูล">🗄️ ฐานข้อมูลหมายเหตุ</button>
      </div>
      <div class="dim-grid">
        ${dimFieldRow(b, 'ความกว้าง (เฟรม)', 'width', 'noteWidth', i, true)}
        ${dimFieldRow(b, 'ความสูง (เฟรม)', 'height', 'noteHeight', i, true)}
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
      <div class="rail-summary" data-rail-sum="${i}" style="flex-wrap:wrap;gap:8px">
        <span class="inline" style="font-size:12px">
          ${lockBtn('railW', 'ขนาดความกว้างรางม่าน')}
          ${isFieldManual(w, 'railW')
            ? `กว้างราง (กรอกเอง): <input type="number" step="any" ${b('customRailW')} placeholder="ก.ราง" style="width:76px;font-weight:700">`
            : `กว้างรางม่าน (กว้าง+เผื่อซ้าย+เผื่อขวา) = <b>${railW || '-'}</b>`}
        </span>
        <span class="inline" style="font-size:12px">
          ${lockBtn('railH', 'ขนาดความสูงรางม่าน')}
          ${isFieldManual(w, 'railH')
            ? `สูงราง (กรอกเอง): <input type="number" step="any" ${b('customRailH')} placeholder="ส.ราง" style="width:76px;font-weight:700">`
            : `สูงรางม่าน (สูงเฟรม+เผื่อบน+เผื่อล่าง) = <b>${railH || '-'}</b>`}
        </span>
        <button type="button" data-act="fillSize" data-i="${i}">↘ ส่งค่าราง/ม่านลงตารางคำนวณ</button>
      </div>
      <div style="margin-top:6px;padding:7px 9px;background:#f7faff;border:1px dashed #90caf9;border-radius:6px">
        <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:6px">
          <label class="inline" style="font-weight:700;color:#0d47a1;cursor:pointer">
            <input type="checkbox" ${b('unequalSplit')}>
            ✂️ แบ่งผ้าม่านผืนซ้าย / ผืนขวา ไม่เท่ากัน (กำหนดจุดแบ่งที่รางม่านเดียวกัน • คิดหน้าและหลาแยกผืนแล้วนำมารวมกัน)
          </label>
          ${w.unequalSplit ? `<span style="font-size:11.5px;color:#1565c0;font-weight:700">ขนาดผ้าม่าน: <b>${esc(w.splitLeft || '?')}/${esc(w.splitRight || '?')}</b> | ขนาดรางม่าน: <b>${esc(railW || w.rail?.a || '-')}</b></span>` : ''}
        </div>
        ${w.unequalSplit ? `
          <div class="grid2" style="margin-top:6px">
            <label>ขนาดช่วงแบ่งผืนซ้าย (ซม.)
              <input type="number" step="any" ${b('splitLeft')} placeholder="เช่น 150">
            </label>
            <label>ขนาดช่วงแบ่งผืนขวา (ซม.)
              <input type="number" step="any" ${b('splitRight')} placeholder="เช่น 250">
            </label>
          </div>
          <div style="font-size:11px;color:#455a64;margin-top:3px">
            * แสดงจุดแบ่งและขนาดช่วงที่แบ่งกำกับไว้บนแปลนหน้าต่าง/ประตู โดยความกว้างผ้าม่านแสดงเป็น <b>ผืนซ้าย/ผืนขวา</b> (เช่น 150/250) และคำนวณจำนวนหน้า/จำนวนหลาแยกซ้าย+ขวาแล้วรวมกันอัตโนมัติ
          </div>
        ` : ''}
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
        <b style="margin:0">🧮 คำนวณขนาดราง / ผ้าม่านทึบ / ผ้าม่านโปร่ง (แสดง หน้า/หลา เช่น 5/8.9)</b>
        <div class="inline">
          <button type="button" data-act="jumpToSheetFabrics" title="เลือกรายการผ้าในตารางผ้าของหน้านี้ก่อน">🧵 ตารางผ้าของหน้านี้</button>
          <button type="button" class="primary" data-act="applyFormula" data-i="${i}" title="คำนวณตามสูตรความกว้าง ความสูง และปริมาณผ้า">⚡ คำนวณตามสูตร</button>
          <button type="button" data-act="openDbWidthFormulas" ${dbBtnAttr} title="ฐานข้อมูลคำนวณขนาดความกว้างผ้าม่าน">📐 สูตรกว้าง</button>
          <button type="button" data-act="openDbHeightFormulas" ${dbBtnAttr} title="ฐานข้อมูลคำนวณขนาดความสูงผ้าม่าน">📏 สูตรสูง</button>
          <button type="button" data-act="openDbFabricCalc" ${dbBtnAttr} title="ฐานข้อมูลคำนวณปริมาณผ้า">🧮 สูตรปริมาณผ้า</button>
        </div>
      </div>

      <div class="calc-auto-box">
        <div class="grid2">
          <label>สูตรความกว้าง (ชั้นที่ 1: ${esc(style1 || 'ม่านทึบ')})
            <select ${b('widthFormulaId1')}>${wfOpts1}</select>
          </label>
          <label>การลดความสูง / สูตรความสูง (ชั้นที่ 1: ${esc(style1 || 'ม่านทึบ')})
            <select ${b('heightFormulaId1')}>${hfOpts1}</select>
          </label>
        </div>
        ${isBlind1 ? `
          <div class="grid2">
            <label class="full">เลือกรายการมู่ลี่ / ม่านม้วน (จากตารางผ้า หรือฐานข้อมูล)
              <span class="inline">
                <select ${b('fabricCol1')}>${sheetFabOpts}</select>
                <select ${b('blindId1')}>${blindOpts1}</select>
              </span>
            </label>
          </div>
        ` : `
          <div class="grid3">
            <label>เลือกผ้าชั้นที่ 1 (จากตารางผ้าของหน้านี้)
              <select ${b('fabricCol1')}>${sheetFabOpts}</select>
            </label>
            <label>เกรนคำนวณผ้า ${!allowSheer1 ? '<small style="color:#c62828">(หน้าผ้า ≤ 270 ได้เฉพาะทึบ)</small>' : ''}
              <select ${b('grainType1')}>
                <option value="opaque">เกรนม่านทึบ</option>
                <option value="sheer" ${allowSheer1 ? '' : 'disabled'}>เกรนม่านโปร่ง (หน้าผ้า &gt; 270 ซม.)</option>
              </select>
            </label>
            <label>สูตรคำนวณปริมาณผ้า (ชั้นที่ 1)
              <select ${b('fabricRuleId1')}>${fRuleOpts1}</select>
            </label>
          </div>
          <div class="grid2" style="margin-top:4px">
            <label>การแสดงจำนวนผ้า ชั้นที่ 1 (หลา)
              <select ${b('yardMode1')}>${yardModeOpts}</select>
            </label>
            ${(w.yardMode1 === 'ceil_plus' || w.yardMode1 === 'exact_plus') ? `
              <label>จำนวนหลาที่ต้องการบวกเพิ่ม (ชั้นที่ 1)
                <input type="number" step="any" ${b('extraYards1')} placeholder="เช่น 1 หรือ 1.5">
              </label>
            ` : `<div></div>`}
          </div>
        `}

        <div class="grid2" style="margin-top:4px;padding-top:4px;border-top:1px dashed #ccd6e6">
          <label>สูตรความกว้าง (ชั้นที่ 2: ม่านโปร่ง)
            <select ${b('widthFormulaId2')}>${wfOpts2}</select>
          </label>
          <label>การลดความสูง / สูตรความสูง (ชั้นที่ 2: ม่านโปร่ง)
            <select ${b('heightFormulaId2')}>${hfOpts2}</select>
          </label>
        </div>
        <div class="grid3">
          <label>เลือกผ้าชั้นที่ 2 (จากตารางผ้าของหน้านี้)
            <select ${b('fabricCol2')}>${sheetFabOpts}</select>
          </label>
          <label>เกรนคำนวณผ้าโปร่ง ${!allowSheer2 ? '<small style="color:#c62828">(หน้าผ้า ≤ 270 ได้เฉพาะทึบ)</small>' : ''}
            <select ${b('grainType2')}>
              <option value="opaque">เกรนม่านทึบ</option>
              <option value="sheer" ${allowSheer2 ? '' : 'disabled'}>เกรนม่านโปร่ง (หน้าผ้า &gt; 270 ซม.)</option>
            </select>
          </label>
          <label>สูตรคำนวณปริมาณผ้า (ชั้นที่ 2)
            <select ${b('fabricRuleId2')}>${fRuleOpts2}</select>
          </label>
        </div>
        <div class="grid2" style="margin-top:4px">
          <label>การแสดงจำนวนผ้า ชั้นที่ 2 (หลา)
            <select ${b('yardMode2')}>${yardModeOpts}</select>
          </label>
          ${(w.yardMode2 === 'ceil_plus' || w.yardMode2 === 'exact_plus') ? `
            <label>จำนวนหลาที่ต้องการบวกเพิ่ม (ชั้นที่ 2)
              <input type="number" step="any" ${b('extraYards2')} placeholder="เช่น 1 หรือ 1.5">
            </label>
          ` : `<div></div>`}
        </div>
      </div>

      <table class="calc-ed">
        <tr><th></th><th>ขนาดกว้าง</th><th></th><th>ขนาดสูง</th><th></th><th>จำนวน</th><th></th><th>รวม (${unit1})</th></tr>
        ${calc('rail', 'rail', 'รางม่าน', 'ชั้น', 'เมตร')}
        ${calc('blackout', 'bo', isBlind1 ? style1 : 'ผ้าม่านทึบ', 'ผืน', unit1)}
        ${calc('sheer', 'sh', 'ผ้าม่านโปร่ง', 'ผืน', unit2)}
      </table>
      <div style="margin-top:6px;padding:7px 9px;background:#eef6ff;border:1px dashed #60a5fa;border-radius:6px">
        <div class="grid2">
          <label>ระยะลอย / กองพื้น (ฐานข้อมูลกำหนดมาตรฐานลอยจากพื้น 1 ซม.)
            <select ${b('floorMode')}>${FLOOR_CLEARANCE_MODES.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select>
          </label>
          ${(w.floorMode === 'float' || w.floorMode === 'puddle') ? `
            <label>${w.floorMode === 'float' ? 'ระบุระยะลอยเพิ่ม (ซม. — ไม่ดูเครื่องหมาย +/-)' : 'ระบุระยะกองพื้น (ซม. — ไม่ดูเครื่องหมาย +/-)'}
              <input type="text" inputmode="decimal" ${b('floorAdjust')} placeholder="${w.floorMode === 'float' ? 'เช่น 2 (ยิ่งลอยเพิ่ม)' : 'เช่น 3 (ยิ่งกองพื้น)'}">
            </label>
          ` : `<div></div>`}
        </div>
        <div style="font-size:11.5px;color:#1e3a8a;margin-top:3px">ผลปรับอัตโนมัติ: <b>${esc(formatFloorStatusSummary(w))}</b></div>
      </div>
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

function changed(sheetPath, sharedPath, fromPopover = false) {
  const sh = currentSheet();
  if (sh && sheetPath) {
    const mWin = /^windows\.(\d+)\.(.+)$/.exec(sheetPath);
    if (mWin) {
      const idx = +mWin[1];
      const field = mWin[2];
      const w = sh.windows[idx];
      if (w) {
        if (!w.manualFields || typeof w.manualFields !== 'object') w.manualFields = {};
        // หากผู้ใช้พิมพ์แก้ไขในช่องตารางคำนวณโดยตรง ให้ล็อกเฉพาะช่องนั้นเป็น "กรอกเอง (✍️)" อัตโนมัติ
        const manualCellMap = {
          'rail.a': 'railA', 'rail.b': 'railB', 'rail.n': 'railN', 'rail.t': 'railT',
          'blackout.a': 'boA', 'blackout.b': 'boB', 'blackout.n': 'boN', 'blackout.t': 'boT',
          'sheer.a': 'shA', 'sheer.b': 'shB', 'sheer.n': 'shN', 'sheer.t': 'shT',
        };
        if (manualCellMap[field]) {
          const mk = manualCellMap[field];
          w.manualFields[mk] = true;
          autoUpdateSheetFabricTableQty(sh);
          const winCard = document.querySelector(`.win-ed[data-win-idx="${idx}"]`);
          if (winCard) {
            const btn = winCard.querySelector(`[data-act="toggleFieldManual"][data-mkey="${mk}"]`);
            if (btn) {
              btn.textContent = '✍️';
              btn.classList.remove('is-auto');
              btn.classList.add('is-manual');
            }
          }
        } else if (/^(curtainStyle1|curtainStyle2|pieces1|pieces2|railTracks|rodType|hookSize|noRail|noRailStatus|noRailDeductPreset|railCountUnit|railUnit|floorMode|backLayerHeightDeduct|backLayerTarget|fabricCol1|fabricCol2|specialType|gable\.type|gable\.hemClearanceType|sideJoin\.type|yardMode1|yardMode2|box|mount|wallCeilingAttach|paneStyle|calcMode|fabricId1|grainType1|fabricRuleId1|blindId1|fabricId2|grainType2|fabricRuleId2|widthFormulaId1|heightFormulaId1|widthFormulaId2|heightFormulaId2|railModel|unequalSplit)$/.test(field)) {
          if (!curtainNeedsHook(w.curtainStyle1, w.curtainStyle2)) w.hookSize = '';
          w.paneStyle = String(getPaneCount(w));
          if (field === 'unequalSplit' && w.unequalSplit) {
            if (!w.layers || !w.layers.length) w.layers = [{ op: 'split', target: 'all', label: '' }];
            else if (!w.layers[0].op) w.layers[0].op = 'split';
          }
          if (w.calcMode !== 'manual') {
            autoCalculateWindow(w, sh);
          } else if (field === 'unequalSplit') {
            const rw = calcRailWidth(w) || w.width;
            if (w.unequalSplit && w.splitLeft && w.splitRight) {
              if (rw) w.rail.a = rw;
              w.blackout.a = `${w.splitLeft}/${w.splitRight}`;
              if (w.sheer.a) w.sheer.a = `${w.splitLeft}/${w.splitRight}`;
            } else if (!w.unequalSplit && rw) {
              w.blackout.a = rw;
              if (w.sheer.a) w.sheer.a = rw;
            }
          }
          renderWindowsEditor();
          syncSheetInputs();
          if (fromPopover && typeof refreshActivePopoverIfStructural === 'function') {
            refreshActivePopoverIfStructural(field);
          }
        } else if (field === 'splitLeft' || field === 'splitRight') {
          const rwNum = +calcRailWidth(w) || +w.width || +w.rail?.a || 0;
          if (field === 'splitLeft' && w.splitLeft !== '' && rwNum > 0) {
            const sl = +w.splitLeft || 0;
            if (sl > 0 && sl < rwNum) {
              w.splitRight = String(Math.round((rwNum - sl) * 100) / 100);
            }
          } else if (field === 'splitRight' && w.splitRight !== '' && rwNum > 0) {
            const sr = +w.splitRight || 0;
            if (sr > 0 && sr < rwNum) {
              w.splitLeft = String(Math.round((rwNum - sr) * 100) / 100);
            }
          }
          if (w.calcMode !== 'manual') {
            autoCalculateWindow(w, sh);
          } else if (w.unequalSplit && (w.splitLeft || w.splitRight)) {
            const rw = calcRailWidth(w) || w.width;
            if (rw) w.rail.a = rw;
            const splitStr = `${w.splitLeft || 0}/${w.splitRight || 0}`;
            w.blackout.a = splitStr;
            w.blackout.n = '2';
            if (w.sheer.a || w.curtainStyle2) {
              w.sheer.a = splitStr;
              w.sheer.n = '2';
            }
          }
          const winCard = document.querySelector(`.win-ed[data-win-idx="${idx}"]`);
          if (winCard) syncSheetInputs(winCard);
          const popEl = document.getElementById('pdfQuickPopover');
          if (popEl && !popEl.hidden) syncSheetInputs(popEl);
        } else if (/^(width|height|extL|extR|extT|extB|customRailW|customRailH|floorAdjust|noRailDeductCustom|extraYards1|extraYards2|gable\..+|sideJoin\..+)$/.test(field)) {
          if (field === 'gable.title' && w.gable) {
            w.gable.titleManual = !!String(w.gable.title || '').trim();
          }
          if (field === 'customRailW') w.manualFields.railW = true;
          if (field === 'customRailH') w.manualFields.railH = true;
          if (w.calcMode !== 'manual') {
            autoCalculateWindow(w, sh);
            const winCard = document.querySelector(`.win-ed[data-win-idx="${idx}"]`);
            if (winCard) syncSheetInputs(winCard);
            const popEl = document.getElementById('pdfQuickPopover');
            if (popEl && !popEl.hidden) syncSheetInputs(popEl);
          }
          const rw = calcRailWidth(w), rh = calcRailHeight(w);
          const sumEl = document.querySelector(`[data-rail-sum="${idx}"]`);
          if (sumEl && w.calcMode !== 'manual') {
            const bs = sumEl.querySelectorAll('b');
            if (bs[0] && !isFieldManual(w, 'railW')) bs[0].textContent = rw || '-';
            if (bs[1] && !isFieldManual(w, 'railH')) bs[1].textContent = rh || '-';
          }
          const popRailSum = document.getElementById('popRailSumText');
          if (popRailSum) {
            popRailSum.innerHTML = `กว้างราง = <b>${esc(rw || '-')}</b> ซม. • สูงราง (สูงเฟรม+เผื่อบน+เผื่อล่าง) = <b>${esc(rh || '-')}</b> ซม.`;
          }
        }
        const t = document.querySelector(`[data-thumb="${idx}"]`);
        if (t) t.innerHTML = windowSVG(w);
      }
    } else if (/^fabrics\.(blackout|sheer|roller|blinds|other)\.(name|design|color|label)$/.test(sheetPath)) {
      const mFab = /^fabrics\.(blackout|sheer|roller|blinds|other)\.name$/.exec(sheetPath);
      if (mFab && sh.fabrics && sh.fabrics[mFab[1]]) {
        const ck = mFab[1];
        const fName = String(sh.fabrics[ck].name || '').trim();
        if (fName && !sh.fabrics[ck].design && typeof masterDB !== 'undefined' && Array.isArray(masterDB.fabrics)) {
          const matchedFab = masterDB.fabrics.find(x => String(x.name || '').trim() === fName);
          if (matchedFab && matchedFab.design) sh.fabrics[ck].design = matchedFab.design;
        }
      }
      (sh.windows || []).forEach(w => {
        if (w && w.calcMode !== 'manual') autoCalculateWindow(w, sh);
      });
      autoUpdateSheetFabricTableQty(sh);
      renderWindowsEditor();
      syncSheetInputs();
      if (typeof refreshActivePopover === 'function') refreshActivePopover();
    } else if (/^fabrics\.(blackout|sheer|roller|blinds|other)\.qty$/.test(sheetPath)) {
      const mQty = /^fabrics\.(blackout|sheer|roller|blinds|other)\.qty$/.exec(sheetPath);
      if (mQty && sh.fabrics && sh.fabrics[mQty[1]]) {
        sh.fabrics[mQty[1]].manualQty = !!String(sh.fabrics[mQty[1]].qty || '').trim();
      }
    }
    if (sheetPath === 'room.name') renderTopSheetNav();
  }
  if (sharedPath) {
    updateTopBadge();
    if (sharedPath === 'customer.name' || sharedPath === 'customer.mobile') {
      renderExistingCustomerSelect();
    }
  }

  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => { renderPreview(); touchAndSave(); }, 100);
}

function renderAllWorkspace() {
  applyUserRoleUI();
  updateTopBadge();
  renderStaffDropdown();
  renderExistingCustomerSelect();
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
      if (el.closest('#pdfQuickPopover') && typeof refreshActivePopover === 'function') refreshActivePopover();
      changed();
    }
    return;
  }

  let v;
  if (el.type === 'checkbox') v = el.checked;
  else if (el.type === 'radio') { if (!el.checked) return; v = el.value; }
  else v = el.value;

  const isFromPopover = !!el.closest('#pdfQuickPopover');

  if (el.dataset.shared) {
    const ord = currentOrder(); if (!ord) return;
    setPath(ord, el.dataset.shared, v);
    if (isFromPopover) syncSharedInputs(document.getElementById('editor'));
    changed(null, el.dataset.shared, isFromPopover);
  } else if (el.dataset.sheet) {
    const sh = currentSheet(); if (!sh) return;
    setPath(sh, el.dataset.sheet, v);
    if (isFromPopover) syncSheetInputs(document.getElementById('editor'));
    changed(el.dataset.sheet, null, isFromPopover);
  }
}
document.addEventListener('input', onFieldInput);
document.addEventListener('change', onFieldInput);

// คลิกซ้ำที่ radio เพื่อยกเลิกการเลือกได้
document.addEventListener('click', e => {
  const el = e.target;
  if (el.type === 'radio' && (el.dataset.shared || el.dataset.sheet)) {
    const isFromPopover = !!el.closest('#pdfQuickPopover');
    if (el.dataset.was === '1') {
      el.checked = false;
      if (el.dataset.shared) { setPath(currentOrder(), el.dataset.shared, ''); changed(null, el.dataset.shared, isFromPopover); }
      else { setPath(currentSheet(), el.dataset.sheet, ''); changed(el.dataset.sheet, null, isFromPopover); }
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
    const newIdx = sh.windows.length - 1;
    renderWindowsEditor(); renderTopSheetNav();
    if (activePopoverCtx && activePopoverCtx.type === 'win') {
      activePopoverCtx.wIdx = newIdx;
      refreshActivePopover();
    } else {
      refreshActivePopover();
    }
    syncPreviewToSheet(activeSheetIdx, Math.floor(newIdx / 4));
    changed();
  },
  delWin(i) {
    const sh = currentSheet(); if (!sh) return;
    if (sh.windows.length <= 1) { alert('ต้องมีอย่างน้อย 1 บานในหน้านี้'); return; }
    if (!confirm(`ลบหน้าต่าง/ประตู จุดที่ ${i + 1}?`)) return;
    sh.windows.splice(i, 1);
    renderWindowsEditor(); renderTopSheetNav();
    if (activePopoverCtx && activePopoverCtx.type === 'win') {
      activePopoverCtx.wIdx = Math.max(0, Math.min(activePopoverCtx.wIdx, sh.windows.length - 1));
    }
    refreshActivePopover();
    changed();
  },
  dupWin(i) {
    const sh = currentSheet(); if (!sh) return;
    const copy = JSON.parse(JSON.stringify(sh.windows[i]));
    copy.planNo = String(sh.windows.length + 1);
    sh.windows.splice(i + 1, 0, copy);
    renderWindowsEditor(); renderTopSheetNav();
    if (activePopoverCtx && activePopoverCtx.type === 'win') {
      activePopoverCtx.wIdx = i + 1;
    }
    refreshActivePopover();
    changed();
  },
  upWin(i) {
    const sh = currentSheet(); if (!sh || i <= 0) return;
    const w = sh.windows; [w[i - 1], w[i]] = [w[i], w[i - 1]];
    renderWindowsEditor();
    if (activePopoverCtx && activePopoverCtx.type === 'win') {
      if (activePopoverCtx.wIdx === i) activePopoverCtx.wIdx = i - 1;
      else if (activePopoverCtx.wIdx === i - 1) activePopoverCtx.wIdx = i;
    }
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  downWin(i) {
    const sh = currentSheet(); if (!sh || i >= sh.windows.length - 1) return;
    const w = sh.windows; [w[i + 1], w[i]] = [w[i], w[i + 1]];
    renderWindowsEditor();
    if (activePopoverCtx && activePopoverCtx.type === 'win') {
      if (activePopoverCtx.wIdx === i) activePopoverCtx.wIdx = i + 1;
      else if (activePopoverCtx.wIdx === i + 1) activePopoverCtx.wIdx = i;
    }
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  moveSheet(fromIdx, dir) {
    const ord = currentOrder(); if (!ord || !Array.isArray(ord.sheets)) return;
    const toIdx = fromIdx + dir;
    if (fromIdx < 0 || fromIdx >= ord.sheets.length || toIdx < 0 || toIdx >= ord.sheets.length) return;
    const [moved] = ord.sheets.splice(fromIdx, 1);
    ord.sheets.splice(toIdx, 0, moved);
    if (activeSheetIdx === fromIdx) activeSheetIdx = toIdx;
    else if (activeSheetIdx === toIdx) activeSheetIdx = fromIdx;
    activeTabMode = 'sheet';
    renderAllWorkspace();
    syncPreviewToSheet(activeSheetIdx, 0);
    touchAndSave();
  },
  setAllAuto(i) {
    const sh = currentSheet(); if (!sh || !sh.windows[i]) return;
    const w = sh.windows[i];
    w.calcMode = 'auto';
    w.manualFields = {};
    autoCalculateWindow(w, sh);
    renderWindowsEditor();
    syncSheetInputs();
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  setAllManual(i) {
    const sh = currentSheet(); if (!sh || !sh.windows[i]) return;
    const w = sh.windows[i];
    w.calcMode = 'manual';
    if (!w.customRailW) w.customRailW = calcRailWidth(w);
    if (!w.customRailH) w.customRailH = calcRailHeight(w);
    renderWindowsEditor();
    syncSheetInputs();
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  toggleFieldManual(i, _li, btnEl) {
    const sh = currentSheet(); if (!sh || !sh.windows[i]) return;
    const w = sh.windows[i];
    const mKey = btnEl && btnEl.dataset ? btnEl.dataset.mkey : '';
    if (!mKey) return;
    if (!w.manualFields || typeof w.manualFields !== 'object') w.manualFields = {};
    if (w.calcMode === 'manual') {
      // สลับจากกรอกเองทั้งหมดเป็นกรอกเองเฉพาะบางรายการ โดยปลดล็อกเฉพาะช่องที่คลิก
      w.calcMode = 'auto';
      ['railW', 'railH', 'railA', 'railB', 'railN', 'railT', 'boA', 'boB', 'boN', 'boT', 'shA', 'shB', 'shN', 'shT'].forEach(k => {
        w.manualFields[k] = (k !== mKey);
      });
    } else {
      w.manualFields[mKey] = !w.manualFields[mKey];
      if (mKey === 'railW' && w.manualFields.railW && !w.customRailW) w.customRailW = calcRailWidth(w);
      if (mKey === 'railH' && w.manualFields.railH && !w.customRailH) w.customRailH = calcRailHeight(w);
    }
    autoCalculateWindow(w, sh);
    renderWindowsEditor();
    syncSheetInputs();
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  fillSize(i) {
    const sh = currentSheet(); if (!sh) return;
    const w = sh.windows[i];
    const rw = calcRailWidth(w) || w.width;
    const rh = calcRailHeight(w) || w.height;
    const effTracks = +w.railTracks || ((w.curtainStyle1 && w.curtainStyle2) ? 2 : 1);
    if (rw) {
      if (!w.noRail) {
        w.rail.a = String(rw);
        w.rail.n = String(effTracks);
        w.rail.t = String(Math.round((+rw / 100) * effTracks * 100) / 100);
      }
      if (w.unequalSplit && (w.splitLeft || w.splitRight)) {
        const splitStr = `${w.splitLeft || 0}/${w.splitRight || 0}`;
        w.blackout.a = splitStr;
        w.blackout.n = '2';
        w.sheer.a = splitStr;
        w.sheer.n = '2';
      } else {
        w.blackout.a = rw;
        w.sheer.a = rw;
      }
    }
    if (rh) {
      if (!w.noRail) w.rail.b = String(rh);
      const deduct = getNoRailHeightDeduction(w);
      const effH = String(Math.max(0, Math.round((+rh - deduct) * 100) / 100));
      w.blackout.b = effH;
      w.sheer.b = effH;
    }
    renderWindowsEditor();
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  applyFormula(i) {
    const sh = currentSheet(); if (!sh) return;
    const w = sh.windows[i];
    if (!w) return;
    autoCalculateWindow(w, sh);
    renderWindowsEditor();
    syncSheetInputs();
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  addLayer(i) {
    const sh = currentSheet(); if (!sh) return;
    sh.windows[i].layers.push({ op: 'split', target: 'all', label: '' });
    renderWindowsEditor();
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  addBlindPiece(i) {
    const sh = currentSheet(); if (!sh || !sh.windows[i]) return;
    const w = sh.windows[i];
    if (!Array.isArray(w.blindPieces)) w.blindPieces = [];
    const defW = w.width || '';
    const defH = w.height || '';
    w.blindPieces.push({ w: defW, h: defH });
    renderWindowsEditor();
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  delBlindPiece(i, pi) {
    const sh = currentSheet(); if (!sh || !sh.windows[i]) return;
    const w = sh.windows[i];
    if (!Array.isArray(w.blindPieces)) return;
    w.blindPieces.splice(pi, 1);
    renderWindowsEditor();
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  incPane(i) {
    const sh = currentSheet(); if (!sh || !sh.windows[i]) return;
    const w = sh.windows[i];
    w.paneStyle = String(Math.min(24, getPaneCount(w) + 1));
    renderWindowsEditor();
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  decPane(i) {
    const sh = currentSheet(); if (!sh || !sh.windows[i]) return;
    const w = sh.windows[i];
    w.paneStyle = String(Math.max(1, getPaneCount(w) - 1));
    renderWindowsEditor();
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  delLayer(i, li) {
    const sh = currentSheet(); if (!sh) return;
    const list = sh.windows[i].layers;
    if (list.length <= 1) { list[0] = { op: '', target: 'all', label: '' }; }
    else list.splice(li, 1);
    renderWindowsEditor();
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  addNote(focus = true) {
    const sh = currentSheet(); if (!sh) return;
    sh.notes.push(''); renderNotesEditor();
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
    if (focus) {
      const nEl = document.querySelector(`[data-note="${sh.notes.length - 1}"]`);
      if (nEl) nEl.focus();
    }
  },
  delNote(i) {
    const sh = currentSheet(); if (!sh) return;
    sh.notes.splice(i, 1); if (!sh.notes.length) sh.notes.push('');
    renderNotesEditor();
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  syncFromPlan() {
    const sh = currentSheet(); if (!sh) return;
    syncWindowsFromPlan(sh);
    renderWindowsEditor();
    renderTopSheetNav();
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  openPlan() {
    const sh = currentSheet(); if (!sh) return;
    const prevCtx = activePopoverCtx ? Object.assign({}, activePopoverCtx) : null;
    closePdfQuickPopover();
    PlanEditor.open(sh.plan.items, items => {
      sh.plan.items = items;
      syncWindowsFromPlan(sh);
      renderPlanMini();
      renderWindowsEditor();
      renderTopSheetNav();
      changed();
      if (prevCtx && prevCtx.type === 'map') {
        openPdfQuickPopover(prevCtx);
      }
    });
  },
  clearLogo() {
    const ord = currentOrder(); if (!ord) return;
    ord.company.logo = ''; document.getElementById('logoFile').value = ''; changed();
  },
  jumpToSheetFabrics() {
    switchToSheetSection(activeSheetIdx, 'secFabrics', '[data-sheet="fabrics.blackout.name"]');
    openPdfQuickPopover({ type: 'fabric', sIdx: activeSheetIdx, fabCol: 'blackout' });
  },
  openDbStaff() { if (isAdminUser()) MasterDBModal.open('staff'); },
  openDbFabrics() { if (isAdminUser()) MasterDBModal.open('fabrics'); },
  openDbWidthFormulas() { if (isAdminUser()) MasterDBModal.open('widthFormulas'); },
  openDbHeightFormulas() { if (isAdminUser()) MasterDBModal.open('heightFormulas'); },
  openDbFabricCalc() { if (isAdminUser()) MasterDBModal.open('fabricCalcRules'); },
  openDbRails() { if (isAdminUser()) MasterDBModal.open('rails'); },
  openDbBlinds() { if (isAdminUser()) MasterDBModal.open('blinds'); },
  openDbCurtains() { if (isAdminUser()) MasterDBModal.open('curtains'); },
  openDbHooks() { if (isAdminUser()) MasterDBModal.open('hooks'); },
  openDbRemarks() { if (isAdminUser()) MasterDBModal.open('remarks'); },
};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b) {
    const fn = actions[b.dataset.act];
    if (fn) fn(b.dataset.i !== undefined ? +b.dataset.i : undefined, b.dataset.li !== undefined ? +b.dataset.li : undefined, b);
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
  const dNewPlan = e.target.closest('[data-dash-newplan]');
  if (dNewPlan) {
    const orig = orders.find(o => o.id === dNewPlan.dataset.dashNewplan);
    if (orig && canAccessOrder(orig)) createNewPlanForCustomer(orig);
    return;
  }
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

/* =========================================================
   Right-Only Mode (ซ่อนแผงซ้ายอัตโนมัติ) + Pinpoint Floating Popover Editor บนใบงานด้านขวา
   ========================================================= */
let rightOnlyMode = true;
let activePopoverCtx = null;

function setRightOnlyMode(on) {
  rightOnlyMode = !!on;
  document.body.classList.toggle('right-only-mode', rightOnlyMode);
  const btn = document.getElementById('btnToggleLeftPanel');
  if (btn) {
    btn.classList.toggle('primary', rightOnlyMode);
    btn.innerHTML = rightOnlyMode
      ? '📋 แสดงแผงข้อมูลด้านซ้าย'
      : '🖥️ ซ่อนแผงซ้าย (คลิกแก้ไขบนใบงานด้านขวา)';
  }
  setTimeout(() => { fitZoomWidth(); }, 60);
}

function ensureQuickPopoverEl() {
  let pop = document.getElementById('pdfQuickPopover');
  if (pop) return pop;
  pop = document.createElement('div');
  pop.id = 'pdfQuickPopover';
  pop.className = 'pdf-quick-popover no-print';
  pop.hidden = true;
  document.body.appendChild(pop);

  // ให้ใช้ลูกกลิ้งเมาส์ (Scroll) เลื่อนขึ้นลงในหน้าต่างแก้ไขเฉพาะจุดได้อย่างลื่นไหลโดยไม่ไปกวนการเลื่อนหน้าพื้นหลัง
  pop.addEventListener('wheel', e => {
    e.stopPropagation();
  }, { passive: true });

  pop.addEventListener('click', e => {
    e.stopPropagation();
    if (e.target.closest('[data-pop-close]')) {
      closePdfQuickPopover();
      return;
    }
    // อนุญาตให้ทุกปุ่ม [data-act] ภายใน Popover (เช่น openPlan, syncFromPlan, addWin, delWin, addLayer, setAllAuto ฯลฯ) ทำงานได้ครบเหมือนแผงซ้าย
    const actBtn = e.target.closest('[data-act]');
    if (actBtn) {
      const fn = actions[actBtn.dataset.act];
      if (fn) {
        fn(
          actBtn.dataset.i !== undefined ? +actBtn.dataset.i : undefined,
          actBtn.dataset.li !== undefined ? +actBtn.dataset.li : undefined,
          actBtn
        );
      }
      return;
    }
    const jumpWinBtn = e.target.closest('[data-pop-win-jump]');
    if (jumpWinBtn) {
      const targetIdx = +jumpWinBtn.dataset.popWinJump;
      activePopoverCtx = { type: 'win', sIdx: activeSheetIdx, wIdx: targetIdx, subTab: 'dims' };
      renderActivePopoverContent({ initialOpen: true });
      positionPopoverNear(pop);
      syncPreviewToSheet(activeSheetIdx, Math.floor(targetIdx / 4));
      return;
    }
    const newPlanCustBtn = e.target.closest('[data-pop-newplan]');
    if (newPlanCustBtn) {
      const ord = currentOrder();
      if (!ord || !ord.customer || !String(ord.customer.name || '').trim()) {
        alert('กรุณาระบุชื่อลูกค้าก่อนสร้างแปลนงานเพิ่ม');
        return;
      }
      closePdfQuickPopover();
      createNewPlanForCustomer(ord);
      return;
    }
    const reorderBtn = e.target.closest('[data-pop-reorder-sheets]');
    if (reorderBtn) {
      closePdfQuickPopover();
      if (typeof openSheetOrderModal === 'function') openSheetOrderModal();
      return;
    }
    const tabBtn = e.target.closest('[data-pop-wintab]');
    if (tabBtn && activePopoverCtx && activePopoverCtx.type === 'win') {
      const targetTab = tabBtn.dataset.popWintab;
      activePopoverCtx.subTab = targetTab;
      pop.querySelectorAll('[data-pop-wintab]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.popWintab === targetTab);
      });
      const secEl = pop.querySelector(`#popSec_${targetTab}`);
      const bodyEl = pop.querySelector('.pop-body');
      if (secEl && bodyEl) {
        secEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        secEl.classList.remove('pop-sec-flash');
        void secEl.offsetWidth;
        secEl.classList.add('pop-sec-flash');
      }
      return;
    }
    const fabTabBtn = e.target.closest('[data-pop-fabcol]');
    if (fabTabBtn && activePopoverCtx && activePopoverCtx.type === 'fabric') {
      activePopoverCtx.fabCol = fabTabBtn.dataset.popFabcol;
      renderActivePopoverContent();
      return;
    }
    const rodTabBtn = e.target.closest('[data-pop-rodpart]');
    if (rodTabBtn && activePopoverCtx && activePopoverCtx.type === 'rod') {
      activePopoverCtx.rodPart = rodTabBtn.dataset.popRodpart;
      renderActivePopoverContent();
      return;
    }
    const pickFabBtn = e.target.closest('[data-pop-pick-fab]');
    if (pickFabBtn) {
      const col = pickFabBtn.dataset.popPickFab;
      const selEl = pop.querySelector('#popFabDbPicker');
      const sh = currentSheet();
      if (sh && selEl && selEl.value) {
        if (col === 'roller' || col === 'blinds') {
          const bl = (masterDB.blinds || []).find(x => x.id === selEl.value);
          if (bl) sh.fabrics[col].name = bl.name || '';
        } else {
          const fb = (masterDB.fabrics || []).find(x => x.id === selEl.value);
          if (fb) {
            sh.fabrics[col].name = fb.name || '';
            sh.fabrics[col].design = fb.design || '';
          }
        }
        renderActivePopoverContent();
        syncSheetInputs();
        changed(`fabrics.${col}.name`, null, true);
      }
      return;
    }
    const clearLogoBtn = e.target.closest('[data-pop-logo-clear]');
    if (clearLogoBtn) {
      const ord = currentOrder();
      if (ord && ord.company) {
        ord.company.logo = '';
        renderActivePopoverContent({ preserveScroll: true });
        syncSharedInputs();
        changed();
      }
      return;
    }
    const planMiniEl = e.target.closest('#popPlanMini');
    if (planMiniEl) {
      actions.openPlan();
      return;
    }
    const pickRailBtn = e.target.closest('[data-pop-pick-rail]');
    if (pickRailBtn) {
      const rKey = pickRailBtn.dataset.popPickRail;
      const selEl = pop.querySelector(`#popRailPicker_${rKey}`);
      const sh = currentSheet();
      if (sh && selEl && selEl.value) {
        const rl = (masterDB.rails || []).find(x => x.id === selEl.value);
        if (rl && sh.rods[rKey]) {
          sh.rods[rKey].model = rl.name || '';
          if (rl.defaultColor) sh.rods[rKey].color = rl.defaultColor;
          renderActivePopoverContent();
          syncSheetInputs();
          changed();
        }
      }
      return;
    }
  });

  pop.addEventListener('change', e => {
    if (e.target.id === 'popExistingCustPick') {
      const srcId = e.target.value;
      if (!srcId) return;
      const srcOrd = orders.find(o => o.id === srcId);
      const ord = currentOrder();
      if (srcOrd && ord) {
        ord.customer.name = srcOrd.customer.name || '';
        ord.customer.mobile = srcOrd.customer.mobile || '';
        ord.customer.tel = srcOrd.customer.tel || '';
        ord.customer.email = srcOrd.customer.email || '';
        if (!ord.customer.houseNo && !ord.customer.building) {
          ['houseNo', 'floor', 'moo', 'road', 'building', 'soi', 'subdistrict', 'district', 'province', 'zipcode'].forEach(k => {
            ord.customer[k] = srcOrd.customer[k] || '';
          });
        }
        renderActivePopoverContent({ preserveScroll: true });
        syncSharedInputs();
        changed(null, 'customer.name');
      }
      e.target.value = '';
      return;
    }
    if (e.target.id === 'popStaffPick') {
      const idx = e.target.value;
      if (idx === '') return;
      const st = masterDB.staff[+idx];
      const ord = currentOrder();
      if (st && ord) {
        ord.staff.name = st.name || '';
        ord.staff.dept = st.dept || '';
        ord.staff.branch = st.branch || '';
        renderActivePopoverContent({ preserveScroll: true });
        syncSharedInputs();
        changed(null, 'staff.name');
      }
      e.target.value = '';
      return;
    }
    if (e.target.id === 'popLogoFile') {
      const f = e.target.files[0]; if (!f) return;
      const ord = currentOrder(); if (!ord) return;
      const rd = new FileReader();
      rd.onload = () => {
        ord.company.logo = rd.result;
        renderActivePopoverContent({ preserveScroll: true });
        syncSharedInputs();
        changed();
      };
      rd.readAsDataURL(f);
      return;
    }
  });

  // Dragging popover header
  let popDrag = null;
  pop.addEventListener('pointerdown', e => {
    const hd = e.target.closest('.pop-hd-drag');
    if (!hd || e.target.closest('button')) return;
    const rect = pop.getBoundingClientRect();
    popDrag = { startX: e.clientX, startY: e.clientY, origL: rect.left, origT: rect.top };
    e.preventDefault();
  });
  document.addEventListener('pointermove', e => {
    if (!popDrag) return;
    const nx = Math.max(8, Math.min(window.innerWidth - 320, popDrag.origL + (e.clientX - popDrag.startX)));
    const ny = Math.max(8, Math.min(window.innerHeight - 120, popDrag.origT + (e.clientY - popDrag.startY)));
    pop.style.left = nx + 'px';
    pop.style.top = ny + 'px';
  });
  document.addEventListener('pointerup', () => { popDrag = null; });

  return pop;
}

function closePdfQuickPopover() {
  const pop = document.getElementById('pdfQuickPopover');
  if (pop) pop.hidden = true;
  activePopoverCtx = null;
}

function positionPopoverNear(pop) {
  // แสดงตรงกลางหน้าจอเห็นทั้งหมดเป็นค่าเริ่มต้น (Default) แล้วสามารถลากขยับหัวหน้าต่างทีหลังได้
  const pw = Math.min(820, window.innerWidth - 24);
  pop.style.width = pw + 'px';
  const rect = pop.getBoundingClientRect();
  const ph = rect.height || Math.min(680, window.innerHeight - 40);
  const left = Math.max(12, Math.round((window.innerWidth - pw) / 2));
  const top = Math.max(14, Math.round((window.innerHeight - ph) / 2));
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}

function refreshActivePopover() {
  const pop = document.getElementById('pdfQuickPopover');
  if (!pop || pop.hidden || !activePopoverCtx) return;
  renderActivePopoverContent({ preserveScroll: true });
}

function refreshActivePopoverIfStructural(changedField) {
  const pop = document.getElementById('pdfQuickPopover');
  if (!pop || pop.hidden || !activePopoverCtx) return;
  if (/^(curtainStyle1|curtainStyle2|pieces1|pieces2|railTracks|rodType|hookSize|noRail|noRailStatus|noRailDeductPreset|railCountUnit|railUnit|backLayerHeightDeduct|backLayerTarget|fabricCol1|fabricCol2|specialType|gable\.type|gable\.hemClearanceType|sideJoin\.type|yardMode1|yardMode2|box|mount|wallCeilingAttach|paneStyle|calcMode|fabricId1|grainType1|fabricRuleId1|blindId1|fabricId2|grainType2|fabricRuleId2|widthFormulaId1|heightFormulaId1|widthFormulaId2|heightFormulaId2|unequalSplit|floorMode)$/.test(changedField)) {
    renderActivePopoverContent({ preserveScroll: true });
  }
}

function renderActivePopoverContent(opts = {}) {
  const pop = ensureQuickPopoverEl();
  const ctx = activePopoverCtx;
  if (!ctx) return;
  const ord = currentOrder();
  const sh = currentSheet();
  if (!ord || !sh) return;

  const prevBody = pop.querySelector('.pop-body');
  const prevScrollTop = (opts.preserveScroll && prevBody) ? prevBody.scrollTop : null;

  const DIM_LABELS = {
    width: ['ความกว้าง (เฟรม)', 'noteWidth'],
    height: ['ความสูง (เฟรม)', 'noteHeight'],
    extL: ['เผื่อด้านซ้าย (+)', 'noteExtL'],
    extR: ['เผื่อด้านขวา (+)', 'noteExtR'],
    extT: ['เผื่อด้านบน (+)', 'noteExtT'],
    extB: ['เผื่อด้านล่าง (+)', 'noteExtB'],
    wallL: ['พื้นที่ด้านซ้าย', 'noteWallL'],
    wallR: ['พื้นที่ด้านขวา', 'noteWallR'],
    ceilT: ['พื้นที่ด้านบน', 'noteCeilT'],
    floorB: ['พื้นที่ด้านล่าง', 'noteFloorB'],
    fullW: ['ความกว้างเต็ม', 'noteFullW'],
    fullH: ['ความสูงเต็ม', 'noteFullH'],
  };

  let title = '✏️ แก้ไขข้อมูลเฉพาะจุด';
  let stickyNavHTML = '';
  let bodyHTML = '';

  if (ctx.type === 'win') {
    const i = ctx.wIdx;
    const w = sh.windows[i];
    if (!w) return;
    const b = p => `data-sheet="windows.${i}.${p}"`;
    const subTab = ctx.subTab || 'dims';
    const numLabel = w.planNo || (i + 1);
    title = `🪟 จุดที่ ${esc(numLabel)} (${esc(w.label || 'หน้าต่าง/ประตู')}) — แก้ไขเฉพาะจุด (ลากขยับหน้าต่างได้)`;

    const fKey = (ctx.svgField && DIM_LABELS[ctx.svgField]) ? ctx.svgField : '';
    const fMeta = fKey ? DIM_LABELS[fKey] : null;
    const rw = calcRailWidth(w), rh = calcRailHeight(w);
    const needHook = curtainNeedsHook(w.curtainStyle1, w.curtainStyle2);
    const curtainOpts = `<option value="">-- เลือก --</option>` +
      masterDB.curtains.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
    const hookOpts = `<option value="">-- เลือกขนาดตะขอ --</option>` +
      masterDB.hooks.map(h => `<option value="${esc(h.name)}">${esc(h.name)}</option>`).join('');
    const rodTypeOpts = `<option value="">-- เลือกประเภทรางม่าน --</option>` +
      ['รางม่านจีบ', 'รางโชว์', 'รางม่านลอน', 'รางม่านพับ'].map(rt => `<option value="${esc(rt)}">${esc(rt)}</option>`).join('');
    const noRailPresetOpts = NO_RAIL_DEDUCT_PRESETS.filter(p => p[0] !== '0').map(([v, labelText]) =>
      `<option value="${esc(v)}">${esc(labelText)}</option>`
    ).join('');
    const planOpenings = getPlanOpenings(sh);
    const planSelectOpts = `<option value="">-- ดึงจากจุดในแปลนห้อง --</option>` +
      planOpenings.map((op, oi) => {
        const no = op.label || (oi + 1);
        const code = (op.type === 'door' ? 'D' : 'W') + no;
        return `<option value="${oi}">จุดที่ ${esc(no)} (${esc(code)})</option>`;
      }).join('');

    const targetOpts = getLayerTargetsForWindow(w);
    const layersHTML = (w.layers || []).map((ly, li) => `
      <div class="layer-row">
        <span class="layer-tag">ผืนที่ ${li + 1}</span>
        <select data-sheet="windows.${i}.layers.${li}.op">
          ${LAYER_OPS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}
        </select>
        <select data-sheet="windows.${i}.layers.${li}.target" style="max-width:135px">
          ${targetOpts.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}
        </select>
        <input data-sheet="windows.${i}.layers.${li}.label" placeholder="ป้ายกำกับ" style="width:75px">
        <button type="button" class="danger" data-act="delLayer" data-i="${i}" data-li="${li}">✕</button>
      </div>
    `).join('');

    const style1 = w.curtainStyle1 || '';
    const style2 = w.curtainStyle2 || w.curtainStyle1 || '';
    const effTracks = +w.railTracks || ((w.curtainStyle1 && w.curtainStyle2) ? 2 : 1);
    const isTwoLayer = effTracks >= 2 || !!(w.curtainStyle1 && w.curtainStyle2);
    const isBlind1 = isBlindOrRollerStyle(style1);
    const isBlind2 = isBlindOrRollerStyle(style2);
    const wfList1 = getWidthFormulasForStyle(style1, w.pieces1, effTracks, w.rodType, 'opaque');
    const hfList1 = getHeightFormulasForWindow(style1, w.rodType, w.hookSize, effTracks, w.pieces1);
    const wfList2 = getWidthFormulasForStyle(style2, w.pieces2 || w.pieces1, effTracks, w.rodType, 'sheer');
    const hfList2 = getHeightFormulasForWindow(style2, w.rodType, w.hookSize, effTracks, w.pieces2 || w.pieces1);

    const sheetFabChoices = getSheetTableFabricChoices(sh);
    const sheetFabOpts = sheetFabChoices.length
      ? `<option value="">-- เลือกผ้าจากตารางผ้าของหน้านี้ (${sheetFabChoices.length} รายการ) --</option>` +
        sheetFabChoices.map(c => `<option value="${esc(c.colKey)}">${esc(c.displayText)}</option>`).join('')
      : `<option value="">-- กรุณาเลือกผ้าที่ตารางผ้าด้านล่างก่อน --</option>`;

    const selFab1 = resolveWindowFabricChoice(w, sh, 1);
    const allowSheer1 = !selFab1 || canFabricUseSheerGrain(selFab1.fabricWidth);
    const selFab2 = resolveWindowFabricChoice(w, sh, 2);
    const allowSheer2 = !selFab2 || canFabricUseSheerGrain(selFab2.fabricWidth);
    const yardModeOpts = YARD_DISPLAY_MODES.map(([v, labelText]) =>
      `<option value="${esc(v)}">${esc(labelText)}</option>`
    ).join('');
    const backDeductOpts = BACK_LAYER_DEDUCT_OPTIONS.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
    const specialTypeOpts = SPECIAL_WIN_TYPES.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
    const gableTypeOpts = GABLE_TYPES.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
    const sideJoinTypeOpts = SIDE_JOIN_TYPES.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
    const gType = (w.gable && w.gable.type) || '1';
    const isGableSingleSpan = gType === '3' || gType === '5';

    const lockBtn = (mKey, titleTxt) => {
      const locked = isFieldManual(w, mKey);
      return `<button type="button" class="field-mode-btn ${locked ? 'is-manual' : 'is-auto'}" data-act="toggleFieldManual" data-i="${i}" data-mkey="${mKey}" title="${locked ? 'กรอกเอง (คลิกเพื่อสลับเป็นอัตโนมัติ)' : 'คำนวณอัตโนมัติ (คลิกเพื่อล็อกกรอกเอง)'}">${locked ? '✍️' : '⚡'}</button>`;
    };
    const calcRowEd = (key, mPrefix, rowTitle, u1, u2) => `<tr><th class="r">${rowTitle}</th>
      <td><div class="calc-cell-wrap">${lockBtn(mPrefix + 'A', rowTitle + ' กว้าง')}<input ${b(key + '.a')} placeholder="กว้าง"></div></td><td class="op">×</td>
      <td><div class="calc-cell-wrap">${lockBtn(mPrefix + 'B', rowTitle + ' สูง')}<input ${b(key + '.b')} placeholder="สูง"></div></td><td class="op">=</td>
      <td><div class="calc-cell-wrap">${lockBtn(mPrefix + 'N', rowTitle + ' จำนวน')}<input ${b(key + '.n')} placeholder="${u1}"></div></td><td class="op">=</td>
      <td><div class="calc-cell-wrap">${lockBtn(mPrefix + 'T', rowTitle + ' รวม')}<input ${b(key + '.t')} placeholder="${u2}"></div></td></tr>`;

    stickyNavHTML = `
      <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:4px;margin-bottom:5px;padding-bottom:4px;border-bottom:1px dashed #cbd5e1">
        <div class="inline" style="flex-wrap:wrap;gap:3px">
          <span style="font-size:11px;font-weight:700;color:#475569">บานในหน้านี้:</span>
          ${(sh.windows || []).map((ww, wi) => `<button type="button" class="${wi === i ? 'primary' : ''}" data-pop-win-jump="${wi}" style="padding:2px 7px;font-size:11px">${esc(ww.planNo || (wi + 1))}. ${esc(ww.label || 'บาน ' + (wi + 1))}</button>`).join('')}
        </div>
        <div class="inline" style="gap:3px">
          <button type="button" data-act="openPlan" style="padding:2px 7px;font-size:11px" title="เปิดหน้าต่างวาดแปลนห้อง">🗺️ แปลนห้อง</button>
          <button type="button" data-pop-reorder-sheets="1" style="padding:2px 7px;font-size:11px" title="จัดลำดับใบแปลนงาน">📑 จัดลำดับใบ</button>
        </div>
      </div>
      <div class="pop-tabs">
        <button type="button" class="${subTab === 'dims' ? 'active' : ''}" data-pop-wintab="dims">1. ขนาดรอบบาน</button>
        <button type="button" class="${subTab === 'style' ? 'active' : ''}" data-pop-wintab="style">2. รูปแบบม่าน & ลดความสูง</button>
        <button type="button" class="${subTab === 'mask' ? 'active' : ''}" data-pop-wintab="mask">3. กรอบบาน & แบ่งผืน</button>
        <button type="button" class="${subTab === 'calc' ? 'active' : ''}" data-pop-wintab="calc">4. คำนวณ & เลือกผ้า</button>
        <button type="button" class="${subTab === 'special' ? 'active' : ''}" data-pop-wintab="special">5. ม่านจั่ว / เย็บต่อข้าง</button>
      </div>
    `;

    bodyHTML = `
      ${fMeta ? `
        <div class="pop-highlight-box">
          <b>🎯 จุดที่คลิกแก้ไข: <span style="color:#b42318">${esc(fMeta[0])}</span></b>
          <div class="grid2" style="margin-top:4px">
            <label>ขนาด ${esc(fMeta[0])} (ซม.)
              <input type="number" step="any" ${b(fKey)} data-pop-autofocus="1" placeholder="ระบุขนาด (ซม.)" style="font-weight:700;font-size:14px">
            </label>
            <label>หมายเหตุกำกับจุดนี้
              <input list="dlRemarks" ${b(fMeta[1])} placeholder="เช่น ชนแอร์, ปลั๊กไฟ, บิ้วอิน">
            </label>
          </div>
        </div>
      ` : ''}

      <!-- ส่วนที่ 1: รหัสจุดและขนาดรอบบาน -->
      <section class="pop-sec-card" id="popSec_dims">
        <div class="pop-sec-title">
          <span class="pop-sec-badge">ส่วนที่ 1</span>
          <b>รหัสจุด และขนาดพื้นที่รอบบาน</b>
        </div>
        <div class="grid3" style="margin-bottom:6px">
          <label>ลำดับจุด
            <input ${b('planNo')} placeholder="1, 2...">
          </label>
          <label>รหัส/ตำแหน่ง (เช่น W1, D1)
            <input ${b('label')} ${(!fMeta && subTab === 'style') ? 'data-pop-autofocus="1"' : ''} placeholder="W1, D1">
          </label>
          <label>ดึงจากจุดในแปลนห้อง
            <select data-plan-pick="${i}">${planSelectOpts}</select>
          </label>
        </div>
        <div class="dim-grid">
          ${dimFieldRow(b, 'ความกว้าง (เฟรม)', 'width', 'noteWidth', i, true)}
          ${dimFieldRow(b, 'ความสูง (เฟรม)', 'height', 'noteHeight', i, true)}
          ${dimFieldRow(b, 'เผื่อด้านซ้าย (+)', 'extL', 'noteExtL', i, true)}
          ${dimFieldRow(b, 'เผื่อด้านขวา (+)', 'extR', 'noteExtR', i, true)}
          ${dimFieldRow(b, 'เผื่อด้านบน (+)', 'extT', 'noteExtT', i, true)}
          ${dimFieldRow(b, 'เผื่อด้านล่าง (+)', 'extB', 'noteExtB', i, true)}
          ${dimFieldRow(b, 'พื้นที่ด้านซ้าย', 'wallL', 'noteWallL', i)}
          ${dimFieldRow(b, 'พื้นที่ด้านขวา', 'wallR', 'noteWallR', i)}
          ${dimFieldRow(b, 'พื้นที่ด้านบน', 'ceilT', 'noteCeilT', i)}
          ${dimFieldRow(b, 'พื้นที่ด้านล่าง', 'floorB', 'noteFloorB', i)}
          ${dimFieldRow(b, 'ความกว้างเต็ม', 'fullW', 'noteFullW', i)}
          ${dimFieldRow(b, 'ความสูงเต็ม', 'fullH', 'noteFullH', i)}
        </div>
        <div id="popRailSumText" class="pop-rail-sum">
          กว้างราง = <b>${esc(rw || '-')}</b> ซม. • สูงราง (สูงเฟรม+เผื่อบน+เผื่อล่าง) = <b>${esc(rh || '-')}</b> ซม.
        </div>
      </section>

      <!-- ส่วนที่ 2: รูปแบบผ้าม่าน รางม่าน และการลดขนาดความสูงม่าน -->
      <section class="pop-sec-card" id="popSec_style">
        <div class="pop-sec-title">
          <span class="pop-sec-badge">ส่วนที่ 2</span>
          <b>รูปแบบผ้าม่าน รางม่าน และการลดขนาดความสูงผ้าม่าน</b>
        </div>
        <div class="grid2">
          <label>รูปแบบผ้าม่านชั้นที่ 1 (ม่านทึบ/หลัก)
            <select ${b('curtainStyle1')}>${curtainOpts}</select>
          </label>
          <label>รูปแบบผ้าม่านชั้นที่ 2 (ม่านโปร่ง)
            <select ${b('curtainStyle2')}>${curtainOpts}</select>
          </label>
          <label>จำนวนผืน ชั้นที่ 1 (ม่านทึบ)
            <select ${b('pieces1')}>
              <option value="">ตามสูตรมาตรฐาน</option>
              <option value="1">1 ผืน (รวบข้างเดียว)</option>
              <option value="2">2 ผืน (แยกกลาง)</option>
              <option value="3">3 ผืน</option>
              <option value="4">4 ผืน</option>
            </select>
          </label>
          <label>จำนวนผืน ชั้นที่ 2 (ม่านโปร่ง)
            <select ${b('pieces2')}>
              <option value="">ตามชั้นที่ 1 / ตามสูตร</option>
              <option value="1">1 ผืน</option>
              <option value="2">2 ผืน</option>
              <option value="3">3 ผืน</option>
              <option value="4">4 ผืน</option>
            </select>
          </label>
          <label>จำนวนชั้นรางม่าน & ประเภทรางม่าน
            <span class="inline">
              <select ${b('railTracks')} style="max-width:95px">
                <option value="">อัตโนมัติ</option>
                <option value="1">1 ชั้น</option>
                <option value="2">2 ชั้น</option>
              </select>
              <select ${b('rodType')}>${rodTypeOpts}</select>
            </span>
          </label>
          <label>ขนาดตะขอ ${needHook ? '<b>(ม่านจีบ/ลอน)</b>' : '<small>(เฉพาะม่านจีบ/ลอน)</small>'}
            <select ${b('hookSize')} ${needHook ? '' : 'disabled'}>${hookOpts}</select>
          </label>
        </div>

        ${isTwoLayer ? `
          <div style="margin-top:6px;padding:6px 8px;background:#f4fbf7;border:1px dashed #81c784;border-radius:6px">
            <div class="grid2">
              <label>กรณีม่าน 2 ชั้น: ลดความสูงผ้าม่านชั้นด้านหลังเพิ่ม
                <select ${b('backLayerHeightDeduct')}>${backDeductOpts}</select>
              </label>
              <label>ชั้นม่านด้านหลังที่ต้องการลดความสูงเพิ่ม
                <select ${b('backLayerTarget')}>
                  <option value="layer2">ชั้นที่ 2 (ม่านโปร่ง — ค่ามาตรฐาน)</option>
                  <option value="layer1">ชั้นที่ 1 (ม่านทึบ)</option>
                </select>
              </label>
            </div>
          </div>
        ` : ''}

        <div style="margin-top:6px;padding:6px 8px;background:#fff8f6;border:1px dashed #ef9a9a;border-radius:6px">
          <label class="inline" style="font-weight:700;color:#b71c1c;cursor:pointer">
            <input type="checkbox" ${b('noRail')}>
            🚫 ไม่รับรางม่าน (ให้ระบบลดขนาดความสูงผ้าม่านตามตัวเลือก)
          </label>
          ${w.noRail ? `
            <div class="grid2" style="margin-top:4px">
              <label>ข้อความในช่องจำนวนราง
                <select ${b('noRailStatus')}>
                  <option value="ใช้รางเดิม">ใช้รางเดิม</option>
                  <option value="ไม่เอาราง">ไม่เอาราง</option>
                </select>
              </label>
              <label>ตัวเลือกลดความสูงผ้าม่าน
                <select ${b('noRailDeductPreset')}>${noRailPresetOpts}</select>
              </label>
              ${w.noRailDeductPreset === 'custom' ? `
                <label class="full">ระบุระยะลดความสูงเอง (ซม.)
                  <input type="number" step="any" ${b('noRailDeductCustom')} placeholder="ซม.">
                </label>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <div class="opts" style="margin-top:6px">
          <div><span class="olbl">กล่องม่าน</span>
            <label><input type="radio" name="pop_box${i}" value="no" ${b('box')}>ไม่มี</label>
            <label><input type="radio" name="pop_box${i}" value="yes" ${b('box')}>มี</label>
            ${w.box === 'yes' ? `<input ${b('boxSize')} placeholder="ระบุขนาดกล่องม่าน" style="width:140px">` : ''}
          </div>
          <div><span class="olbl">ขาจับราง</span>
            <label><input type="radio" name="pop_mount${i}" value="wall" ${b('mount')}>ผนัง</label>
            <label><input type="radio" name="pop_mount${i}" value="ceiling" ${b('mount')}>เพดาน</label>
            ${w.mount === 'wall' ? `
              <label style="margin-left:4px;font-weight:700"><input type="checkbox" ${b('wallCeilingAttach')}>ผนังชิดเพดาน</label>
              ${w.wallCeilingAttach ? `<input ${b('wallCeilingNote')} placeholder="ระบุระยะ" style="width:100px">` : ''}
            ` : ''}
          </div>
        </div>
      </section>

      <!-- ส่วนที่ 3: กรอบบาน แบ่งผืนซ้าย/ขวา และหน้ากากม่าน -->
      <section class="pop-sec-card" id="popSec_mask">
        <div class="pop-sec-title">
          <span class="pop-sec-badge">ส่วนที่ 3</span>
          <b>กรอบหน้าต่าง/ประตู แบ่งผืนซ้าย/ขวา และหน้ากากม่าน</b>
        </div>
        <div class="grid2">
          <label>รูปแบบหน้าต่าง/ประตู (แบบ 1–9 โค้ง 90°)
            <select ${b('cornerShape')}>${CORNER_SHAPES.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>
          </label>
          <label>จำนวนช่องบานในกรอบ
            <span class="inline">
              <button type="button" data-act="decPane" data-i="${i}">−</button>
              <input type="number" min="1" max="24" step="1" ${b('paneStyle')} style="max-width:65px;text-align:center;font-weight:700">
              <button type="button" data-act="incPane" data-i="${i}">＋</button>
              <small style="color:#555">ช่องบาน</small>
            </span>
          </label>
        </div>
        <div style="margin-top:6px;padding:7px 9px;background:#f7faff;border:1px dashed #90caf9;border-radius:6px">
          <label class="inline" style="font-weight:700;color:#0d47a1;cursor:pointer">
            <input type="checkbox" ${b('unequalSplit')}>
            ✂️ แบ่งผ้าม่านผืนซ้าย / ผืนขวา ไม่เท่ากันบนรางเดียว (เช่น 150/250 ราง 400)
          </label>
          ${w.unequalSplit ? `
            <div class="grid2" style="margin-top:6px">
              <label>ขนาดช่วงแบ่งผืนซ้าย (ซม.)
                <input type="number" step="any" ${b('splitLeft')} placeholder="เช่น 150">
              </label>
              <label>ขนาดช่วงแบ่งผืนขวา (ซม.)
                <input type="number" step="any" ${b('splitRight')} placeholder="เช่น 250">
              </label>
            </div>
          ` : ''}
        </div>
        <div style="margin-top:6px">
          <div class="inline" style="justify-content:space-between;margin-bottom:4px">
            <b>🪟 หน้ากากแสดงการรวบม่าน / โซ่ดึง</b>
            <button type="button" data-act="addLayer" data-i="${i}">➕ เพิ่มชิ้นผ้าม่าน</button>
          </div>
          <div class="layers-ed">${layersHTML}</div>
        </div>
      </section>

      <!-- ส่วนที่ 4: การคำนวณขนาดและปริมาณผ้า (เลือกจากตารางผ้าของหน้านี้) -->
      <section class="pop-sec-card" id="popSec_calc">
        <div class="pop-sec-title">
          <span class="pop-sec-badge">ส่วนที่ 4</span>
          <b>การคำนวณขนาดราง ขนาดผ้าม่าน และปริมาณผ้า (แสดง หน้า/หลา เช่น 5/8.9)</b>
        </div>
        <div class="inline" style="justify-content:space-between;flex-wrap:wrap;margin-bottom:6px">
          <div class="inline">
            <button type="button" class="${w.calcMode !== 'manual' ? 'primary' : ''}" data-act="setAllAuto" data-i="${i}">⚡ อัตโนมัติทั้งหมด</button>
            <button type="button" class="${w.calcMode === 'manual' ? 'primary' : ''}" data-act="setAllManual" data-i="${i}">✍️ กรอกเองทั้งหมด</button>
          </div>
          <div class="inline">
            <button type="button" data-act="jumpToSheetFabrics">🧵 ตั้งค่ารายการผ้าในตารางผ้าของหน้านี้</button>
            <button type="button" class="primary" data-act="applyFormula" data-i="${i}">🔄 คำนวณใหม่ตามสูตร</button>
          </div>
        </div>

        <div class="pop-layer-box">
          <div class="pop-layer-hd">ชั้นที่ 1: ${esc(style1 || 'ผ้าม่านทึบ (กรุณาเลือกรูปแบบม่านและรายการผ้าก่อนคำนวณ)')}</div>
          <div class="grid2">
            <label>สูตรความกว้าง (ม่านทึบ)
              <select ${b('widthFormulaId1')}>
                <option value="">-- อัตโนมัติตามเงื่อนไข (${wfList1.length} สูตร) --</option>
                ${wfList1.map(f => `<option value="${esc(f.id)}">${esc(f.label)}</option>`).join('')}
              </select>
            </label>
            <label>การลดความสูง / สูตรความสูง (ม่านทึบ)
              <select ${b('heightFormulaId1')}>
                <option value="">-- อัตโนมัติตามเงื่อนไข (${hfList1.length} สูตร) --</option>
                ${hfList1.map(f => `<option value="${esc(f.id)}">${esc(f.label)} (${esc(f.heightExp)})</option>`).join('')}
              </select>
            </label>
            <label>เลือกผ้าชั้นที่ 1 (จากตารางผ้าของหน้านี้)
              <select ${b('fabricCol1')}>${sheetFabOpts}</select>
            </label>
            <label>เกรนคำนวณผ้าชั้นที่ 1
              <select ${b('grainType1')}>
                <option value="opaque">เกรนม่านทึบ</option>
                <option value="sheer" ${allowSheer1 ? '' : 'disabled'}>เกรนม่านโปร่ง (หน้าผ้า &gt; 270 ซม.)</option>
              </select>
            </label>
            <label>การแสดงจำนวนหลา (ชั้นที่ 1)
              <select ${b('yardMode1')}>${yardModeOpts}</select>
            </label>
            ${(w.yardMode1 === 'ceil_plus' || w.yardMode1 === 'exact_plus') ? `
              <label>จำนวนหลาที่ต้องการบวกเพิ่ม
                <input type="number" step="any" ${b('extraYards1')} placeholder="เช่น 1">
              </label>
            ` : `<div></div>`}
          </div>
        </div>

        <div class="pop-layer-box" style="margin-top:6px">
          <div class="pop-layer-hd">ชั้นที่ 2: ${esc(w.curtainStyle2 || 'ผ้าม่านโปร่ง')}</div>
          <div class="grid2">
            <label>สูตรความกว้าง (ม่านโปร่ง)
              <select ${b('widthFormulaId2')}>
                <option value="">-- อัตโนมัติตามเงื่อนไข (${wfList2.length} สูตร) --</option>
                ${wfList2.map(f => `<option value="${esc(f.id)}">${esc(f.label)}</option>`).join('')}
              </select>
            </label>
            <label>การลดความสูง / สูตรความสูง (ม่านโปร่ง)
              <select ${b('heightFormulaId2')}>
                <option value="">-- อัตโนมัติตามเงื่อนไข (${hfList2.length} สูตร) --</option>
                ${hfList2.map(f => `<option value="${esc(f.id)}">${esc(f.label)} (${esc(f.heightExp)})</option>`).join('')}
              </select>
            </label>
            <label>เลือกผ้าชั้นที่ 2 (จากตารางผ้าของหน้านี้)
              <select ${b('fabricCol2')}>${sheetFabOpts}</select>
            </label>
            <label>เกรนคำนวณผ้าชั้นที่ 2
              <select ${b('grainType2')}>
                <option value="opaque">เกรนม่านทึบ</option>
                <option value="sheer" ${allowSheer2 ? '' : 'disabled'}>เกรนม่านโปร่ง (หน้าผ้า &gt; 270 ซม.)</option>
              </select>
            </label>
            <label>การแสดงจำนวนหลา (ชั้นที่ 2)
              <select ${b('yardMode2')}>${yardModeOpts}</select>
            </label>
            ${(w.yardMode2 === 'ceil_plus' || w.yardMode2 === 'exact_plus') ? `
              <label>จำนวนหลาที่ต้องการบวกเพิ่ม
                <input type="number" step="any" ${b('extraYards2')} placeholder="เช่น 1">
              </label>
            ` : `<div></div>`}
          </div>
        </div>

        <table class="calc-ed" style="margin-top:6px">
          <tr><th></th><th>ขนาดกว้าง</th><th></th><th>ขนาดสูง</th><th></th><th>จำนวน</th><th></th><th>รวม (หน้า/หลา)</th></tr>
          ${calcRowEd('rail', 'rail', (w.rowLabel1 || 'รางม่าน'), (w.railCountUnit || (isBlind1 && !w.curtainStyle2 ? 'ผืน' : 'ชั้น')), (w.noRail ? '' : (w.railUnit || 'เมตร')))}
          ${calcRowEd('blackout', 'bo', (w.rowLabel2 || (isBlind1 ? style1 : 'ผ้าม่านทึบ')), 'ผืน', isBlind1 ? 'ตร.ม.' : 'หน้า/หลา')}
          ${calcRowEd('sheer', 'sh', (w.rowLabel3 || 'ผ้าม่านโปร่ง'), 'ผืน', isBlind2 ? 'ตร.ม.' : 'หน้า/หลา')}
        </table>

        <div style="margin-top:6px;padding:7px 9px;background:#eef6ff;border:1px dashed #60a5fa;border-radius:6px">
          <div class="grid2">
            <label>ระยะลอย / กองพื้น (ฐานข้อมูลกำหนดมาตรฐานลอยจากพื้น 1 ซม.)
              <select ${b('floorMode')}>${FLOOR_CLEARANCE_MODES.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select>
            </label>
            ${(w.floorMode === 'float' || w.floorMode === 'puddle') ? `
              <label>${w.floorMode === 'float' ? 'ระบุระยะลอยเพิ่ม (ซม. — ไม่ดูเครื่องหมาย +/-)' : 'ระบุระยะกองพื้น (ซม. — ไม่ดูเครื่องหมาย +/-)'}
                <input type="text" inputmode="decimal" ${b('floorAdjust')} placeholder="${w.floorMode === 'float' ? 'เช่น 2 (ยิ่งลอยเพิ่ม)' : 'เช่น 3 (ยิ่งกองพื้น)'}">
              </label>
            ` : `<div></div>`}
          </div>
          <div style="font-size:11.5px;color:#1e3a8a;margin-top:3px">ผลปรับอัตโนมัติ: <b>${esc(formatFloorStatusSummary(w))}</b></div>
        </div>

        <div class="subcard" style="margin-top:6px;background:#f8fafc;border:1px solid #dbe2ea">
          <div class="grid2">
            <label>หน่วยช่องชั้น/ผืน (รางม่าน)
              <select ${b('railCountUnit')}>
                <option value="">อัตโนมัติ (${isBlind1 && !w.curtainStyle2 ? 'ผืน' : 'ชั้น'})</option>
                <option value="ชั้น">ชั้น</option>
                <option value="ผืน">ผืน</option>
                <option value="ชุด">ชุด</option>
              </select>
            </label>
            <label>หน่วยช่องจำนวนราง
              <select ${b('railUnit')}>
                <option value="">อัตโนมัติตามรุ่นราง</option>
                <option value="เมตร">เมตร (ขั้นต่ำ 1 เมตร/ราง)</option>
                <option value="ชุด">ชุด (ตามช่วงความยาวชุดราง)</option>
                <option value="ชุด/เมตร">ชุด/เมตร</option>
                <option value="เมตร/ชุด">เมตร/ชุด</option>
                <option value="ตร.ม.">ตร.ม.</option>
              </select>
            </label>
            <label class="full">กำหนดชื่อแถวเอง (รางม่าน / ผ้าม่านทึบ / ผ้าม่านโปร่ง เช่น ผืนที่ 1 / ผืนที่ 2)
              <span class="inline">
                <input ${b('rowLabel1')} placeholder="รางม่าน">
                <input ${b('rowLabel2')} placeholder="ผ้าม่านทึบ">
                <input ${b('rowLabel3')} placeholder="ผ้าม่านโปร่ง">
              </span>
            </label>
          </div>
          ${(isBlind1 || isBlind2 || (Array.isArray(w.blindPieces) && w.blindPieces.length > 0)) ? `
            <div style="margin-top:6px;padding-top:6px;border-top:1px dashed #cbd5e1">
              <div class="inline" style="justify-content:space-between;margin-bottom:4px">
                <b>🪟 ม่านม้วน/มู่ลี่ แบ่งหลายผืน (ขนาดเท่ากันจะรวมเป็น เช่น ผืนที่ 2/ผืนที่ 3 อัตโนมัติ)</b>
                <button type="button" data-act="addBlindPiece" data-i="${i}">➕ เพิ่มผืน</button>
              </div>
              ${(w.blindPieces || []).map((bp, pi) => `
                <div class="inline" style="margin-bottom:4px">
                  <span class="layer-tag">ผืนที่ ${pi + 1}</span>
                  <input type="number" step="any" data-sheet="windows.${i}.blindPieces.${pi}.w" value="${esc(bp.w || '')}" placeholder="กว้าง (ซม.)" style="width:95px">
                  <span>x</span>
                  <input type="number" step="any" data-sheet="windows.${i}.blindPieces.${pi}.h" value="${esc(bp.h || '')}" placeholder="สูง (ซม.)" style="width:95px">
                  <button type="button" class="danger" data-act="delBlindPiece" data-i="${i}" data-li="${pi}">✕</button>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </section>

      <!-- ส่วนที่ 5: รายการพิเศษ (แปลนงานม่านจั่ว 5 รูปแบบ / ผ้าม่านเย็บต่อด้านข้าง แสดงแยกหน้าถัดไป) -->
      <section class="pop-sec-card" id="popSec_special">
        <div class="pop-sec-title">
          <span class="pop-sec-badge">ส่วนที่ 5</span>
          <b>รายการพิเศษ (แปลนงานม่านจั่ว 5 รูปแบบ / เย็บต่อด้านข้าง — แสดงแยกในหน้าถัดไป)</b>
        </div>
        <div class="grid2">
          <label class="full">เลือกประเภทรายการพิเศษของจุดนี้
            <select ${b('specialType')}>${specialTypeOpts}</select>
          </label>
        </div>
        ${w.specialType === 'gable' ? `
          <div style="margin-top:6px;padding:8px;background:#faf8ff;border:1px solid #d1c4e9;border-radius:6px">
            <div class="grid2">
              <label class="full">เลือกรูปแบบม่านจั่ว (ตามไฟล์แนบ 5 หน้า)
                <select ${b('gable.type')}>${gableTypeOpts}</select>
              </label>
              <label>หัวข้อแปลนงานม่านจั่ว (ดึงชื่อห้อง+ตำแหน่งอัตโนมัติ)
                <input ${b('gable.title')} placeholder="เช่น ห้องนอนใหญ่ W1">
              </label>
              <label>ระยะลดความสูงม่านจั่ว (ซม.)
                <input type="number" step="any" ${b('gable.heightDeduct')} placeholder="เช่น 2">
              </label>
              <label>ระยะชายม่านท้ายใบม่านจั่ว
                <select ${b('gable.hemClearanceType')}>
                  <option value="float">ลอยจากพื้น</option>
                  <option value="touch">พอดีพื้น</option>
                  <option value="puddle">กองพื้น</option>
                </select>
              </label>
              <label>ระบุระยะชายม่านที่ต้องการ (ซม.)
                <input type="number" step="any" ${b('gable.hemClearanceVal')} placeholder="เช่น 1 หรือ 2">
              </label>
              ${isGableSingleSpan ? `
                <label class="full">ความกว้างที่วัดได้จริง (ซม.)
                  <input type="number" step="any" ${b('gable.widthTotal')} placeholder="ระบุความกว้างที่วัดได้จริง">
                </label>
                <label>ความสูงเต็ม [A] (ซม.)
                  <input type="number" step="any" ${b('gable.fullA')} placeholder="สูงเต็ม A">
                </label>
                <label>ความสูงเต็ม [B] (ซม.)
                  <input type="number" step="any" ${b('gable.fullB')} placeholder="สูงเต็ม B">
                </label>
                <label>ความสูง [A] ที่ลดความสูงแล้ว (ซม.)
                  <input type="number" step="any" ${b('gable.redA')} placeholder="คำนวณอัตโนมัติ">
                </label>
                <label>ความสูง [B] ที่ลดความสูงแล้ว (ซม.)
                  <input type="number" step="any" ${b('gable.redB')} placeholder="คำนวณอัตโนมัติ">
                </label>
              ` : `
                <label>ความกว้างซ้าย ที่วัดได้จริง (ซม.)
                  <input type="number" step="any" ${b('gable.widthLeft')} placeholder="กว้างซ้ายวัดจริง">
                </label>
                <label>ความกว้างขวา ที่วัดได้จริง (ซม.)
                  <input type="number" step="any" ${b('gable.widthRight')} placeholder="กว้างขวาวัดจริง">
                </label>
                <label>ความสูงเต็ม [A] ซ้าย (ซม.)
                  <input type="number" step="any" ${b('gable.fullA')} placeholder="สูงเต็ม A">
                </label>
                <label>ความสูงเต็ม [B] กลาง (ซม.)
                  <input type="number" step="any" ${b('gable.fullB')} placeholder="สูงเต็ม B">
                </label>
                <label>ความสูงเต็ม [C] ขวา (ซม.)
                  <input type="number" step="any" ${b('gable.fullC')} placeholder="สูงเต็ม C">
                </label>
                <label>หมายเหตุท้ายใบม่านจั่ว (ซม.)
                  <input ${b('gable.noteDeduct')} placeholder="เช่น หักราง 2">
                </label>
                <label>ความสูง [A] ที่ลดความสูงแล้ว (ซม.)
                  <input type="number" step="any" ${b('gable.redA')} placeholder="คำนวณอัตโนมัติ">
                </label>
                <label>ความสูง [B] ที่ลดความสูงแล้ว (ซม.)
                  <input type="number" step="any" ${b('gable.redB')} placeholder="คำนวณอัตโนมัติ">
                </label>
                <label>ความสูง [C] ที่ลดความสูงแล้ว (ซม.)
                  <input type="number" step="any" ${b('gable.redC')} placeholder="คำนวณอัตโนมัติ">
                </label>
              `}
            </div>
          </div>
        ` : ''}
        ${w.specialType === 'side_join' ? `
          <div style="margin-top:6px;padding:8px;background:#faf8ff;border:1px solid #d1c4e9;border-radius:6px">
            <div class="grid2">
              <label class="full">รูปแบบการเย็บต่อผ้าด้านข้าง
                <select ${b('sideJoin.type')}>${sideJoinTypeOpts}</select>
              </label>
              <label>ความกว้างผ้าหลัก (ซม.)
                <input type="number" step="any" ${b('sideJoin.mainWidth')} placeholder="เช่น 200">
              </label>
              <label>ความกว้างแถบผ้าที่เย็บต่อ (ซม.)
                <input type="number" step="any" ${b('sideJoin.borderWidth')} placeholder="เช่น 30">
              </label>
              <label>ชื่อผ้าที่นำมาเย็บต่อด้านข้าง
                <input list="dlFabrics" ${b('sideJoin.joinFabName')} placeholder="ระบุชื่อผ้าต่อข้าง">
              </label>
              <label>ดีไซน์ / สีของผ้าที่ต่อ
                <span class="inline">
                  <input ${b('sideJoin.joinDesign')} placeholder="ดีไซน์">
                  <input ${b('sideJoin.joinColor')} placeholder="สี">
                </span>
              </label>
              <label>จำนวนหลาผ้าต่อข้างที่ใช้
                <input ${b('sideJoin.joinQty')} placeholder="เช่น 6.5">
              </label>
              <label>หมายเหตุการเย็บต่อพิเศษ
                <input ${b('sideJoin.note')} placeholder="ระบุรายละเอียด">
              </label>
            </div>
          </div>
        ` : ''}
      </section>

      <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:4px;margin-top:8px;padding-top:6px;border-top:1px solid #e1e6ef">
        <div class="inline" style="flex-wrap:wrap;gap:4px">
          <button type="button" data-act="addWin">➕ เพิ่มบานใหม่</button>
          <button type="button" data-act="dupWin" data-i="${i}">⧉ คัดลอกบานนี้</button>
          <button type="button" data-act="upWin" data-i="${i}" ${i === 0 ? 'disabled' : ''}>▲ ย้ายขึ้น</button>
          <button type="button" data-act="downWin" data-i="${i}" ${i >= (sh.windows || []).length - 1 ? 'disabled' : ''}>▼ ย้ายลง</button>
          <button type="button" class="danger" data-act="delWin" data-i="${i}">🗑️ ลบบานนี้</button>
        </div>
        <button type="button" class="primary" data-pop-close="1">✔ เสร็จสิ้น</button>
      </div>
    `;
  } else if (ctx.type === 'customer') {
    title = '👤 แก้ไขข้อมูลลูกค้า และสถานที่ติดตั้ง';
    const accessibleCusts = orders.filter(o => canAccessOrder(o) && o.customer && String(o.customer.name || '').trim());
    const custMap = new Map();
    accessibleCusts.forEach(o => {
      const nk = String(o.customer.name).trim().toLowerCase();
      if (!custMap.has(nk)) custMap.set(nk, { order: o, count: 1 });
      else custMap.get(nk).count++;
    });
    const custList = Array.from(custMap.values());
    const custPickOpts = `<option value="">-- เลือกชื่อลูกค้าที่มีอยู่แล้ว เพื่อดึงข้อมูล (${custList.length} รายชื่อ) --</option>` +
      custList.map(({ order: co, count }) => `<option value="${esc(co.id)}">${esc(co.customer.name)} (${esc(co.customer.mobile || '-')} • มี ${count} แปลนงาน)</option>`).join('');
    bodyHTML = `
      <section class="pop-sec-card" style="background:#f0f7ff;border:1px solid #bfdbfe">
        <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:6px">
          <select id="popExistingCustPick" style="flex:1;min-width:220px">${custPickOpts}</select>
          <button type="button" data-pop-newplan="1" title="สร้างแปลนงานเพิ่มให้ลูกค้ารายนี้">🏠+ สร้างแปลนใหม่ให้ลูกค้ารายนี้</button>
        </div>
      </section>
      <section class="pop-sec-card">
        <div class="pop-sec-title"><span class="pop-sec-badge">ข้อมูลลูกค้า</span><b>ชื่อลูกค้าและการติดต่อ</b></div>
        <div class="grid2">
          <label class="full">ชื่อลูกค้า
            <input data-shared="customer.name" data-pop-autofocus="1">
          </label>
          <label>เบอร์มือถือ <input data-shared="customer.mobile"></label>
          <label>โทรศัพท์ <input data-shared="customer.tel"></label>
          <label class="full">อีเมล <input data-shared="customer.email"></label>
        </div>
      </section>
      <section class="pop-sec-card">
        <div class="pop-sec-title"><span class="pop-sec-badge">ที่อยู่ติดตั้ง</span><b>รายละเอียดสถานที่ติดตั้งและจัดส่ง</b></div>
        <div class="grid2">
          <label class="full">อาคาร / หมู่บ้าน <input data-shared="customer.building"></label>
          <label>เลขที่ <input data-shared="customer.houseNo"></label>
          <label>ชั้น <input data-shared="customer.floor"></label>
          <label>หมู่ที่ <input data-shared="customer.moo"></label>
          <label>ซอย <input data-shared="customer.soi"></label>
          <label>ถนน <input data-shared="customer.road"></label>
          <label>ตำบล / แขวง <input data-shared="customer.subdistrict"></label>
          <label>อำเภอ / เขต <input data-shared="customer.district"></label>
          <label>จังหวัด <input data-shared="customer.province"></label>
          <label>รหัสไปรษณีย์ <input data-shared="customer.zipcode"></label>
          <label>วันที่จัดส่ง <input type="date" data-shared="customer.deliveryDate"></label>
          <label class="full">สถานที่ส่ง <input data-shared="customer.deliveryPlace"></label>
        </div>
      </section>
    `;
  } else if (ctx.type === 'staff') {
    title = '🧑‍💼 แก้ไขข้อมูลพนักงาน และส่วนลด';
    const curUser = getCurrentUser();
    const visibleStaff = (curUser && curUser.role !== 'admin')
      ? masterDB.staff.map((s, si) => ({ s, si })).filter(({ s }) => String(s.username || '').toLowerCase() === String(curUser.username || '').toLowerCase())
      : masterDB.staff.map((s, si) => ({ s, si }));
    const staffPickOpts = `<option value="">-- เลือกพนักงานจากฐานข้อมูล (${visibleStaff.length} คน) --</option>` +
      visibleStaff.map(({ s, si }) => `<option value="${si}">${esc(s.name)} (${esc(s.dept || '-')} / ${esc(s.branch || '-')})</option>`).join('');
    bodyHTML = `
      <section class="pop-sec-card" style="background:#f0f7ff;border:1px solid #bfdbfe">
        <label>เลือกพนักงานจากฐานข้อมูล
          <select id="popStaffPick">${staffPickOpts}</select>
        </label>
      </section>
      <section class="pop-sec-card">
        <div class="pop-sec-title"><span class="pop-sec-badge">พนักงาน</span><b>ข้อมูลผู้รับผิดชอบ</b></div>
        <div class="grid2">
          <label>เลขที่เอกสาร <input data-shared="staff.orderNo" data-pop-autofocus="1" placeholder="-"></label>
          <label>ชื่อพนักงานขาย <input data-shared="staff.name"></label>
          <label>แผนก <input data-shared="staff.dept"></label>
          <label>สาขา <input data-shared="staff.branch"></label>
        </div>
      </section>
      <section class="pop-sec-card">
        <div class="pop-sec-title"><span class="pop-sec-badge">ส่วนลด</span><b>ส่วนลดแต่ละหมวด (%)</b></div>
        <div class="grid2">
          <label>ส่วนลดผ้าทึบ (%) <input type="number" step="0.1" data-shared="discount.blackout"></label>
          <label>ส่วนลดผ้าโปร่ง (%) <input type="number" step="0.1" data-shared="discount.sheer"></label>
          <label>ส่วนลดอุปกรณ์ (%) <input type="number" step="0.1" data-shared="discount.equipment"></label>
          <label>ส่วนลดค่าแรง (%) <input type="number" step="0.1" data-shared="discount.labor"></label>
        </div>
      </section>
    `;
  } else if (ctx.type === 'map') {
    title = '🗺️ แก้ไขชื่อห้อง แปลนห้อง จุดหน้าต่าง และหมายเหตุห้อง';
    const popPlanSvg = (typeof planPreviewSVG === 'function') ? planPreviewSVG((sh.plan && sh.plan.items) || []) : '';
    const winRowsHtml = (sh.windows || []).map((ww, wi) => `
      <div class="inline" style="justify-content:space-between;padding:4px 6px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;margin-bottom:4px">
        <div style="font-size:12px">
          <b>จุดที่ ${esc(ww.planNo || (wi + 1))}</b> (${esc(ww.label || '-')})
          <span style="color:#64748b;margin-left:4px">${esc(ww.width || '-')} × ${esc(ww.height || '-')} ซม.</span>
        </div>
        <div class="inline" style="gap:3px">
          <button type="button" data-pop-win-jump="${wi}" title="แก้ไขจุดนี้">✏️ แก้ไข</button>
          <button type="button" data-act="upWin" data-i="${wi}" ${wi === 0 ? 'disabled' : ''} title="ย้ายขึ้น">▲</button>
          <button type="button" data-act="downWin" data-i="${wi}" ${wi >= (sh.windows || []).length - 1 ? 'disabled' : ''} title="ย้ายลง">▼</button>
          <button type="button" class="danger" data-act="delWin" data-i="${wi}" title="ลบบานนี้">✕</button>
        </div>
      </div>
    `).join('');
    bodyHTML = `
      <section class="pop-sec-card">
        <div class="pop-sec-title"><span class="pop-sec-badge">ข้อมูลห้อง</span><b>ชื่อห้องและสภาพหน้างาน</b></div>
        <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:6px">
          <label style="flex:1;min-width:180px">ชื่อห้อง
            <input data-sheet="room.name" data-pop-autofocus="1" placeholder="เช่น ห้องนอนใหญ่, ห้องรับแขก">
          </label>
          <div class="inline" style="margin-top:16px">
            <button type="button" class="primary" data-act="openPlan">✏️ วาดแปลนห้อง &amp; กำหนดจุดหน้าต่าง/ประตู</button>
            <button type="button" data-act="syncFromPlan" title="อัปเดตรายการหน้าต่าง/ประตูตามจุดในแปลน">🔄 ดึงจุดจากแปลน</button>
            <button type="button" data-pop-reorder-sheets="1" title="จัดลำดับหน้า/ใบแปลนงาน">📑 จัดลำดับใบแปลน</button>
          </div>
        </div>
        <div id="popPlanMini" style="border:1px dashed #60a5fa;border-radius:8px;padding:6px;background:#f8fafc;cursor:pointer;text-align:center;margin-bottom:8px" title="คลิกเพื่อเปิดหน้าต่างวาดแปลนห้อง &amp; กำหนดจุดหน้าต่าง/ประตู">
          ${popPlanSvg || '<div style="padding:14px;color:#1d4ed8;font-size:12px">📐 ยังไม่มีแปลนห้อง — คลิกที่นี่เพื่อวาดแปลนห้องและกำหนดจุดหน้าต่าง/ประตู</div>'}
        </div>
        <div class="opts">
          <div><span class="olbl">แอร์ผนัง</span>
            <label><input type="radio" name="pop_aircon" value="no" data-sheet="room.aircon">ไม่มี</label>
            <label><input type="radio" name="pop_aircon" value="yes" data-sheet="room.aircon">มี</label>
          </div>
          <div><span class="olbl">เหล็กดัด</span>
            <label><input type="radio" name="pop_grille" value="no" data-sheet="room.grille">ไม่มี</label>
            <label><input type="radio" name="pop_grille" value="yes" data-sheet="room.grille">มี</label>
          </div>
          <div><span class="olbl">มุ้งลวด</span>
            <label><input type="radio" name="pop_screen" value="no" data-sheet="room.screen">ไม่มี</label>
            <label><input type="radio" name="pop_screen" value="yes" data-sheet="room.screen">มี</label>
          </div>
        </div>
        <div class="grid2">
          <label>ลำดับอ้างอิง <input data-sheet="room.refNo"></label>
          <label>โปรโมชัน <input data-sheet="room.promo"></label>
        </div>
      </section>
      <section class="pop-sec-card">
        <div class="inline" style="justify-content:space-between;margin-bottom:6px">
          <b>🪟 รายการหน้าต่าง / ประตูในหน้านี้ (${(sh.windows || []).length} บาน)</b>
          <button type="button" data-act="addWin">➕ เพิ่มบานใหม่</button>
        </div>
        ${winRowsHtml || '<div class="hint">ยังไม่มีรายการหน้าต่าง/ประตู</div>'}
      </section>
      <section class="pop-sec-card">
        <div class="inline" style="justify-content:space-between;margin-bottom:4px">
          <b>📝 หมายเหตุประจำห้อง</b>
          <button type="button" data-act="addNote">➕ เพิ่มข้อหมายเหตุ</button>
        </div>
        <ol style="margin:0;padding-left:18px">
          ${(sh.notes || []).map((n, ni) => `<li style="margin-bottom:4px"><div class="inline"><input data-sheet="notes.${ni}" placeholder="หมายเหตุข้อ ${ni + 1}"><button type="button" class="danger" data-act="delNote" data-i="${ni}">✕</button></div></li>`).join('')}
        </ol>
      </section>
    `;
  } else if (ctx.type === 'fabric') {
    const col = ctx.fabCol || 'blackout';
    const colTitles = {
      blackout: 'ผ้าม่านทึบ',
      sheer: 'ผ้าม่านโปร่ง',
      roller: 'ม่านม้วน',
      blinds: 'มู่ลี่',
      other: 'อื่นๆ',
    };
    title = `🧵 แก้ไขตารางผ้าและสินค้า — ${colTitles[col] || ''}`;
    const isBlindCol = col === 'roller' || col === 'blinds';
    const dbOptions = isBlindCol
      ? (masterDB.blinds || []).map(x => `<option value="${esc(x.id)}">${esc(x.name)} [${esc(x.curtainStyle)}]</option>`).join('')
      : (masterDB.fabrics || []).map(x => `<option value="${esc(x.id)}">${esc(x.name)} (${esc(x.design || '-')}) หน้าผ้า ${esc(x.fabricWidth)} ซม.</option>`).join('');

    stickyNavHTML = `
      <div class="pop-tabs">
        ${Object.entries(colTitles).map(([k, t]) => `<button type="button" class="${col === k ? 'active' : ''}" data-pop-fabcol="${k}">${t}</button>`).join('')}
      </div>
    `;
    bodyHTML = `
      <section class="pop-sec-card">
        <div class="pop-sec-title"><span class="pop-sec-badge">${colTitles[col] || ''}</span><b>เลือกจากฐานข้อมูลหรือกรอกข้อมูล</b></div>
        <div class="inline" style="margin:6px 0">
          <select id="popFabDbPicker">
            <option value="">-- เลือกจากฐานข้อมูล${isBlindCol ? 'มู่ลี่/ม่านม้วน' : 'ผ้า'} --</option>
            ${dbOptions}
          </select>
          <button type="button" class="primary" data-pop-pick-fab="${col}">↘ ดึงค่า</button>
        </div>
        ${(col === 'blackout' || col === 'sheer') ? `
          <div class="opts">
            <label><input type="checkbox" data-sheet="fabrics.${col}.isOpaque"> ทึบ</label>
            <label><input type="checkbox" data-sheet="fabrics.${col}.isSheer"> โปร่ง</label>
          </div>
        ` : ''}
        ${col === 'other' ? `<label style="margin-bottom:6px">หัวข้อคอลัมน์อื่นๆ <input data-sheet="fabrics.other.label"></label>` : ''}
        <div class="grid2">
          <label>ชื่อผ้า / รุ่นสินค้า <input list="${isBlindCol ? 'dlBlinds' : 'dlFabrics'}" data-sheet="fabrics.${col}.name" data-pop-autofocus="1"></label>
          <label>รหัสดีไซน์ <input data-sheet="fabrics.${col}.design"></label>
          <label>สี <input data-sheet="fabrics.${col}.color"></label>
          <label>ปริมาณรวม (หลา / ตร.ม.) <input data-sheet="fabrics.${col}.qty"></label>
        </div>
      </section>
    `;
  } else if (ctx.type === 'rod') {
    const part = ctx.rodPart || 'rodType';
    title = '🛤️ แก้ไขรางม่าน ตะขอสายรวบ ก้านจูง และห่วงตาไก่';
    const railPickerFor = (rKey, catName) => {
      const items = (masterDB.rails || []).filter(r => !r.rodCategory || r.rodCategory === catName || r.rodCategory === '*');
      return `<div class="inline" style="margin-bottom:4px">
        <select id="popRailPicker_${rKey}">
          <option value="">-- เลือก ${catName} จากฐานข้อมูล (${items.length}) --</option>
          ${items.map(r => `<option value="${esc(r.id)}">${esc(r.name)} (${esc(r.defaultColor || '-')})</option>`).join('')}
        </select>
        <button type="button" data-pop-pick-rail="${rKey}">↘ ดึง</button>
      </div>`;
    };
    stickyNavHTML = `
      <div class="pop-tabs">
        <button type="button" class="${part === 'rodType' ? 'active' : ''}" data-pop-rodpart="rodType">🛤️ ประเภทรางม่าน</button>
        <button type="button" class="${part === 'holdBack' ? 'active' : ''}" data-pop-rodpart="holdBack">🪝 ตะขอสายรวบ</button>
        <button type="button" class="${part === 'drawRod' ? 'active' : ''}" data-pop-rodpart="drawRod">🦯 ก้านจูง</button>
        <button type="button" class="${part === 'grommet' ? 'active' : ''}" data-pop-rodpart="grommet">⭕ ห่วงตาไก่</button>
      </div>
    `;
    bodyHTML = `
      ${part === 'rodType' ? `
        <section class="pop-sec-card">
          <label class="inline" style="margin:2px 0 8px;font-weight:700"><input type="checkbox" data-sheet="rods.typeNo"> ไม่รับรางม่าน</label>
          ${railPickerFor('pleat', 'รางม่านจีบ')}
          <div class="grid2" style="margin-bottom:6px">
            <label>รางม่านจีบ <input list="dlRails" data-sheet="rods.pleat.model" data-pop-autofocus="1"></label>
            <label>สี <input data-sheet="rods.pleat.color"></label>
          </div>
          ${railPickerFor('show', 'รางโชว์')}
          <div class="grid3" style="margin-bottom:6px">
            <label>รางโชว์ <input list="dlRails" data-sheet="rods.show.model"></label>
            <label>สี <input data-sheet="rods.show.color"></label>
            <label>หัวปิดราง <input data-sheet="rods.show.cap"></label>
          </div>
          ${railPickerFor('wave', 'รางม่านลอน')}
          <div class="grid2" style="margin-bottom:6px">
            <label>รางม่านลอน <input list="dlRails" data-sheet="rods.wave.model"></label>
            <label>สี <input data-sheet="rods.wave.color"></label>
          </div>
          ${railPickerFor('fold', 'รางม่านพับ')}
          <div class="grid2">
            <label>รางม่านพับ <input list="dlRails" data-sheet="rods.fold.model"></label>
            <label>สี <input data-sheet="rods.fold.color"></label>
          </div>
        </section>
      ` : ''}
      ${part === 'holdBack' ? `
        <section class="pop-sec-card">
          <div class="opts" style="margin-top:2px">
            <label><input type="checkbox" data-sheet="rods.holdNo"> ไม่รับตะขอ</label>
            <label><input type="checkbox" data-sheet="rods.holdStd"> แบบมาตรฐาน</label>
            <label><input type="checkbox" data-sheet="rods.holdCrystal"> แบบคริสตัล</label>
          </div>
          <div class="grid2">
            <label class="inline"><input type="checkbox" data-sheet="rods.hold.silver.on"> สีเงิน <input type="number" min="0" data-sheet="rods.hold.silver.qty" placeholder="อัน"></label>
            <label class="inline"><input type="checkbox" data-sheet="rods.hold.black.on"> สีดำ <input type="number" min="0" data-sheet="rods.hold.black.qty" placeholder="อัน"></label>
            <label class="inline"><input type="checkbox" data-sheet="rods.hold.brass.on"> ทองเหลือง <input type="number" min="0" data-sheet="rods.hold.brass.qty" placeholder="อัน"></label>
            <label class="inline"><input type="checkbox" data-sheet="rods.hold.copper.on"> ทองแดง <input type="number" min="0" data-sheet="rods.hold.copper.qty" placeholder="อัน"></label>
          </div>
        </section>
      ` : ''}
      ${part === 'drawRod' ? `
        <section class="pop-sec-card">
          <label class="inline" style="margin:2px 0 6px;font-weight:700"><input type="checkbox" data-sheet="rods.drawNo"> ไม่ใช้ก้านจูง</label>
          <div class="grid2">
            ${['drawBlackout', 'drawSheer'].map((dk, di) => `
              <div class="subcard">
                <b>${di === 0 ? 'ผ้าม่านทึบ' : 'ผ้าม่านโปร่ง'}</b>
                <div class="qty-grid" style="margin-top:4px">
                  <label><input type="checkbox" data-sheet="rods.${dk}.wood.on"> ลายไม้</label><input type="number" min="0" data-sheet="rods.${dk}.wood.qty" placeholder="อัน">
                  <label><input type="checkbox" data-sheet="rods.${dk}.alu.on"> อลูมิเนียม</label><input type="number" min="0" data-sheet="rods.${dk}.alu.qty" placeholder="อัน">
                  <label><input type="checkbox" data-sheet="rods.${dk}.acrylic.on"> อะคริลิค</label><input type="number" min="0" data-sheet="rods.${dk}.acrylic.qty" placeholder="อัน">
                  <label><input type="checkbox" data-sheet="rods.${dk}.other.on"><input data-sheet="rods.${dk}.other.name" placeholder="อื่นๆ" style="width:82px"></label><input type="number" min="0" data-sheet="rods.${dk}.other.qty" placeholder="อัน">
                  <label><input type="checkbox" data-sheet="rods.${dk}.size120"> ขนาด 120 ซม.</label><span></span>
                  <label>ขนาดอื่น (ซม.)</label><input type="number" min="0" data-sheet="rods.${dk}.sizeCustom">
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}
      ${part === 'grommet' ? `
        <section class="pop-sec-card">
          ${[
            ['flat', 'แบบเรียบ', [['silver', 'สีเงิน'], ['brass', 'ทองเหลือง'], ['copper', 'ทองแดง']]],
            ['wave', 'แบบลอน', [['brass', 'ทองเหลือง'], ['copper', 'ทองแดง']]],
            ['ripple', 'แบบคลื่น', [['brass', 'ทองเหลือง'], ['copper', 'ทองแดง']]],
          ].map(([gk, gtitle, gcols]) => `
            <div class="subcard" style="margin-bottom:6px">
              <b>${gtitle}</b>
              <div class="opts" style="margin:4px 0 0">
                ${gcols.map(([ck, cl]) => `<label><input type="checkbox" data-sheet="rods.grommet.${gk}.${ck}">${cl}</label>`).join('')}
                <label><input type="checkbox" data-sheet="rods.grommet.${gk}.other">อื่นๆ</label>
                <input data-sheet="rods.grommet.${gk}.otherText" placeholder="ระบุ" style="width:120px">
              </div>
            </div>
          `).join('')}
        </section>
      ` : ''}
    `;
  } else if (ctx.type === 'company') {
    title = '🏢 แก้ไขข้อมูลบริษัท แบบฟอร์ม และโลโก้';
    const hasLogo = !!(ord.company && ord.company.logo);
    bodyHTML = `
      <section class="pop-sec-card">
        <div class="pop-sec-title"><span class="pop-sec-badge">หัวกระดาษ</span><b>ข้อมูลบริษัทและแบบฟอร์ม</b></div>
        <div class="grid2">
          <label>ชื่อบริษัท / โลโก้ (ข้อความ) <input data-shared="company.name" data-pop-autofocus="1"></label>
          <label>ชื่อแบบฟอร์ม <input data-shared="company.title"></label>
          <label class="full">ที่อยู่ / ติดต่อ (หลายบรรทัด) <textarea rows="3" data-shared="company.address"></textarea></label>
        </div>
      </section>
      <section class="pop-sec-card">
        <div class="pop-sec-title"><span class="pop-sec-badge">โลโก้</span><b>อัปโหลดโลโก้บริษัท</b></div>
        <div class="inline" style="flex-wrap:wrap;gap:8px;margin-top:4px">
          <input type="file" id="popLogoFile" accept="image/*" style="max-width:240px">
          ${hasLogo ? `<button type="button" class="danger" data-pop-logo-clear="1">✕ ลบโลโก้</button>` : ''}
        </div>
        ${hasLogo ? `<div style="margin-top:8px"><img src="${ord.company.logo}" alt="logo" style="max-height:58px;border:1px solid #cbd5e1;border-radius:4px;padding:2px;background:#fff"></div>` : ''}
      </section>
    `;
  } else if (ctx.type === 'sign') {
    title = '✍️ แก้ไขข้อมูลผู้ลงนาม และวันที่';
    bodyHTML = `
      <section class="pop-sec-card">
        <div class="grid2">
          <label>ชื่อผู้ขอ <input data-shared="sign.requester" data-pop-autofocus="1"></label>
          <label>วันที่ <input type="date" data-shared="sign.requesterDate"></label>
          <label>ชื่อลูกค้า <input data-shared="sign.customer"></label>
          <label>วันที่ <input type="date" data-shared="sign.customerDate"></label>
          <label>ชื่อช่างติดตั้ง <input data-shared="sign.installer"></label>
          <label>วันที่ <input type="date" data-shared="sign.installerDate"></label>
          <label>ชื่อผู้ทำใบเสนอราคา <input data-shared="sign.cs"></label>
          <label>วันที่ <input type="date" data-shared="sign.csDate"></label>
        </div>
      </section>
    `;
  }

  pop.innerHTML = `
    <div class="pop-hd pop-hd-drag">
      <span>${title}</span>
      <button type="button" class="ghost" data-pop-close="1" title="ปิดหน้าต่างแก้ไขนี้">✕</button>
    </div>
    ${stickyNavHTML ? `<div class="pop-sticky-nav">${stickyNavHTML}</div>` : ''}
    <div class="pop-body">${bodyHTML}</div>
  `;
  pop.hidden = false;
  syncSharedInputs(pop);
  syncSheetInputs(pop);

  const newBody = pop.querySelector('.pop-body');
  if (prevScrollTop !== null && newBody) {
    newBody.scrollTop = prevScrollTop;
  } else if (opts.initialOpen && ctx.type === 'win' && ctx.subTab && ctx.subTab !== 'dims') {
    const secEl = pop.querySelector(`#popSec_${ctx.subTab}`);
    if (secEl && newBody) {
      setTimeout(() => {
        secEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 20);
    }
  }

  if (!opts.preserveScroll) {
    const af = pop.querySelector('[data-pop-autofocus="1"]');
    if (af) {
      setTimeout(() => {
        try { af.focus({ preventScroll: true }); if (af.select) af.select(); } catch (e) {}
      }, 30);
    }
  }
}

function openPdfQuickPopover(ctx, clientX, clientY) {
  activePopoverCtx = ctx;
  const pop = ensureQuickPopoverEl();
  renderActivePopoverContent({ initialOpen: true });
  positionPopoverNear(pop, clientX, clientY);
}

// ปิด Popover เมื่อคลิกพื้นที่ว่างนอกใบงานหรือกด Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePdfQuickPopover();
});

function scrollAndFlashEditor(targetEl, focusSelector) {
  if (!targetEl || rightOnlyMode) return;
  if (targetEl.tagName === 'DETAILS') targetEl.open = true;
  const parentDetails = targetEl.closest('details.sec');
  if (parentDetails) parentDetails.open = true;

  isSyncingScroll = true;
  targetEl.classList.remove('jump-flash');
  void targetEl.offsetWidth; // trigger reflow for animation restart
  targetEl.classList.add('jump-flash');
  targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (focusSelector && !rightOnlyMode) {
    const inputEl = targetEl.querySelector(focusSelector) || document.querySelector(focusSelector);
    if (inputEl && typeof inputEl.focus === 'function') {
      setTimeout(() => {
        try { inputEl.focus({ preventScroll: true }); } catch (e) {}
      }, 180);
    }
  }

  setTimeout(() => { isSyncingScroll = false; }, 450);
  setTimeout(() => { targetEl.classList.remove('jump-flash'); }, 1150);
}

function switchToCustomerSection(secId, focusSelector) {
  activeTabMode = 'customer';
  renderTopSheetNav();
  syncSharedInputs();
  const secEl = document.getElementById(secId);
  scrollAndFlashEditor(secEl, focusSelector);
}

function switchToSheetSection(targetSheetIdx, secId, focusSelector, customTargetElFn) {
  const ord = currentOrder();
  if (!ord) return;
  const clampedSheetIdx = Math.max(0, Math.min(targetSheetIdx, ord.sheets.length - 1));
  const needSheetRender = (activeTabMode !== 'sheet' || activeSheetIdx !== clampedSheetIdx);
  activeTabMode = 'sheet';
  activeSheetIdx = clampedSheetIdx;

  if (needSheetRender) {
    renderTopSheetNav();
    renderWindowsEditor();
    renderNotesEditor();
    renderDrawAndGrommetEditor();
    renderPlanMini();
    syncSheetInputs();
  } else {
    renderTopSheetNav();
  }

  if (activeSectionFilter !== 'all' && activeSectionFilter !== secId) {
    applySectionFilter(secId);
  } else {
    applySectionFilter(activeSectionFilter);
  }

  const secEl = document.getElementById(secId);
  if (secEl) secEl.open = true;
  const targetEl = (customTargetElFn && customTargetElFn()) || secEl;
  scrollAndFlashEditor(targetEl, focusSelector);
}

// คลิกที่ส่วนใดของใบ PDF ด้านขวา -> เปิดกล่องแก้ไขลอยตรงจุดที่คลิกทันที (และซิงค์แผงซ้ายด้วยหากเปิดอยู่)
document.getElementById('preview').addEventListener('click', e => {
  if (e.target.closest('.float-note-box')) return;
  const pageEl = e.target.closest('.page[data-page-idx]');
  if (!pageEl) {
    closePdfQuickPopover();
    return;
  }

  const ord = currentOrder();
  if (!ord) return;
  const pIdx = +pageEl.dataset.pageIdx;
  const sIdx = +pageEl.dataset.sheetIdx;
  currentPreviewPageIdx = pIdx;
  const totalPages = document.querySelectorAll('#preview .page').length || 1;
  const indEl = document.getElementById('singlePageIndicator');
  if (indEl) indEl.textContent = `${currentPreviewPageIdx + 1}/${totalPages}`;

  if (e.target.closest('.s-hd')) {
    switchToCustomerSection('secCompany', '[data-shared="company.name"]');
    openPdfQuickPopover({ type: 'company', sIdx }, e.clientX, e.clientY);
    return;
  }
  if (e.target.closest('.s-cust .disc') || e.target.closest('.s-cust .cr')) {
    switchToCustomerSection(e.target.closest('.s-cust .disc') ? 'secDiscount' : 'secStaff', '[data-shared="staff.orderNo"]');
    openPdfQuickPopover({ type: 'staff', sIdx }, e.clientX, e.clientY);
    return;
  }
  if (e.target.closest('.s-cust')) {
    switchToCustomerSection('secCustomer', '[data-shared="customer.name"]');
    openPdfQuickPopover({ type: 'customer', sIdx }, e.clientX, e.clientY);
    return;
  }
  if (e.target.closest('.s-sign')) {
    switchToCustomerSection('secSign', '[data-shared="sign.requester"]');
    openPdfQuickPopover({ type: 'sign', sIdx }, e.clientX, e.clientY);
    return;
  }
  if (e.target.closest('.s-map .pbox')) {
    switchToSheetSection(sIdx, 'secPlan', '[data-sheet="room.name"]');
    closePdfQuickPopover();
    actions.openPlan();
    return;
  }
  if (e.target.closest('.s-map')) {
    const isNotes = !!e.target.closest('.s-map .notes-list, .s-map .map-note-hd');
    switchToSheetSection(sIdx, isNotes ? 'secNotes' : 'secPlan', isNotes ? '[data-note="0"]' : '[data-sheet="room.name"]');
    openPdfQuickPopover({ type: 'map', sIdx }, e.clientX, e.clientY);
    return;
  }
  const specialWrap = e.target.closest('.gable-page-wrap[data-special-win]') || (pageEl.dataset.specialWidx !== undefined ? pageEl : null);
  if (specialWrap) {
    const wIdx = +(specialWrap.dataset.specialWin ?? pageEl.dataset.specialWidx ?? 0);
    switchToSheetSection(
      sIdx,
      'secWins',
      `[data-sheet="windows.${wIdx}.specialType"]`,
      () => document.querySelector(`.win-ed[data-win-idx="${wIdx}"]`)
    );
    openPdfQuickPopover({ type: 'win', sIdx, wIdx, subTab: 'special' }, e.clientX, e.clientY);
    return;
  }
  const winCell = e.target.closest('.wc[data-preview-win]');
  if (winCell) {
    const wIdx = +winCell.dataset.previewWin;
    const sh = ord.sheets[sIdx];
    if (sh) {
      let added = false;
      while (sh.windows.length <= wIdx) {
        sh.windows.push(newWindow(sh.windows.length + 1));
        added = true;
      }
      if (added) {
        activeSheetIdx = sIdx;
        renderWindowsEditor();
        renderTopSheetNav();
      }
    }

    const svgHit = e.target.closest('[data-svg-field]');
    const svgField = svgHit ? svgHit.dataset.svgField : '';
    const winPartEl = e.target.closest('[data-win-part]');
    const winPart = winPartEl ? winPartEl.dataset.winPart : '';

    let subTab = 'dims';
    let focusSel = `[data-sheet="windows.${wIdx}.width"]`;
    if (svgField === 'layers' || svgField === 'split') {
      subTab = 'mask';
      focusSel = `[data-sheet="windows.${wIdx}.paneStyle"]`;
    } else if (svgField) {
      subTab = 'dims';
      focusSel = `[data-sheet="windows.${wIdx}.${svgField}"]`;
    } else if (winPart === 'calc' || e.target.closest('.calc-group')) {
      subTab = 'calc';
      focusSel = `[data-sheet="windows.${wIdx}.widthFormulaId1"]`;
    } else if (winPart === 'header' || winPart === 'box' || winPart === 'mount') {
      subTab = 'style';
      focusSel = `[data-sheet="windows.${wIdx}.label"]`;
    }

    switchToSheetSection(
      sIdx,
      'secWins',
      focusSel,
      () => document.querySelector(`.win-ed[data-win-idx="${wIdx}"]`)
    );
    openPdfQuickPopover({ type: 'win', sIdx, wIdx, subTab, svgField }, e.clientX, e.clientY);
    return;
  }
  if (e.target.closest('.s-tb')) {
    const colEl = e.target.closest('[data-fab-col]');
    const fabCol = colEl ? colEl.dataset.fabCol : 'blackout';
    switchToSheetSection(sIdx, 'secFabrics', `[data-sheet="fabrics.${fabCol}.name"]`);
    openPdfQuickPopover({ type: 'fabric', sIdx, fabCol }, e.clientX, e.clientY);
    return;
  }
  if (e.target.closest('.s-rod')) {
    const partEl = e.target.closest('[data-rod-part]');
    const rodPart = partEl ? partEl.dataset.rodPart : 'rodType';
    switchToSheetSection(sIdx, 'secRods', '[data-sheet="rods.pleat.model"]');
    openPdfQuickPopover({ type: 'rod', sIdx, rodPart }, e.clientX, e.clientY);
    return;
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

function renderSheetOrderModal() {
  const ord = currentOrder();
  const body = document.getElementById('sheetOrderBody');
  if (!ord || !body) return;
  const allPages = (typeof expandOrderPages === 'function') ? expandOrderPages(ord) : [];
  const totalSheets = ord.sheets.length;

  body.innerHTML = ord.sheets.map((sh, sIdx) => {
    const leafPages = allPages.filter(p => p.sIdx === sIdx);
    const roomName = (sh.room && sh.room.name) ? sh.room.name : 'ยังไม่ระบุชื่อห้อง';
    const winCount = (sh.windows || []).length;

    const leafRows = leafPages.map((p, li) => {
      const isCont = li > 0 || p.pageType !== 'standard' || p.cIdx > 0;
      let leafTitle = '';
      if (p.pageType === 'standard' && p.cIdx === 0) {
        const wLen = (p.wins || []).length;
        leafTitle = `📄 หน้าเริ่มต้น (จุดที่ 1–${Math.max(wLen, 1)})`;
      } else if (p.pageType === 'standard') {
        const fromNo = (p.startNo != null ? p.startNo : p.cIdx * 4) + 1;
        const toNo = fromNo + Math.max((p.wins || []).length, 1) - 1;
        leafTitle = `📄 หน้าต่อ (จุดที่ ${fromNo}–${toNo})`;
      } else if (p.pageType === 'gable') {
        const wLabel = (p.win && p.win.label) || `จุดที่ ${(p.wIdx || 0) + 1}`;
        leafTitle = `🔺 หน้าพิเศษ: ม่านจั่ว (${esc(wLabel)})`;
      } else if (p.pageType === 'side_join') {
        const wLabel = (p.win && p.win.label) || `จุดที่ ${(p.wIdx || 0) + 1}`;
        leafTitle = `📐 หน้าพิเศษ: เย็บต่อด้านข้าง (${esc(wLabel)})`;
      } else {
        leafTitle = `📄 หน้า ${li + 1}`;
      }
      return `
        <div class="reorder-leaf-item ${isCont ? 'is-cont' : ''}">
          <span>${leafTitle}</span>
          ${isCont
            ? `<span class="inline" style="gap:6px"><span class="reorder-cont-lock">🔒 หน้าต่อจากหน้าเริ่มต้น — ห้ามเลื่อนขึ้นก่อนหน้าเริ่มต้น</span></span>`
            : `<span class="hint">หน้าเริ่มต้นของชุด</span>`}
        </div>
      `;
    }).join('');

    return `
      <div class="reorder-sheet-card ${sIdx === activeSheetIdx && activeTabMode === 'sheet' ? 'active' : ''}">
        <div class="reorder-sheet-hd">
          <div>
            <b>ชุดที่ ${sIdx + 1}: 🏠 ${esc(roomName)}</b>
            <small style="color:#475569;margin-left:6px">(${winCount} บาน • ${leafPages.length || 1} หน้ากระดาษ)</small>
          </div>
          <div class="inline" style="gap:4px">
            <button type="button" data-sheet-move="${sIdx}" data-dir="-1" ${sIdx === 0 ? 'disabled' : ''}>▲ เลื่อนขึ้น</button>
            <button type="button" data-sheet-move="${sIdx}" data-dir="1" ${sIdx >= totalSheets - 1 ? 'disabled' : ''}>▼ เลื่อนลง</button>
            <button type="button" data-sheet-focus="${sIdx}">👁️ เปิดหน้านี้</button>
          </div>
        </div>
        <div class="reorder-leaf-list">${leafRows || '<div class="reorder-leaf-item">📄 หน้าเริ่มต้น</div>'}</div>
      </div>
    `;
  }).join('');
}

function openSheetOrderModal() {
  const modal = document.getElementById('sheetOrderModal');
  if (!modal) return;
  renderSheetOrderModal();
  modal.hidden = false;
}

const btnMoveSheetLeft = document.getElementById('btnMoveSheetLeft');
if (btnMoveSheetLeft) {
  btnMoveSheetLeft.addEventListener('click', () => {
    if (activeTabMode !== 'sheet') return;
    actions.moveSheet(activeSheetIdx, -1);
  });
}

const btnMoveSheetRight = document.getElementById('btnMoveSheetRight');
if (btnMoveSheetRight) {
  btnMoveSheetRight.addEventListener('click', () => {
    if (activeTabMode !== 'sheet') return;
    actions.moveSheet(activeSheetIdx, 1);
  });
}

const btnReorderSheets = document.getElementById('btnReorderSheets');
if (btnReorderSheets) {
  btnReorderSheets.addEventListener('click', openSheetOrderModal);
}

const sheetOrderClose = document.getElementById('sheetOrderClose');
if (sheetOrderClose) {
  sheetOrderClose.addEventListener('click', () => {
    document.getElementById('sheetOrderModal').hidden = true;
  });
}

const sheetOrderBody = document.getElementById('sheetOrderBody');
if (sheetOrderBody) {
  sheetOrderBody.addEventListener('click', e => {
    const moveBtn = e.target.closest('[data-sheet-move]');
    if (moveBtn) {
      const sIdx = +moveBtn.dataset.sheetMove;
      const dir = +moveBtn.dataset.dir;
      actions.moveSheet(sIdx, dir);
      renderSheetOrderModal();
      return;
    }
    const focusBtn = e.target.closest('[data-sheet-focus]');
    if (focusBtn) {
      const sIdx = +focusBtn.dataset.sheetFocus;
      document.getElementById('sheetOrderModal').hidden = true;
      activeTabMode = 'sheet';
      activeSheetIdx = sIdx;
      renderAllWorkspace();
      syncPreviewToSheet(activeSheetIdx, 0);
    }
  });
}

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
document.getElementById('btnMasterDb').addEventListener('click', () => {
  if (isAdminUser()) MasterDBModal.open('staff');
});
document.getElementById('orderSearch').addEventListener('input', renderDashboard);

const existingCustSel = document.getElementById('existingCustomerSelect');
if (existingCustSel) {
  existingCustSel.addEventListener('change', e => {
    const srcId = e.target.value;
    if (!srcId) return;
    const srcOrd = orders.find(o => o.id === srcId);
    const ord = currentOrder();
    if (srcOrd && ord) {
      ord.customer.name = srcOrd.customer.name || '';
      ord.customer.mobile = srcOrd.customer.mobile || '';
      ord.customer.tel = srcOrd.customer.tel || '';
      ord.customer.email = srcOrd.customer.email || '';
      if (!ord.customer.houseNo && !ord.customer.building) {
        ['houseNo', 'floor', 'moo', 'road', 'building', 'soi', 'subdistrict', 'district', 'province', 'zipcode'].forEach(k => {
          ord.customer[k] = srcOrd.customer[k] || '';
        });
      }
      syncSharedInputs();
      changed(null, 'customer.name');
    }
    e.target.value = '';
  });
}

const btnNewPlanSameCustomer = document.getElementById('btnNewPlanSameCustomer');
if (btnNewPlanSameCustomer) {
  btnNewPlanSameCustomer.addEventListener('click', () => {
    const ord = currentOrder();
    if (!ord) return;
    if (!ord.customer.name || !String(ord.customer.name).trim()) {
      alert('กรุณาระบุชื่อลูกค้าก่อนสร้างแปลนงานเพิ่ม');
      return;
    }
    createNewPlanForCustomer(ord);
  });
}

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

const btnToggleLeftPanel = document.getElementById('btnToggleLeftPanel');
if (btnToggleLeftPanel) {
  btnToggleLeftPanel.addEventListener('click', () => {
    setRightOnlyMode(!rightOnlyMode);
  });
}

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

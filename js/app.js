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
    unequalLayerRail: false, // ฟังก์ชันขนาดรางม่านทึบ/โปร่งไม่เท่ากัน (เช่น 400/380)
    railW1: '',
    railW2: '',
    railH1: '',
    railH2: '',
    railMinLength: '', // ขั้นต่ำความยาวรางต่อชุด (เมตร) เช่น 2.00 หรือ 1.00
    unequalSplit: false,
    unequalSplitTarget: 'both', // 'both' | 'opaque' | 'sheer'
    splitLeft: '',
    splitRight: '',
    splitLeft2: '',
    splitRight2: '',
    railTracks: '',   // จำนวนรางม่าน (ชั้น): '' = อัตโนมัติ, '1' = 1 ชั้น, '2' = 2 ชั้น
    pieces1: '',      // จำนวนผืน ชั้นที่ 1: '' = ตามสูตร, '1', '2', '3', '4'
    pieces2: '',      // จำนวนผืน ชั้นที่ 2
    noRail: false,    // กรณีไม่รับรางม่าน
    noRailStatus: 'ใช้รางเดิม', // ข้อความแสดงในช่องจำนวนราง: 'ใช้รางเดิม' | 'ไม่เอาราง'
    railCountUnit: '', // หน่วยช่องชั้น: '' = อัตโนมัติ, 'ชั้น', 'ผืน', 'ชุด'
    railUnit: '',      // หน่วยช่องจำนวนราง: '' = อัตโนมัติตามฐานข้อมูลราง, 'เมตร', 'ชุด', 'ชุด/เมตร', 'เมตร/ชุด', 'ตร.ม.'
    railSetRanges: '', // กำหนดช่วงแบ่งชุดเฉพาะบาน (ถ้าว่างใช้จากฐานข้อมูลราง)
    floorMode: 'std',  // ระยะลอย/กองพื้นบนแปลน: 'std' (ลอย 1 ซม. ตามฐานข้อมูล) | 'float' (ระบุระยะลอยพื้นที่ต้องการ) | 'touch' (พอดีพื้น) | 'puddle' (กองพื้น)
    floorAdjust: '',   // ตัวเลขระยะลอย/กองพื้นที่ต้องการ ซม.
    rowLabel1: '',     // ชื่อแถวที่ 1 (ค่าเริ่มต้น "รางม่าน" หรือ "ผืนที่ 1" สำหรับม่านม้วน/มู่ลี่)
    rowLabel2: '',     // ชื่อแถวที่ 2 (ค่าเริ่มต้น "ผ้าม่านทึบ")
    rowLabel3: '',     // ชื่อแถวที่ 3 (ค่าเริ่มต้น "ผ้าม่านโปร่ง")
    blindPieces: [],   // ม่านม้วน/มู่ลี่หลายผืน: [{ w, h }]  ผืนที่ 1, ผืนที่ 2 ...
    noRailDeductPreset: 'existing_pleat_2',
    noRailDeductCustom: '',
    backLayerHeightDeduct: '1', // Default กรณีม่าน 2 ชั้น ให้ลดขนาดความสูงผ้าม่านโปร่งมากกว่าปกติ 1 ซม.
    backLayerTarget: 'layer2',  // 'layer2' = ชั้นที่ 2 ม่านโปร่ง (ด้านหลัง), 'layer1' = ชั้นที่ 1 ม่านทึบ
    fabricCol1: 'blackout',     // Default ชั้นที่ 1 เป็นม่านทึบ
    fabricCol2: 'sheer',        // Default ชั้นที่ 2 เป็นม่านโปร่ง
    lining1: false,             // เย็บประกบ ชั้นที่ 1 (ม่านทึบ)
    lining2: false,             // เย็บประกบ ชั้นที่ 2 (ม่านโปร่ง)
    lining1T: '',               // ผลคำนวณหน้า/หลา ผ้าเย็บประกบ ชั้นที่ 1 เช่น "1/4.0"
    lining2T: '',               // ผลคำนวณหน้า/หลา ผ้าเย็บประกบ ชั้นที่ 2 เช่น "1/3.2"
    liningRuleId1: '',
    liningRuleId2: '',
    liningYardMode1: '',
    liningYardMode2: '',
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
    railModel2: '',
    curtainStyle1: '',
    curtainStyle2: '',
    curtainType: '',
    rodType: '',
    rodType2: '',
    hookSize: '',
    hookSize2: '',
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
    sideWidthCenter: '',         // ความกว้างด้านตรง (กรณีบานดัดโค้ง)
    sideWidthLeft: '',           // ความกว้างด้านโค้งซ้าย
    sideWidthRight: '',          // ความกว้างด้านโค้งขวา
    height: '', noteHeight: '',  // 6.2 ความสูง
    wallL: '',  noteWallL: '',   // 6.3 พื้นที่ด้านซ้าย
    wallR: '',  noteWallR: '',   // 6.4 พื้นที่ด้านขวา
    ceilT: '',  noteCeilT: '',   // 6.5 พื้นที่ด้านบน
    floorB: '', noteFloorB: '',  // 6.6 พื้นที่ด้านล่าง
    fullW: '',  noteFullW: '',   // 6.7 ความกว้างเต็ม
    fullH: '',  noteFullH: '',   // 6.8 ความสูงเต็ม (แสดง ซ้าย-ขวา เสมอ เช่น 299.5-299 หรือ 300-302)
    fullHLeft: '',               // ความสูงเต็ม ด้านซ้าย
    fullHMid: '',                // ความสูงเต็ม ด้านกลาง
    fullHRight: '',              // ความสูงเต็ม ด้านขวา
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

const fab = (defGrain = '') => ({
  grain: (defGrain === 'opaque' || defGrain === 'sheer') ? defGrain : '',
  isOpaque: defGrain === 'opaque',
  isSheer: defGrain === 'sheer',
  group: '',
  name: '', design: '', color: '', qty: '',
  cordType: 'เชือกเทป',
  cordColor: '',
  valanceColor: '',
});
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
    windows: [
      Object.assign(newWindow(1), { label: 'W1' }),
      Object.assign(newWindow(2), { label: 'W2' }),
      Object.assign(newWindow(3), { label: 'W3' }),
      Object.assign(newWindow(4), { label: 'W4' }),
    ],
    noteBoxes: [], // Req #12: กล่องข้อความอิสระในหน้าข้อมูลหน้าต่าง/ประตู
    fabrics: {
      blackout: fab(''),
      sheer: fab(''),
      roller: fab(''),
      blinds: fab(''),
      other: Object.assign(fab(''), { label: 'อื่นๆ' }),
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
  if (!nw.fabricCol1) nw.fabricCol1 = 'blackout';
  if (!nw.fabricCol2) nw.fabricCol2 = 'sheer';
  if (w && (w.backLayerHeightDeduct === undefined || w.backLayerHeightDeduct === '')) {
    nw.backLayerHeightDeduct = '1';
  }
  if (!nw.unequalSplitTarget) nw.unequalSplitTarget = 'both';
  if (typeof formatFullHeightLeftToRight === 'function') {
    const fhlr = formatFullHeightLeftToRight(nw);
    if (fhlr) nw.fullH = fhlr;
  }
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

function normalizeSheetFabricSingleGrain(cell, defGrain = '') {
  if (!cell) return;
  let g = cell.grain;
  if (g !== 'opaque' && g !== 'sheer' && g !== '') {
    if (cell.isSheer && !cell.isOpaque) g = 'sheer';
    else if (cell.isOpaque && !cell.isSheer) g = 'opaque';
    else g = defGrain;
  }
  if (g !== 'opaque' && g !== 'sheer') g = '';
  cell.grain = g;
  cell.isOpaque = (g === 'opaque');
  cell.isSheer = (g === 'sheer');
}

function isBlankDefaultWindow(w) {
  if (!w || typeof w !== 'object') return true;
  const hasAny = v => v !== undefined && v !== null && String(v).trim() !== '';
  return !hasAny(w.width) && !hasAny(w.height) && !hasAny(w.curtainStyle1) && !hasAny(w.curtainStyle2)
    && !hasAny(w.box) && !hasAny(w.mount) && !hasAny(w.extL) && !hasAny(w.extR) && !hasAny(w.extT) && !hasAny(w.extB)
    && !hasAny(w.rail && w.rail.a) && !hasAny(w.rail && w.rail.b) && !hasAny(w.rail && w.rail.t)
    && !hasAny(w.blackout && w.blackout.a) && !hasAny(w.blackout && w.blackout.b) && !hasAny(w.blackout && w.blackout.t)
    && !hasAny(w.sheer && w.sheer.a) && !hasAny(w.sheer && w.sheer.b) && !hasAny(w.sheer && w.sheer.t);
}

function normalizeSheet(sh, idx) {
  const ns = mergeDefaults(newSheet(idx + 1), sh);
  ns.windows = (ns.windows || []).map((w, i) => normalizeWindow(w, i));
  if (!ns.windows.length) ns.windows = [newWindow(1)];
  // หากในแปลนห้องมีการกำหนดจุดติดตั้งไว้แล้ว ให้ตัดช่องว่างเริ่มต้นที่เกินจำนวนจุด (เช่น W4 ที่ไม่ได้กำหนด) ออกอัตโนมัติ
  const planOps = (ns.plan && Array.isArray(ns.plan.items))
    ? ns.plan.items.filter(it => it && (it.type === 'window' || it.type === 'door'))
    : [];
  if (planOps.length > 0) {
    while (ns.windows.length > planOps.length && isBlankDefaultWindow(ns.windows[ns.windows.length - 1])) {
      ns.windows.pop();
    }
  }
  if (!Array.isArray(ns.notes) || !ns.notes.length) ns.notes = [''];
  if (!Array.isArray(ns.noteBoxes)) ns.noteBoxes = [];
  if (ns.fabrics) {
    normalizeSheetFabricSingleGrain(ns.fabrics.blackout, '');
    normalizeSheetFabricSingleGrain(ns.fabrics.sheer, '');
    normalizeSheetFabricSingleGrain(ns.fabrics.other, '');
  }
  if (typeof dedupeSheetWindowPositions === 'function') {
    dedupeSheetWindowPositions(ns);
  }
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

let lastAutoSaveAt = null;
let autoSaveIntervalId = null;
let autoSaveDirty = false;
let bgAutoSaveTimer = null;

/* =========================================================
   Order Workspace Undo / Redo History Manager
   ========================================================= */
const ORDER_HISTORY_MAX = 50;
const orderHist = {
  orderId: null,
  undo: [],
  redo: [],
  current: '',
  timer: null,
  applying: false,
};

function serializeOrderForHistory(ord) {
  if (!ord) return '';
  try {
    const clone = Object.assign({}, ord, { updatedAt: '' });
    return JSON.stringify(clone);
  } catch (e) {
    return '';
  }
}

function updateOrderUndoRedoButtons() {
  const btnU = document.getElementById('btnOrderUndo');
  const btnR = document.getElementById('btnOrderRedo');
  if (btnU) {
    btnU.disabled = orderHist.undo.length === 0;
    btnU.title = orderHist.undo.length
      ? `ย้อนกลับการแก้ไขในใบงานนี้ (Ctrl+Z) • ย้อนได้ ${orderHist.undo.length} ขั้น`
      : 'ยังไม่มีรายการให้ย้อนกลับ';
  }
  if (btnR) {
    btnR.disabled = orderHist.redo.length === 0;
    btnR.title = orderHist.redo.length
      ? `ทำซ้ำการแก้ไขในใบงานนี้ (Ctrl+Y) • ทำซ้ำได้ ${orderHist.redo.length} ขั้น`
      : 'ยังไม่มีรายการให้ทำซ้ำ';
  }
}

function resetOrderHistory(ord) {
  clearTimeout(orderHist.timer);
  orderHist.timer = null;
  orderHist.orderId = ord ? ord.id : null;
  orderHist.undo = [];
  orderHist.redo = [];
  orderHist.current = ord ? serializeOrderForHistory(ord) : '';
  updateOrderUndoRedoButtons();
}

function commitOrderHistorySnapshot() {
  if (orderHist.applying) return;
  const ord = currentOrder();
  if (!ord) return;
  if (orderHist.orderId !== ord.id) {
    resetOrderHistory(ord);
    return;
  }
  const snap = serializeOrderForHistory(ord);
  if (!snap || snap === orderHist.current) return;
  if (orderHist.current) {
    orderHist.undo.push(orderHist.current);
    if (orderHist.undo.length > ORDER_HISTORY_MAX) orderHist.undo.shift();
  }
  orderHist.current = snap;
  orderHist.redo = [];
  updateOrderUndoRedoButtons();
}

function scheduleOrderHistorySnapshot(delayMs = 420) {
  if (orderHist.applying) return;
  clearTimeout(orderHist.timer);
  orderHist.timer = setTimeout(() => {
    orderHist.timer = null;
    commitOrderHistorySnapshot();
  }, delayMs);
}

function applyOrderHistorySnapshot(snapStr) {
  if (!snapStr || !activeOrderId) return false;
  const idx = orders.findIndex(o => o.id === activeOrderId);
  if (idx < 0) return false;
  try {
    const restored = normalizeOrder(JSON.parse(snapStr), idx + 1);
    restored.updatedAt = new Date().toISOString();
    orderHist.applying = true;
    orders[idx] = restored;
    activeSheetIdx = Math.max(0, Math.min(activeSheetIdx, restored.sheets.length - 1));
    const maxPages = Math.max(0, expandOrderPages(restored).length - 1);
    currentPreviewPageIdx = Math.max(0, Math.min(currentPreviewPageIdx, maxPages));
    renderAllWorkspace();
    const pop = document.getElementById('pdfQuickPopover');
    if (pop && !pop.hidden && typeof refreshActivePopover === 'function') {
      refreshActivePopover();
    }
    orderHist.applying = false;
    updateOrderUndoRedoButtons();
    scheduleBackgroundAutoSave(800);
    return true;
  } catch (e) {
    orderHist.applying = false;
    console.warn('Undo/Redo restore failed:', e);
    return false;
  }
}

function undoOrderChange() {
  if (orderHist.timer) {
    clearTimeout(orderHist.timer);
    orderHist.timer = null;
    commitOrderHistorySnapshot();
  }
  if (!orderHist.undo.length) return false;
  const prevSnap = orderHist.undo.pop();
  if (orderHist.current) orderHist.redo.push(orderHist.current);
  orderHist.current = prevSnap;
  return applyOrderHistorySnapshot(prevSnap);
}

function redoOrderChange() {
  if (orderHist.timer) {
    clearTimeout(orderHist.timer);
    orderHist.timer = null;
    commitOrderHistorySnapshot();
  }
  if (!orderHist.redo.length) return false;
  const nextSnap = orderHist.redo.pop();
  if (orderHist.current) orderHist.undo.push(orderHist.current);
  orderHist.current = nextSnap;
  return applyOrderHistorySnapshot(nextSnap);
}

function runWhenIdle(fn) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => fn(), { timeout: 2000 });
  } else {
    setTimeout(fn, 0);
  }
}

function updateAutoSaveBadge(state = 'ready', msg = '') {
  const badge = document.getElementById('autoSaveBadge');
  if (!badge) return;
  badge.classList.remove('is-saving', 'is-saved', 'is-error');
  if (state === 'saving') {
    badge.classList.add('is-saving');
    badge.textContent = msg || '⏳ บันทึก...';
  } else if (state === 'saved') {
    badge.classList.add('is-saved');
    const tStr = lastAutoSaveAt
      ? lastAutoSaveAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      : '';
    badge.textContent = msg || `✅ บันทึกแล้ว${tStr ? ' ' + tStr : ''}`;
  } else if (state === 'error') {
    badge.classList.add('is-error');
    badge.textContent = msg || '⚠️ บันทึกไม่สำเร็จ';
  } else {
    badge.textContent = msg || '💾 Auto Save';
  }
}

function saveOrders() {
  clearTimeout(bgAutoSaveTimer);
  bgAutoSaveTimer = null;
  autoSaveDirty = false;
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    lastAutoSaveAt = new Date();
    updateAutoSaveBadge('saved');
  } catch (e) {
    console.warn('saveOrders failed', e);
    updateAutoSaveBadge('error');
  }
  if (typeof RealtimeSync !== 'undefined') RealtimeSync.schedulePush();
}

function scheduleBackgroundAutoSave(delayMs = 2500) {
  autoSaveDirty = true;
  const ord = currentOrder();
  if (ord) ord.updatedAt = new Date().toISOString();
  scheduleOrderHistorySnapshot(420);
  clearTimeout(bgAutoSaveTimer);
  bgAutoSaveTimer = setTimeout(() => {
    bgAutoSaveTimer = null;
    if (!autoSaveDirty) return;
    runWhenIdle(() => {
      if (autoSaveDirty) saveOrders();
    });
  }, delayMs);
}

function flushAutoSaveNow() {
  if (!autoSaveDirty) return;
  const ord = currentOrder();
  if (ord) {
    ord.updatedAt = new Date().toISOString();
  }
  saveOrders();
  if (typeof RealtimeSync !== 'undefined' && typeof RealtimeSync.flushNow === 'function') {
    RealtimeSync.flushNow();
  }
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

  // Filter พนักงานขายสำหรับแอดมิน
  const staffFilterEl = document.getElementById('orderStaffFilter');
  let selectedStaff = '';
  if (staffFilterEl) {
    const isAdmin = isAdminUser();
    staffFilterEl.hidden = !isAdmin;
    if (isAdmin) {
      const prevVal = staffFilterEl.value || '';
      const countByStaff = new Map();
      let emptyStaffCount = 0;
      accessible.forEach(o => {
        const sn = String((o.staff && o.staff.name) || '').trim();
        if (sn) countByStaff.set(sn, (countByStaff.get(sn) || 0) + 1);
        else emptyStaffCount++;
      });
      // รวมรายชื่อพนักงานทั้งหมดจากฐานข้อมูล + ออเดอร์ที่มีอยู่
      const allStaffNames = new Set(countByStaff.keys());
      (masterDB.staff || []).forEach(s => {
        const sn = String((s && s.name) || '').trim();
        if (sn) allStaffNames.add(sn);
      });
      const sortedNames = Array.from(allStaffNames).sort((a, b) => a.localeCompare(b, 'th'));
      const opts = [
        `<option value="">👤 พนักงานทั้งหมด (${accessible.length})</option>`,
        ...sortedNames.map(sn => {
          const cnt = countByStaff.get(sn) || 0;
          return `<option value="${esc(sn)}">${esc(sn)} (${cnt})</option>`;
        }),
      ];
      if (emptyStaffCount > 0) {
        opts.push(`<option value="__EMPTY__">(ยังไม่ระบุพนักงาน) (${emptyStaffCount})</option>`);
      }
      staffFilterEl.innerHTML = opts.join('');
      if (prevVal && (sortedNames.includes(prevVal) || (prevVal === '__EMPTY__' && emptyStaffCount > 0))) {
        staffFilterEl.value = prevVal;
      }
      selectedStaff = staffFilterEl.value || '';
    } else {
      staffFilterEl.value = '';
    }
  }

  const filtered = accessible.filter(o => {
    if (selectedStaff) {
      const sn = String((o.staff && o.staff.name) || '').trim();
      if (selectedStaff === '__EMPTY__') {
        if (sn) return false;
      } else if (sn !== selectedStaff) {
        return false;
      }
    }
    if (!q) return true;
    const hay = [o.staff.orderNo, o.customer.name, o.customer.mobile, o.customer.building, o.customer.road, o.staff.name, o.staff.branch]
      .map(x => String(x || '').toLowerCase()).join(' ');
    return hay.includes(q);
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="c" style="padding:24px;color:#777">ไม่พบรายการออเดอร์ — กด "➕ สร้างออเดอร์ใหม่" ด้านบน</td></tr>`;
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
    const locSummary = [o.customer.building, o.customer.houseNo ? `เลขที่ ${o.customer.houseNo}` : '', o.customer.road ? `ถ.${o.customer.road}` : '', o.customer.district, o.customer.province]
      .filter(Boolean).join(' ');
    return `<tr>
      <td class="c"><b>${esc(o.staff.orderNo || '-')}</b></td>
      <td><b>${esc(cName)}</b>${multiBadge}</td>
      <td>${locSummary ? `📍 ${esc(locSummary)}` : '<span style="color:#94a3b8">-</span>'}</td>
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
    const uBrs = (typeof getStaffBranchList === 'function') ? getStaffBranchList(u) : [];
    const allBrs = (typeof getAllBranchesList === 'function') ? getAllBranchesList() : [];
    ord.staff.branch = uBrs[0] || allBrs[0] || sourceOrder.staff.branch || '';
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
  resetOrderHistory(null);
  renderDashboard();
}

function openOrder(orderId, mode = 'sheet', sheetIdx = 0) {
  if (!isUserLoggedIn()) { showLoginView(); return; }
  const ord = orders.find(o => o.id === orderId);
  if (!ord || !canAccessOrder(ord)) return;
  applyUserRoleUI();
  activeOrderId = ord.id;
  resetOrderHistory(ord);
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
  const active = document.activeElement;
  root.querySelectorAll('[data-shared]').forEach(el => {
    if (el === active) return;
    const v = getPath(ord, el.dataset.shared);
    if (el.type === 'checkbox') el.checked = !!v;
    else if (el.type === 'radio') el.checked = v === el.value;
    else el.value = v ?? '';
  });
}

function syncSheetInputs(root = document) {
  const sh = currentSheet(); if (!sh) return;
  const active = document.activeElement;
  root.querySelectorAll('[data-sheet]').forEach(el => {
    if (el === active) return;
    const v = getPath(sh, el.dataset.sheet);
    if (el.type === 'checkbox') el.checked = !!v;
    else if (el.type === 'radio') el.checked = v === el.value;
    else el.value = v ?? '';
  });
  root.querySelectorAll('[data-fab-grain]').forEach(el => {
    const colKey = el.dataset.fabGrain;
    const cell = sh.fabrics && sh.fabrics[colKey];
    if (!cell) return;
    const g = (cell.grain === 'opaque' || cell.grain === 'sheer')
      ? cell.grain
      : (cell.isSheer ? 'sheer' : (cell.isOpaque ? 'opaque' : ''));
    el.checked = !!g && (el.value === g);
  });
}

/* =========================================================
   Sync points from Room Plan in order & Prevent Duplicate Positions (Req #9, #10)
   ========================================================= */
function getPlanOpenings(sh) {
  return ((sh && sh.plan && sh.plan.items) || []).filter(it => it.type === 'window' || it.type === 'door');
}

function formatPlanOpeningCode(op, idx = 0) {
  const rawLbl = String((op && op.label) || (idx + 1)).trim();
  const cleanNo = rawLbl.replace(/^[WDwd]\s*/, '') || String(idx + 1);
  const prefix = (op && op.type === 'door') ? 'D' : 'W';
  const code = /^[WDwd]\d+/i.test(rawLbl) ? rawLbl.toUpperCase() : (prefix + cleanNo);
  const typeName = (op && op.type === 'door') ? 'ประตู' : 'หน้าต่าง';
  return { no: cleanNo, code, typeName };
}

function findMatchingPlanOpeningIdx(w, planOpenings) {
  if (!w || !Array.isArray(planOpenings) || !planOpenings.length) return -1;
  const wLbl = String(w.label || '').trim().toUpperCase();
  const wNo = String(w.planNo || '').trim();
  let idx = planOpenings.findIndex((op, oi) => {
    const info = formatPlanOpeningCode(op, oi);
    return wLbl && info.code.toUpperCase() === wLbl;
  });
  if (idx < 0 && wNo) {
    idx = planOpenings.findIndex((op, oi) => formatPlanOpeningCode(op, oi).no === wNo);
  }
  return idx;
}

function dedupeSheetWindowPositions(sh) {
  if (!sh || !Array.isArray(sh.windows)) return;
  const openings = getPlanOpenings(sh);
  if (openings.length > 0) {
    const usedOpIdx = new Set();
    // รอบแรก: จับคู่บานที่ตรงกับจุดในแปลนและยังไม่ซ้ำ
    sh.windows.forEach(w => {
      if (!w) return;
      const mIdx = findMatchingPlanOpeningIdx(w, openings);
      if (mIdx >= 0 && !usedOpIdx.has(mIdx)) {
        usedOpIdx.add(mIdx);
        const info = formatPlanOpeningCode(openings[mIdx], mIdx);
        w.planNo = info.no;
        w.label = info.code;
      } else {
        w._needsReassign = true;
      }
    });
    // รอบสอง: บานที่ซ้ำหรือยังไม่มีจุดในแปลน ให้ดึงจุดในแปลนลำดับถัดไปที่ยังว่าง
    let nextExtraNo = openings.length + 1;
    sh.windows.forEach(w => {
      if (!w || !w._needsReassign) return;
      delete w._needsReassign;
      let assigned = false;
      for (let oi = 0; oi < openings.length; oi++) {
        if (!usedOpIdx.has(oi)) {
          usedOpIdx.add(oi);
          const info = formatPlanOpeningCode(openings[oi], oi);
          w.planNo = info.no;
          w.label = info.code;
          const inferred = inferCornerShapeFromPlanItem(openings[oi]);
          if (inferred !== '1' && (!w.cornerShape || w.cornerShape === '1')) w.cornerShape = inferred;
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        while (sh.windows.some(other => other !== w && (String(other.planNo) === String(nextExtraNo) || String(other.label).toUpperCase() === 'W' + nextExtraNo))) {
          nextExtraNo++;
        }
        w.planNo = String(nextExtraNo);
        w.label = 'W' + nextExtraNo;
        nextExtraNo++;
      }
    });
  } else {
    // กรณีแปลนห้องยังไม่ได้กำหนดจุดหน้าต่าง/ประตู -> ตรวจสอบไม่ให้มีลำดับจุดหรือรหัสตำแหน่งซ้ำกัน
    const usedLabels = new Set();
    const usedNos = new Set();
    let seq = 1;
    sh.windows.forEach((w, idx) => {
      if (!w) return;
      let no = String(w.planNo || (idx + 1)).trim();
      let lbl = String(w.label || ('W' + no)).trim().toUpperCase();
      if (!no || usedNos.has(no) || !lbl || usedLabels.has(lbl)) {
        while (usedNos.has(String(seq)) || usedLabels.has('W' + seq) || usedLabels.has('D' + seq)) {
          seq++;
        }
        const prefix = /^D/i.test(lbl) ? 'D' : 'W';
        no = String(seq);
        lbl = prefix + no;
      }
      usedNos.add(no);
      usedLabels.add(lbl);
      w.planNo = no;
      w.label = lbl;
    });
  }
}

function assignPlanOpeningToWindow(sh, winIdx, opIdx) {
  if (!sh || !Array.isArray(sh.windows)) return;
  const openings = getPlanOpenings(sh);
  const op = openings[opIdx];
  const w = sh.windows[winIdx];
  if (!op || !w) return;
  const targetInfo = formatPlanOpeningCode(op, opIdx);
  const prevNo = w.planNo;
  const prevLabel = w.label;

  // หากมีบานอื่นใช้จุดนี้อยู่แล้ว ให้สลับตำแหน่งกันทันที เพื่อไม่ให้ตำแหน่งซ้ำกัน (Req #10)
  const conflictWin = sh.windows.find((other, oi) =>
    oi !== winIdx && other && (String(other.label || '').trim().toUpperCase() === targetInfo.code.toUpperCase() || String(other.planNo || '').trim() === targetInfo.no)
  );
  w.planNo = targetInfo.no;
  w.label = targetInfo.code;
  const inferred = inferCornerShapeFromPlanItem(op);
  if (inferred !== '1') w.cornerShape = inferred;

  if (conflictWin) {
    conflictWin.planNo = prevNo || '';
    conflictWin.label = prevLabel || '';
  }
  dedupeSheetWindowPositions(sh);
}

function syncWindowsFromPlan(sh) {
  if (!sh) return;
  const openings = getPlanOpenings(sh);
  if (!openings.length) {
    dedupeSheetWindowPositions(sh);
    return;
  }
  while (sh.windows.length < openings.length) {
    sh.windows.push(newWindow(sh.windows.length + 1));
  }
  // ตัดช่องว่างเริ่มต้นที่เกินจำนวนจุดที่กำหนดในแปลนออก (เช่น กำหนดแค่ 3 จุด ไม่ให้แสดง W4)
  while (sh.windows.length > openings.length && typeof isBlankDefaultWindow === 'function' && isBlankDefaultWindow(sh.windows[sh.windows.length - 1])) {
    sh.windows.pop();
  }
  openings.forEach((op, idx) => {
    const w = sh.windows[idx];
    if (!w) return;
    const info = formatPlanOpeningCode(op, idx);
    w.planNo = info.no;
    w.label = info.code;
    const inferred = inferCornerShapeFromPlanItem(op);
    if (inferred !== '1' && (!w.cornerShape || w.cornerShape === '1')) {
      w.cornerShape = inferred;
    }
  });
  dedupeSheetWindowPositions(sh);
}

/* =========================================================
   Window Editor Card (Req #5, #6.1–6.12, #7.16, #9, #13)
   ========================================================= */
function dimFieldRow(b, label, numKey, noteKey, idx, isRailCalc = false) {
  return `<div class="dim-pair">
    <span class="dim-lbl">${label}</span>
    <input type="number" step="0.5" data-halfcm="1" data-dim-num="1" ${b(numKey)} ${isRailCalc ? `data-rail-calc="${idx}"` : ''} placeholder="เช่น 150">
    <input list="dlRemarks" tabindex="-1" ${b(noteKey)} placeholder="หมายเหตุ (คลิกเพื่อระบุ)">
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
        || { id: 'sheet_' + colKey, name, design, fabricWidth: (cell.isSheer || colKey === 'sheer') ? 300 : 140, yRepeat: 0, calcMode: (cell.isSheer || colKey === 'sheer') ? 'both' : 'opaque' })
      : null;
    // บังคับ 1 รายการผ้า = 1 เกรน ตามที่เลือกไว้ในตารางสินค้า (ทึบ หรือ โปร่ง)
    let grainType = (cell.grain === 'sheer' || (cell.isSheer && !cell.isOpaque)) ? 'sheer' : 'opaque';
    if (fabricObj && typeof canFabricUseSheerGrain === 'function' && !canFabricUseSheerGrain(fabricObj.fabricWidth)) {
      grainType = 'opaque';
    }
    const blindObj = isBlindCol
      ? (blindAll.find(x => String(x.name || '').trim() === name) || { id: 'sheet_' + colKey, name, curtainStyle: colTitle, minSqm: 1.5, roundMode: 'ceil_1dec' })
      : null;
    const grainBadge = !isBlindCol ? ` • ${grainType === 'sheer' ? 'เกรนโปร่ง' : 'เกรนทึบ'}` : '';
    out.push({
      colKey,
      colTitle,
      name,
      design,
      color,
      isBlindCol,
      grainType,
      fabricObj,
      blindObj,
      displayText: `[${colTitle}] ${name}${design ? ' • ดีไซน์ ' + design : ''}${color ? ' • สี ' + color : ''}${fabricObj ? ' (หน้าผ้า ' + fabricObj.fabricWidth + ' ซม.' + grainBadge + ')' : ''}`,
    });
  });
  return out;
}

function resolveWindowFabricChoice(w, sh, layerNo) {
  const choices = getSheetTableFabricChoices(sh);
  const fabAll = (typeof masterDB !== 'undefined' && Array.isArray(masterDB.fabrics)) ? masterDB.fabrics : [];
  const colField = layerNo === 1 ? 'fabricCol1' : 'fabricCol2';
  const idField = layerNo === 1 ? 'fabricId1' : 'fabricId2';
  const grainField = layerNo === 1 ? 'grainType1' : 'grainType2';

  if (w[colField]) {
    const matched = choices.find(c => c.colKey === w[colField]);
    if (matched) {
      if (matched.fabricObj && matched.fabricObj.id) w[idField] = matched.fabricObj.id;
      // ใช้เกรนที่เลือกไว้ในตารางสินค้าของรายการผ้านั้นๆ อัตโนมัติ ไม่ต้องเลือกใหม่
      if (matched.grainType) w[grainField] = matched.grainType;
      return matched.fabricObj;
    }
    // แม้ยังไม่ได้กรอกชื่อผ้าในคอลัมน์นั้น แต่ให้ซิงค์เกรนตามที่ติ๊กในตารางสินค้า (หากยังไม่ติ๊ก ใช้ค่าภายในตามชั้นโดยไม่ติ๊กบนแปลน)
    if (sh && sh.fabrics && sh.fabrics[w[colField]]) {
      const cell = sh.fabrics[w[colField]];
      if (cell.grain === 'sheer' || (cell.grain !== '' && cell.isSheer && !cell.isOpaque)) w[grainField] = 'sheer';
      else if (cell.grain === 'opaque' || (cell.grain !== '' && cell.isOpaque && !cell.isSheer)) w[grainField] = 'opaque';
      else w[grainField] = layerNo === 2 ? 'sheer' : 'opaque';
    }
  }
  if (w[idField]) {
    const byId = fabAll.find(x => x.id === w[idField]);
    if (byId) {
      const matchCol = choices.find(c => c.name === byId.name);
      if (matchCol) {
        if (!w[colField]) w[colField] = matchCol.colKey;
        if (matchCol.grainType) w[grainField] = matchCol.grainType;
        return byId;
      }
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
  const rawAdj = String((w && w.floorAdjust) ?? '').trim();
  const mag = (typeof parseUnsignedFloat === 'function') ? parseUnsignedFloat(rawAdj) : Math.abs(parseFloat(rawAdj) || 0);
  if (mode === 'float') {
    if (!rawAdj) return 'ลอยจากพื้นตามมาตรฐานฐานข้อมูล 1 ซม. (ระบุระยะลอยพื้นที่ต้องการ เช่น 2 ซม.)';
    const delta = Math.round((1 - mag) * 100) / 100;
    const signStr = delta <= 0 ? String(delta) : ('+' + delta);
    const exAfter = Math.round((-1.5 + delta) * 100) / 100;
    return `ต้องการลอยจากพื้น ${mag} ซม. (ปรับจากมาตรฐานลอย 1 ซม. ${signStr} ซม. → เช่น สูตร -1.5 ลอย 1 ซม. เป็น ${exAfter} ลอย ${mag} ซม.)`;
  }
  if (mode === 'touch') {
    return 'พอดีพื้น 0 ซม. (บวกคืนความสูงผ้า +1 ซม. จากมาตรฐานลอย 1 ซม. เช่น สูตร -1.5 เป็น -0.5 ซม.)';
  }
  if (mode === 'puddle') {
    return `ต้องการกองพื้น ${mag} ซม. (บวกเพิ่มความสูงผ้า +${Math.round((1 + mag) * 100) / 100} ซม. จากมาตรฐานลอย 1 ซม.)`;
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

/**
 * แยกเงื่อนไขการคำนวณของแต่ละชั้น (ชั้น 1 ม่านทึบ / ชั้น 2 ม่านโปร่ง) อย่างอิสระ
 * รองรับกรณี 2 ชั้นคนละรูปแบบ/ราง/ตะขอ เช่น ม่านทึบ=ม่านลอน(รางลอน/No.8) + ม่านโปร่ง=ม่านจีบ(รางจีบ/No.6)
 */
function resolveWindowLayerConfig(w, sh, layerNo) {
  const style1 = String((w && w.curtainStyle1) || '').trim();
  const style2Raw = String((w && w.curtainStyle2) || '').trim();
  const isLayer2 = layerNo === 2;
  const style = isLayer2 ? (style2Raw || style1) : style1;
  const isMixedStyle = !!(style1 && style2Raw && style1 !== style2Raw);
  const natRod = (typeof inferNaturalRodTypeForStyle === 'function') ? inferNaturalRodTypeForStyle(style) : '';

  let rodType = '';
  let railModel = '';
  let hookSize = '';

  if (!isLayer2) {
    railModel = String((w && w.railModel) || '').trim();
    const rm1 = (typeof resolveRailMetaByName === 'function') ? resolveRailMetaByName(railModel) : { rodCategory: '' };
    rodType = String((w && w.rodType) || '').trim() || rm1.rodCategory || natRod;
    hookSize = String((w && w.hookSize) || '').trim();
  } else {
    railModel = String((w && w.railModel2) || '').trim();
    const rm2 = (typeof resolveRailMetaByName === 'function') ? resolveRailMetaByName(railModel) : { rodCategory: '' };
    rodType = String((w && w.rodType2) || '').trim()
      || rm2.rodCategory
      || (isMixedStyle ? natRod : (String((w && w.rodType) || '').trim() || natRod));
    hookSize = String((w && w.hookSize2) || '').trim()
      || (curtainNeedsHook(style, '') ? String((w && w.hookSize) || '').trim() : '');
  }

  // ดึงรุ่นรางจากตารางรางของหน้าแปลน (sh.rods) ให้ตรงกับประเภทรางของชั้นนั้นๆ โดยตรง (ไม่มั่วดึงรางม่านจีบมาให้ม่านลอน!)
  if (!railModel && sh && sh.rods) {
    const r = sh.rods;
    const rt = rodType || natRod;
    if (rt === 'รางม่านจีบ' && r.pleat && r.pleat.model) railModel = String(r.pleat.model).trim();
    else if (rt === 'รางโชว์' && r.show && r.show.model) railModel = String(r.show.model).trim();
    else if (rt === 'รางม่านลอน' && r.wave && r.wave.model) railModel = String(r.wave.model).trim();
    else if (rt === 'รางม่านพับ' && r.fold && r.fold.model) railModel = String(r.fold.model).trim();
    else if (!rt) {
      railModel = String((r.pleat && r.pleat.model) || (r.wave && r.wave.model) || (r.show && r.show.model) || (r.fold && r.fold.model) || '').trim();
    }
  }
  if (!railModel && isLayer2 && !isMixedStyle && w && String(w.railModel || '').trim()) {
    railModel = String(w.railModel).trim();
  }

  const finalMeta = (typeof resolveRailMetaByName === 'function') ? resolveRailMetaByName(railModel) : { name: railModel, railGroup: '', rodCategory: '' };
  if (!rodType && finalMeta.rodCategory) rodType = finalMeta.rodCategory;

  return { style, rodType, railModel, railGroup: finalMeta.railGroup || '', hookSize, isMixedStyle };
}

/**
 * ซิงค์รุ่นรางม่านที่เลือกจากหน้าต่าง/ประตู (ทั้งชั้นที่ 1 และชั้นที่ 2) ไปแสดงในตาราง ROD TYPE ของใบแปลน
 * - รองรับกรณีชั้น 1 และชั้น 2 เลือกคนละประเภทราง (เช่น รางม่านลอน + รางม่านจีบ -> แสดงครบทั้ง 2 ช่องบนแปลน)
 * - รองรับกรณีชั้น 1 และชั้น 2 อยู่ประเภทเดียวกันแต่คนละรุ่น (เช่น รุ่น A / รุ่น B)
 */
function syncSheetRodsFromWindows(sh, forceReplaceCats = null) {
  if (!sh || !sh.rods) return;
  const catMap = { 'รางม่านจีบ': 'pleat', 'รางโชว์': 'show', 'รางม่านลอน': 'wave', 'รางม่านพับ': 'fold' };
  const byCat = { pleat: [], show: [], wave: [], fold: [] };
  const colorByCat = { pleat: '', show: '', wave: '', fold: '' };

  const addRailEntry = (railName, fallbackRodType) => {
    const n = String(railName || '').trim();
    if (!n) return;
    const nLow = n.toLowerCase();
    const railObj = (masterDB.rails || []).find(r => String(r.name || '').trim().toLowerCase() === nLow);
    const cat = (railObj && railObj.rodCategory) || fallbackRodType || '';
    const rk = catMap[cat];
    if (!rk || !byCat[rk]) return;
    const canonicalName = (railObj && railObj.name) || n;
    if (!byCat[rk].includes(canonicalName)) byCat[rk].push(canonicalName);
    if (!colorByCat[rk] && railObj && railObj.defaultColor) colorByCat[rk] = railObj.defaultColor;
  };

  (sh.windows || []).forEach(win => {
    if (!win) return;
    if (win.railModel) {
      const nat1 = (typeof inferNaturalRodTypeForStyle === 'function') ? inferNaturalRodTypeForStyle(win.curtainStyle1) : '';
      addRailEntry(win.railModel, win.rodType || nat1);
    }
    if (win.railModel2) {
      const nat2 = (typeof inferNaturalRodTypeForStyle === 'function') ? inferNaturalRodTypeForStyle(win.curtainStyle2 || win.curtainStyle1) : '';
      addRailEntry(win.railModel2, win.rodType2 || nat2 || win.rodType);
    }
  });

  ['pleat', 'show', 'wave', 'fold'].forEach(rk => {
    const picked = byCat[rk];
    if (!sh.rods[rk]) return;
    if (picked.length) {
      if (forceReplaceCats && forceReplaceCats.has(rk)) {
        sh.rods[rk].model = picked.join(' / ');
      } else {
        const curParts = String(sh.rods[rk].model || '').split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean);
        picked.forEach(p => { if (!curParts.includes(p)) curParts.push(p); });
        sh.rods[rk].model = curParts.join(' / ');
      }
      if (!sh.rods[rk].color && colorByCat[rk]) sh.rods[rk].color = colorByCat[rk];
    } else if (forceReplaceCats && forceReplaceCats.has(rk)) {
      sh.rods[rk].model = '';
    }
  });
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

  // กรณีบานดัดโค้ง (แบบ 2-9) ถ้าระบุความกว้างแต่ละด้านไว้ ให้นำมารวมเป็นความกว้างเฟรมอัตโนมัติ (Req #14)
  if (typeof calcCurvedSidesWidthSum === 'function' && String(w.cornerShape || '1') !== '1') {
    const curvedSum = calcCurvedSidesWidthSum(w);
    if (curvedSum > 0) w.width = String(curvedSum);
  }
  // กรณีระบุความสูงเต็ม ซ้าย/กลาง/ขวา ให้จัดรูปแบบแสดงจากซ้ายไปขวาเสมอ (Req #17)
  if (typeof formatFullHeightLeftToRight === 'function') {
    const fhlr = formatFullHeightLeftToRight(w);
    if (fhlr) w.fullH = fhlr;
  }

  const numClean = v => {
    const n = parseFloat(String(v ?? '').replace(/\*/g, '').trim());
    return isNaN(n) ? 0 : n;
  };
  const rw = numClean(calcRailWidth(w)) || numClean(w.width) || 0;
  const rh = numClean(calcRailHeight(w)) || numClean(w.height) || 0;
  const effTracks = (w.unequalLayerRail ? 2 : 0) || +w.railTracks || ((w.curtainStyle1 && w.curtainStyle2) ? 2 : 1);
  const isTwoLayer = effTracks >= 2 || !!(w.curtainStyle1 && w.curtainStyle2) || !!w.unequalLayerRail;

  // Req #5: Default ม่าน 2 ชั้นให้ลดความสูงม่านโปร่ง/ชั้นหลังมากกว่าปกติ 1 ซม. (ถ้าเป็นชั้นเดียวไม่ต้องลดเพิ่ม)
  if (w.backLayerHeightDeduct === undefined || w.backLayerHeightDeduct === '') {
    w.backLayerHeightDeduct = '1';
  }
  const style1 = String(w.curtainStyle1 || '').trim();
  const style2 = String(w.curtainStyle2 || '').trim();
  const isSingleBlindWindow = isBlindOrRollerStyle(style1) && !style2 && !isTwoLayer;

  // จัดคอลัมน์สินค้าให้ตรงประเภท (ม่านม้วน -> roller, มู่ลี่/ม่านปรับแสง -> blinds, ผ้าม่าน -> blackout/sheer)
  const syncColByStyle = (curCol, st, fallback) => {
    if (/ม่านม้วน/.test(st)) return curCol === 'other' ? 'other' : 'roller';
    if (/มู่ลี่|ม่านปรับแสง/.test(st)) return curCol === 'other' ? 'other' : 'blinds';
    if (!curCol || (st && !isBlindOrRollerStyle(st) && (curCol === 'roller' || curCol === 'blinds'))) return fallback;
    return curCol;
  };
  w.fabricCol1 = syncColByStyle(w.fabricCol1, style1, 'blackout');
  if (isTwoLayer) {
    w.fabricCol2 = syncColByStyle(w.fabricCol2, style2, 'sheer');
  }

  const backDeductVal = isTwoLayer ? (parseFloat(w.backLayerHeightDeduct) || 0) : 0;
  const extraDeduct1 = (isTwoLayer && w.backLayerTarget === 'layer1') ? backDeductVal : 0;
  const extraDeduct2 = (isTwoLayer && w.backLayerTarget !== 'layer1') ? backDeductVal : 0;

  const rw1 = (w.unequalLayerRail && numClean(w.railW1) > 0) ? numClean(w.railW1) : rw;
  const rw2 = (w.unequalLayerRail && numClean(w.railW2) > 0) ? numClean(w.railW2) : rw;
  const rh1 = (w.unequalLayerRail && numClean(w.railH1) > 0) ? numClean(w.railH1) : rh;
  const rh2 = (w.unequalLayerRail && numClean(w.railH2) > 0) ? numClean(w.railH2) : rh;

  if (!isAllManual) {
    if (isSingleBlindWindow) {
      // Req #15: ม่านม้วน / มู่ลี่ ให้ใส่ขนาดแค่ช่องเดียว ไม่ต้องแยกขนาดราง ขนาดผ้าม่าน
      if (!mf.railA) w.rail.a = '';
      if (!mf.railB) w.rail.b = '';
      if (!mf.railN) w.rail.n = '';
      if (!mf.railT) w.rail.t = '';
    } else {
      const railRes = computeWindowRailRow(w, sh);
      if (!mf.railA) w.rail.a = railRes.a;
      if (!mf.railB) w.rail.b = railRes.b;
      if (!mf.railN) w.rail.n = railRes.n;
      if (!mf.railT) w.rail.t = railRes.t;
    }
  }

  const wfAll = masterDB.widthFormulas || [];
  const hfAll = masterDB.heightFormulas || [];
  const blindAll = masterDB.blinds || [];
  const ruleAll = masterDB.fabricCalcRules || [];

  const cfg1 = resolveWindowLayerConfig(w, sh, 1);
  const cfg2 = resolveWindowLayerConfig(w, sh, 2);

  // ต้องเลือกข้อมูล (เช่น รูปแบบผ้าม่าน ชั้นที่ 1) และต้องมีขนาดหน้าต่าง/ประตูของบานนี้ก่อน จึงจะเริ่มคำนวณ
  const fab1 = resolveWindowFabricChoice(w, sh, 1);
  const hasLayer1Selection = !!(style1 || w.widthFormulaId1 || w.heightFormulaId1 || fab1);
  const liningChoice = sh ? (getSheetTableFabricChoices(sh).find(c => c.colKey === 'other') || null) : null;

  if (!isAllManual) {
    if (hasLayer1Selection && (rw1 > 0 || rh1 > 0)) {
      const wf1 = (w.widthFormulaId1 && wfAll.find(f => f.id === w.widthFormulaId1))
        || (style1 ? getWidthFormulasForStyle(style1, w.pieces1, effTracks, cfg1.rodType, 'opaque')[0] : null);
      const hf1 = (w.heightFormulaId1 && hfAll.find(f => f.id === w.heightFormulaId1))
        || findAutoHeightFormulaForWindow(style1, cfg1.rodType, cfg1.hookSize, effTracks, cfg1.railModel);
      if (fab1 && !canFabricUseSheerGrain(fab1.fabricWidth)) {
        w.grainType1 = 'opaque';
      }
      const grain1 = w.grainType1 || 'opaque';
      const rule1 = (w.fabricRuleId1 && ruleAll.find(r => r.id === w.fabricRuleId1))
        || (style1 ? getFabricCalcRulesForStyle(style1, grain1)[0] : null);
      const blind1 = (w.blindId1 && blindAll.find(b => b.id === w.blindId1))
        || (isBlindOrRollerStyle(style1) ? getBlindsForStyle(style1)[0] : null);

      const r1 = computeCurtainLayerByWidthHeight(w, wf1, hf1, {
        layerKey: 'opaque',
        overrideRW: rw1,
        overrideRH: rh1,
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

      // เย็บประกบ ชั้นที่ 1: ใช้รูปแบบม่าน ขนาดผ้าม่าน และจำนวนผืนเหมือนผ้าด้านหน้า แต่คำนวณปริมาณใหม่ตามผ้าและเกรนในคอลัมน์ OTHER
      if (w.lining1 && !isBlindOrRollerStyle(style1) && liningChoice && liningChoice.fabricObj) {
        const linGrain1 = (liningChoice.grainType === 'sheer' && canFabricUseSheerGrain(liningChoice.fabricObj.fabricWidth)) ? 'sheer' : 'opaque';
        const linRule1 = (w.liningRuleId1 && ruleAll.find(r => r.id === w.liningRuleId1))
          || (style1 ? getFabricCalcRulesForStyle(style1, linGrain1)[0] : null);
        const linRes1 = computeCurtainLayerByWidthHeight(w, wf1, hf1, {
          layerKey: 'opaque',
          overrideRW: rw1,
          overrideRH: rh1,
          curtainStyle: style1,
          pieces: w.pieces1 || (wf1 && wf1.pieces) || '',
          railTracks: effTracks,
          fabric: liningChoice.fabricObj,
          grainType: linGrain1,
          fabricRule: linRule1,
          yardMode: w.liningYardMode1 || w.yardMode1 || 'exact',
          extraYards: w.extraYards1 || 0,
          extraHeightDeduct: extraDeduct1,
        });
        if (!mf.boLinT) w.lining1T = linRes1.t || '';
      } else if (!mf.boLinT) {
        w.lining1T = '';
      }
    } else if (rw1 <= 0 && rh1 <= 0) {
      if (!mf.boA) w.blackout.a = '';
      if (!mf.boB) w.blackout.b = '';
      if (!mf.boN) w.blackout.n = '';
      if (!mf.boT) w.blackout.t = '';
      if (!mf.boLinT) w.lining1T = '';
    } else if (!mf.boLinT) {
      w.lining1T = '';
    }
    // กรณีม่านม้วน/มู่ลี่มีการกำหนดขนาดต่อผืนเอง (blindPieces) ให้สรุปจำนวนผืนและพื้นที่รวม (ตร.ม.) ลงใน w.blackout เพื่อรวมยอดลงตารางสินค้า
    if (Array.isArray(w.blindPieces) && w.blindPieces.length && typeof calcBlindPiecesTotalSqm === 'function') {
      const bpRes = calcBlindPiecesTotalSqm(w);
      if (bpRes.count > 0) {
        if (!mf.boN) w.blackout.n = String(bpRes.count);
        if (!mf.boT) w.blackout.t = bpRes.totalSqmStr;
      }
    }
  }

  // Layer 2 (ม่านโปร่ง) — คำนวณแยกอิสระตามรูปแบบผ้าม่าน ราง ตะขอ และสูตรของชั้นที่ 2 เอง (เช่น ทึบ=ม่านลอน, โปร่ง=ม่านจีบ)
  const fab2 = resolveWindowFabricChoice(w, sh, 2);
  const hasLayer2Selection = !isSingleBlindWindow && !!(style2 || w.widthFormulaId2 || w.heightFormulaId2 || (isTwoLayer && (style1 || fab2)));
  if (!isAllManual) {
    if (hasLayer2Selection && (rw2 > 0 || rh2 > 0)) {
      const effStyle2 = cfg2.style;
      const wf2 = (w.widthFormulaId2 && wfAll.find(f => f.id === w.widthFormulaId2))
        || (effStyle2 ? getWidthFormulasForStyle(effStyle2, w.pieces2 || w.pieces1, effTracks, cfg2.rodType, 'sheer')[0] : null);
      const hf2 = (w.heightFormulaId2 && hfAll.find(f => f.id === w.heightFormulaId2))
        || findAutoHeightFormulaForWindow(effStyle2, cfg2.rodType, cfg2.hookSize, effTracks, cfg2.railModel);
      if (fab2 && !canFabricUseSheerGrain(fab2.fabricWidth)) {
        w.grainType2 = 'opaque';
      }
      const grain2 = w.grainType2 || 'sheer';
      const rule2 = (w.fabricRuleId2 && ruleAll.find(r => r.id === w.fabricRuleId2))
        || (effStyle2 ? getFabricCalcRulesForStyle(effStyle2, grain2)[0] : null);
      const blind2 = (w.blindId2 && blindAll.find(b => b.id === w.blindId2))
        || (isBlindOrRollerStyle(effStyle2) ? getBlindsForStyle(effStyle2)[0] : null);

      const r2 = computeCurtainLayerByWidthHeight(w, wf2, hf2, {
        layerKey: 'sheer',
        overrideRW: rw2,
        overrideRH: rh2,
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

      // เย็บประกบ ชั้นที่ 2: ใช้รูปแบบม่าน ขนาดผ้าม่าน และจำนวนผืนเหมือนผ้าชั้นที่ 2 แต่คำนวณปริมาณใหม่ตามผ้าและเกรนในคอลัมน์ OTHER
      if (w.lining2 && !isBlindOrRollerStyle(effStyle2) && liningChoice && liningChoice.fabricObj) {
        const linGrain2 = (liningChoice.grainType === 'sheer' && canFabricUseSheerGrain(liningChoice.fabricObj.fabricWidth)) ? 'sheer' : 'opaque';
        const linRule2 = (w.liningRuleId2 && ruleAll.find(r => r.id === w.liningRuleId2))
          || (effStyle2 ? getFabricCalcRulesForStyle(effStyle2, linGrain2)[0] : null);
        const linRes2 = computeCurtainLayerByWidthHeight(w, wf2, hf2, {
          layerKey: 'sheer',
          overrideRW: rw2,
          overrideRH: rh2,
          curtainStyle: effStyle2,
          pieces: w.pieces2 || w.pieces1 || (wf2 && wf2.pieces) || '',
          railTracks: effTracks,
          fabric: liningChoice.fabricObj,
          grainType: linGrain2,
          fabricRule: linRule2,
          yardMode: w.liningYardMode2 || w.yardMode2 || 'exact',
          extraYards: w.extraYards2 || 0,
          extraHeightDeduct: extraDeduct2,
        });
        if (!mf.shLinT) w.lining2T = linRes2.t || '';
      } else if (!mf.shLinT) {
        w.lining2T = '';
      }
    } else {
      if (!mf.shA) w.sheer.a = '';
      if (!mf.shB) w.sheer.b = '';
      if (!mf.shN) w.sheer.n = '';
      if (!mf.shT) w.sheer.t = '';
      if (!mf.shLinT) w.lining2T = '';
    }
  }

  // ซิงค์รุ่นราง (ทั้งชั้นที่ 1 และชั้นที่ 2) และอัปเดตผลรวมจำนวนหลาในตารางผ้าของหน้าห้อง
  if (sh) {
    syncSheetRodsFromWindows(sh, null);
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
function buildBlindPiecesSummaryText(w) {
  const pieces = Array.isArray(w && w.blindPieces) ? w.blindPieces : [];
  if (!pieces.length) return 'ยังไม่แบ่งผืนย่อย — กดปุ่มจำนวนผืนด้านบนเพื่อระบุขนาดแต่ละผืนเองได้ (เช่น 180 + 120)';
  const rw = parseFloat(String(calcRailWidth(w) || w.width || 0).replace(/\*/g, '')) || 0;
  const info = (typeof calcBlindPiecesTotalSqm === 'function') ? calcBlindPiecesTotalSqm(w) : { count: 0, totalWidth: 0, totalSqmStr: '' };
  const wParts = pieces.map(p => parseFloat(p && p.w) || 0).filter(n => n > 0);
  const sumExpr = wParts.length > 1 ? `${wParts.join(' + ')} = ${info.totalWidth}` : `${info.totalWidth}`;
  let diffTxt = '';
  if (rw > 0 && info.totalWidth > 0) {
    const diff = Math.round((rw - info.totalWidth) * 100) / 100;
    if (Math.abs(diff) < 0.01) diffTxt = ` (ตรงกับความกว้างรวม ${rw} ซม. ✔)`;
    else if (diff > 0) diffTxt = ` (ยังขาดอีก ${diff} ซม. จาก ${rw} ซม.)`;
    else diffTxt = ` (เกิน ${Math.abs(diff)} ซม. จาก ${rw} ซม.)`;
  }
  return `รวมกว้าง: ${sumExpr} ซม.${diffTxt}${info.totalSqmStr ? ` • พื้นที่รวม ${info.totalSqmStr} ตร.ม.` : ''}`;
}

function buildBlindPiecesEditorHTML(w, i) {
  const pieces = Array.isArray(w && w.blindPieces) ? w.blindPieces : [];
  const info = (typeof calcBlindPiecesTotalSqm === 'function') ? calcBlindPiecesTotalSqm(w) : { pieceSqms: [] };
  const activeCnt = pieces.length;
  const sameH = w.blindSameHeight !== false;
  const quickHint = pieces.map(p => p && p.w).filter(Boolean).join(', ');
  return `
    <div class="blind-pieces-box" style="margin-top:6px;padding:7px 9px;background:#f0f9ff;border:1px solid #7dd3fc;border-radius:6px">
      <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:4px;margin-bottom:5px">
        <b style="color:#0369a1;font-size:12px">🪟 กำหนดขนาดต่อผืนเอง (ม่านม้วน / มู่ลี่)</b>
        <div class="inline" style="flex-wrap:wrap;gap:3px">
          ${[1, 2, 3, 4].map(cnt => `<button type="button" class="${activeCnt === cnt ? 'primary' : ''}" data-act="setBlindPieceCount" data-i="${i}" data-li="${cnt}" style="padding:2px 7px;font-size:11px">${cnt} ผืน</button>`).join('')}
          <button type="button" data-act="addBlindPiece" data-i="${i}" style="padding:2px 7px;font-size:11px">➕ เพิ่มผืน</button>
          ${activeCnt >= 2 ? `<button type="button" data-act="balanceBlindPieces" data-i="${i}" style="padding:2px 7px;font-size:11px" title="คำนวณความกว้างที่เหลือให้ผืนสุดท้ายอัตโนมัติ">⚡ เติมส่วนที่เหลือ</button>` : ''}
        </div>
      </div>
      <div class="inline" style="margin-bottom:5px;gap:5px;flex-wrap:wrap">
        <input type="text" data-bp-quick="${i}" value="${esc(quickHint)}" placeholder="⚡ พิมพ์ความกว้างหลายผืนแบบเร็ว เช่น 180, 120 แล้วกด Enter" style="flex:1;min-width:190px;font-size:12px;background:#fff">
        <button type="button" class="primary" data-act="applyBlindQuickWidths" data-i="${i}" style="padding:3px 8px;font-size:11.5px">แบ่งทันที</button>
        <label class="inline" style="font-size:11.5px;color:#0c4a6e;cursor:pointer;white-space:nowrap">
          <input type="checkbox" data-bp-sameh="${i}" ${sameH ? 'checked' : ''}> สูงเท่ากันทุกผืน
        </label>
      </div>
      ${pieces.map((bp, pi) => {
        const sqm = (info.pieceSqms && info.pieceSqms[pi]) || '';
        return `
        <div class="inline" style="margin-bottom:4px;flex-wrap:wrap;gap:5px">
          <span class="layer-tag">ผืนที่ ${pi + 1}</span>
          <input type="number" step="0.5" data-halfcm="1" data-dim-num="1" data-sheet="windows.${i}.blindPieces.${pi}.w" value="${esc(bp.w || '')}" placeholder="กว้าง (ซม.)" style="width:92px">
          <span>×</span>
          <input type="number" step="0.5" data-halfcm="1" ${sameH && pi > 0 ? 'tabindex="-1"' : 'data-dim-num="1"'} data-sheet="windows.${i}.blindPieces.${pi}.h" value="${esc(bp.h || '')}" placeholder="สูง (ซม.)" style="width:92px">
          <span class="bp-sqm-tag" data-bp-sqm="${i}_${pi}" style="font-size:11.5px;color:#0369a1;font-weight:700;min-width:68px">${sqm ? `= ${esc(sqm)} ตร.ม.` : ''}</span>
          <button type="button" class="danger" tabindex="-1" data-act="delBlindPiece" data-i="${i}" data-li="${pi}" style="padding:2px 6px">✕</button>
        </div>`;
      }).join('')}
      <div class="blind-pieces-summary" data-bp-summary="${i}" style="font-size:11.5px;color:#0c4a6e;font-weight:600;margin-top:4px">${esc(buildBlindPiecesSummaryText(w))}</div>
    </div>
  `;
}

function buildWindowLiningEditorHTML(w, i, sh, opts = {}) {
  const b = p => `data-sheet="windows.${i}.${p}"`;
  const style1 = String((w && w.curtainStyle1) || '').trim();
  const style2 = String((w && w.curtainStyle2) || '').trim();
  const isBlind1 = opts.isBlind1 !== undefined ? opts.isBlind1 : isBlindOrRollerStyle(style1);
  const isBlind2 = opts.isBlind2 !== undefined ? opts.isBlind2 : isBlindOrRollerStyle(style2);
  const showLayer2 = !!opts.showLayer2;
  if (isBlind1 && (!showLayer2 || isBlind2)) return '';
  const useCombo = !!opts.fromPopover;
  const radioName = `${useCombo ? 'pop' : 'ed'}_lining_other_grain_${i}_${opts.sectionKey || 's'}`;
  const otherFab = (sh && sh.fabrics && sh.fabrics.other) || {};
  const hasOtherName = !!String(otherFab.name || '').trim();
  const anyLining = !!(w.lining1 || w.lining2);
  const boPreview = w.lining1
    ? `${w.blackout && w.blackout.t ? w.blackout.t : '-'} (${w.lining1T || (hasOtherName ? '-' : 'รอเลือกผ้า OTHER')})`
    : '';
  const shPreview = w.lining2
    ? `${w.sheer && w.sheer.t ? w.sheer.t : '-'} (${w.lining2T || (hasOtherName ? '-' : 'รอเลือกผ้า OTHER')})`
    : '';
  return `
    <div class="lining-opt-box" style="margin-top:6px;padding:7px 9px;background:#faf5ff;border:1px dashed #a855f7;border-radius:6px">
      <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:6px">
        <b style="color:#6b21a8;font-size:12px">🧵 ตัวเลือกเย็บประกบ (ผ้าด้านหลัง → แสดงชื่อผ้า สี และรวมยอดที่คอลัมน์ OTHER อื่นๆ)</b>
        <div class="inline" style="flex-wrap:wrap;gap:10px">
          ${!isBlind1 ? `<label class="inline" style="font-weight:700;color:#581c87;cursor:pointer"><input type="checkbox" ${b('lining1')}> เย็บประกบ ชั้นที่ 1 (${esc(style1 || 'ม่านทึบ')})</label>` : ''}
          ${(showLayer2 && !isBlind2) ? `<label class="inline" style="font-weight:700;color:#581c87;cursor:pointer"><input type="checkbox" ${b('lining2')}> เย็บประกบ ชั้นที่ 2 (${esc(style2 || 'ม่านโปร่ง')})</label>` : ''}
        </div>
      </div>
      ${anyLining ? `
        <div style="margin-top:6px;padding-top:6px;border-top:1px dashed #d8b4fe">
          <div class="opts" style="padding:4px 7px;background:#fff;border:1px solid #e9d5ff;border-radius:5px;margin-bottom:6px">
            <span class="olbl" style="font-weight:700;color:#6b21a8">เกรนผ้าเย็บประกบ (OTHER):</span>
            <label><input type="radio" name="${radioName}" value="opaque" data-fab-grain="other"> เกรนทึบ</label>
            <label><input type="radio" name="${radioName}" value="sheer" data-fab-grain="other"> เกรนโปร่ง</label>
            <span style="font-size:11px;color:#64748b">(ใช้รูปแบบม่าน ขนาดผ้า และจำนวนผืนเหมือนผ้าด้านหน้า)</span>
          </div>
          <div class="grid3" style="gap:6px">
            <label>ชื่อผ้าเย็บประกบ (ดึงจากฐานข้อมูลผ้า → OTHER)
              ${useCombo
                ? comboInputHTML({ kind: 'fabric', col: 'other', sheetPath: 'fabrics.other.name', placeholder: 'เลือกผ้าเย็บประกบจากฐานข้อมูลผ้า...' })
                : `<input list="dlFabrics" data-sheet="fabrics.other.name" placeholder="เลือกผ้าเย็บประกบจากฐานข้อมูลผ้า...">`
              }
            </label>
            <label>ดีไซน์ผ้าเย็บประกบ (OTHER)
              <input data-sheet="fabrics.other.design" placeholder="อัตโนมัติเมื่อเลือกผ้า">
            </label>
            <label>สีผ้าเย็บประกบ (OTHER)
              <input data-sheet="fabrics.other.color" placeholder="ระบุสีผ้าเย็บประกบ">
            </label>
          </div>
          <div class="grid2" style="margin-top:6px;gap:6px">
            ${w.lining1 ? `
              <label>ปริมาณผ้าเย็บประกบ ชั้นที่ 1 (แสดงในวงเล็บ: <b>${esc(boPreview)}</b>)
                <input ${b('lining1T')} placeholder="คำนวณอัตโนมัติ เช่น 1/4.0">
              </label>
            ` : ''}
            ${w.lining2 ? `
              <label>ปริมาณผ้าเย็บประกบ ชั้นที่ 2 (แสดงในวงเล็บ: <b>${esc(shPreview)}</b>)
                <input ${b('lining2T')} placeholder="คำนวณอัตโนมัติ เช่น 1/3.2">
              </label>
            ` : ''}
          </div>
          ${!hasOtherName ? `<div style="margin-top:4px;font-size:11.5px;color:#b45309;font-weight:600">⚠️ กรุณาเลือกชื่อผ้าเย็บประกบด้านบน (หรือในคอลัมน์ OTHER) เพื่อให้ระบบคำนวณจำนวนหน้าและปริมาณผ้าเย็บประกบ</div>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

function windowEditorHTML(w, i, planOpenings) {
  const b = p => `data-sheet="windows.${i}.${p}"`;
  const sh = currentSheet();
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

  const cfgEd1 = resolveWindowLayerConfig(w, sh, 1);
  const cfgEd2 = resolveWindowLayerConfig(w, sh, 2);
  const railList = getRailsForStyle(w.curtainStyle1, cfgEd1.rodType);
  const railModelOpts = `<option value="">-- อัตโนมัติตามตารางราง (${esc(cfgEd1.railModel || 'ไม่ระบุ')}) --</option>` +
    railList.map(r => `<option value="${esc(r.name)}">${esc(r.name)}${r.railGroup ? ' [' + esc(r.railGroup) + ']' : ''} (${esc(r.rodCategory || '-')})</option>`).join('');
  const railList2 = getRailsForStyle(w.curtainStyle2 || w.curtainStyle1, cfgEd2.rodType);
  const railModelOpts2Ed = `<option value="">-- อัตโนมัติตามรางชั้น 2 (${esc(cfgEd2.railModel || 'ไม่ระบุ')}) --</option>` +
    railList2.map(r => `<option value="${esc(r.name)}">${esc(r.name)}${r.railGroup ? ' [' + esc(r.railGroup) + ']' : ''} (${esc(r.rodCategory || '-')})</option>`).join('');

  // Req #9 & #10: ดึงตำแหน่งจากจุดในแปลนห้องเท่านั้น (กำหนดเองได้เฉพาะเมื่อแปลนห้องยังไม่ได้วางจุด) และป้องกันตำแหน่งซ้ำกัน
  const hasPlanPoints = planOpenings.length > 0;
  const matchedOpIdx = findMatchingPlanOpeningIdx(w, planOpenings);
  const planSelectOpts = `<option value="">-- ${hasPlanPoints ? 'เลือกจุดจากแปลนห้อง' : 'ยังไม่มีจุดในแปลน (กำหนดเองได้)'} --</option>` +
    planOpenings.map((op, oi) => {
      const info = formatPlanOpeningCode(op, oi);
      const usedByIdx = (sh && sh.windows || []).findIndex((other, wi) => wi !== i && other && String(other.label || '').trim().toUpperCase() === info.code.toUpperCase());
      const usedNote = usedByIdx >= 0 ? ` [สลับกับลำดับที่ ${usedByIdx + 1}]` : '';
      return `<option value="${oi}" ${oi === matchedOpIdx ? 'selected' : ''}>จุดที่ ${esc(info.no)} (${info.typeName} → ${esc(info.code)})${esc(usedNote)}</option>`;
    }).join('');

  const wings = shapeWings(w.cornerShape || '1');
  const isCurvedShape = String(w.cornerShape || '1') !== '1';
  const railW = calcRailWidth(w);
  const railH = calcRailHeight(w);
  const effTracks = (w.unequalLayerRail ? 2 : 0) || +w.railTracks || ((w.curtainStyle1 && w.curtainStyle2) ? 2 : 1);

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
      <input ${b('planNo')} style="max-width:48px;text-align:center;${hasPlanPoints ? 'background:#f1f5f9' : ''}" ${hasPlanPoints ? 'readonly' : ''} title="${hasPlanPoints ? 'ดึงลำดับจุดจากแปลนห้องเท่านั้น' : 'หมายเลขลำดับจุด'}">
      <input ${b('label')} style="${hasPlanPoints ? 'background:#f1f5f9' : ''}" ${hasPlanPoints ? 'readonly' : ''} placeholder="รหัส/ตำแหน่ง เช่น W1, D1" title="${hasPlanPoints ? 'ดึงรหัสตำแหน่งจากแปลนห้องเท่านั้น (เลือกเปลี่ยนจุดได้ที่ช่องด้านขวา)' : 'กำหนดรหัสตำแหน่งเอง (เนื่องจากยังไม่มีจุดในแปลนห้อง)'}">
      <select data-plan-pick="${i}" style="max-width:190px" title="ดึงตำแหน่งจากจุดที่วาดไว้ในแปลนห้อง">${planSelectOpts}</select>
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
      <label>รุ่นราง ชั้นที่ 1
        <span class="inline">
          <select ${b('railModel')}>${railModelOpts}</select>
          <button type="button" data-act="openDbRails" ${dbBtnAttr} title="ฐานข้อมูลรางม่านและอุปกรณ์เสริม">🗄️</button>
        </span>
      </label>
      ${isTwoLayer ? `
      <label>ประเภทราง & รุ่นราง ชั้นที่ 2 <small>(แยกจากชั้น 1 ได้)</small>
        <span class="inline">
          <select ${b('rodType2')} style="max-width:125px">
            <option value="">อัตโนมัติ (${esc(cfgEd2.rodType || '-')})</option>
            ${['รางม่านจีบ', 'รางโชว์', 'รางม่านลอน', 'รางม่านพับ'].map(rt => `<option value="${esc(rt)}">${esc(rt)}</option>`).join('')}
          </select>
          <select ${b('railModel2')}>${railModelOpts2Ed}</select>
        </span>
      </label>
      ` : ''}
      <label>ขนาดตะขอ ${needHook ? '<b>(ม่านจีบ/ลอน)</b>' : '<small>(เฉพาะม่านจีบ/ลอน)</small>'}
        <span class="inline">
          <select ${b('hookSize')} ${needHook ? '' : 'disabled'}>${hookOpts}</select>
          ${isTwoLayer ? `
            <select ${b('hookSize2')} ${curtainNeedsHook(w.curtainStyle2 || w.curtainStyle1, '') ? '' : 'disabled'} title="ขนาดตะขอ ชั้นที่ 2">
              <option value="">ชั้น 2: ตามชั้น 1</option>
              ${masterDB.hooks.map(h => `<option value="${esc(h.name)}">ชั้น 2: ${esc(h.name)}</option>`).join('')}
            </select>
          ` : ''}
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

    ${(isBlind1 || isBlind2 || (Array.isArray(w.blindPieces) && w.blindPieces.length > 0)) ? buildBlindPiecesEditorHTML(w, i) : ''}

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

    <div style="margin-top:6px;padding:7px 9px;background:#f6f3ff;border:1px dashed #b39ddb;border-radius:6px" hidden>
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
      ${isCurvedShape ? `
        <div style="margin-bottom:6px;padding:6px 8px;background:#fff8eb;border:1px dashed #f59f00;border-radius:6px">
          <b style="color:#b45309;font-size:12px">📐 บานดัดโค้ง: ระบุความกว้างแต่ละด้าน (ระบบนำมารวมเป็นความกว้างเฟรมอัตโนมัติ)</b>
          <div class="grid3" style="margin-top:4px">
            ${wings.left ? `<label>ด้านโค้งซ้าย (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('sideWidthLeft')} placeholder="เช่น 100"></label>` : `<div></div>`}
            <label>ด้านตรง (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('sideWidthCenter')} placeholder="เช่น 200"></label>
            ${wings.right ? `<label>ด้านโค้งขวา (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('sideWidthRight')} placeholder="เช่น 100"></label>` : `<div></div>`}
          </div>
        </div>
      ` : ''}
      <div class="dim-grid">
        ${dimFieldRow(b, 'ความกว้าง (เฟรม)', 'width', 'noteWidth', i, true)}
        ${dimFieldRow(b, 'ความสูง (เฟรม)', 'height', 'noteHeight', i, true)}
        ${dimFieldRow(b, 'พื้นที่ด้านซ้าย', 'wallL', 'noteWallL', i)}
        ${dimFieldRow(b, 'พื้นที่ด้านขวา', 'wallR', 'noteWallR', i)}
        ${dimFieldRow(b, 'พื้นที่ด้านบน', 'ceilT', 'noteCeilT', i)}
        ${dimFieldRow(b, 'พื้นที่ด้านล่าง', 'floorB', 'noteFloorB', i)}
        ${dimFieldRow(b, 'เผื่อด้านซ้าย (+/-)', 'extL', 'noteExtL', i, true)}
        ${dimFieldRow(b, 'เผื่อด้านขวา (+/-)', 'extR', 'noteExtR', i, true)}
        ${dimFieldRow(b, 'เผื่อด้านบน (+/-)', 'extT', 'noteExtT', i, true)}
        ${dimFieldRow(b, 'เผื่อด้านล่าง (+/-)', 'extB', 'noteExtB', i, true)}
        ${dimFieldRow(b, 'ความกว้างเต็ม', 'fullW', 'noteFullW', i)}
        ${dimFieldRow(b, 'ความสูงเต็ม (ซ้าย-ขวา)', 'fullH', 'noteFullH', i)}
      </div>
      <div style="margin-top:4px;padding:5px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px">
        <div class="grid3">
          <label style="font-size:11.5px">ความสูงเต็ม ซ้าย (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('fullHLeft')} placeholder="เช่น 299.5"></label>
          <label style="font-size:11.5px">ความสูงเต็ม กลาง (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('fullHMid')} placeholder="เว้นว่างได้"></label>
          <label style="font-size:11.5px">ความสูงเต็ม ขวา (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('fullHRight')} placeholder="เช่น 299"></label>
        </div>
      </div>
      <div class="rail-summary" data-rail-sum="${i}" style="flex-wrap:wrap;gap:8px">
        <span class="inline" style="font-size:12px">
          ${lockBtn('railW', 'ขนาดความกว้างรางม่าน')}
          กว้างราง (ซม.): <input type="number" step="0.5" data-halfcm="1" ${b('customRailW')} placeholder="${esc(railW || 'อัตโนมัติ')}" style="width:82px;font-weight:700" title="ระบุขนาดความกว้างรางม่านเอง ระบบจะคำนวณผ้าม่านตามขนาดรางนี้และใส่ * กำกับ">
          <small style="color:#475569">(คำนวณ = <b>${railW || '-'}</b>${isFieldManual(w, 'railW') && w.customRailW ? '*' : ''})</small>
        </span>
        <span class="inline" style="font-size:12px">
          ${lockBtn('railH', 'ขนาดความสูงรางม่าน')}
          สูงราง (ซม.): <input type="number" step="0.5" data-halfcm="1" ${b('customRailH')} placeholder="${esc(railH || 'อัตโนมัติ')}" style="width:82px;font-weight:700" title="ระบุขนาดความสูงรางม่านเอง ระบบจะคำนวณผ้าม่านตามขนาดรางนี้และใส่ * กำกับ">
          <small style="color:#475569">(คำนวณ = <b>${railH || '-'}</b>${isFieldManual(w, 'railH') && w.customRailH ? '*' : ''})</small>
        </span>
        <button type="button" data-act="fillSize" data-i="${i}">↘ ส่งค่าราง/ม่านลงตารางคำนวณ</button>
      </div>
      <div style="margin-top:6px;padding:7px 9px;background:#fdf4ff;border:1px dashed #d8b4fe;border-radius:6px">
        <label class="inline" style="font-weight:700;color:#6b21a8;cursor:pointer">
          <input type="checkbox" ${b('unequalLayerRail')}>
          🔀 ใช้ฟังก์ชันขนาดรางม่านทึบ / รางม่านโปร่ง ไม่เท่ากัน (แสดงเป็น ทึบ/โปร่ง เช่น 400/380 พร้อมกำกับในแปลน)
        </label>
        ${w.unequalLayerRail ? `
          <div class="grid2" style="margin-top:6px">
            <label>ความกว้างรางม่านทึบ (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('railW1')} placeholder="เช่น 400"></label>
            <label>ความกว้างรางม่านโปร่ง (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('railW2')} placeholder="เช่น 380"></label>
            <label>ความสูงรางม่านทึบ (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('railH1')} placeholder="เช่น 250"></label>
            <label>ความสูงรางม่านโปร่ง (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('railH2')} placeholder="เช่น 245"></label>
          </div>
        ` : ''}
      </div>
      <div style="margin-top:6px;padding:7px 9px;background:#f7faff;border:1px dashed #90caf9;border-radius:6px">
        <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:6px">
          <label class="inline" style="font-weight:700;color:#0d47a1;cursor:pointer">
            <input type="checkbox" ${b('unequalSplit')}>
            ✂️ แบ่งผ้าม่านผืนซ้าย / ผืนขวา ไม่เท่ากันบนรางเดียว (แบ่งจากขนาดรางม่าน → คำนวณขนาดผ้าม่าน จำนวนหน้า และปริมาณผ้าของแต่ละผืน)
          </label>
          ${w.unequalSplit ? `<span style="font-size:11.5px;color:#1565c0;font-weight:700">ช่วงแบ่งราง: <b>${esc(w.splitLeft || '?')}/${esc(w.splitRight || '?')}</b> | กว้างผ้าม่าน: <b>${esc(w.blackout?.a || '-')}</b></span>` : ''}
        </div>
        ${w.unequalSplit ? `
          <div class="grid3" style="margin-top:6px">
            <label>เลือกรางที่จะแบ่งผืนซ้าย/ขวา
              <select ${b('unequalSplitTarget')}>
                <option value="both">แบ่งทั้งคู่ (ม่านทึบ + ม่านโปร่ง)</option>
                <option value="opaque">เฉพาะรางม่านทึบ (ชั้นที่ 1)</option>
                <option value="sheer">เฉพาะรางม่านโปร่ง (ชั้นที่ 2)</option>
              </select>
            </label>
            <label>ระยะแบ่งรางผืนซ้าย (ซม.)
              <input type="number" step="0.5" data-halfcm="1" ${b('splitLeft')} placeholder="เช่น 150">
            </label>
            <label>ระยะแบ่งรางผืนขวา (ซม.)
              <input type="number" step="0.5" data-halfcm="1" ${b('splitRight')} placeholder="เช่น 250">
            </label>
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
          <div class="grid2">
            <label>เลือกผ้าชั้นที่ 1 (ใช้เกรนตามที่กำหนดในตารางผ้าอัตโนมัติ)
              <select ${b('fabricCol1')}>${sheetFabOpts}</select>
            </label>
            <label>สูตรคำนวณปริมาณผ้า (ชั้นที่ 1 • ${effGrain1 === 'sheer' ? 'เกรนโปร่ง' : 'เกรนทึบ'})
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
        <div class="grid2">
          <label>เลือกผ้าชั้นที่ 2 (ใช้เกรนตามที่กำหนดในตารางผ้าอัตโนมัติ)
            <select ${b('fabricCol2')}>${sheetFabOpts}</select>
          </label>
          <label>สูตรคำนวณปริมาณผ้า (ชั้นที่ 2 • ${effGrain2 === 'sheer' ? 'เกรนโปร่ง' : 'เกรนทึบ'})
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

      ${buildWindowLiningEditorHTML(w, i, sh, { showLayer2: !!(w.curtainStyle2 || +w.railTracks >= 2), isBlind1, isBlind2: isBlindOrRollerStyle(w.curtainStyle2), fromPopover: false, sectionKey: 'ed' })}

      <table class="calc-ed">
        <tr><th></th><th>ขนาดกว้าง</th><th></th><th>ขนาดสูง</th><th></th><th>จำนวน</th><th></th><th>รวม (${unit1})</th></tr>
        ${(isBlind1 && !w.curtainStyle2) ? `
          ${calc('blackout', 'bo', style1 || 'ม่านม้วน/มู่ลี่', 'ผืน', 'ตร.ม.')}
        ` : `
          ${calc('rail', 'rail', 'รางม่าน', 'ชั้น', 'เมตร')}
          ${calc('blackout', 'bo', isBlind1 ? style1 : 'ผ้าม่านทึบ', 'ผืน', unit1)}
          ${calc('sheer', 'sh', 'ผ้าม่านโปร่ง', 'ผืน', unit2)}
        `}
      </table>
      <div style="margin-top:6px;padding:7px 9px;background:#eef6ff;border:1px dashed #60a5fa;border-radius:6px">
        <div class="grid2">
          <label>ระยะลอย / กองพื้น (ฐานข้อมูลกำหนดมาตรฐานลอยจากพื้น 1 ซม.)
            <select ${b('floorMode')}>${FLOOR_CLEARANCE_MODES.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select>
          </label>
          ${(w.floorMode === 'float' || w.floorMode === 'puddle') ? `
            <label>${w.floorMode === 'float' ? 'ระบุระยะลอยจากพื้นที่ต้องการ (ซม. เช่น 2 → ลดจากสูตรลอย 1 ซม. เป็น -2.5)' : 'ระบุระยะกองพื้นที่ต้องการ (ซม.)'}
              <input type="text" inputmode="decimal" ${b('floorAdjust')} placeholder="${w.floorMode === 'float' ? 'เช่น 2 (ต้องการให้ลอย 2 ซม.)' : 'เช่น 3 (ต้องการให้กองพื้น 3 ซม.)'}">
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
  commitOrderHistorySnapshot();
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
          'lining1T': 'boLinT', 'lining2T': 'shLinT',
        };
        if (manualCellMap[field]) {
          const mk = manualCellMap[field];
          w.manualFields[mk] = true;
          // Req #18: หากกรอกขนาดความกว้างรางม่าน (rail.a) หรือ ความสูงรางม่าน (rail.b) เอง ให้ระบบคำนวณขนาดผ้าม่าน จำนวนหน้า และปริมาณผ้าตามขนาดรางที่ระบุเองนั้นทันที พร้อมแสดง * กำกับ
          if (field === 'rail.a') {
            const rawA = String(w.rail.a || '').replace(/\*/g, '').trim();
            if (rawA.includes('/')) {
              const [p1, p2] = rawA.split('/');
              w.unequalLayerRail = true;
              w.railW1 = p1.trim();
              w.railW2 = (p2 || p1).trim();
            } else {
              w.customRailW = rawA;
              w.manualFields.railW = !!rawA;
            }
            if (w.calcMode !== 'manual') {
              delete w.manualFields.railA;
              autoCalculateWindow(w, sh);
            }
          } else if (field === 'rail.b') {
            const rawB = String(w.rail.b || '').replace(/\*/g, '').trim();
            if (rawB.includes('/')) {
              const [p1, p2] = rawB.split('/');
              w.unequalLayerRail = true;
              w.railH1 = p1.trim();
              w.railH2 = (p2 || p1).trim();
            } else {
              w.customRailH = rawB;
              w.manualFields.railH = !!rawB;
            }
            if (w.calcMode !== 'manual') {
              delete w.manualFields.railB;
              autoCalculateWindow(w, sh);
            }
          }
          autoUpdateSheetFabricTableQty(sh);
          const winCard = document.querySelector(`.win-ed[data-win-idx="${idx}"]`);
          if (winCard) {
            syncSheetInputs(winCard);
            const btn = winCard.querySelector(`[data-act="toggleFieldManual"][data-mkey="${mk}"]`);
            if (btn) {
              btn.textContent = '✍️';
              btn.classList.remove('is-auto');
              btn.classList.add('is-manual');
            }
          }
          const popEl = document.getElementById('pdfQuickPopover');
          if (popEl && !popEl.hidden) syncSheetInputs(popEl);
        } else if (field === 'planNo' || field === 'label') {
          dedupeSheetWindowPositions(sh);
          const actEl = document.activeElement;
          const typingInWinEd = actEl && actEl.closest('#windowsEditor') && (actEl.tagName === 'INPUT' || actEl.tagName === 'TEXTAREA') && actEl.type !== 'checkbox' && actEl.type !== 'radio';
          if (!typingInWinEd) renderWindowsEditor();
          syncSheetInputs();
        } else if (/^(curtainStyle1|curtainStyle2|pieces1|pieces2|railTracks|rodType|rodType2|hookSize|hookSize2|noRail|noRailStatus|noRailDeductPreset|railCountUnit|railUnit|floorMode|backLayerHeightDeduct|backLayerTarget|fabricCol1|fabricCol2|lining1|lining2|liningRuleId1|liningRuleId2|liningYardMode1|liningYardMode2|specialType|gable\.type|gable\.hemClearanceType|sideJoin\.type|yardMode1|yardMode2|box|mount|wallCeilingAttach|paneStyle|cornerShape|calcMode|fabricId1|grainType1|fabricRuleId1|blindId1|fabricId2|grainType2|fabricRuleId2|widthFormulaId1|heightFormulaId1|widthFormulaId2|heightFormulaId2|railModel|railModel2|unequalSplit|unequalSplitTarget|unequalLayerRail)$/.test(field)) {
          // เลือกรูปแบบม่านแล้วปรับประเภทราง/จำนวนผืน/คอลัมน์สินค้าให้อัตโนมัติ และล้างสูตรความสูงที่เลือกค้างไว้เพื่อให้จับคู่สูตรใหม่อัตโนมัติ
          if (field === 'curtainStyle1' && w.curtainStyle1) {
            const natRod = (typeof inferNaturalRodTypeForStyle === 'function') ? inferNaturalRodTypeForStyle(w.curtainStyle1) : '';
            if (natRod && !(w.rodType === 'รางโชว์' && /ม่านจีบ|ม่านตาไก่|หูกระเช้า/.test(w.curtainStyle1))) {
              w.rodType = natRod;
            }
            if (!w.pieces1 && !isBlindOrRollerStyle(w.curtainStyle1)) w.pieces1 = '2';
            if (/ม่านม้วน/.test(w.curtainStyle1)) w.fabricCol1 = 'roller';
            else if (/มู่ลี่|ม่านปรับแสง/.test(w.curtainStyle1)) w.fabricCol1 = 'blinds';
            else if (w.fabricCol1 === 'roller' || w.fabricCol1 === 'blinds') w.fabricCol1 = 'blackout';
            w.heightFormulaId1 = '';
          }
          if (field === 'curtainStyle2') {
            const natRod2 = (typeof inferNaturalRodTypeForStyle === 'function') ? inferNaturalRodTypeForStyle(w.curtainStyle2) : '';
            w.rodType2 = natRod2 || '';
            if (/ม่านม้วน/.test(w.curtainStyle2 || '')) w.fabricCol2 = 'roller';
            else if (/มู่ลี่|ม่านปรับแสง/.test(w.curtainStyle2 || '')) w.fabricCol2 = 'blinds';
            else if (w.fabricCol2 === 'roller' || w.fabricCol2 === 'blinds') w.fabricCol2 = 'sheer';
            w.heightFormulaId2 = '';
          }
          if (field === 'railModel' && w.railModel && typeof resolveRailMetaByName === 'function') {
            const rm = resolveRailMetaByName(w.railModel);
            if (rm.rodCategory) w.rodType = rm.rodCategory;
          }
          if (field === 'railModel2' && w.railModel2 && typeof resolveRailMetaByName === 'function') {
            const rm2 = resolveRailMetaByName(w.railModel2);
            if (rm2.rodCategory) w.rodType2 = rm2.rodCategory;
          }
          if (field === 'railModel' || field === 'railModel2') {
            const catMap = { 'รางม่านจีบ': 'pleat', 'รางโชว์': 'show', 'รางม่านลอน': 'wave', 'รางม่านพับ': 'fold' };
            const touchCats = new Set();
            const rt1 = w.rodType || (typeof inferNaturalRodTypeForStyle === 'function' ? inferNaturalRodTypeForStyle(w.curtainStyle1) : '');
            const rt2 = w.rodType2 || (typeof inferNaturalRodTypeForStyle === 'function' ? inferNaturalRodTypeForStyle(w.curtainStyle2 || w.curtainStyle1) : '');
            if (catMap[rt1]) touchCats.add(catMap[rt1]);
            if (catMap[rt2]) touchCats.add(catMap[rt2]);
            syncSheetRodsFromWindows(sh, touchCats);
          }
          if (field === 'pieces1' && isBlindOrRollerStyle(w.curtainStyle1) && +w.pieces1 >= 2) {
            const cnt = Math.min(12, Math.max(1, +w.pieces1));
            if (!Array.isArray(w.blindPieces) || w.blindPieces.length !== cnt) {
              const totalW = parseFloat(String(calcRailWidth(w) || w.width || 0).replace(/\*/g, '')) || 0;
              const defH = String(calcRailHeight(w) || w.height || '').replace(/\*/g, '');
              const eachW = totalW > 0 ? Math.round((totalW / cnt) * 10) / 10 : '';
              w.blindPieces = Array.from({ length: cnt }, (_, k) => {
                if (totalW > 0 && k === cnt - 1) {
                  const used = Math.round(eachW * (cnt - 1) * 10) / 10;
                  return { w: String(Math.round((totalW - used) * 10) / 10), h: defH };
                }
                return { w: eachW ? String(eachW) : '', h: defH };
              });
            }
          }
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
          const rwNum = parseFloat(String(calcRailWidth(w) || w.width || w.rail?.a || 0).replace(/\*/g, '')) || 0;
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
        } else if (/^blindPieces\.(\d+)\.(w|h)$/.test(field)) {
          const mBp = /^blindPieces\.(\d+)\.(w|h)$/.exec(field);
          if (mBp && mBp[2] === 'h' && w.blindSameHeight !== false && Array.isArray(w.blindPieces)) {
            const newH = w.blindPieces[+mBp[1]] ? w.blindPieces[+mBp[1]].h : '';
            w.blindPieces.forEach((p, k) => {
              if (k !== +mBp[1] && p) p.h = newH;
            });
            syncSheetInputs();
          }
          autoCalculateWindow(w, sh);
          autoUpdateSheetFabricTableQty(sh);
          const info = (typeof calcBlindPiecesTotalSqm === 'function') ? calcBlindPiecesTotalSqm(w) : { pieceSqms: [] };
          document.querySelectorAll(`[data-bp-summary="${idx}"]`).forEach(el => {
            el.textContent = buildBlindPiecesSummaryText(w);
          });
          (info.pieceSqms || []).forEach((sqm, pi) => {
            document.querySelectorAll(`[data-bp-sqm="${idx}_${pi}"]`).forEach(el => {
              el.textContent = sqm ? `= ${sqm} ตร.ม.` : '';
            });
          });
        } else if (/^(width|height|extL|extR|extT|extB|sideWidthCenter|sideWidthLeft|sideWidthRight|fullHLeft|fullHMid|fullHRight|fullH|fullW|customRailW|customRailH|railW1|railW2|railH1|railH2|railMinLength|floorAdjust|noRailDeductCustom|extraYards1|extraYards2|gable\..+|sideJoin\..+)$/.test(field)) {
          if (field === 'gable.title' && w.gable) {
            w.gable.titleManual = !!String(w.gable.title || '').trim();
          }
          if (field === 'customRailW') {
            w.manualFields.railW = !!String(w.customRailW || '').trim();
            delete w.manualFields.railA;
          }
          if (field === 'customRailH') {
            w.manualFields.railH = !!String(w.customRailH || '').trim();
            delete w.manualFields.railB;
          }
          if (/^sideWidth(Center|Left|Right)$/.test(field) && typeof calcCurvedSidesWidthSum === 'function') {
            const cSum = calcCurvedSidesWidthSum(w);
            if (cSum > 0) w.width = String(cSum);
          }
          if (/^fullH(Left|Mid|Right)$/.test(field) && typeof formatFullHeightLeftToRight === 'function') {
            w.fullH = formatFullHeightLeftToRight(w);
          }
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
            if (bs[0]) bs[0].textContent = rw || '-';
            if (bs[1]) bs[1].textContent = rh || '-';
          }
          const popRailSum = document.getElementById('popRailSumText');
          if (popRailSum) {
            popRailSum.innerHTML = `กว้างราง = <b>${esc(rw || '-')}${isFieldManual(w, 'railW') && w.customRailW ? '*' : ''}</b> ซม. • สูงราง (สูงเฟรม+เผื่อบน+เผื่อล่าง) = <b>${esc(rh || '-')}${isFieldManual(w, 'railH') && w.customRailH ? '*' : ''}</b> ซม.`;
          }
          const popFloorSum = document.getElementById('popFloorStatusSummary');
          if (popFloorSum) {
            popFloorSum.textContent = formatFloorStatusSummary(w);
          }
        }
        const t = document.querySelector(`[data-thumb="${idx}"]`);
        if (t) t.innerHTML = windowSVG(w);
      }
    } else if (/^fabrics\.(blackout|sheer|roller|blinds|other)\.name$/.test(sheetPath)) {
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
      const actEl = document.activeElement;
      const isTypingText = !!(actEl && (actEl.tagName === 'INPUT' || actEl.tagName === 'TEXTAREA') && actEl.type !== 'checkbox' && actEl.type !== 'radio');
      if (!(isTypingText && actEl.closest('#windowsEditor'))) renderWindowsEditor();
      syncSheetInputs();
      // ห้ามรีเฟรช HTML ของ Popover ขณะผู้ใช้กำลังพิมพ์อยู่ในช่องกรอก (ป้องกันพิมพ์ได้ทีละตัวแล้วหลุดโฟกัส)
      const typingInPop = isTypingText && actEl.closest('#pdfQuickPopover');
      if (!typingInPop && typeof refreshActivePopover === 'function') refreshActivePopover();
    } else if (/^fabrics\.(blackout|sheer|roller|blinds|other)\.(design|color|label)$/.test(sheetPath)) {
      // ช่องสี/ดีไซน์/ประเภทผ้าในตารางผ้า อัปเดตเฉพาะช่องที่ไม่ได้กำลังพิมพ์อยู่และพรีวิวแปลน โดยไม่รีเฟรช Popover หรือ Window Editor
      syncSheetInputs();
    } else if (/^rods\.(pleat|show|wave|fold)\.model$/.test(sheetPath)) {
      // Req #11: เมื่อเปลี่ยนรุ่นรางม่าน ให้คำนวณลดขนาดความสูงผ้าม่านใหม่ตามกลุ่มราง/รายการรางม่านของบานต่างๆ อัตโนมัติ
      (sh.windows || []).forEach(w => {
        if (w && w.calcMode !== 'manual') autoCalculateWindow(w, sh);
      });
      autoUpdateSheetFabricTableQty(sh);
      syncSheetInputs();
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
  renderTimer = setTimeout(() => { renderPreview(); scheduleBackgroundAutoSave(2500); }, 100);
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
  if (!el || !el.dataset) return;

  // ป้องกัน <select>, checkbox, radio ทำงานซ้ำ 2 รอบจากทั้ง input และ change (Req #3: ไม่ให้กระตุก/เลื่อนไปมาตอนเลือก Dropdown)
  if ((el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio') && e.type === 'input') {
    return;
  }

  // Req #13: ช่องความกว้าง/ความสูง/พื้นที่/เผื่อ สามารถใส่ทศนิยมได้แต่ต้องเป็น .5 เท่านั้น ไม่อย่างนั้นต้องเป็นจำนวนเต็ม (เช่น 150 หรือ 150.5)
  if (e.type === 'change' && typeof snapHalfCm === 'function') {
    const isHalfCmField = el.dataset.halfcm === '1'
      || (el.dataset.sheet && /^windows\.\d+\.(width|height|wallL|wallR|ceilT|floorB|fullW|fullHLeft|fullHMid|fullHRight|extL|extR|extT|extB|sideWidthCenter|sideWidthLeft|sideWidthRight|customRailW|customRailH|railW1|railW2|railH1|railH2|splitLeft|splitRight|splitLeft2|splitRight2|blindPieces\.\d+\.(w|h))$/.test(el.dataset.sheet));
    if (isHalfCmField && el.value !== '') {
      const snapped = snapHalfCm(el.value);
      if (snapped !== el.value) {
        el.value = snapped;
      }
    }
  }

  // Req #2: เลือกเกรนผ้าในตารางสินค้า (1 รายการผ้า = 1 เกรน: ทึบ หรือ โปร่ง) แล้วให้ใช้เกรนนั้นคำนวณอัตโนมัติ
  if (el.dataset.fabGrain) {
    if (el.type === 'radio' && !el.checked) return;
    const sh = currentSheet(); if (!sh || !sh.fabrics) return;
    const colKey = el.dataset.fabGrain;
    const cell = sh.fabrics[colKey];
    if (cell) {
      let g = el.value === 'sheer' ? 'sheer' : 'opaque';
      const fName = String(cell.name || '').trim();
      if (g === 'sheer' && fName && typeof masterDB !== 'undefined' && Array.isArray(masterDB.fabrics)) {
        const matchedFab = masterDB.fabrics.find(x => String(x.name || '').trim() === fName);
        if (matchedFab && typeof canFabricUseSheerGrain === 'function' && !canFabricUseSheerGrain(matchedFab.fabricWidth)) {
          alert(`ผ้า "${fName}" มีหน้าผ้า ${matchedFab.fabricWidth} ซม. (≤ 270 ซม.) จึงใช้ได้เฉพาะเกรนม่านทึบเท่านั้น`);
          g = 'opaque';
        }
      }
      cell.grain = g;
      cell.isOpaque = (g === 'opaque');
      cell.isSheer = (g === 'sheer');
      (sh.windows || []).forEach(w => {
        if (w && w.calcMode !== 'manual') autoCalculateWindow(w, sh);
      });
      autoUpdateSheetFabricTableQty(sh);
      renderWindowsEditor();
      syncSheetInputs();
      if (el.closest('#pdfQuickPopover') && typeof refreshActivePopover === 'function') refreshActivePopover();
      changed(`fabrics.${colKey}.grain`, null, !!el.closest('#pdfQuickPopover'));
    }
    return;
  }

  // เลือกดึงจุดจากแปลนห้อง (Req #9 & #10)
  if (el.dataset.planPick !== undefined && el.value !== '') {
    const sh = currentSheet(); if (!sh) return;
    const winIdx = +el.dataset.planPick;
    const opIdx = +el.value;
    assignPlanOpeningToWindow(sh, winIdx, opIdx);
    renderWindowsEditor();
    syncSheetInputs();
    if (el.closest('#pdfQuickPopover') && typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
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

// คลิกซ้ำที่ radio เพื่อยกเลิกการเลือกได้ (รวมถึงเกรนม่าน data-fab-grain)
document.addEventListener('click', e => {
  const el = e.target;
  if (el.type === 'radio' && el.dataset.fabGrain) {
    if (el.dataset.was === '1') {
      const sh = currentSheet();
      const colKey = el.dataset.fabGrain;
      const cell = sh && sh.fabrics && sh.fabrics[colKey];
      if (cell) {
        el.checked = false;
        cell.grain = '';
        cell.isOpaque = false;
        cell.isSheer = false;
        (sh.windows || []).forEach(w => { if (w && w.calcMode !== 'manual') autoCalculateWindow(w, sh); });
        autoUpdateSheetFabricTableQty(sh);
        syncSheetInputs();
        changed(`fabrics.${colKey}.grain`, null, !!el.closest('#pdfQuickPopover'));
      }
    }
    document.querySelectorAll(`input[type=radio][name="${el.name}"]`).forEach(r => { r.dataset.was = r.checked ? '1' : ''; });
    return;
  }
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
    const brs = (typeof getStaffBranchList === 'function') ? getStaffBranchList(st) : [];
    ord.staff.branch = brs[0] || st.branch || '';
    syncSharedInputs();
    changed(null, 'staff.name');
  }
});

/* ---------------- Actions ---------------- */
const actions = {
  addWin() {
    const sh = currentSheet(); if (!sh) return;
    const nw = newWindow(sh.windows.length + 1);
    nw.label = 'W' + (sh.windows.length + 1);
    sh.windows.push(nw);
    dedupeSheetWindowPositions(sh);
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
    dedupeSheetWindowPositions(sh);
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
    copy.label = 'W' + (sh.windows.length + 1);
    sh.windows.splice(i + 1, 0, copy);
    dedupeSheetWindowPositions(sh);
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
  applyBlindQuickWidths(i) {
    const sh = currentSheet(); if (!sh || !sh.windows[i]) return;
    const w = sh.windows[i];
    const pop = document.getElementById('pdfQuickPopover');
    const qIn = (pop && !pop.hidden && pop.querySelector(`[data-bp-quick="${i}"]`))
      || document.querySelector(`[data-bp-quick="${i}"]`);
    if (!qIn) return;
    const nums = String(qIn.value || '')
      .split(/[,;+\s/|]+/)
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n) && n > 0);
    if (!nums.length) return;
    const defH = (Array.isArray(w.blindPieces) && w.blindPieces[0] && w.blindPieces[0].h)
      || String(calcRailHeight(w) || w.height || '').replace(/\*/g, '');
    w.blindPieces = nums.map(nw => ({ w: String(nw), h: defH }));
    w.pieces1 = String(nums.length);
    autoCalculateWindow(w, sh);
    autoUpdateSheetFabricTableQty(sh);
    renderWindowsEditor();
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  setBlindPieceCount(i, count) {
    const sh = currentSheet(); if (!sh || !sh.windows[i]) return;
    const w = sh.windows[i];
    const cnt = Math.max(1, Math.min(12, +count || 1));
    const totalW = parseFloat(String(calcRailWidth(w) || w.width || 0).replace(/\*/g, '')) || 0;
    const defH = String(calcRailHeight(w) || w.height || '').replace(/\*/g, '');
    const prev = Array.isArray(w.blindPieces) ? w.blindPieces : [];
    const eachW = totalW > 0 ? Math.round((totalW / cnt) * 10) / 10 : '';
    w.blindPieces = Array.from({ length: cnt }, (_, k) => {
      if (prev[k] && (prev[k].w || prev[k].h) && prev.length === cnt) return prev[k];
      if (totalW > 0 && k === cnt - 1) {
        const used = Math.round(eachW * (cnt - 1) * 10) / 10;
        return { w: String(Math.round((totalW - used) * 10) / 10), h: defH };
      }
      return { w: eachW ? String(eachW) : '', h: defH };
    });
    w.pieces1 = String(cnt);
    autoCalculateWindow(w, sh);
    autoUpdateSheetFabricTableQty(sh);
    renderWindowsEditor();
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  balanceBlindPieces(i) {
    const sh = currentSheet(); if (!sh || !sh.windows[i]) return;
    const w = sh.windows[i];
    if (!Array.isArray(w.blindPieces) || w.blindPieces.length < 2) return;
    const totalW = parseFloat(String(calcRailWidth(w) || w.width || 0).replace(/\*/g, '')) || 0;
    if (totalW <= 0) return;
    let sumBefore = 0;
    for (let k = 0; k < w.blindPieces.length - 1; k++) {
      sumBefore += parseFloat(w.blindPieces[k] && w.blindPieces[k].w) || 0;
    }
    const rem = Math.max(0, Math.round((totalW - sumBefore) * 10) / 10);
    const last = w.blindPieces[w.blindPieces.length - 1];
    last.w = rem > 0 ? String(rem) : '';
    if (!last.h) last.h = String(calcRailHeight(w) || w.height || '').replace(/\*/g, '');
    autoCalculateWindow(w, sh);
    autoUpdateSheetFabricTableQty(sh);
    renderWindowsEditor();
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  addBlindPiece(i) {
    const sh = currentSheet(); if (!sh || !sh.windows[i]) return;
    const w = sh.windows[i];
    if (!Array.isArray(w.blindPieces)) w.blindPieces = [];
    const totalW = parseFloat(String(calcRailWidth(w) || w.width || 0).replace(/\*/g, '')) || 0;
    const usedW = w.blindPieces.reduce((s, p) => s + (parseFloat(p && p.w) || 0), 0);
    const remW = totalW > usedW ? Math.round((totalW - usedW) * 10) / 10 : totalW;
    const defW = remW > 0 ? String(remW) : (w.width || '');
    const defH = String(calcRailHeight(w) || w.height || '').replace(/\*/g, '');
    w.blindPieces.push({ w: defW, h: defH });
    w.pieces1 = String(w.blindPieces.length);
    autoCalculateWindow(w, sh);
    autoUpdateSheetFabricTableQty(sh);
    renderWindowsEditor();
    if (typeof refreshActivePopover === 'function') refreshActivePopover();
    changed();
  },
  delBlindPiece(i, pi) {
    const sh = currentSheet(); if (!sh || !sh.windows[i]) return;
    const w = sh.windows[i];
    if (!Array.isArray(w.blindPieces)) return;
    w.blindPieces.splice(pi, 1);
    if (w.blindPieces.length) w.pieces1 = String(w.blindPieces.length);
    autoCalculateWindow(w, sh);
    autoUpdateSheetFabricTableQty(sh);
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
  openDbAccessories() { if (isAdminUser()) MasterDBModal.open('accessories'); },
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
      ? '📋 แผงซ้าย'
      : '🖥️ ซ่อนแผงซ้าย';
  }
  setTimeout(() => { fitZoomWidth(); }, 60);
}

/* =========================================================
   Unified Searchable Combobox (Dropdown + Search + Custom Input + Sort ตามลำดับ / A-Z)
   Req #7 & Req #9
   ========================================================= */
const DROPDOWN_SORT_KEY = 'mto-dropdown-sort-mode-v1';
function getDropdownSortMode() {
  try {
    return localStorage.getItem(DROPDOWN_SORT_KEY) === 'az' ? 'az' : 'order';
  } catch (e) { return 'order'; }
}
function setDropdownSortMode(mode) {
  const m = mode === 'az' ? 'az' : 'order';
  try { localStorage.setItem(DROPDOWN_SORT_KEY, m); } catch (e) {}
  return m;
}
function sortListByDropdownMode(arr, labelFn) {
  const list = Array.isArray(arr) ? arr.slice() : [];
  if (getDropdownSortMode() !== 'az') return list;
  return list.sort((a, b) => {
    const la = String(labelFn ? labelFn(a) : (a && (a.label || a.name)) || a || '').trim();
    const lb = String(labelFn ? labelFn(b) : (b && (b.label || b.name)) || b || '').trim();
    return la.localeCompare(lb, 'th', { numeric: true, sensitivity: 'base' });
  });
}

function comboInputHTML({ kind, col = '', sheetPath = '', sharedPath = '', placeholder = '', autofocus = false, value = undefined }) {
  return `<div class="mto-combo" data-combo-kind="${esc(kind)}" ${col ? `data-combo-col="${esc(col)}"` : ''}>
    <input ${sheetPath ? `data-sheet="${esc(sheetPath)}"` : ''} ${sharedPath ? `data-shared="${esc(sharedPath)}"` : ''} ${value !== undefined ? `value="${esc(value)}"` : ''} ${autofocus ? 'data-pop-autofocus="1"' : ''} placeholder="${esc(placeholder || 'เลือกจากรายการ หรือพิมพ์ค้นหา/ระบุเอง...')}" autocomplete="off">
    <button type="button" class="mto-combo-toggle" tabindex="-1" title="เปิดรายการเลือก">▾</button>
  </div>`;
}

const MtoCombo = (() => {
  let menuEl = null;
  let activeWrap = null;
  let activeInput = null;
  let lastItems = [];

  function ensureMenu() {
    if (menuEl) return menuEl;
    menuEl = document.createElement('div');
    menuEl.id = 'mtoComboMenu';
    menuEl.className = 'mto-combo-menu no-print';
    menuEl.hidden = true;
    document.body.appendChild(menuEl);
    menuEl.addEventListener('mousedown', e => {
      e.preventDefault(); // ป้องกัน input หลุดโฟกัสขณะคลิกปุ่มเรียงลำดับหรือเลือกรายการ
    });
    menuEl.addEventListener('click', e => {
      e.stopPropagation();
      const sortBtn = e.target.closest('[data-combo-sort]');
      if (sortBtn) {
        setDropdownSortMode(sortBtn.dataset.comboSort);
        renderMenu(activeInput ? activeInput.value : '');
        return;
      }
      const itemEl = e.target.closest('[data-combo-idx]');
      if (itemEl) {
        const item = lastItems[+itemEl.dataset.comboIdx];
        if (item) selectItem(item);
      }
    });
    return menuEl;
  }

  function buildOptions(kind, col) {
    const sh = currentSheet();
    const ord = currentOrder();
    if (kind === 'fabric') {
      return (masterDB.fabrics || []).map((x, idx) => ({
        value: x.name || '',
        label: x.name || '',
        sub: `${x.design || '-'} • หน้าผ้า ${x.fabricWidth || 140} ซม.`,
        id: x.id || ('__idx_' + idx),
        raw: x,
      }));
    }
    if (kind === 'blindGroup') {
      const allBlinds = masterDB.blinds || [];
      const filtered = allBlinds.filter(b => {
        const st = String(b.curtainStyle || '');
        if (col === 'roller') return /ม่านม้วน/.test(st) || !st || st === '*';
        if (col === 'blinds') return /มู่ลี่|ม่านปรับแสง/.test(st) || !st || st === '*';
        return true;
      });
      const src = filtered.length ? filtered : allBlinds;
      const gMap = new Map();
      src.forEach(b => {
        const g = String(b.model || b.group || b.name || '').trim();
        if (!g) return;
        const codes = (typeof parseBlindCodesList === 'function') ? parseBlindCodesList(b.codes) : [];
        if (!gMap.has(g)) gMap.set(g, new Set(codes));
        else codes.forEach(c => gMap.get(g).add(c));
      });
      return Array.from(gMap.entries()).map(([g, codeSet]) => {
        const arr = Array.from(codeSet);
        const sub = arr.length ? `${arr.length} รหัส: ${arr.slice(0, 5).join(', ')}${arr.length > 5 ? '...' : ''}` : 'ระบุรหัสเองได้';
        return { value: g, label: g, sub };
      });
    }
    if (kind === 'blindCode') {
      const allBlinds = masterDB.blinds || [];
      const curModel = String((sh && sh.fabrics && sh.fabrics[col] && sh.fabrics[col].group) || '').trim();
      let list = allBlinds.filter(b => {
        const mName = String(b.model || b.group || b.name || '').trim();
        if (curModel) return mName === curModel;
        const st = String(b.curtainStyle || '');
        if (col === 'roller') return /ม่านม้วน/.test(st) || !st || st === '*';
        if (col === 'blinds') return /มู่ลี่|ม่านปรับแสง/.test(st) || !st || st === '*';
        return true;
      });
      if (!list.length) list = allBlinds;
      const out = [];
      const seen = new Set();
      list.forEach((x, idx) => {
        const mName = String(x.model || x.group || x.name || '').trim();
        const codes = (typeof parseBlindCodesList === 'function') ? parseBlindCodesList(x.codes) : [];
        if (codes.length) {
          codes.forEach(code => {
            const key = `${mName}::${code}`;
            if (seen.has(key)) return;
            seen.add(key);
            out.push({
              value: code,
              label: code,
              sub: `รุ่น: ${mName}${x.curtainStyle ? ' [' + x.curtainStyle + ']' : ''}`,
              id: x.id || ('__idx_' + idx),
              raw: Object.assign({}, x, { group: mName }),
            });
          });
        } else if (x.name) {
          out.push({
            value: x.name,
            label: x.name,
            sub: `รุ่น: ${mName}${x.curtainStyle ? ' [' + x.curtainStyle + ']' : ''}`,
            id: x.id || ('__idx_' + idx),
            raw: Object.assign({}, x, { group: mName }),
          });
        }
      });
      return out;
    }
    if (kind === 'blindCord') {
      const cell = (sh && sh.fabrics && sh.fabrics[col]) || {};
      const selType = cell.cordType === 'เชือกสลิง' ? 'เชือกสลิง' : 'เชือกเทป';
      const cordsAll = (masterDB.blindCords || []).filter(c => c && c.name && (c.cordType === selType));
      const items = cordsAll.map(c => ({
        value: c.name,
        label: c.name,
        sub: `${c.cordType}${c.code ? ' • รหัส ' + c.code : ''}`,
      }));
      if (items.length) return items;
      const defaults = selType === 'เชือกสลิง'
        ? ['สีขาว', 'สีครีม', 'สีเทา', 'สีน้ำตาล', 'สีดำ']
        : ['สีครีม', 'สีขาว', 'สีน้ำตาลอ่อน', 'สีน้ำตาลเข้ม', 'สีดำ'];
      return defaults.map(v => ({ value: v, label: v, sub: selType }));
    }
    if (kind === 'blindValance') {
      const vals = (masterDB.blindValances || []).filter(v => v && v.name);
      if (vals.length) {
        return vals.map(v => ({ value: v.name, label: v.name, sub: v.code ? `รหัส ${v.code}` : 'กล่องบังรางมู่ลี่' }));
      }
      return ['สีเดียวกับใบมู่ลี่', 'ขาว', 'ครีม', 'น้ำตาลเข้ม', 'เงิน', 'ดำ'].map(v => ({ value: v, label: v, sub: '' }));
    }
    if (kind === 'staffBranch') {
      const allBranches = (typeof getAllBranchesList === 'function') ? getAllBranchesList() : [];
      const allSet = new Set(allBranches);
      const staffName = ord && ord.staff ? ord.staff.name : '';
      const assigned = ((typeof getStaffBranchList === 'function') ? getStaffBranchList(staffName) : [])
        .filter(b => !allBranches.length || allSet.has(b));
      const curUser = getCurrentUser();
      const userBranches = ((curUser && typeof getStaffBranchList === 'function') ? getStaffBranchList(curUser) : [])
        .filter(b => !allBranches.length || allSet.has(b));
      const primary = assigned.length ? assigned : userBranches;
      const primarySet = new Set(primary);
      const out = [];
      primary.forEach(b => out.push({ value: b, label: b, sub: 'สาขาที่กำหนดให้พนักงาน' }));
      allBranches.forEach(b => {
        if (!primarySet.has(b)) out.push({ value: b, label: b, sub: 'สาขาในฐานข้อมูล' });
      });
      return out;
    }
    if (kind === 'rail') {
      const catMap = { pleat: 'รางม่านจีบ', show: 'รางโชว์', wave: 'รางม่านลอน', fold: 'รางม่านพับ' };
      const catName = catMap[col] || '';
      const list = (masterDB.rails || []).filter(r => !catName || !r.rodCategory || r.rodCategory === catName || r.rodCategory === '*');
      return list.map(r => ({
        value: r.name || '',
        label: r.name || '',
        sub: `${r.railGroup ? 'กลุ่ม: ' + r.railGroup + ' • ' : ''}สี: ${r.defaultColor || '-'}`,
        id: r.id,
        raw: r,
      }));
    }
    if (kind === 'staff') {
      const curUser = getCurrentUser();
      const visible = (curUser && curUser.role !== 'admin')
        ? (masterDB.staff || []).filter(s => String(s.username || '').toLowerCase() === String(curUser.username || '').toLowerCase())
        : (masterDB.staff || []);
      return visible.map(s => ({
        value: s.name || '',
        label: s.name || '',
        sub: `${s.dept || '-'} / ${s.branch || '-'}`,
        raw: s,
      }));
    }
    if (kind === 'customer') {
      const accessible = orders.filter(o => canAccessOrder(o) && o.customer && String(o.customer.name || '').trim());
      const cMap = new Map();
      accessible.forEach(o => {
        const nk = String(o.customer.name).trim().toLowerCase();
        if (!cMap.has(nk)) cMap.set(nk, { order: o, count: 1 });
        else cMap.get(nk).count++;
      });
      return Array.from(cMap.values()).map(({ order: co, count }) => ({
        value: co.customer.name || '',
        label: co.customer.name || '',
        sub: `${co.customer.mobile || '-'} • มี ${count} แปลนงาน`,
        id: co.id,
        raw: co,
      }));
    }
    if (kind === 'remark') {
      return (masterDB.remarks || []).map(r => ({ value: r.name || '', label: r.name || '', sub: '' }));
    }
    return [];
  }

  function positionMenu() {
    if (!menuEl || menuEl.hidden || !activeInput) return;
    const rect = activeInput.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.max(rect.width, 230);
    let left = Math.max(8, Math.min(rect.left, vw - w - 8));
    let top = rect.bottom + 3;
    if (top + 240 > vh && rect.top > 250) {
      top = Math.max(8, rect.top - 245);
    }
    menuEl.style.left = left + 'px';
    menuEl.style.top = top + 'px';
    menuEl.style.width = w + 'px';
  }

  function renderMenu(queryText = '') {
    if (!activeWrap || !activeInput) return;
    const m = ensureMenu();
    const kind = activeWrap.dataset.comboKind || '';
    const col = activeWrap.dataset.comboCol || '';
    const q = String(queryText || '').trim().toLowerCase();
    const allOpts = sortListByDropdownMode(buildOptions(kind, col), it => it.label);
    const filtered = !q ? allOpts : allOpts.filter(it => `${it.label} ${it.sub || ''}`.toLowerCase().includes(q));
    lastItems = filtered;
    const mode = getDropdownSortMode();
    m.innerHTML = `
      <div class="mto-combo-menu-hd">
        <span>พบ ${filtered.length} รายการ</span>
        <span class="mto-combo-sort-btns">
          <button type="button" class="mto-combo-sort-btn ${mode === 'order' ? 'active' : ''}" data-combo-sort="order" title="แสดงตามลำดับในฐานข้อมูล">📋 ตามลำดับ</button>
          <button type="button" class="mto-combo-sort-btn ${mode === 'az' ? 'active' : ''}" data-combo-sort="az" title="เรียงชื่อ A → Z / ก → ฮ">🔤 A-Z</button>
        </span>
      </div>
      <div class="mto-combo-list">
        ${filtered.length
          ? filtered.map((it, idx) => `<div class="mto-combo-item ${String(activeInput.value || '').trim() === it.value ? 'is-selected' : ''}" data-combo-idx="${idx}"><b>${esc(it.label)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</div>`).join('')
          : `<div class="mto-combo-empty">ไม่พบในฐานข้อมูล — พิมพ์ระบุเองได้ทันที</div>`
        }
      </div>
    `;
    m.hidden = false;
    positionMenu();
  }

  function open(wrap, showAll = false) {
    activeWrap = wrap;
    activeInput = wrap.querySelector('input');
    if (!activeInput) return;
    renderMenu(showAll ? '' : activeInput.value);
  }

  function close() {
    if (menuEl) menuEl.hidden = true;
    activeWrap = null;
    activeInput = null;
  }

  function selectItem(item) {
    if (!activeWrap || !activeInput) return;
    const kind = activeWrap.dataset.comboKind || '';
    const col = activeWrap.dataset.comboCol || '';
    const pop = document.getElementById('pdfQuickPopover');
    const sh = currentSheet();
    const ord = currentOrder();

    activeInput.value = item.value;
    if (kind === 'fabric') {
      close();
      applyFabricPickFromDb(pop, col, item.id);
      return;
    }
    if (kind === 'blindGroup' && sh && sh.fabrics && sh.fabrics[col]) {
      sh.fabrics[col].group = item.value;
      sh.fabrics[col]._pickedDbId = '';
      close();
      syncSheetInputs();
      renderPreview();
      scheduleBackgroundAutoSave(1200);
      return;
    }
    if (kind === 'blindCode' && sh && sh.fabrics && sh.fabrics[col]) {
      sh.fabrics[col].name = item.value;
      if (item.raw && item.raw.group) sh.fabrics[col].group = item.raw.group;
      sh.fabrics[col]._pickedDbId = item.id || '';
      if (activePopoverCtx && activePopoverCtx.type === 'fabric') {
        activePopoverCtx.lastPickedMsg = `✔ เลือก "${item.value}" แสดงบนตารางสินค้าแล้ว`;
      }
      close();
      (sh.windows || []).forEach(w => { if (w && w.calcMode !== 'manual') autoCalculateWindow(w, sh); });
      autoUpdateSheetFabricTableQty(sh);
      syncSheetInputs();
      renderPreview();
      if (pop && !pop.hidden && activePopoverCtx && activePopoverCtx.type === 'fabric') {
        renderActivePopoverContent({ preserveScroll: true });
      }
      scheduleBackgroundAutoSave(1200);
      return;
    }
    if (kind === 'blindCord' && sh && sh.fabrics && sh.fabrics[col]) {
      sh.fabrics[col].cordColor = item.value;
      if (/สลิง/.test(item.value)) sh.fabrics[col].cordType = 'เชือกสลิง';
      else if (/เทป/.test(item.value)) sh.fabrics[col].cordType = 'เชือกเทป';
      close();
      syncSheetInputs();
      renderPreview();
      scheduleBackgroundAutoSave(1200);
      return;
    }
    if (kind === 'blindValance' && sh && sh.fabrics && sh.fabrics[col]) {
      sh.fabrics[col].valanceColor = item.value;
      close();
      syncSheetInputs();
      renderPreview();
      scheduleBackgroundAutoSave(1200);
      return;
    }
    if (kind === 'rail' && sh && sh.rods && sh.rods[col]) {
      sh.rods[col].model = item.value;
      if (item.raw && item.raw.defaultColor) sh.rods[col].color = item.raw.defaultColor;
      close();
      (sh.windows || []).forEach(w => { if (w && w.calcMode !== 'manual') autoCalculateWindow(w, sh); });
      autoUpdateSheetFabricTableQty(sh);
      syncSheetInputs();
      renderPreview();
      scheduleBackgroundAutoSave(1200);
      return;
    }
    if (kind === 'staff' && ord && item.raw) {
      ord.staff.name = item.raw.name || '';
      ord.staff.dept = item.raw.dept || '';
      const brList = (typeof getStaffBranchList === 'function') ? getStaffBranchList(item.raw) : [];
      ord.staff.branch = brList[0] || item.raw.branch || '';
      close();
      syncSharedInputs();
      changed(null, 'staff.name');
      return;
    }
    if (kind === 'staffBranch' && ord) {
      ord.staff.branch = item.value;
      close();
      syncSharedInputs();
      changed(null, 'staff.branch');
      return;
    }
    if (kind === 'customer' && ord && item.raw && item.raw.customer) {
      ['name', 'mobile', 'tel', 'email', 'building', 'houseNo', 'floor', 'moo', 'soi', 'road', 'subdistrict', 'district', 'province', 'zipcode', 'deliveryPlace'].forEach(k => {
        if (item.raw.customer[k] !== undefined) ord.customer[k] = item.raw.customer[k];
      });
      close();
      syncSharedInputs();
      changed(null, 'customer.name');
      return;
    }
    // Generic fallback: trigger input event
    close();
    activeInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function init() {
    document.addEventListener('focusin', e => {
      const wrap = e.target && e.target.closest && e.target.closest('.mto-combo');
      if (wrap && e.target.tagName === 'INPUT') {
        // หากเป็นการ autofocus อัตโนมัติตอนเปิด Popover ไม่ต้องเด้งเมนูมาบังช่องรางอื่น
        if (e.target.dataset.skipAutoCombo === '1') {
          delete e.target.dataset.skipAutoCombo;
          return;
        }
        // เปิดแสดงรายการทั้งหมดในฐานข้อมูลก่อนเสมอ (และค่อยกรองเมื่อผู้ใช้เริ่มพิมพ์) เพื่อให้เลือกสาขา/สินค้าอื่นได้ทันทีโดยไม่ต้องลบข้อความเดิม
        open(wrap, true);
      }
    });
    document.addEventListener('input', e => {
      const wrap = e.target && e.target.closest && e.target.closest('.mto-combo');
      if (wrap && e.target === activeInput) {
        renderMenu(e.target.value);
      }
    });
    document.addEventListener('click', e => {
      const toggle = e.target.closest && e.target.closest('.mto-combo-toggle');
      if (toggle) {
        e.stopPropagation();
        const wrap = toggle.closest('.mto-combo');
        const inp = wrap && wrap.querySelector('input');
        if (activeWrap === wrap && menuEl && !menuEl.hidden) {
          close();
        } else if (wrap && inp) {
          inp.focus();
          open(wrap, true); // คลิก ▾ แสดงรายการทั้งหมดให้เลือกได้ทันที
        }
        return;
      }
      const comboInp = e.target && e.target.tagName === 'INPUT' && e.target.closest && e.target.closest('.mto-combo');
      if (comboInp) {
        open(comboInp.closest('.mto-combo'), true);
        return;
      }
      if (!e.target.closest('.mto-combo') && !e.target.closest('#mtoComboMenu')) {
        close();
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menuEl && !menuEl.hidden) {
        close();
      }
    });
    window.addEventListener('resize', positionMenu);
  }

  return { init, open, close };
})();

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
      renderActivePopoverContent({ preserveScroll: false });
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
      let pickedVal = selEl ? selEl.value : '';
      // หากผู้ใช้พิมพ์ค้นหาไว้แต่ยังไม่ได้คลิกเลือกใน Dropdown ให้ดึงรายการแรกที่พบให้อัตโนมัติเมื่อกดปุ่มดึงค่า
      if (!pickedVal && selEl && selEl.options && selEl.options.length > 1) {
        pickedVal = selEl.options[1].value;
      }
      if (!pickedVal) {
        alert('กรุณาเลือกรายการผ้าจากฐานข้อมูลก่อนกดดึงค่า');
        return;
      }
      applyFabricPickFromDb(pop, col, pickedVal);
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
        const brs = (typeof getStaffBranchList === 'function') ? getStaffBranchList(st) : [];
        ord.staff.branch = brs[0] || st.branch || '';
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
    if (e.target.id === 'popFabDbPicker' && e.target.value) {
      const col = (activePopoverCtx && activePopoverCtx.fabCol) || 'blackout';
      applyFabricPickFromDb(pop, col, e.target.value);
      return;
    }
  });

  // Req #7: พิมพ์ค้นหารายการผ้าใน Dropdown ได้ทันทีไม่ต้องเลื่อนหาอย่างเดียว
  pop.addEventListener('input', e => {
    if (e.target.id === 'popFabSearchInput') {
      if (activePopoverCtx) activePopoverCtx.fabSearchQuery = e.target.value || '';
      const q = String(e.target.value || '').trim().toLowerCase();
      const selEl = pop.querySelector('#popFabDbPicker');
      if (!selEl) return;
      const col = (activePopoverCtx && activePopoverCtx.fabCol) || 'blackout';
      const isBlindCol = col === 'roller' || col === 'blinds';
      const list = isBlindCol ? (masterDB.blinds || []) : (masterDB.fabrics || []);
      const filtered = !q ? list : list.filter(x => {
        const hay = `${x.name || ''} ${x.design || ''} ${x.fabricWidth || ''} ${x.curtainStyle || ''}`.toLowerCase();
        return hay.includes(q);
      });
      selEl.innerHTML = `<option value="">-- พบ ${filtered.length} รายการ (เลือกเพื่อดึงค่าทันที) --</option>` +
        (isBlindCol
          ? filtered.map((x, idx) => `<option value="${esc(x.id || ('__idx_' + idx))}">${esc(x.name)} [${esc(x.curtainStyle)}]</option>`).join('')
          : filtered.map((x, idx) => `<option value="${esc(x.id || ('__idx_' + idx))}">${esc(x.name)} (${esc(x.design || '-')}) หน้าผ้า ${esc(x.fabricWidth)} ซม.</option>`).join(''));
      if (filtered.length === 1) {
        selEl.value = filtered[0].id || '__idx_0';
      }
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

function applyFabricPickFromDb(pop, col, pickedId) {
  const ord = currentOrder();
  const sIdx = (activePopoverCtx && activePopoverCtx.sIdx !== undefined) ? activePopoverCtx.sIdx : activeSheetIdx;
  const sh = (ord && ord.sheets && ord.sheets[sIdx]) ? ord.sheets[sIdx] : currentSheet();
  if (!sh || !sh.fabrics || !sh.fabrics[col] || !pickedId) return false;

  const isBlindCol = col === 'roller' || col === 'blinds';
  const list = isBlindCol ? (masterDB.blinds || []) : (masterDB.fabrics || []);
  let item = list.find(x => String(x.id) === String(pickedId));
  if (!item && String(pickedId).startsWith('__idx_')) {
    const idx = parseInt(String(pickedId).replace('__idx_', ''), 10);
    if (!isNaN(idx)) item = list[idx];
  }
  if (!item) return false;

  if (isBlindCol) {
    sh.fabrics[col].name = item.name || '';
  } else {
    sh.fabrics[col].name = item.name || '';
    sh.fabrics[col].design = item.design || '';
    // หากผู้ใช้ติ๊กเกรนโปร่งไว้กับผ้าหน้าแคบ (<= 270) ให้ปรับเป็นทึบ แต่ถ้ายังไม่ได้เลือกเกรน (ว่าง) ไม่ต้องติ๊กเอง
    if (sh.fabrics[col].grain === 'sheer' && typeof canFabricUseSheerGrain === 'function' && !canFabricUseSheerGrain(item.fabricWidth)) {
      sh.fabrics[col].grain = 'opaque';
      sh.fabrics[col].isOpaque = true;
      sh.fabrics[col].isSheer = false;
    }
  }
  sh.fabrics[col]._pickedDbId = String(pickedId);
  if (activePopoverCtx) activePopoverCtx.lastPickedMsg = `✔ ดึงค่า "${item.name}" แสดงบนตารางผ้าในแปลนแล้ว`;

  (sh.windows || []).forEach(w => {
    if (w && w.calcMode !== 'manual') autoCalculateWindow(w, sh);
  });
  autoUpdateSheetFabricTableQty(sh);
  renderWindowsEditor();
  syncSheetInputs();
  renderPreview();
  touchAndSave();
  renderActivePopoverContent({ preserveScroll: true });
  return true;
}

function closePdfQuickPopover() {
  if (typeof MtoCombo !== 'undefined') MtoCombo.close();
  const pop = document.getElementById('pdfQuickPopover');
  if (pop) pop.hidden = true;
  activePopoverCtx = null;
}

function positionPopoverNear(pop) {
  // แสดงตรงกลางหน้าจอเห็นทั้งหมดเป็นค่าเริ่มต้น รองรับทั้งคอมพิวเตอร์และ iPad (รวมกรณีคีย์บอร์ดหน้าจอเปิด)
  const vv = window.visualViewport;
  const vw = vv ? vv.width : window.innerWidth;
  const vh = vv ? vv.height : window.innerHeight;
  const pw = Math.min(820, Math.max(300, vw - 20));
  pop.style.width = pw + 'px';
  pop.style.maxHeight = Math.max(260, vh - 20) + 'px';
  const rect = pop.getBoundingClientRect();
  const ph = Math.min(rect.height || 640, vh - 20);
  const left = Math.max(10, Math.round((vw - pw) / 2));
  const top = Math.max(10, Math.round((vh - ph) / 2));
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}

// รองรับการหมุนหน้าจอ iPad / เปลี่ยนขนาดหน้าจอให้ปรับตำแหน่ง Popover และซูมใบงานพอดีจออัตโนมัติ
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    const pop = document.getElementById('pdfQuickPopover');
    if (pop && !pop.hidden) positionPopoverNear(pop);
    if (typeof fitZoomWidth === 'function' && window.innerWidth <= 1180) fitZoomWidth();
  }, 220);
});
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const pop = document.getElementById('pdfQuickPopover');
    if (pop && !pop.hidden) positionPopoverNear(pop);
  });
}

function refreshActivePopover() {
  const pop = document.getElementById('pdfQuickPopover');
  if (!pop || pop.hidden || !activePopoverCtx) return;
  renderActivePopoverContent({ preserveScroll: true });
}

function refreshActivePopoverIfStructural(changedField) {
  const pop = document.getElementById('pdfQuickPopover');
  if (!pop || pop.hidden || !activePopoverCtx) return;
  if (/^(curtainStyle1|curtainStyle2|pieces1|pieces2|railTracks|rodType|rodType2|railModel|railModel2|hookSize|hookSize2|noRail|noRailStatus|noRailDeductPreset|railCountUnit|railUnit|backLayerHeightDeduct|backLayerTarget|fabricCol1|fabricCol2|lining1|lining2|liningRuleId1|liningRuleId2|liningYardMode1|liningYardMode2|specialType|gable\.type|gable\.hemClearanceType|sideJoin\.type|yardMode1|yardMode2|box|mount|wallCeilingAttach|paneStyle|cornerShape|calcMode|fabricId1|grainType1|fabricRuleId1|blindId1|fabricId2|grainType2|fabricRuleId2|widthFormulaId1|heightFormulaId1|widthFormulaId2|heightFormulaId2|unequalSplit|unequalSplitTarget|unequalLayerRail|floorMode)$/.test(changedField)) {
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
      sortListByDropdownMode(masterDB.curtains, c => c.name).map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
    const hookOpts = `<option value="">-- เลือกขนาดตะขอ --</option>` +
      sortListByDropdownMode(masterDB.hooks, h => h.name).map(h => `<option value="${esc(h.name)}">${esc(h.name)}</option>`).join('');
    const rodTypeOpts = `<option value="">-- เลือกประเภทรางม่าน --</option>` +
      ['รางม่านจีบ', 'รางโชว์', 'รางม่านลอน', 'รางม่านพับ'].map(rt => `<option value="${esc(rt)}">${esc(rt)}</option>`).join('');
    const noRailPresetOpts = NO_RAIL_DEDUCT_PRESETS.filter(p => p[0] !== '0').map(([v, labelText]) =>
      `<option value="${esc(v)}">${esc(labelText)}</option>`
    ).join('');
    const planOpenings = getPlanOpenings(sh);
    const hasPlanPoints = planOpenings.length > 0;
    const matchedOpIdx = findMatchingPlanOpeningIdx(w, planOpenings);
    const planSelectOpts = `<option value="">-- ${hasPlanPoints ? 'เลือกจุดจากแปลนห้อง' : 'ยังไม่มีจุดในแปลน (กำหนดเองได้)'} --</option>` +
      planOpenings.map((op, oi) => {
        const info = formatPlanOpeningCode(op, oi);
        const usedByIdx = (sh && sh.windows || []).findIndex((other, wi) => wi !== i && other && String(other.label || '').trim().toUpperCase() === info.code.toUpperCase());
        const usedNote = usedByIdx >= 0 ? ` [สลับกับลำดับที่ ${usedByIdx + 1}]` : '';
        return `<option value="${oi}" ${oi === matchedOpIdx ? 'selected' : ''}>จุดที่ ${esc(info.no)} (${esc(info.code)})${esc(usedNote)}</option>`;
      }).join('');
    const wings = shapeWings(w.cornerShape || '1');
    const isCurvedShape = String(w.cornerShape || '1') !== '1';

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
    const cfg1 = resolveWindowLayerConfig(w, sh, 1);
    const cfg2 = resolveWindowLayerConfig(w, sh, 2);
    const railModelOpts1 = `<option value="">-- อัตโนมัติตามตารางราง (${esc(cfg1.railModel || 'ไม่ระบุ')}) --</option>` +
      sortListByDropdownMode(getRailsForStyle(style1, cfg1.rodType), r => r.name).map(r => `<option value="${esc(r.name)}">${esc(r.name)}${r.railGroup ? ' [' + esc(r.railGroup) + ']' : ''}</option>`).join('');
    const railModelOpts2 = `<option value="">-- อัตโนมัติตามรางชั้น 2 (${esc(cfg2.railModel || 'ไม่ระบุ')}) --</option>` +
      sortListByDropdownMode(getRailsForStyle(style2, cfg2.rodType), r => r.name).map(r => `<option value="${esc(r.name)}">${esc(r.name)}${r.railGroup ? ' [' + esc(r.railGroup) + ']' : ''}</option>`).join('');
    const wfList1 = sortListByDropdownMode(getWidthFormulasForStyle(style1, w.pieces1, effTracks, cfg1.rodType, 'opaque'), f => f.label);
    const hfList1 = sortListByDropdownMode(getHeightFormulasForWindow(style1, cfg1.rodType, cfg1.hookSize, effTracks, cfg1.railModel), f => f.label);
    const wfList2 = sortListByDropdownMode(getWidthFormulasForStyle(style2, w.pieces2 || w.pieces1, effTracks, cfg2.rodType, 'sheer'), f => f.label);
    const hfList2 = sortListByDropdownMode(getHeightFormulasForWindow(style2, cfg2.rodType, cfg2.hookSize, effTracks, cfg2.railModel), f => f.label);

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
      return `<button type="button" tabindex="-1" class="field-mode-btn ${locked ? 'is-manual' : 'is-auto'}" data-act="toggleFieldManual" data-i="${i}" data-mkey="${mKey}" title="${locked ? 'กรอกเอง (คลิกเพื่อสลับเป็นอัตโนมัติ)' : 'คำนวณอัตโนมัติ (คลิกเพื่อล็อกกรอกเอง)'}">${locked ? '✍️' : '⚡'}</button>`;
    };
    const calcRowEd = (key, mPrefix, rowTitle, u1, u2) => `<tr><th class="r">${rowTitle}</th>
      <td><div class="calc-cell-wrap">${lockBtn(mPrefix + 'A', rowTitle + ' กว้าง')}<input ${b(key + '.a')} placeholder="กว้าง"></div></td><td class="op">×</td>
      <td><div class="calc-cell-wrap">${lockBtn(mPrefix + 'B', rowTitle + ' สูง')}<input ${b(key + '.b')} placeholder="สูง"></div></td><td class="op">=</td>
      <td><div class="calc-cell-wrap">${lockBtn(mPrefix + 'N', rowTitle + ' จำนวน')}<input ${b(key + '.n')} placeholder="${u1}"></div></td><td class="op">=</td>
      <td><div class="calc-cell-wrap">${lockBtn(mPrefix + 'T', rowTitle + ' รวม')}<input ${b(key + '.t')} placeholder="${u2}"></div></td></tr>`;

    stickyNavHTML = `
      <div class="pop-tabs">
        <button type="button" class="${subTab === 'dims' ? 'active' : ''}" data-pop-wintab="dims">1. ขนาดรอบบาน</button>
        <button type="button" class="${subTab === 'style' ? 'active' : ''}" data-pop-wintab="style">2. รูปแบบม่าน & ราง</button>
        <button type="button" class="${subTab === 'mask' ? 'active' : ''}" data-pop-wintab="mask">3. กรอบบาน & แบ่งผืน</button>
        <button type="button" class="${subTab === 'calc' ? 'active' : ''}" data-pop-wintab="calc">4. คำนวณ & เลือกผ้า</button>
      </div>
    `;

    const autoMatchedHf1 = (!w.heightFormulaId1 && style1 && typeof findAutoHeightFormulaForWindow === 'function')
      ? findAutoHeightFormulaForWindow(style1, cfg1.rodType, cfg1.hookSize, effTracks, cfg1.railModel)
      : null;
    const autoMatchedHf2 = (!w.heightFormulaId2 && isTwoLayer && style2 && typeof findAutoHeightFormulaForWindow === 'function')
      ? findAutoHeightFormulaForWindow(style2, cfg2.rodType, cfg2.hookSize, effTracks, cfg2.railModel)
      : null;
    const activeHf1Obj = (w.heightFormulaId1 && (masterDB.heightFormulas || []).find(f => f.id === w.heightFormulaId1)) || autoMatchedHf1;
    const activeHf2Obj = (w.heightFormulaId2 && (masterDB.heightFormulas || []).find(f => f.id === w.heightFormulaId2)) || autoMatchedHf2;
    const autoHfLines = [];
    if (activeHf1Obj && !isBlind1) {
      autoHfLines.push(`ชั้น 1 (${esc(style1 || 'ทึบ')}${cfg1.railModel ? ' • ' + esc(cfg1.railModel) : ''}${cfg1.hookSize ? ' • ' + esc(cfg1.hookSize) : ''}): ${esc(activeHf1Obj.label)}`);
    }
    if (isTwoLayer && activeHf2Obj && !isBlind2) {
      autoHfLines.push(`ชั้น 2 (${esc(style2 || 'โปร่ง')}${cfg2.railModel ? ' • ' + esc(cfg2.railModel) : ''}${cfg2.hookSize ? ' • ' + esc(cfg2.hookSize) : ''}): ${esc(activeHf2Obj.label)}`);
    }
    const autoHfBadgeHtml = autoHfLines.length
      ? `<div style="margin-bottom:6px;padding:5px 8px;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:6px;color:#065f46;font-size:11.5px;font-weight:600;line-height:1.45">✔ ลดความสูงอัตโนมัติตามเงื่อนไข:<br>${autoHfLines.join('<br>')}</div>`
      : '';
    const hasAdvDims = !!(w.customRailW || w.customRailH || w.unequalLayerRail || w.fullHLeft || w.fullHMid || w.fullHRight);
    const hasAdvCalc = !!(w.railCountUnit || w.railUnit || w.railMinLength || w.rowLabel1 || w.rowLabel2 || w.rowLabel3);
    const showLayer2Box = !!(w.curtainStyle2 || isTwoLayer || w.fabricCol2 || (w.sheer && (w.sheer.a || w.sheer.t)));
    const showBlindPiecePanel = !!(isBlind1 || isBlind2 || (Array.isArray(w.blindPieces) && w.blindPieces.length > 0));

    bodyHTML = `
      ${(subTab === 'dims' && fMeta) ? `
        <div class="pop-highlight-box">
          <b>🎯 จุดที่คลิกแก้ไข: <span style="color:#b42318">${esc(fMeta[0])}</span></b>
          <div class="grid2" style="margin-top:4px">
            <label>ขนาด ${esc(fMeta[0])} (ซม.)
              <input type="number" step="any" data-dim-num="1" ${b(fKey)} data-pop-autofocus="1" placeholder="ระบุขนาด (ซม.)" style="font-weight:700;font-size:14px">
            </label>
            <label>หมายเหตุกำกับจุดนี้
              ${comboInputHTML({ kind: 'remark', sheetPath: `windows.${i}.${fMeta[1]}`, placeholder: 'เช่น ชนแอร์, ปลั๊กไฟ, บิ้วอิน' })}
            </label>
          </div>
        </div>
      ` : ''}

      ${subTab === 'dims' ? `
      <!-- ส่วนที่ 1: รหัสจุดและขนาดรอบบาน -->
      <section class="pop-sec-card" id="popSec_dims">
        <div class="pop-sec-title">
          <span class="pop-sec-badge">ส่วนที่ 1</span>
          <b>รหัสจุด และขนาดพื้นที่รอบบาน (กด Tab เลื่อนช่องขนาดถัดไปได้ทันที)</b>
        </div>
        <div class="grid3" style="margin-bottom:6px">
          <label>ลำดับจุด ${hasPlanPoints ? '<small style="color:#1d4ed8">(จากแปลน)</small>' : ''}
            <input ${b('planNo')} ${hasPlanPoints ? 'readonly tabindex="-1" style="background:#f1f5f9"' : ''} placeholder="1, 2...">
          </label>
          <label>รหัส/ตำแหน่ง ${hasPlanPoints ? '<small style="color:#1d4ed8">(จากแปลน)</small>' : ''}
            <input ${b('label')} ${hasPlanPoints ? 'readonly tabindex="-1" style="background:#f1f5f9"' : ''} placeholder="W1, D1">
          </label>
          <label>ดึงจากจุดในแปลนห้อง
            <select tabindex="-1" data-plan-pick="${i}">${planSelectOpts}</select>
          </label>
        </div>
        ${isCurvedShape ? `
          <div style="margin-bottom:6px;padding:6px 8px;background:#fff8eb;border:1px dashed #f59f00;border-radius:6px">
            <b style="color:#b45309;font-size:11.5px">📐 บานดัดโค้ง: ระบุความกว้างแต่ละด้าน (ระบบนำมารวมเป็นความกว้างเฟรมอัตโนมัติ)</b>
            <div class="grid3" style="margin-top:4px">
              ${wings.left ? `<label>ด้านโค้งซ้าย (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('sideWidthLeft')} placeholder="เช่น 100"></label>` : `<div></div>`}
              <label>ด้านตรง (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('sideWidthCenter')} placeholder="เช่น 200"></label>
              ${wings.right ? `<label>ด้านโค้งขวา (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('sideWidthRight')} placeholder="เช่น 100"></label>` : `<div></div>`}
            </div>
          </div>
        ` : ''}
        <div class="dim-grid">
          ${dimFieldRow(b, 'ความกว้าง (เฟรม)', 'width', 'noteWidth', i, true)}
          ${dimFieldRow(b, 'ความสูง (เฟรม)', 'height', 'noteHeight', i, true)}
          ${dimFieldRow(b, 'เผื่อด้านซ้าย (+/-)', 'extL', 'noteExtL', i, true)}
          ${dimFieldRow(b, 'เผื่อด้านขวา (+/-)', 'extR', 'noteExtR', i, true)}
          ${dimFieldRow(b, 'เผื่อด้านบน (+/-)', 'extT', 'noteExtT', i, true)}
          ${dimFieldRow(b, 'เผื่อด้านล่าง (+/-)', 'extB', 'noteExtB', i, true)}
          ${dimFieldRow(b, 'พื้นที่ด้านซ้าย', 'wallL', 'noteWallL', i)}
          ${dimFieldRow(b, 'พื้นที่ด้านขวา', 'wallR', 'noteWallR', i)}
          ${dimFieldRow(b, 'พื้นที่ด้านบน', 'ceilT', 'noteCeilT', i)}
          ${dimFieldRow(b, 'พื้นที่ด้านล่าง', 'floorB', 'noteFloorB', i)}
          ${dimFieldRow(b, 'ความกว้างเต็ม', 'fullW', 'noteFullW', i)}
          ${dimFieldRow(b, 'ความสูงเต็ม (ซ้าย-ขวา)', 'fullH', 'noteFullH', i)}
        </div>
        <div class="pop-rail-sum">
          <div id="popRailSumText">
            กว้างราง = <b>${esc(rw || '-')}${isFieldManual(w, 'railW') && w.customRailW ? '*' : ''}</b> ซม. • สูงราง (สูงเฟรม+เผื่อบน+เผื่อล่าง) = <b>${esc(rh || '-')}${isFieldManual(w, 'railH') && w.customRailH ? '*' : ''}</b> ซม.
          </div>
        </div>
        ${showBlindPiecePanel ? buildBlindPiecesEditorHTML(w, i) : ''}
        <details class="pop-adv-details" ${hasAdvDims ? 'open' : ''}>
          <summary>⚙️ ตั้งค่าขั้นสูง (ระบุขนาดรางเอง / รางทึบ-โปร่งไม่เท่ากัน / ความสูงเต็ม ซ้าย-กลาง-ขวา)</summary>
          <div class="grid3" style="margin-bottom:6px">
            <label style="font-size:11.5px">ความสูงเต็ม ซ้าย (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('fullHLeft')} placeholder="เช่น 299.5"></label>
            <label style="font-size:11.5px">ความสูงเต็ม กลาง (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('fullHMid')} placeholder="เว้นว่างได้"></label>
            <label style="font-size:11.5px">ความสูงเต็ม ขวา (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('fullHRight')} placeholder="เช่น 299"></label>
          </div>
          <div class="grid2" style="gap:6px">
            <label style="font-size:11.5px">ระบุความกว้างรางม่านเอง (ซม. • มี * กำกับ)
              <span class="inline">${lockBtn('railW', 'ขนาดความกว้างรางม่าน')}<input type="number" step="0.5" data-halfcm="1" ${b('customRailW')} placeholder="เว้นว่าง = คำนวณตามเฟรม"></span>
            </label>
            <label style="font-size:11.5px">ระบุความสูงรางม่านเอง (ซม. • มี * กำกับ)
              <span class="inline">${lockBtn('railH', 'ขนาดความสูงรางม่าน')}<input type="number" step="0.5" data-halfcm="1" ${b('customRailH')} placeholder="เว้นว่าง = คำนวณตามเฟรม"></span>
            </label>
          </div>
          <div style="margin-top:5px;padding-top:5px;border-top:1px dashed #bfdbfe">
            <label class="inline" style="font-weight:700;color:#6b21a8;cursor:pointer;font-size:11.5px">
              <input type="checkbox" ${b('unequalLayerRail')}>
              🔀 ขนาดรางม่านทึบ / รางม่านโปร่ง ไม่เท่ากัน (เช่น 400/380)
            </label>
            ${w.unequalLayerRail ? `
              <div class="grid2" style="margin-top:4px;gap:6px">
                <label style="font-size:11.5px">กว้างรางม่านทึบ (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('railW1')} placeholder="เช่น 400"></label>
                <label style="font-size:11.5px">กว้างรางม่านโปร่ง (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('railW2')} placeholder="เช่น 380"></label>
                <label style="font-size:11.5px">สูงรางม่านทึบ (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('railH1')} placeholder="เช่น 250"></label>
                <label style="font-size:11.5px">สูงรางม่านโปร่ง (ซม.) <input type="number" step="0.5" data-halfcm="1" ${b('railH2')} placeholder="เช่น 245"></label>
              </div>
            ` : ''}
          </div>
        </details>
      </section>
      ` : ''}

      ${subTab === 'style' ? `
      <!-- ส่วนที่ 2: รูปแบบผ้าม่าน รางม่าน และการลดขนาดความสูงม่าน -->
      <section class="pop-sec-card" id="popSec_style">
        <div class="pop-sec-title">
          <span class="pop-sec-badge">ส่วนที่ 2</span>
          <b>รูปแบบผ้าม่าน รางม่าน และกล่องม่าน / ขาจับราง</b>
        </div>
        <div class="grid2">
          <label>รูปแบบผ้าม่านชั้นที่ 1 (ม่านทึบ/หลัก)
            <select ${b('curtainStyle1')} data-pop-autofocus="1">${curtainOpts}</select>
          </label>
          <label>รูปแบบผ้าม่านชั้นที่ 2 (ม่านโปร่ง — ถ้ามี)
            <select ${b('curtainStyle2')}>${curtainOpts}</select>
          </label>
          <label>จำนวนผืน ชั้นที่ 1
            <select ${b('pieces1')}>
              <option value="">ตามสูตรมาตรฐาน (2 ผืน)</option>
              <option value="1">1 ผืน (รวบข้างเดียว)</option>
              <option value="2">2 ผืน (แยกกลาง)</option>
              <option value="3">3 ผืน</option>
              <option value="4">4 ผืน</option>
            </select>
          </label>
          ${showLayer2Box ? `
          <label>จำนวนผืน ชั้นที่ 2 (ม่านโปร่ง)
            <select ${b('pieces2')}>
              <option value="">ตามชั้นที่ 1</option>
              <option value="1">1 ผืน</option>
              <option value="2">2 ผืน</option>
              <option value="3">3 ผืน</option>
              <option value="4">4 ผืน</option>
            </select>
          </label>
          ` : `
          <label>ขนาดตะขอ ${needHook ? '<b>(ม่านจีบ/ลอน)</b>' : '<small>(เฉพาะม่านจีบ/ลอน)</small>'}
            <select ${b('hookSize')} ${needHook ? '' : 'disabled'}>${hookOpts}</select>
          </label>
          `}
          <label>จำนวนชั้นราง & ประเภทราง ชั้นที่ 1
            <span class="inline">
              <select ${b('railTracks')} style="max-width:95px">
                <option value="">อัตโนมัติ</option>
                <option value="1">1 ชั้น</option>
                <option value="2">2 ชั้น</option>
              </select>
              <select ${b('rodType')}>${rodTypeOpts}</select>
            </span>
          </label>
          <label>รุ่นราง ชั้นที่ 1
            <select ${b('railModel')}>${railModelOpts1}</select>
          </label>
          ${showLayer2Box ? `
          <label>ประเภทราง ชั้นที่ 2 <small>(แยกจากชั้น 1 ได้)</small>
            <select ${b('rodType2')}>
              <option value="">อัตโนมัติ (${esc(cfg2.rodType || 'ตามรูปแบบชั้น 2')})</option>
              ${['รางม่านจีบ', 'รางโชว์', 'รางม่านลอน', 'รางม่านพับ'].map(rt => `<option value="${esc(rt)}">${esc(rt)}</option>`).join('')}
            </select>
          </label>
          <label>รุ่นราง ชั้นที่ 2
            <select ${b('railModel2')}>${railModelOpts2}</select>
          </label>
          <label>ขนาดตะขอ ชั้นที่ 1 ${curtainNeedsHook(w.curtainStyle1, '') ? '<b>(ม่านจีบ/ลอน)</b>' : '<small>(ถ้ามี)</small>'}
            <select ${b('hookSize')} ${needHook ? '' : 'disabled'}>${hookOpts}</select>
          </label>
          <label>ขนาดตะขอ ชั้นที่ 2 <small>(ถ้าต่างจากชั้น 1)</small>
            <select ${b('hookSize2')} ${curtainNeedsHook(w.curtainStyle2 || w.curtainStyle1, '') ? '' : 'disabled'}>
              <option value="">ตามชั้นที่ 1 (${esc(w.hookSize || '-')})</option>
              ${sortListByDropdownMode(masterDB.hooks, h => h.name).map(h => `<option value="${esc(h.name)}">${esc(h.name)}</option>`).join('')}
            </select>
          </label>
          ` : `<div></div><div></div>`}
        </div>
        ${(cfg1.railModel || (showLayer2Box && cfg2.railModel)) ? `
          <div style="margin-top:6px;padding:4px 8px;background:#f0f7ff;border:1px solid #bfdbfe;border-radius:6px;font-size:11.5px;color:#1e3a8a">
            🛤️ <b>รางม่านที่ใช้ (ซิงค์ลงใบแปลนอัตโนมัติ):</b>
            ชั้น 1: <b>${esc(cfg1.rodType || '-')} ${esc(cfg1.railModel || '(ยังไม่เลือกรุ่น)')}</b>
            ${showLayer2Box ? ` • ชั้น 2: <b>${esc(cfg2.rodType || '-')} ${esc(cfg2.railModel || '(ยังไม่เลือกรุ่น)')}</b>` : ''}
          </div>
        ` : ''}

        ${showBlindPiecePanel ? buildBlindPiecesEditorHTML(w, i) : ''}
        ${buildWindowLiningEditorHTML(w, i, sh, { showLayer2: showLayer2Box, isBlind1, isBlind2, fromPopover: true, sectionKey: 'style' })}

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
      </section>
      ` : ''}

      ${subTab === 'mask' ? `
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
            ✂️ แบ่งผ้าม่านผืนซ้าย / ผืนขวา ไม่เท่ากันบนรางเดียว
          </label>
          ${w.unequalSplit ? `
            <div class="grid3" style="margin-top:6px">
              <label>เลือกรางที่จะแบ่งผืนซ้าย/ขวา
                <select ${b('unequalSplitTarget')}>
                  <option value="both">แบ่งทั้งคู่ (ม่านทึบ + ม่านโปร่ง)</option>
                  <option value="opaque">เฉพาะรางม่านทึบ (ชั้นที่ 1)</option>
                  <option value="sheer">เฉพาะรางม่านโปร่ง (ชั้นที่ 2)</option>
                </select>
              </label>
              <label>ระยะแบ่งรางผืนซ้าย (ซม.)
                <input type="number" step="0.5" data-halfcm="1" ${b('splitLeft')} placeholder="เช่น 150">
              </label>
              <label>ระยะแบ่งรางผืนขวา (ซม.)
                <input type="number" step="0.5" data-halfcm="1" ${b('splitRight')} placeholder="เช่น 250">
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
      ` : ''}

      ${subTab === 'calc' ? `
      <!-- ส่วนที่ 4: การคำนวณขนาดและปริมาณผ้า (เลือกจากตารางผ้าของหน้านี้) -->
      <section class="pop-sec-card" id="popSec_calc">
        <div class="pop-sec-title">
          <span class="pop-sec-badge">ส่วนที่ 4</span>
          <b>การคำนวณขนาดราง ขนาดผ้าม่าน และปริมาณผ้า</b>
        </div>
        <div class="inline" style="justify-content:space-between;flex-wrap:wrap;margin-bottom:6px">
          <div class="inline">
            <button type="button" class="${w.calcMode !== 'manual' ? 'primary' : ''}" data-act="setAllAuto" data-i="${i}">⚡ อัตโนมัติทั้งหมด</button>
            <button type="button" class="${w.calcMode === 'manual' ? 'primary' : ''}" data-act="setAllManual" data-i="${i}">✍️ กรอกเองทั้งหมด</button>
          </div>
          <div class="inline">
            <button type="button" data-act="jumpToSheetFabrics">🧵 ตั้งค่าตารางผ้า</button>
            <button type="button" class="primary" data-act="applyFormula" data-i="${i}">🔄 คำนวณใหม่</button>
          </div>
        </div>

        ${showBlindPiecePanel ? buildBlindPiecesEditorHTML(w, i) : ''}
        ${autoHfBadgeHtml}

        <div class="pop-layer-box" style="margin-top:6px">
          <div class="pop-layer-hd">ชั้นที่ 1: ${esc(style1 || 'ผ้าม่านทึบ (กรุณาเลือกรูปแบบม่านและรายการผ้าก่อนคำนวณ)')}</div>
          <div class="grid2">
            <label>เลือกผ้าชั้นที่ 1 (ใช้เกรนจากตารางผ้าอัตโนมัติ)
              <select ${b('fabricCol1')}>${sheetFabOpts}</select>
            </label>
            <label>การแสดงจำนวนหลา (ชั้นที่ 1)
              <select ${b('yardMode1')}>${yardModeOpts}</select>
            </label>
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
            ${(w.yardMode1 === 'ceil_plus' || w.yardMode1 === 'exact_plus') ? `
              <label>จำนวนหลาที่ต้องการบวกเพิ่ม
                <input type="number" step="any" ${b('extraYards1')} placeholder="เช่น 1">
              </label>
            ` : ''}
          </div>
        </div>

        ${showLayer2Box ? `
        <div class="pop-layer-box" style="margin-top:6px">
          <div class="pop-layer-hd">ชั้นที่ 2: ${esc(w.curtainStyle2 || 'ผ้าม่านโปร่ง')}</div>
          <div class="grid2">
            <label>เลือกผ้าชั้นที่ 2 (ใช้เกรนจากตารางผ้าอัตโนมัติ)
              <select ${b('fabricCol2')}>${sheetFabOpts}</select>
            </label>
            <label>การแสดงจำนวนหลา (ชั้นที่ 2)
              <select ${b('yardMode2')}>${yardModeOpts}</select>
            </label>
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
            ${(w.yardMode2 === 'ceil_plus' || w.yardMode2 === 'exact_plus') ? `
              <label>จำนวนหลาที่ต้องการบวกเพิ่ม
                <input type="number" step="any" ${b('extraYards2')} placeholder="เช่น 1">
              </label>
            ` : ''}
          </div>
        </div>
        ` : ''}

        ${buildWindowLiningEditorHTML(w, i, sh, { showLayer2: showLayer2Box, isBlind1, isBlind2, fromPopover: true, sectionKey: 'calc' })}

        <table class="calc-ed" style="margin-top:6px">
          <tr><th></th><th>ขนาดกว้าง</th><th></th><th>ขนาดสูง</th><th></th><th>จำนวน</th><th></th><th>รวม (หน้า/หลา)</th></tr>
          ${(isBlind1 && !w.curtainStyle2) ? `
            ${calcRowEd('blackout', 'bo', (w.rowLabel2 || style1 || 'ม่านม้วน/มู่ลี่'), 'ผืน', 'ตร.ม.')}
          ` : `
            ${calcRowEd('rail', 'rail', (w.rowLabel1 || 'รางม่าน'), (w.railCountUnit || (isBlind1 && !w.curtainStyle2 ? 'ผืน' : 'ชั้น')), (w.noRail ? '' : (w.railUnit || 'เมตร')))}
            ${calcRowEd('blackout', 'bo', (w.rowLabel2 || (isBlind1 ? style1 : 'ผ้าม่านทึบ')), 'ผืน', isBlind1 ? 'ตร.ม.' : 'หน้า/หลา')}
            ${showLayer2Box ? calcRowEd('sheer', 'sh', (w.rowLabel3 || 'ผ้าม่านโปร่ง'), 'ผืน', isBlind2 ? 'ตร.ม.' : 'หน้า/หลา') : ''}
          `}
        </table>

        <div style="margin-top:6px;padding:7px 9px;background:#eef6ff;border:1px dashed #60a5fa;border-radius:6px">
          <div class="grid2">
            <label>ระยะลอย / กองพื้น (มาตรฐานลอย 1 ซม.)
              <select ${b('floorMode')}>${FLOOR_CLEARANCE_MODES.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select>
            </label>
            ${(w.floorMode === 'float' || w.floorMode === 'puddle') ? `
              <label>${w.floorMode === 'float' ? 'ระบุระยะลอยจากพื้น (ซม.)' : 'ระบุระยะกองพื้น (ซม.)'}
                <input type="text" inputmode="decimal" ${b('floorAdjust')} placeholder="${w.floorMode === 'float' ? 'เช่น 2' : 'เช่น 3'}">
              </label>
            ` : `<div></div>`}
          </div>
          <div style="font-size:11.5px;color:#1e3a8a;margin-top:3px">ผลปรับอัตโนมัติ: <b id="popFloorStatusSummary">${esc(formatFloorStatusSummary(w))}</b></div>
        </div>

        <details class="pop-adv-details" ${hasAdvCalc ? 'open' : ''}>
          <summary>⚙️ ตั้งค่าขั้นสูง (หน่วยราง / ชื่อแถว / แบ่งผืนมู่ลี่-ม่านม้วน)</summary>
          <div class="grid3">
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
                <option value="ชุด">ชุด (แสดงเมตร+ชุด เช่น 2.85 1 ชุด)</option>
                <option value="ชุด/เมตร">ชุด/เมตร</option>
                <option value="เมตร/ชุด">เมตร/ชุด</option>
                <option value="ตร.ม.">ตร.ม.</option>
              </select>
            </label>
            <label>ขั้นต่ำรางต่อชุด (เมตร)
              <input type="number" step="0.5" min="0.5" ${b('railMinLength')} placeholder="เช่น 2.00 หรือ 1.00">
            </label>
            <label class="full">กำหนดชื่อแถวเอง (รางม่าน / ผ้าม่านทึบ / ผ้าม่านโปร่ง)
              <span class="inline">
                <input ${b('rowLabel1')} placeholder="รางม่าน">
                <input ${b('rowLabel2')} placeholder="ผ้าม่านทึบ">
                <input ${b('rowLabel3')} placeholder="ผ้าม่านโปร่ง">
              </span>
            </label>
          </div>
        </details>
      </section>
      ` : ''}

      <!-- ส่วนที่ 5: รายการพิเศษ (ซ่อนไว้ก่อนตามคำขอ) -->
      <section class="pop-sec-card" id="popSec_special" hidden>
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
    bodyHTML = `
      <section class="pop-sec-card">
        <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:6px">
          <div class="pop-sec-title" style="margin:0"><span class="pop-sec-badge">ข้อมูลลูกค้า</span><b>เลือกจากรายชื่อเดิม พิมพ์ค้นหา หรือระบุใหม่ได้ทันที</b></div>
          <button type="button" data-pop-newplan="1" title="สร้างแปลนงานเพิ่มให้ลูกค้ารายนี้">🏠+ สร้างแปลนใหม่ให้ลูกค้ารายนี้</button>
        </div>
        <div class="grid2">
          <label class="full">ชื่อลูกค้า
            ${comboInputHTML({ kind: 'customer', sharedPath: 'customer.name', placeholder: 'เลือกชื่อลูกค้าเดิม หรือพิมพ์ชื่อใหม่...', autofocus: true })}
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
    bodyHTML = `
      <section class="pop-sec-card">
        <div class="pop-sec-title"><span class="pop-sec-badge">พนักงาน</span><b>เลือกจากรายชื่อพนักงาน พิมพ์ค้นหา หรือระบุเองได้ทันที</b></div>
        <div class="grid2">
          <label>เลขที่เอกสาร <input data-shared="staff.orderNo" data-pop-autofocus="1" placeholder="-"></label>
          <label>ชื่อพนักงานขาย
            ${comboInputHTML({ kind: 'staff', sharedPath: 'staff.name', placeholder: 'เลือกพนักงาน หรือพิมพ์ค้นหา/ระบุเอง...' })}
          </label>
          <label>แผนก <input data-shared="staff.dept"></label>
          <label>สาขา
            ${comboInputHTML({ kind: 'staffBranch', sharedPath: 'staff.branch', placeholder: 'เลือกสาขาของพนักงาน หรือระบุเอง...' })}
          </label>
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
    const mapPart = ctx.mapPart || 'room';
    const popPlanSvg = (typeof planPreviewSVG === 'function') ? planPreviewSVG((sh.plan && sh.plan.items) || []) : '';
    if (mapPart === 'notes') {
      title = '📝 แก้ไขหมายเหตุประจำห้อง';
      bodyHTML = `
        <section class="pop-sec-card">
          <div class="inline" style="justify-content:space-between;margin-bottom:6px">
            <b>📝 หมายเหตุประจำห้อง</b>
            <button type="button" data-act="addNote">➕ เพิ่มข้อหมายเหตุ</button>
          </div>
          <ol style="margin:0;padding-left:18px">
            ${(sh.notes || []).map((n, ni) => `<li style="margin-bottom:4px"><div class="inline"><input data-sheet="notes.${ni}" ${ni === 0 ? 'data-pop-autofocus="1"' : ''} placeholder="หมายเหตุข้อ ${ni + 1}"><button type="button" class="danger" data-act="delNote" data-i="${ni}">✕</button></div></li>`).join('')}
          </ol>
        </section>
      `;
    } else if (mapPart === 'roomOpts') {
      title = '🏠 แก้ไขสภาพหน้างาน / ห้อง';
      bodyHTML = `
        <section class="pop-sec-card">
          <div class="pop-sec-title"><span class="pop-sec-badge">สภาพหน้างาน</span><b>แอร์ผนัง / เหล็กดัด / มุ้งลวด / อ้างอิง</b></div>
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
          <div class="grid2" style="margin-top:6px">
            <label>ลำดับอ้างอิง (No.) <input data-sheet="room.refNo" data-pop-autofocus="1"></label>
            <label>โปรโมชัน (โปร.) <input data-sheet="room.promo"></label>
          </div>
        </section>
      `;
    } else {
      title = '🗺️ แก้ไขชื่อห้อง และแปลนห้อง';
      bodyHTML = `
        <section class="pop-sec-card">
          <div class="pop-sec-title"><span class="pop-sec-badge">ข้อมูลห้อง</span><b>ชื่อห้องและแปลนห้อง</b></div>
          <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:6px">
            <label style="flex:1;min-width:180px">ชื่อห้อง
              <input data-sheet="room.name" data-pop-autofocus="1" placeholder="เช่น ห้องนอนใหญ่, ห้องรับแขก">
            </label>
            <div class="inline" style="margin-top:16px">
              <button type="button" class="primary" data-act="openPlan">✏️ วาดแปลนห้อง &amp; กำหนดจุด</button>
              <button type="button" data-act="syncFromPlan" title="อัปเดตรายการหน้าต่าง/ประตูตามจุดในแปลน">🔄 ดึงจุดจากแปลน</button>
            </div>
          </div>
          <div id="popPlanMini" style="border:1px dashed #60a5fa;border-radius:8px;padding:6px;background:#f8fafc;cursor:pointer;text-align:center" title="คลิกเพื่อเปิดหน้าต่างวาดแปลนห้อง &amp; กำหนดจุดหน้าต่าง/ประตู">
            ${popPlanSvg || '<div style="padding:14px;color:#1d4ed8;font-size:12px">📐 ยังไม่มีแปลนห้อง — คลิกที่นี่เพื่อวาดแปลนห้องและกำหนดจุดหน้าต่าง/ประตู</div>'}
          </div>
        </section>
      `;
    }
  } else if (ctx.type === 'fabric') {
    const col = ctx.fabCol || 'blackout';
    const colTitles = {
      blackout: 'ผ้าม่านทึบ',
      sheer: 'ผ้าม่านโปร่ง',
      roller: 'ม่านม้วน',
      blinds: 'มู่ลี่',
      other: 'อื่นๆ / ผ้าเย็บประกบ',
    };
    title = `🧵 แก้ไขสินค้า — ${colTitles[col] || ''}`;
    const isBlindCol = col === 'roller' || col === 'blinds';

    bodyHTML = `
      <section class="pop-sec-card">
        <div class="pop-sec-title"><span class="pop-sec-badge">${colTitles[col] || ''}</span><b>เลือกจาก Dropdown, พิมพ์ค้นหา หรือระบุเองในช่องเดียว</b></div>
        ${ctx.lastPickedMsg ? `<div style="margin-bottom:6px;padding:4px 8px;background:#dcfce7;border:1px solid #86efac;border-radius:6px;color:#166534;font-size:12px;font-weight:600">${esc(ctx.lastPickedMsg)}</div>` : ''}
        ${(col === 'blackout' || col === 'sheer' || col === 'other') ? `
          <div class="opts" style="padding:6px 8px;background:#f0f7ff;border:1px solid #bfdbfe;border-radius:6px;margin-bottom:6px">
            <span class="olbl" style="font-weight:700;color:#0b3a8c">เกรนคำนวณผ้า:</span>
            <label><input type="radio" name="pop_fab_grain_${col}" value="opaque" data-fab-grain="${col}"> เกรนทึบ</label>
            <label><input type="radio" name="pop_fab_grain_${col}" value="sheer" data-fab-grain="${col}"> เกรนโปร่ง</label>
          </div>
        ` : ''}
        ${col === 'other' ? `<label style="margin-bottom:6px">หัวข้อคอลัมน์อื่นๆ <input data-sheet="fabrics.other.label"></label>` : ''}
        ${isBlindCol ? `
          <div class="grid2">
            <label>ชื่อรุ่น${col === 'roller' ? 'ม่านม้วน' : 'มู่ลี่ / ม่านปรับแสง'} (เลือกรุ่นก่อน)
              ${comboInputHTML({ kind: 'blindGroup', col, sheetPath: `fabrics.${col}.group`, placeholder: 'เลือกชื่อรุ่น เช่น P100 หรือระบุเอง...', autofocus: true })}
            </label>
            <label>รหัสสินค้า (ตามรุ่นที่เลือก)
              ${comboInputHTML({ kind: 'blindCode', col, sheetPath: `fabrics.${col}.name`, placeholder: 'เลือกรหัสสินค้า เช่น P101 หรือระบุเอง...' })}
            </label>
            <label>สีใบ / สีผ้า <input data-sheet="fabrics.${col}.color" placeholder="ระบุสี"></label>
            <label>ปริมาณรวม (ตร.ม.) <input data-sheet="fabrics.${col}.qty" placeholder="คำนวณอัตโนมัติ"></label>
          </div>
          ${col === 'blinds' ? `
            <div class="grid2" style="margin-top:6px;padding-top:6px;border-top:1px dashed #cbd5e1">
              <label>ประเภทเชือก (ดึงชุดสีแยกเชือกเทป/สลิง)
                <select data-sheet="fabrics.blinds.cordType">
                  <option value="เชือกเทป">เชือกเทป</option>
                  <option value="เชือกสลิง">เชือกสลิง</option>
                </select>
              </label>
              <label>สีเชือก (แยกตามประเภทเชือกที่เลือก)
                ${comboInputHTML({ kind: 'blindCord', col: 'blinds', sheetPath: 'fabrics.blinds.cordColor', placeholder: 'เลือกสีเชือก หรือพิมพ์ระบุเอง...' })}
              </label>
              <label class="full">สีกล่องบังรางมู่ลี่
                ${comboInputHTML({ kind: 'blindValance', col: 'blinds', sheetPath: 'fabrics.blinds.valanceColor', placeholder: 'เลือกสีกล่องบังราง หรือพิมพ์ระบุเอง...' })}
              </label>
            </div>
          ` : ''}
        ` : `
          <div class="grid2">
            <label>ชื่อผ้า / รุ่นสินค้า
              ${comboInputHTML({ kind: 'fabric', col, sheetPath: `fabrics.${col}.name`, placeholder: 'เลือกผ้าจาก Dropdown หรือพิมพ์ค้นหา/ระบุเอง...', autofocus: true })}
            </label>
            <label>รหัสดีไซน์ <input data-sheet="fabrics.${col}.design" placeholder="อัตโนมัติเมื่อเลือกผ้า"></label>
            <label>สี <input data-sheet="fabrics.${col}.color" placeholder="ระบุสีผ้า"></label>
            <label>ปริมาณรวม (หลา) <input data-sheet="fabrics.${col}.qty" placeholder="คำนวณอัตโนมัติ"></label>
          </div>
        `}
      </section>
    `;
  } else if (ctx.type === 'rod') {
    const part = ctx.rodPart || 'rodType';
    const slot = ctx.rodSlot || '';
    const slotHl = key => (slot && slot === key) ? ' style="margin-bottom:6px;padding:6px 8px;background:#eff6ff;border:1px solid #93c5fd;border-radius:6px"' : ' style="margin-bottom:6px"';
    const rodPartTitles = {
      rodType: '🛤️ แก้ไขประเภทรางม่าน (คลิกเลือกรางใดก็ได้อิสระ)',
      holdBack: '🪝 แก้ไขตะขอสายรวบ',
      drawRod: '🦯 แก้ไขก้านจูง',
      grommet: '⭕ แก้ไขห่วงตาไก่',
    };
    title = rodPartTitles[part] || '🛤️ แก้ไขรางม่านและอุปกรณ์';
    bodyHTML = `
      ${part === 'rodType' ? `
        <section class="pop-sec-card">
          <label class="inline" style="margin:2px 0 8px;font-weight:700"><input type="checkbox" data-sheet="rods.typeNo"> ไม่รับรางม่าน</label>
          <div class="grid2"${slotHl('pleat')}>
            <label>รางม่านจีบ
              ${comboInputHTML({ kind: 'rail', col: 'pleat', sheetPath: 'rods.pleat.model', placeholder: 'เลือกรางม่านจีบ หรือพิมพ์ระบุเอง...' })}
            </label>
            <label>สี <input data-sheet="rods.pleat.color"></label>
          </div>
          <div class="grid3"${slotHl('show')}>
            <label>รางโชว์
              ${comboInputHTML({ kind: 'rail', col: 'show', sheetPath: 'rods.show.model', placeholder: 'เลือกรางโชว์ หรือพิมพ์ระบุเอง...' })}
            </label>
            <label>สี <input data-sheet="rods.show.color"></label>
            <label>หัวปิดราง <input data-sheet="rods.show.cap"></label>
          </div>
          <div class="grid2"${slotHl('wave')}>
            <label>รางม่านลอน
              ${comboInputHTML({ kind: 'rail', col: 'wave', sheetPath: 'rods.wave.model', placeholder: 'เลือกรางม่านลอน หรือพิมพ์ระบุเอง...' })}
            </label>
            <label>สี <input data-sheet="rods.wave.color"></label>
          </div>
          <div class="grid2"${slot === 'fold' ? ' style="padding:6px 8px;background:#eff6ff;border:1px solid #93c5fd;border-radius:6px"' : ''}>
            <label>รางม่านพับ
              ${comboInputHTML({ kind: 'rail', col: 'fold', sheetPath: 'rods.fold.model', placeholder: 'เลือกรางม่านพับ หรือพิมพ์ระบุเอง...' })}
            </label>
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
        secEl.scrollIntoView({ behavior: 'auto', block: 'start' });
      }, 20);
    }
  }

  if (!opts.preserveScroll) {
    const af = pop.querySelector('[data-pop-autofocus="1"]');
    if (af) {
      setTimeout(() => {
        try {
          if (af.closest && af.closest('.mto-combo')) af.dataset.skipAutoCombo = '1';
          af.focus({ preventScroll: true });
          if (af.select) af.select();
        } catch (e) {}
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

// ปิด Popover เมื่อคลิกพื้นที่ว่างนอกใบงานหรือกด Escape + คีย์ลัด Undo (Ctrl+Z) / Redo (Ctrl+Y)
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closePdfQuickPopover(); return; }
  if (!activeOrderId) return;
  const mod = e.ctrlKey || e.metaKey;
  if (!mod || e.altKey) return;
  // หากเปิด Modal อื่น (วาดแปลน / ฐานข้อมูล / นำเข้า PDF) หรือกำลังพิมพ์ในช่องข้อความ ให้ใช้ Undo ของช่องนั้นเอง
  const modalOpen = ['planModal', 'dbModal', 'pdfImportModal', 'syncModal', 'sheetOrderModal']
    .some(id => { const el = document.getElementById(id); return el && !el.hidden; });
  if (modalOpen) return;
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  const k = String(e.key || '').toLowerCase();
  if (k === 'z' && !e.shiftKey) {
    e.preventDefault();
    undoOrderChange();
  } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
    e.preventDefault();
    redoOrderChange();
  }
});

const btnOrderUndoEl = document.getElementById('btnOrderUndo');
if (btnOrderUndoEl) btnOrderUndoEl.addEventListener('click', () => undoOrderChange());
const btnOrderRedoEl = document.getElementById('btnOrderRedo');
if (btnOrderRedoEl) btnOrderRedoEl.addEventListener('click', () => redoOrderChange());

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
    const isRoomOpts = !!e.target.closest('.s-map .rt, .s-map [data-map-part="roomOpts"]');
    const mapPart = isNotes ? 'notes' : (isRoomOpts ? 'roomOpts' : 'room');
    switchToSheetSection(sIdx, isNotes ? 'secNotes' : 'secPlan', isNotes ? '[data-note="0"]' : '[data-sheet="room.name"]');
    openPdfQuickPopover({ type: 'map', sIdx, mapPart }, e.clientX, e.clientY);
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
    const slotEl = e.target.closest('[data-rod-slot]');
    const rodSlot = slotEl ? slotEl.dataset.rodSlot : '';
    switchToSheetSection(sIdx, 'secRods', rodSlot ? `[data-sheet="rods.${rodSlot}.model"]` : null);
    openPdfQuickPopover({ type: 'rod', sIdx, rodPart, rodSlot }, e.clientX, e.clientY);
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
const orderStaffFilterEl = document.getElementById('orderStaffFilter');
if (orderStaffFilterEl) orderStaffFilterEl.addEventListener('change', renderDashboard);

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
    const uBrs = (typeof getStaffBranchList === 'function') ? getStaffBranchList(u) : [];
    const allBrs = (typeof getAllBranchesList === 'function') ? getAllBranchesList() : [];
    ord.staff.branch = uBrs[0] || allBrs[0] || '';
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
MtoCombo.init();
if (typeof PdfHandwritingImporter !== 'undefined') PdfHandwritingImporter.init();

const btnImportPdfEl = document.getElementById('btnImportPdf');
if (btnImportPdfEl) {
  btnImportPdfEl.addEventListener('click', () => {
    if (typeof PdfHandwritingImporter !== 'undefined') PdfHandwritingImporter.open();
  });
}

// Req #8: กด Tab / Enter ที่ช่องขนาดหน้าต่าง/ประตู (data-dim-num) ให้เลื่อนไปช่องใส่ขนาดถัดไปทันที (ข้ามช่องหมายเหตุ)
document.addEventListener('keydown', e => {
  const el = e.target;
  if (!el || !el.dataset) return;
  if (el.dataset.bpQuick !== undefined && e.key === 'Enter') {
    e.preventDefault();
    actions.applyBlindQuickWidths(+el.dataset.bpQuick);
    return;
  }
  if (el.dataset.dimNum === '1' && (e.key === 'Tab' || e.key === 'Enter')) {
    const scope = el.closest('#pdfQuickPopover') || el.closest('.win-ed') || document;
    const allDims = Array.from(scope.querySelectorAll('input[data-dim-num="1"]:not([disabled]):not([readonly])'))
      .filter(inp => inp.offsetParent !== null);
    const curIdx = allDims.indexOf(el);
    if (curIdx >= 0 && allDims.length > 1) {
      const nextIdx = e.shiftKey ? (curIdx - 1) : (curIdx + 1);
      if (nextIdx >= 0 && nextIdx < allDims.length) {
        e.preventDefault();
        const nxt = allDims[nextIdx];
        nxt.focus();
        if (typeof nxt.select === 'function') nxt.select();
      }
    }
  }
});

// Req #10: Checkbox "สูงเท่ากันทุกผืน" สำหรับม่านม้วน/มู่ลี่
document.addEventListener('change', e => {
  const el = e.target;
  if (el && el.dataset && el.dataset.bpSameh !== undefined) {
    const sh = currentSheet();
    const w = sh && sh.windows[+el.dataset.bpSameh];
    if (w) {
      w.blindSameHeight = !!el.checked;
      if (w.blindSameHeight && Array.isArray(w.blindPieces) && w.blindPieces.length > 1) {
        const refH = (w.blindPieces[0] && w.blindPieces[0].h) || String(calcRailHeight(w) || w.height || '').replace(/\*/g, '');
        w.blindPieces.forEach(p => { if (p) p.h = refH; });
        autoCalculateWindow(w, sh);
        autoUpdateSheetFabricTableQty(sh);
        syncSheetInputs();
        renderPreview();
      }
      if (typeof refreshActivePopover === 'function') refreshActivePopover();
      scheduleBackgroundAutoSave(1200);
    }
  }
});
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

// Auto Save แบบเบื้องหลัง: บันทึกเฉพาะเมื่อมีการแก้ไขค้างอยู่ (ทุก 30 วินาทีตอนเบราว์เซอร์ว่าง) + บันทึกทันทีเมื่อสลับแท็บหรือปิดหน้าเว็บ
if (autoSaveIntervalId) clearInterval(autoSaveIntervalId);
autoSaveIntervalId = setInterval(() => {
  if (autoSaveDirty && activeOrderId && isUserLoggedIn()) {
    runWhenIdle(() => flushAutoSaveNow());
  }
}, 30000);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && isUserLoggedIn() && activeOrderId) {
    flushAutoSaveNow();
  }
});
window.addEventListener('pagehide', () => {
  if (isUserLoggedIn() && activeOrderId) flushAutoSaveNow();
});
window.addEventListener('beforeunload', () => {
  if (isUserLoggedIn() && activeOrderId) flushAutoSaveNow();
});

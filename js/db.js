/* =========================================================
   Master Database – Staff (with Username/Password/Role),
   Curtain Styles, Hook Sizes, Dimension Remarks,
   Width Calculation Formulas (by Curtain Style, multi-value),
   and Height Calculation Formulas (by Curtain Style + Rod Type + Hook Size, multi-value)
   ========================================================= */
const DB_KEY = 'mto-master-db-v5';

const ROD_TYPES_LIST = [
  'รางม่านจีบ',
  'รางโชว์',
  'รางม่านลอน',
  'รางม่านพับ',
];

function defaultMasterDB() {
  return {
    staff: [
      {
        id: 'admin_t58121',
        username: 'T58121',
        password: 'Admin',
        role: 'admin',
        name: 'นฤชา',
        dept: 'ขาย',
        branch: 'สาขาเซ็นทรัลลาดพร้าว',
      },
    ],
    curtains: [
      { id: 'c1', name: 'ม่านจีบ', useHook: true },
      { id: 'c2', name: 'ม่านลอน', useHook: true },
      { id: 'c3', name: 'ม่านตาไก่', useHook: false },
      { id: 'c4', name: 'ม่านพับ', useHook: false },
      { id: 'c5', name: 'ม่านม้วน', useHook: false },
      { id: 'c6', name: 'มู่ลี่ไม้', useHook: false },
      { id: 'c7', name: 'มู่ลี่อลูมิเนียม', useHook: false },
      { id: 'c8', name: 'ม่านปรับแสง', useHook: false },
    ],
    hooks: [
      { id: 'h1', name: 'No.5' },
      { id: 'h2', name: 'No.6' },
      { id: 'h3', name: 'No.8' },
      { id: 'h4', name: 'No.9' },
    ],
    remarks: [
      { id: 'r1', name: 'ชนแอร์' },
      { id: 'r2', name: 'ปลั๊กไฟ' },
      { id: 'r3', name: 'บิ้วอิน' },
      { id: 'r4', name: 'ตู้' },
      { id: 'r5', name: 'เตียง' },
      { id: 'r6', name: 'ติดเสา' },
      { id: 'r7', name: 'ชนฝ้าหลุม' },
    ],
    // ฐานข้อมูลการคำนวณขนาดความกว้างผ้าม่านตามรูปแบบผ้าม่าน (กำหนดได้หลายค่าต่อรูปแบบผ้าม่าน)
    widthFormulas: [
      {
        id: 'wf1',
        curtainStyle: 'ม่านจีบ',
        label: 'ม่านจีบ มาตรฐาน (กว้างเท่ากับราง RW • ลอน 2.5 เท่า)',
        widthExp: 'RW',
        piecesExp: 'ceil((RW * 2.5) / 130)',
        qtyExp: 'round(((P * (HC + 35)) / 90) * 10) / 10',
      },
      {
        id: 'wf2',
        curtainStyle: 'ม่านจีบ',
        label: 'ม่านจีบ เผื่อซ้อนกลาง +10 ซม. (RW + 10 • ลอน 2.5 เท่า)',
        widthExp: 'RW + 10',
        piecesExp: 'ceil(((RW + 10) * 2.5) / 130)',
        qtyExp: 'round(((P * (HC + 35)) / 90) * 10) / 10',
      },
      {
        id: 'wf3',
        curtainStyle: 'ม่านจีบ',
        label: 'ม่านจีบ ลอน 2.2 เท่า (ประหยัดผ้า)',
        widthExp: 'RW',
        piecesExp: 'ceil((RW * 2.2) / 130)',
        qtyExp: 'round(((P * (HC + 35)) / 90) * 10) / 10',
      },
      {
        id: 'wf4',
        curtainStyle: 'ม่านลอน',
        label: 'ม่านลอน มาตรฐาน (กว้างเท่ากับราง RW • ลอน 2.2 เท่า)',
        widthExp: 'RW',
        piecesExp: '2',
        qtyExp: 'round((((RW * 2.2) + 30) / 90) * 10) / 10',
      },
      {
        id: 'wf5',
        curtainStyle: 'ม่านลอน',
        label: 'ม่านลอน ลอนลึก 2.5 เท่า (กว้างเท่ากับราง RW)',
        widthExp: 'RW',
        piecesExp: '2',
        qtyExp: 'round((((RW * 2.5) + 30) / 90) * 10) / 10',
      },
      {
        id: 'wf6',
        curtainStyle: 'ม่านตาไก่',
        label: 'ม่านตาไก่ มาตรฐาน (กว้างเท่ากับราง RW • ลอน 2.2 เท่า)',
        widthExp: 'RW',
        piecesExp: 'ceil((RW * 2.2) / 130)',
        qtyExp: 'round(((P * (HC + 35)) / 90) * 10) / 10',
      },
      {
        id: 'wf7',
        curtainStyle: 'ม่านตาไก่',
        label: 'ม่านตาไก่ ลอน 2.5 เท่า (กว้างเท่ากับราง RW)',
        widthExp: 'RW',
        piecesExp: 'ceil((RW * 2.5) / 130)',
        qtyExp: 'round(((P * (HC + 35)) / 90) * 10) / 10',
      },
      {
        id: 'wf8',
        curtainStyle: 'ม่านพับ',
        label: 'ม่านพับ มาตรฐาน (กว้างเท่ากับราง RW)',
        widthExp: 'RW',
        piecesExp: '1',
        qtyExp: 'round(((ceil(RW / 120) * (HC + 40)) / 90) * 10) / 10',
      },
      {
        id: 'wf9',
        curtainStyle: 'ม่านม้วน',
        label: 'ม่านม้วน มาตรฐาน (กว้างเท่ากับราง RW)',
        widthExp: 'RW',
        piecesExp: '1',
        qtyExp: 'round(((WC / 100) * (HC / 100) * 1.2) * 10) / 10',
      },
      {
        id: 'wf10',
        curtainStyle: '*',
        label: 'ทั่วไป: กว้างเท่ากับความกว้างราง (RW)',
        widthExp: 'RW',
        piecesExp: '2',
        qtyExp: 'round(((2 * (HC + 30)) / 90) * 10) / 10',
      },
    ],
    // ฐานข้อมูลการคำนวณขนาดความสูงผ้าม่านตามรูปแบบผ้าม่าน + ประเภทรางม่าน + ขนาดตะขอ (กำหนดได้หลายค่า)
    heightFormulas: [
      {
        id: 'hf1',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางม่านจีบ',
        hookSize: 'No.5',
        label: 'ม่านจีบ + รางม่านจีบ + ตะขอ No.5 (หัก 1.5 ซม.)',
        heightExp: 'RH - 1.5',
      },
      {
        id: 'hf2',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางม่านจีบ',
        hookSize: 'No.6',
        label: 'ม่านจีบ + รางม่านจีบ + ตะขอ No.6 (หัก 2 ซม.)',
        heightExp: 'RH - 2',
      },
      {
        id: 'hf3',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางม่านจีบ',
        hookSize: 'No.8',
        label: 'ม่านจีบ + รางม่านจีบ + ตะขอ No.8 (หัก 1 ซม.)',
        heightExp: 'RH - 1',
      },
      {
        id: 'hf4',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางม่านจีบ',
        hookSize: 'No.9',
        label: 'ม่านจีบ + รางม่านจีบ + ตะขอ No.9 (เท่าความสูงราง RH)',
        heightExp: 'RH',
      },
      {
        id: 'hf5',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางโชว์',
        hookSize: '*',
        label: 'ม่านจีบ + รางโชว์ (หักหัวรางโชว์ 4 ซม.)',
        heightExp: 'RH - 4',
      },
      {
        id: 'hf6',
        curtainStyle: 'ม่านลอน',
        rodType: 'รางม่านลอน',
        hookSize: '*',
        label: 'ม่านลอน + รางม่านลอน (หักราง 2.5 ซม.)',
        heightExp: 'RH - 2.5',
      },
      {
        id: 'hf7',
        curtainStyle: 'ม่านลอน',
        rodType: 'รางม่านลอน',
        hookSize: '*',
        label: 'ม่านลอน + รางม่านลอน ลอยพื้นเพิ่ม (หัก 3.5 ซม.)',
        heightExp: 'RH - 3.5',
      },
      {
        id: 'hf8',
        curtainStyle: 'ม่านตาไก่',
        rodType: 'รางโชว์',
        hookSize: '*',
        label: 'ม่านตาไก่ + รางโชว์ (บวกหัวม่านเหนือราง +3 ซม.)',
        heightExp: 'RH + 3',
      },
      {
        id: 'hf9',
        curtainStyle: 'ม่านตาไก่',
        rodType: 'รางโชว์',
        hookSize: '*',
        label: 'ม่านตาไก่ + รางโชว์ (เท่าความสูงราง RH)',
        heightExp: 'RH',
      },
      {
        id: 'hf10',
        curtainStyle: 'ม่านพับ',
        rodType: 'รางม่านพับ',
        hookSize: '*',
        label: 'ม่านพับ + รางม่านพับ (เท่าความสูงราง RH)',
        heightExp: 'RH',
      },
      {
        id: 'hf11',
        curtainStyle: 'ม่านม้วน',
        rodType: '*',
        hookSize: '*',
        label: 'ม่านม้วน (เท่าความสูงราง RH)',
        heightExp: 'RH',
      },
      {
        id: 'hf12',
        curtainStyle: '*',
        rodType: '*',
        hookSize: '*',
        label: 'ทั่วไป: เท่ากับความสูงราง (RH)',
        heightExp: 'RH',
      },
    ],
  };
}

/**
 * รับประกันว่ามีบัญชีแอดมินตั้งต้น username = T58121, password = Admin, role = admin เสมอ
 */
function ensureDefaultAdmin(staffList) {
  const list = Array.isArray(staffList) ? staffList.map(s => Object.assign({
    id: s.id || ('st_' + Math.random().toString(36).slice(2, 7)),
    username: s.username || '',
    password: s.password || '',
    role: s.role === 'admin' ? 'admin' : 'staff',
    name: s.name || '',
    dept: s.dept || '',
    branch: s.branch || '',
  }, s)) : [];

  const adminIdx = list.findIndex(s => String(s.username || '').trim().toUpperCase() === 'T58121');
  if (adminIdx >= 0) {
    list[adminIdx].username = 'T58121';
    if (!list[adminIdx].password) list[adminIdx].password = 'Admin';
    list[adminIdx].role = 'admin';
    if (!list[adminIdx].name) list[adminIdx].name = 'Admin (T58121)';
  } else {
    // หากรายการแรกเป็นพนักงานเดิมที่ยังไม่มี username ให้ผูกหรือแทรกแอดมินตั้งต้นเข้าไป
    if (list.length === 1 && !list[0].username && list[0].name === 'นฤชา') {
      list[0].username = 'T58121';
      list[0].password = 'Admin';
      list[0].role = 'admin';
    } else {
      list.unshift({
        id: 'admin_t58121',
        username: 'T58121',
        password: 'Admin',
        role: 'admin',
        name: 'นฤชา',
        dept: 'ขาย',
        branch: 'สาขาเซ็นทรัลลาดพร้าว',
      });
    }
  }
  return list;
}

function normalizeMasterDBObject(raw) {
  const def = defaultMasterDB();
  if (!raw || typeof raw !== 'object') return def;
  return {
    staff: ensureDefaultAdmin(Array.isArray(raw.staff) ? raw.staff : def.staff),
    curtains: Array.isArray(raw.curtains) && raw.curtains.length ? raw.curtains : def.curtains,
    hooks: Array.isArray(raw.hooks) && raw.hooks.length ? raw.hooks : def.hooks,
    remarks: Array.isArray(raw.remarks) && raw.remarks.length ? raw.remarks : def.remarks,
    widthFormulas: Array.isArray(raw.widthFormulas) && raw.widthFormulas.length ? raw.widthFormulas : def.widthFormulas,
    heightFormulas: Array.isArray(raw.heightFormulas) && raw.heightFormulas.length ? raw.heightFormulas : def.heightFormulas,
  };
}

let masterDB = (() => {
  try {
    const raw = JSON.parse(
      localStorage.getItem(DB_KEY) ||
      localStorage.getItem('mto-master-db-v4') ||
      localStorage.getItem('mto-master-db-v3') ||
      localStorage.getItem('mto-master-db-v2')
    );
    return normalizeMasterDBObject(raw);
  } catch {
    return defaultMasterDB();
  }
})();

function saveMasterDB() {
  masterDB.staff = ensureDefaultAdmin(masterDB.staff);
  try { localStorage.setItem(DB_KEY, JSON.stringify(masterDB)); } catch (e) { console.warn(e); }
  refreshRemarksDatalist();
  if (typeof RealtimeSync !== 'undefined') RealtimeSync.schedulePush();
}

function refreshRemarksDatalist() {
  const dl = document.getElementById('dlRemarks');
  if (!dl) return;
  const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  dl.innerHTML = (masterDB.remarks || []).map(r => `<option value="${escH(r.name)}">`).join('');
}

/**
 * Safe formula evaluator for curtain width, height, pieces & fabric quantity
 * Supported variables:
 *   W  = ความกว้างเฟรม (cm)
 *   H  = ความสูงเฟรม (cm)
 *   EL = เผื่อซ้าย, ER = เผื่อขวา, ET = เผื่อบน, EB = เผื่อล่าง (cm)
 *   RW = ความกว้างราง = W + EL + ER (cm)
 *   RH = ความสูงราง = H + ET + EB (cm)
 *   FW = ความกว้างเต็ม, FH = ความสูงเต็ม (cm)
 *   WC = ความกว้างผ้าม่านที่คำนวณได้ (cm)
 *   HC = ความสูงผ้าม่านที่คำนวณได้ (cm)
 *   P  = จำนวนผืน
 * Supported functions: ceil(), floor(), round(), max(), min()
 */
function evalFormulaExpr(expr, vars) {
  if (!expr || !String(expr).trim()) return '';
  try {
    const fn = new Function(
      'W', 'H', 'EL', 'ER', 'ET', 'EB', 'RW', 'RH', 'FW', 'FH', 'WC', 'HC', 'P',
      'ceil', 'floor', 'round', 'max', 'min',
      `"use strict"; return (${expr});`
    );
    const res = fn(
      vars.W, vars.H, vars.EL, vars.ER, vars.ET, vars.EB,
      vars.RW, vars.RH, vars.FW, vars.FH, vars.WC, vars.HC, vars.P,
      Math.ceil, Math.floor, Math.round, Math.max, Math.min
    );
    if (res === undefined || res === null || Number.isNaN(res) || !Number.isFinite(res)) return '';
    return String(Math.round(res * 100) / 100);
  } catch (e) {
    console.warn('Formula error:', expr, e);
    return '';
  }
}

function getWidthFormulasForStyle(curtainStyle) {
  const all = masterDB.widthFormulas || [];
  if (!curtainStyle) return all;
  const matched = all.filter(f => !f.curtainStyle || f.curtainStyle === '*' || f.curtainStyle === curtainStyle || curtainStyle.includes(f.curtainStyle));
  return matched.length ? matched : all;
}

function getHeightFormulasForWindow(curtainStyle, rodType, hookSize) {
  const all = masterDB.heightFormulas || [];
  const matched = all.filter(f => {
    const matchStyle = !curtainStyle || !f.curtainStyle || f.curtainStyle === '*' || f.curtainStyle === curtainStyle || curtainStyle.includes(f.curtainStyle);
    const matchRod = !rodType || !f.rodType || f.rodType === '*' || f.rodType === rodType;
    const matchHook = !hookSize || !f.hookSize || f.hookSize === '*' || f.hookSize === hookSize;
    return matchStyle && matchRod && matchHook;
  });
  return matched.length ? matched : all;
}

/**
 * คำนวณขนาดความกว้างและความสูงผ้าม่านจากสูตรความกว้าง (wf) และสูตรความสูง (hf)
 */
function computeCurtainLayerByWidthHeight(w, wf, hf) {
  const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const W = num(w.width), H = num(w.height);
  const EL = num(w.extL), ER = num(w.extR), ET = num(w.extT), EB = num(w.extB);
  const RW = W + EL + ER;
  const RH = H + ET + EB;
  const FW = num(w.fullW), FH = num(w.fullH);
  const vars = { W, H, EL, ER, ET, EB, RW, RH, FW, FH, WC: RW, HC: RH, P: 2 };

  const a = wf && wf.widthExp ? evalFormulaExpr(wf.widthExp, vars) : (RW ? String(RW) : '');
  vars.WC = num(a) || RW;

  const b = hf && hf.heightExp ? evalFormulaExpr(hf.heightExp, vars) : (RH ? String(RH) : '');
  vars.HC = num(b) || RH;

  const n = wf && wf.piecesExp ? evalFormulaExpr(wf.piecesExp, vars) : (RW ? '2' : '');
  vars.P = num(n) || 1;

  const t = wf && wf.qtyExp ? evalFormulaExpr(wf.qtyExp, vars) : '';
  return { a, b, n, t, RW, RH };
}

/**
 * Check if a window's selected curtain styles require hook size.
 */
function curtainNeedsHook(style1, style2) {
  const checkOne = name => {
    if (!name) return false;
    const found = masterDB.curtains.find(c => c.name === name);
    if (found) return !!found.useHook;
    return /จีบ|ลอน/.test(name);
  };
  return checkOne(style1) || checkOne(style2);
}

/** Combine opaque and sheer curtain style names with " / " when different */
function formatCurtainType(w) {
  const s1 = (w.curtainStyle1 || '').trim();
  const s2 = (w.curtainStyle2 || '').trim();
  if (s1 && s2 && s1 !== s2) return `${s1} / ${s2}`;
  if (s1) return s1;
  if (s2) return s2;
  return (w.curtainType || '').trim();
}

/* ---------------- Modal UI for Master DB ---------------- */
const MasterDBModal = (() => {
  let activeTab = 'staff';
  let onUpdate = null;

  const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function curtainSelectOpts(selected) {
    const opts = [['*', 'ทั้งหมด (*)'], ...(masterDB.curtains || []).map(c => [c.name, c.name])];
    return opts.map(([v, t]) => `<option value="${escH(v)}" ${(selected || '*') === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
  }

  function rodSelectOpts(selected) {
    const opts = [['*', 'ทั้งหมด (*)'], ...ROD_TYPES_LIST.map(r => [r, r])];
    return opts.map(([v, t]) => `<option value="${escH(v)}" ${(selected || '*') === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
  }

  function hookSelectOpts(selected) {
    const opts = [['*', 'ทั้งหมด / ไม่ใช้ (*)'], ...(masterDB.hooks || []).map(h => [h.name, h.name])];
    return opts.map(([v, t]) => `<option value="${escH(v)}" ${(selected || '*') === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
  }

  function render() {
    const body = document.getElementById('dbBody');
    document.querySelectorAll('[data-dbtab]').forEach(b => b.classList.toggle('active', b.dataset.dbtab === activeTab));

    if (activeTab === 'staff') {
      body.innerHTML = `
        <p class="hint" style="margin-bottom:8px">จัดการบัญชีผู้ใช้งานและรายชื่อพนักงาน (แอดมินเห็นและแก้ไขได้ทุกคน • พนักงานทั่วไปเห็นและแก้ไขได้เฉพาะของตัวเอง)</p>
        <table class="ed-tbl">
          <thead>
            <tr>
              <th style="width:110px">Username</th>
              <th style="width:110px">Password</th>
              <th style="width:125px">สิทธิ์ (Role)</th>
              <th>ชื่อพนักงาน (S.R.)</th>
              <th>แผนก (DEPT.)</th>
              <th>สาขา (Branch)</th>
              <th style="width:50px">ลบ</th>
            </tr>
          </thead>
          <tbody>
            ${masterDB.staff.map((st, i) => `
              <tr>
                <td><input data-db-edit="staff.${i}.username" value="${escH(st.username || '')}" placeholder="Username"></td>
                <td><input data-db-edit="staff.${i}.password" value="${escH(st.password || '')}" placeholder="Password"></td>
                <td>
                  <select data-db-edit="staff.${i}.role">
                    <option value="staff" ${st.role !== 'admin' ? 'selected' : ''}>พนักงาน (Staff)</option>
                    <option value="admin" ${st.role === 'admin' ? 'selected' : ''}>แอดมิน (Admin)</option>
                  </select>
                </td>
                <td><input data-db-edit="staff.${i}.name" value="${escH(st.name)}" placeholder="ชื่อพนักงาน"></td>
                <td><input data-db-edit="staff.${i}.dept" value="${escH(st.dept)}" placeholder="แผนก"></td>
                <td><input data-db-edit="staff.${i}.branch" value="${escH(st.branch)}" placeholder="สาขา"></td>
                <td class="c"><button type="button" class="danger" data-db-del="staff.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="staff">➕ เพิ่มพนักงาน / ผู้ใช้งาน</button>
      `;
    } else if (activeTab === 'curtains') {
      body.innerHTML = `
        <p class="hint" style="margin-bottom:8px">กำหนดรายชื่อรูปแบบผ้าม่าน และติ๊ก "ใช้ตะขอ" สำหรับม่านจีบ/ม่านลอน (เพื่อให้เลือกขนาดตะขอได้)</p>
        <table class="ed-tbl">
          <thead><tr><th>ชื่อรูปแบบผ้าม่าน</th><th style="width:150px">ใช้ตะขอ (จีบ/ลอน)</th><th style="width:60px">ลบ</th></tr></thead>
          <tbody>
            ${masterDB.curtains.map((c, i) => `
              <tr>
                <td><input data-db-edit="curtains.${i}.name" value="${escH(c.name)}" placeholder="เช่น ม่านจีบ"></td>
                <td class="c"><input type="checkbox" data-db-edit="curtains.${i}.useHook" ${c.useHook ? 'checked' : ''}></td>
                <td class="c"><button type="button" class="danger" data-db-del="curtains.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="curtains">➕ เพิ่มรูปแบบผ้าม่าน</button>
      `;
    } else if (activeTab === 'hooks') {
      body.innerHTML = `
        <p class="hint" style="margin-bottom:8px">กำหนดรายการขนาดตะขอ (แสดงให้เลือกเมื่อรูปแบบม่านเป็นม่านจีบ หรือ ม่านลอน)</p>
        <table class="ed-tbl">
          <thead><tr><th>ขนาดตะขอ</th><th style="width:60px">ลบ</th></tr></thead>
          <tbody>
            ${masterDB.hooks.map((h, i) => `
              <tr>
                <td><input data-db-edit="hooks.${i}.name" value="${escH(h.name)}" placeholder="เช่น No.5"></td>
                <td class="c"><button type="button" class="danger" data-db-del="hooks.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="hooks">➕ เพิ่มขนาดตะขอ</button>
      `;
    } else if (activeTab === 'remarks') {
      body.innerHTML = `
        <p class="hint" style="margin-bottom:8px">กำหนดข้อความหมายเหตุสำหรับเลือกแสดงกำกับตามตำแหน่งรอบบานหน้าต่าง/ประตู (เช่น ชนแอร์, ปลั๊กไฟ, บิ้วอิน, ตู้, เตียง)</p>
        <table class="ed-tbl">
          <thead><tr><th>ข้อความหมายเหตุ</th><th style="width:60px">ลบ</th></tr></thead>
          <tbody>
            ${masterDB.remarks.map((r, i) => `
              <tr>
                <td><input data-db-edit="remarks.${i}.name" value="${escH(r.name)}" placeholder="เช่น ชนแอร์"></td>
                <td class="c"><button type="button" class="danger" data-db-del="remarks.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="remarks">➕ เพิ่มข้อความหมายเหตุ</button>
      `;
    } else if (activeTab === 'widthFormulas') {
      body.innerHTML = `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <b>📐 ฐานข้อมูลการคำนวณขนาดความกว้างผ้าม่านตามรูปแบบผ้าม่าน (กำหนดได้หลายค่าต่อรูปแบบผ้าม่าน):</b><br>
          ตัวแปรที่ใช้ได้: <code>RW</code> = ความกว้างราง (W+EL+ER), <code>W</code> = กว้างเฟรม, <code>EL</code> = เผื่อซ้าย, <code>ER</code> = เผื่อขวา,
          <code>WC</code> = ความกว้างผ้าที่คำนวณได้, <code>HC</code> = ความสูงผ้าที่คำนวณได้, <code>P</code> = จำนวนผืน • ฟังก์ชัน: <code>ceil()</code>, <code>floor()</code>, <code>round()</code>
        </div>
        <table class="ed-tbl">
          <thead>
            <tr>
              <th style="width:130px">รูปแบบผ้าม่าน</th>
              <th>ชื่อเงื่อนไข / รายละเอียด</th>
              <th style="width:110px">สูตรความกว้างผ้า</th>
              <th style="width:130px">สูตรจำนวน (ผืน)</th>
              <th style="width:170px">สูตรปริมาณผ้า (หลา)</th>
              <th style="width:45px">ลบ</th>
            </tr>
          </thead>
          <tbody>
            ${(masterDB.widthFormulas || []).map((wf, i) => `
              <tr>
                <td>
                  <select data-db-edit="widthFormulas.${i}.curtainStyle">
                    ${curtainSelectOpts(wf.curtainStyle)}
                  </select>
                </td>
                <td><input data-db-edit="widthFormulas.${i}.label" value="${escH(wf.label || '')}" placeholder="เช่น มาตรฐาน (ลอน 2.5 เท่า)"></td>
                <td><input data-db-edit="widthFormulas.${i}.widthExp" value="${escH(wf.widthExp || '')}" placeholder="RW"></td>
                <td><input data-db-edit="widthFormulas.${i}.piecesExp" value="${escH(wf.piecesExp || '')}" placeholder="ceil((RW*2.5)/130)"></td>
                <td><input data-db-edit="widthFormulas.${i}.qtyExp" value="${escH(wf.qtyExp || '')}" placeholder="round(((P*(HC+35))/90)*10)/10"></td>
                <td class="c"><button type="button" class="danger" data-db-del="widthFormulas.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="widthFormulas">➕ เพิ่มค่าการคำนวณความกว้างผ้าม่าน</button>
      `;
    } else if (activeTab === 'heightFormulas') {
      body.innerHTML = `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <b>📏 ฐานข้อมูลการคำนวณขนาดความสูงผ้าม่าน ตามรูปแบบผ้าม่าน + ประเภทรางม่าน + ขนาดตะขอ (กำหนดได้หลายค่า):</b><br>
          ตัวแปรที่ใช้ได้: <code>RH</code> = ความสูงราง (H+ET+EB), <code>H</code> = สูงเฟรม, <code>ET</code> = เผื่อบน, <code>EB</code> = เผื่อล่าง, <code>FH</code> = สูงเต็ม
          (เช่น <code>RH - 2</code>, <code>RH - 4</code>, <code>RH</code>)
        </div>
        <table class="ed-tbl">
          <thead>
            <tr>
              <th style="width:130px">รูปแบบผ้าม่าน</th>
              <th style="width:130px">ประเภทรางม่าน</th>
              <th style="width:120px">ขนาดตะขอ</th>
              <th>ชื่อเงื่อนไขความสูง</th>
              <th style="width:120px">สูตรความสูงผ้า</th>
              <th style="width:45px">ลบ</th>
            </tr>
          </thead>
          <tbody>
            ${(masterDB.heightFormulas || []).map((hf, i) => `
              <tr>
                <td>
                  <select data-db-edit="heightFormulas.${i}.curtainStyle">
                    ${curtainSelectOpts(hf.curtainStyle)}
                  </select>
                </td>
                <td>
                  <select data-db-edit="heightFormulas.${i}.rodType">
                    ${rodSelectOpts(hf.rodType)}
                  </select>
                </td>
                <td>
                  <select data-db-edit="heightFormulas.${i}.hookSize">
                    ${hookSelectOpts(hf.hookSize)}
                  </select>
                </td>
                <td><input data-db-edit="heightFormulas.${i}.label" value="${escH(hf.label || '')}" placeholder="เช่น หักหัวราง 2 ซม."></td>
                <td><input data-db-edit="heightFormulas.${i}.heightExp" value="${escH(hf.heightExp || '')}" placeholder="RH - 2"></td>
                <td class="c"><button type="button" class="danger" data-db-del="heightFormulas.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="heightFormulas">➕ เพิ่มค่าการคำนวณความสูงผ้าม่าน</button>
      `;
    }
  }

  function onEditChange(e) {
    const k = e.target.dataset.dbEdit;
    if (!k) return;
    const [list, idx, field] = k.split('.');
    if (masterDB[list] && masterDB[list][+idx]) {
      masterDB[list][+idx][field] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      saveMasterDB();
    }
  }

  function init(cb) {
    onUpdate = cb;
    refreshRemarksDatalist();
    const modal = document.getElementById('dbModal');
    document.querySelectorAll('[data-dbtab]').forEach(b => {
      b.addEventListener('click', () => { activeTab = b.dataset.dbtab; render(); });
    });
    document.getElementById('dbClose').addEventListener('click', () => {
      modal.hidden = true;
      if (onUpdate) onUpdate();
    });
    modal.addEventListener('input', onEditChange);
    modal.addEventListener('change', onEditChange);
    modal.addEventListener('click', e => {
      const add = e.target.closest('[data-db-add]');
      if (add) {
        const t = add.dataset.dbAdd;
        const id = 'id_' + Date.now();
        if (t === 'staff') {
          masterDB.staff.push({ id, username: '', password: '', role: 'staff', name: '', dept: '', branch: '' });
        } else if (t === 'curtains') {
          masterDB.curtains.push({ id, name: '', useHook: false });
        } else if (t === 'hooks') {
          masterDB.hooks.push({ id, name: '' });
        } else if (t === 'remarks') {
          masterDB.remarks.push({ id, name: '' });
        } else if (t === 'widthFormulas') {
          masterDB.widthFormulas.push({
            id, curtainStyle: 'ม่านจีบ', label: 'เงื่อนไขความกว้างใหม่', widthExp: 'RW', piecesExp: '2', qtyExp: 'round(((P*(HC+35))/90)*10)/10',
          });
        } else if (t === 'heightFormulas') {
          masterDB.heightFormulas.push({
            id, curtainStyle: 'ม่านจีบ', rodType: 'รางม่านจีบ', hookSize: '*', label: 'เงื่อนไขความสูงใหม่', heightExp: 'RH - 2',
          });
        }
        saveMasterDB(); render(); return;
      }
      const del = e.target.closest('[data-db-del]');
      if (del) {
        const [list, idx] = del.dataset.dbDel.split('.');
        if (list === 'staff' && masterDB.staff[+idx] && String(masterDB.staff[+idx].username).toUpperCase() === 'T58121') {
          alert('ไม่สามารถลบบัญชีแอดมินตั้งต้น (T58121) ได้');
          return;
        }
        masterDB[list].splice(+idx, 1);
        saveMasterDB(); render();
      }
    });
  }

  function open(tab = 'staff') {
    activeTab = tab;
    render();
    document.getElementById('dbModal').hidden = false;
  }

  return { init, open };
})();
